import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fixture, owner } from './helpers.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { createApplication } from '../server/application.mjs';

test('organizer uploads a real logo; normalized image survives restart without changing a historical registration', async t => {
  const f = await fixture(t), cookie = await owner(f);
  const team = (await f.request('/api/teams', { method:'POST', cookie, body:{name:'Media team',tag:'IMG'} })).body.team;
  const png = await sharp({create:{width:120,height:80,channels:4,background:{r:30,g:90,b:60,alpha:0.5}}}).png().toBuffer();
  const uploaded = await f.request(`/api/teams/${team.id}/media/logo`, { method:'POST', cookie, body:{revision:team.revision,data:png.toString('base64'),mime:'image/png',light:true,x:50,y:50} });
  assert.equal(uploaded.status,200);
  assert.ok(uploaded.body.asset.id);
  assert.equal(uploaded.body.asset.width,120);
  const oldEvent = (await f.request('/api/tournaments', {method:'POST',cookie,body:{name:'Old images'}})).body.tournament;
  await f.request(`/api/tournaments/${oldEvent.id}/registrations`, {method:'POST',cookie,body:{teamId:team.id,playerIds:[],revision:0}});
  const oldId = uploaded.body.asset.id;
  const changed = await f.request(`/api/teams/${team.id}/media/logo`, {method:'POST',cookie,body:{revision:uploaded.body.record.revision,data:png.toString('base64'),mime:'image/png',light:false,x:30,y:40}});
  assert.equal(changed.status,200);
  assert.notEqual(changed.body.asset.id,oldId);
  await f.restart();
  const current = (await f.request('/api/directory',{cookie})).body.teams.find(item=>item.id===team.id);
  assert.equal(current.media.logo.id,changed.body.asset.id);
  const stored = (await f.request(`/api/tournaments/${oldEvent.id}`,{cookie})).body.tournament;
  assert.equal(stored.registrations[0].team.media.logo.id,oldId);
});

test('media enforces revision and scope; a registered version remains readable after catalog removal', async t => {
  const f = await fixture(t), cookie = await owner(f);
  const team = (await f.request('/api/teams',{method:'POST',cookie,body:{name:'Scope team',tag:'SCP'}})).body.team;
  const player = (await f.request('/api/players',{method:'POST',cookie,body:{name:'Portrait player',handle:'Portrait'}})).body.player;
  const png = await sharp({create:{width:40,height:70,channels:4,background:{r:50,g:100,b:70,alpha:0.4}}}).png().toBuffer();
  const upload = (kind,id,slot,revision,extra={}) => f.request(`/api/${kind}/${id}/media/${slot}`,{method:'POST',cookie,body:{revision,data:png.toString('base64'),mime:'image/png',light:false,x:50,y:50,...extra}});
  const photo=(await upload('players',player.id,'portrait',player.revision)).body;
  const logo=(await upload('teams',team.id,'logo',team.revision)).body;
  assert.equal((await upload('teams',team.id,'logo',team.revision)).status,409);
  const event=(await f.request('/api/tournaments',{method:'POST',cookie,body:{name:'Scoped media'}})).body.tournament;
  await f.request(`/api/tournaments/${event.id}/registrations`,{method:'POST',cookie,body:{teamId:team.id,playerIds:[player.id],revision:0}});
  const other=(await f.request('/api/tournaments',{method:'POST',cookie,body:{name:'Not this media'}})).body.tournament;
  const binary=await f.request(`/api/media/${photo.asset.id}/800?tournamentId=${event.id}`,{cookie});
  assert.equal(binary.status,200); assert.equal(binary.contentType,'image/webp');
  const metadata=await sharp(binary.body).metadata(); assert.equal(metadata.width,40); assert.equal(metadata.height,70); assert.equal(metadata.hasAlpha,true); assert.equal(metadata.exif,undefined);
  assert.equal((await f.request(`/api/media/${photo.asset.id}/128`)).status,401);
  assert.equal((await f.request(`/api/media/${photo.asset.id}/128?tournamentId=${other.id}`,{cookie})).status,404);
  const removed=await f.request(`/api/teams/${team.id}/media/logo`,{method:'POST',cookie,body:{revision:logo.record.revision,remove:true}});
  assert.equal(removed.status,200); assert.equal(removed.body.record.media.logo,undefined);
  assert.equal((await f.request(`/api/media/${logo.asset.id}/128?tournamentId=${event.id}`,{cookie})).status,200);
});

test('upload rejects false MIME, SVG, damaged images, animated PNG and dimension/byte limits without losing the old image', async t => {
  const f=await fixture(t),cookie=await owner(f);
  const team=(await f.request('/api/teams',{method:'POST',cookie,body:{name:'Bad media',tag:'BAD'}})).body.team;
  const good=await sharp({create:{width:16,height:16,channels:4,background:'#345644'}}).png().toBuffer();
  const path=`/api/teams/${team.id}/media/logo`;
  const upload=(bytes,mime='image/png',revision=team.revision)=>f.request(path,{method:'POST',cookie,body:{revision,data:bytes.toString('base64'),mime,light:false,x:50,y:50}});
  assert.equal((await upload(good,'image/jpeg')).status,415);
  assert.equal((await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'))).status,415);
  assert.equal((await upload(Buffer.from('not an image'))).status,400);
  const wide=await sharp({create:{width:8193,height:1,channels:3,background:'#345644'}}).png().toBuffer();
  assert.equal((await upload(wide)).status,413);
  assert.equal((await upload(Buffer.alloc(10*1024*1024+1))).status,413);
  const saved=(await upload(good)).body;
  const broken=await upload(Buffer.from('bad'),'image/png',saved.record.revision);
  assert.equal(broken.status,400);
  assert.equal((await f.request('/api/directory',{cookie})).body.teams[0].media.logo.id,saved.asset.id);
  // Animation-control chunk uses a valid CRC and is inserted after IHDR.
  const chunk=Buffer.alloc(20);chunk.writeUInt32BE(8);chunk.write('acTL',4);chunk.writeUInt32BE(2,8);
  let crc=0xffffffff;for(const byte of chunk.subarray(4,16)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}chunk.writeUInt32BE((crc^0xffffffff)>>>0,16);
  const animated=Buffer.concat([good.subarray(0,33),chunk,good.subarray(33)]);
  assert.equal((await upload(animated,'image/png',saved.record.revision)).status,415);
});

test('JPEG orientation is normalized and simultaneous media edits do not overwrite a newer revision', async t => {
  const f=await fixture(t),cookie=await owner(f);
  const player=(await f.request('/api/players',{method:'POST',cookie,body:{handle:'Oriented',name:'Oriented player'}})).body.player;
  const jpeg=await sharp({create:{width:40,height:20,channels:3,background:'#345644'}}).jpeg().withMetadata({orientation:6}).toBuffer();
  const upload=()=>f.request(`/api/players/${player.id}/media/portrait`,{method:'POST',cookie,body:{revision:player.revision,data:jpeg.toString('base64'),mime:'image/jpeg',light:false,x:50,y:50}});
  const responses=await Promise.all([upload(),upload()]);
  assert.deepEqual(responses.map(item=>item.status).sort(),[200,409]);
  const saved=responses.find(item=>item.status===200).body;
  assert.equal(saved.asset.width,20);assert.equal(saved.asset.height,40);
  const image=await f.request(`/api/media/${saved.asset.id}/800`,{cookie});
  const metadata=await sharp(image.body).metadata();assert.equal(metadata.exif,undefined);assert.equal(metadata.orientation,undefined);
});

test('caster can read directory and registered media but cannot upload; account lock revokes access', async t => {
  const f=await fixture(t),cookie=await owner(f);
  const team=(await f.request('/api/teams',{method:'POST',cookie,body:{name:'Authorized team',tag:'AUTH'}})).body.team;
  const png=await sharp({create:{width:16,height:16,channels:3,background:'#345644'}}).png().toBuffer();
  const body={revision:team.revision,data:png.toString('base64'),mime:'image/png',light:false,x:50,y:50};
  const saved=(await f.request(`/api/teams/${team.id}/media/logo`,{method:'POST',cookie,body})).body;
  const event=(await f.request('/api/tournaments',{method:'POST',cookie,body:{name:'Granted images'}})).body.tournament;
  await f.request(`/api/tournaments/${event.id}/registrations`,{method:'POST',cookie,body:{teamId:team.id,playerIds:[],revision:0}});
  const user=(await f.request('/api/users',{method:'POST',cookie,body:{username:'image-entry',displayName:'Entry',password:'Image-Test-Password-42!'}})).body.user;
  const login=await f.request('/api/login',{method:'POST',body:{username:'image-entry',password:'Image-Test-Password-42!'}});
  const changed=await f.request('/api/password',{method:'POST',cookie:login.cookie,body:{currentPassword:'Image-Test-Password-42!',newPassword:'Image-Changed-Password-42!'}});
  const imagePath=`/api/media/${saved.asset.id}/128?tournamentId=${event.id}`;
  assert.equal((await f.request(imagePath,{cookie:changed.cookie})).status,200);
  assert.equal((await f.request(imagePath,{cookie:changed.cookie})).status,200);
  assert.equal((await f.request(`/api/media/${saved.asset.id}/128`,{cookie:changed.cookie})).status,200);
  assert.equal((await f.request(`/api/teams/${team.id}/media/logo`,{method:'POST',cookie:changed.cookie,body:{...body,revision:saved.record.revision}})).status,403);
  await f.request(`/api/users/${user.id}`,{method:'POST',cookie,body:{revision:changed.body.user.revision,disabled:true}});
  assert.equal((await f.request(imagePath,{cookie:changed.cookie})).status,401);
});

test('existing backup/restore commands preserve images and registration references', async t => {
  const f=await fixture(t),cookie=await owner(f);
  const team=(await f.request('/api/teams',{method:'POST',cookie,body:{name:'Backup images',tag:'BAK'}})).body.team;
  const png=await sharp({create:{width:12,height:24,channels:4,background:{r:40,g:80,b:50,alpha:.6}}}).png().toBuffer();
  const saved=(await f.request(`/api/teams/${team.id}/media/cover`,{method:'POST',cookie,body:{revision:team.revision,data:png.toString('base64'),mime:'image/png',light:false,x:20,y:70}})).body;
  const imagePath=`/api/media/${saved.asset.id}/512`;
  const expected=(await f.request(imagePath,{cookie})).body;
  const run=promisify(execFile),backup=join(f.directory,'media-backup.sqlite'),restored=join(f.directory,'media-restored.sqlite');
  await run(process.execPath,['scripts/backup.mjs',f.databasePath,backup]);
  await run(process.execPath,['scripts/restore.mjs',backup,restored]);
  const app=await createApplication({databasePath:restored});
  try {
    await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
    const base=`http://127.0.0.1:${app.server.address().port}`;
    assert.equal((await fetch(base+imagePath,{headers:{Cookie:cookie}})).status,401);
    const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:5173'},body:JSON.stringify({username:'owner',password:'Temporary-Test-Password-42!'})});
    assert.equal(login.status,200);
    const image=await fetch(base+imagePath,{headers:{Cookie:login.headers.get('set-cookie').split(';')[0]}});
    assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),expected);
  } finally {await app.close();}
});

test('adjusting an existing image creates a new version without uploading its bytes again', async t => {
  const f=await fixture(t),cookie=await owner(f);
  const team=(await f.request('/api/teams',{method:'POST',cookie,body:{name:'Focus settings',tag:'FOC'}})).body.team;
  const webp=await sharp({create:{width:100,height:80,channels:3,background:'#345644'}}).webp().toBuffer();
  const path=`/api/teams/${team.id}/media/cover`;
  const saved=(await f.request(path,{method:'POST',cookie,body:{revision:team.revision,data:webp.toString('base64'),mime:'image/webp',light:false,x:50,y:50}})).body;
  const adjusted=await f.request(path,{method:'POST',cookie,body:{revision:saved.record.revision,reuse:true,light:false,x:10,y:90}});
  assert.equal(adjusted.status,200);assert.notEqual(adjusted.body.asset.id,saved.asset.id);assert.equal(adjusted.body.asset.x,10);assert.equal(adjusted.body.asset.y,90);
});
