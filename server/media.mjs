import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;
const MIME = { png:'image/png', jpeg:'image/jpeg', webp:'image/webp' };
function fail(status,message) { throw Object.assign(new Error(message),{status}); }
export function createMedia(db, access, directory) {
  let processing = 0;
  function subject(kind,id,slot) {
    if (!(kind === 'teams' ? ['logo','cover'] : ['portrait']).includes(slot)) fail(404,'Loại ảnh không hợp lệ.');
    const row = db.prepare(`SELECT * FROM ${kind} WHERE id=?`).get(id);
    if (!row) fail(404,'Không tìm thấy hồ sơ.');
    return row;
  }
  async function save(kind,id,slot,body,authorize) {
    authorize();
    const before = subject(kind,id,slot);
    if (body.revision !== before.revision) fail(409,'Hồ sơ vừa thay đổi. Tải lại trước khi lưu ảnh.');
    if (body.remove === true) {
      db.exec('BEGIN IMMEDIATE');
      try {
        authorize(); const current = subject(kind,id,slot);
        if (body.revision !== current.revision) fail(409,'Hồ sơ vừa thay đổi. Tải lại trước khi lưu ảnh.');
        const media = JSON.parse(current.media_json); delete media[slot];
        db.prepare(`UPDATE ${kind} SET media_json=?,revision=revision+1 WHERE id=?`).run(JSON.stringify(media),id);
        db.exec('COMMIT');
        return {asset:null,record:directory.list()[kind].find(item=>item.id===id)};
      } catch(error) { if(db.isTransaction) db.exec('ROLLBACK'); throw error; }
    }
    let input;
    if (body.reuse === true) {
      const previous = JSON.parse(before.media_json)[slot];
      const source = previous && db.prepare('SELECT source FROM media_assets WHERE id=? AND kind=? AND subject_id=? AND slot=?').get(previous.id,kind,id,slot);
      if (!source) fail(400,'Chưa có ảnh để chỉnh.');
      input = Buffer.from(source.source);
    } else {
    if (typeof body.data !== 'string' || body.data.length > Math.ceil(MAX_BYTES/3)*4) fail(413,'Ảnh tối đa 10MB.');
    if (!body.data.length || body.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.data)) fail(400,'Dữ liệu ảnh không hợp lệ.');
    input = Buffer.from(body.data,'base64');
    if(input.length > MAX_BYTES) fail(413,'Ảnh tối đa 10MB.');
    if(input.toString('base64') !== body.data) fail(400,'Dữ liệu ảnh không hợp lệ.');
    }
    if(typeof body.light !== 'boolean' || ![body.x,body.y].every(value=>typeof value==='number' && Number.isFinite(value) && value>=0 && value<=100)) fail(400,'Thiết lập ảnh không hợp lệ.');
    if(processing>=2) fail(429,'Đang xử lý ảnh khác. Thử lại sau.');
    processing++;
    let normalized, images, asset;
    try {
      const decoder=sharp(input,{limitInputPixels:MAX_PIXELS,failOn:'warning'});
      const metadata=await decoder.metadata();
      // APNG is not exposed as multi-page by every libvips build. Inspect its real chunk structure.
      let animatedPng=false;
      if(metadata.format==='png') {
        for(let offset=8;offset+12<=input.length;) {
          const length=input.readUInt32BE(offset);
          if(length>input.length-offset-12) fail(400,'Ảnh PNG không hợp lệ.');
          if(input.toString('ascii',offset+4,offset+8)==='acTL') animatedPng=true;
          offset+=length+12;
        }
      }
      if(!MIME[metadata.format] || (body.reuse !== true && body.mime!==MIME[metadata.format]) || (metadata.pages||1)>1 || animatedPng) fail(415,'Chỉ nhận PNG, JPEG hoặc WebP tĩnh đúng định dạng.');
      if(!metadata.width || !metadata.height || metadata.width>8192 || metadata.height>8192 || metadata.width*metadata.height>MAX_PIXELS) fail(413,'Ảnh tối đa 24 megapixel và 8192px mỗi chiều.');
      normalized=body.reuse === true ? {data:input,info:{width:metadata.width,height:metadata.height}} : await decoder.rotate().toColourspace('srgb').webp({quality:90,effort:3}).toBuffer({resolveWithObject:true});
      asset={id:randomUUID(),width:normalized.info.width,height:normalized.info.height,light:body.light,x:body.x,y:body.y};
      images=[];
      for(const size of [128,512,800,1280]) {
        const image=await sharp(normalized.data).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:85,effort:3}).toBuffer();
        images.push({size,data:image});
      }
    } catch(error) {
      if(error.status) throw error;
      fail(400,'Không đọc được ảnh hoặc ảnh vượt giới hạn. Chọn ảnh khác.');
    } finally { processing--; }
    db.exec('BEGIN IMMEDIATE');
    try {
      authorize(); const current=subject(kind,id,slot);
      if(body.revision!==current.revision) fail(409,'Hồ sơ vừa thay đổi. Tải lại trước khi lưu ảnh.');
      db.prepare('INSERT INTO media_assets (id,kind,subject_id,slot,width,height,source,created_at) VALUES (?,?,?,?,?,?,?,?)').run(asset.id,kind,id,slot,asset.width,asset.height,normalized.data,new Date().toISOString());
      const insert=db.prepare('INSERT INTO media_images (asset_id,size,data) VALUES (?,?,?)');
      for(const image of images) insert.run(asset.id,image.size,image.data);
      const media=JSON.parse(current.media_json); media[slot]=asset;
      db.prepare(`UPDATE ${kind} SET media_json=?,revision=revision+1 WHERE id=?`).run(JSON.stringify(media),id);
      db.exec('COMMIT');
      return {asset,record:directory.list()[kind].find(item=>item.id===id)};
    } catch(error) {if(db.isTransaction) db.exec('ROLLBACK'); throw error;}
  }
  function read(user,id,size,tournamentId) {
    const asset=db.prepare('SELECT id,kind,subject_id,slot FROM media_assets WHERE id=?').get(id);
    if(!asset) fail(404,'Không tìm thấy ảnh.');
    if(tournamentId) {
      access.requireRole(user,tournamentId);
      const event=directory.tournament(tournamentId);
      const referenced=event.registrations.some(registration=>[registration.team,...registration.players].some(entity=>Object.values(entity.media||{}).some(value=>value?.id===id)));
      if(!referenced) fail(404,'Ảnh không thuộc đăng ký của giải.');
    } else if(!access.managesDirectory(user)) fail(403,'Chưa có quyền xem ảnh danh bạ.');
    const image=db.prepare('SELECT data FROM media_images WHERE asset_id=? AND size=?').get(id,size);
    if(!image) fail(404,'Không tìm thấy cỡ ảnh.');
    return Buffer.from(image.data);
  }
  return {save,read};
}
