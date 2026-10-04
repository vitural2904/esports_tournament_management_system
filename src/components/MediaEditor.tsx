import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { api } from "../lib/api";
import type { MediaAsset } from "../lib/api";
import "./MediaEditor.css";

export type MediaEntity = { id: string; revision: number; media?: Partial<Record<"logo" | "cover" | "portrait", MediaAsset>> };
export function mediaUrl(asset: MediaAsset, size = 512, tournamentId?: string) {
  return `/api/media/${encodeURIComponent(asset.id)}/${size}${tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : ""}`;
}
export function MediaImage({asset,slot,tournamentId,className=""}: {asset:MediaAsset;slot:"logo"|"cover"|"portrait";tournamentId?:string;className?:string}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[asset.id,tournamentId]);
  const size=slot==="logo"?128:slot==="cover"?1280:512;
  return <div className={`team-media team-media-${slot} ${asset.light?"team-media-light":""} ${className}`}>{failed?<ImagePlus aria-label="Ảnh không tải được"/>:<img src={mediaUrl(asset,size,tournamentId)} width={asset.width} height={asset.height} loading="lazy" alt={slot==="logo"?"Logo đội":slot==="cover"?"Ảnh bìa đội":"Ảnh tuyển thủ"} style={{objectPosition:`${asset.x}% ${asset.y}%`}} onError={()=>setFailed(true)}/>}</div>;
}
export default function MediaEditor({record,kind,slot,onSaved}: {record:MediaEntity;kind:"teams"|"players";slot:"logo"|"cover"|"portrait";onSaved:(savedRecord:MediaEntity)=>Promise<void>|void}) {
  const existing=record.media?.[slot];
  const [editing,setEditing]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState("");
  const [light,setLight]=useState(existing?.light||false);
  const [x,setX]=useState(existing?.x??50),[y,setY]=useState(existing?.y??50);
  const [baseRevision,setBaseRevision]=useState(record.revision);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=> { if(!file){setPreview("");return;} const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
  function open(){setEditing(true);setFile(null);setLight(existing?.light||false);setX(existing?.x??50);setY(existing?.y??50);setBaseRevision(record.revision);setError("");setNotice("");}
  function select(event:ChangeEvent<HTMLInputElement>){const selected=event.target.files?.[0];if(!selected)return;if(!["image/png","image/jpeg","image/webp"].includes(selected.type)||selected.size>10*1024*1024){setError("Chọn PNG, JPEG, WebP tĩnh tối đa 10MB.");event.target.value="";return;}setFile(selected);setError("");}
  async function save(remove=false){setBusy(true);setError("");setNotice("");try{let body:object;if(remove)body={revision:baseRevision,remove:true};else if(!file && existing){body={revision:baseRevision,reuse:true,light,x,y};}else{if(!file)throw new Error("Chọn ảnh trước khi lưu.");const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=()=>reject(new Error("Không đọc được file."));reader.readAsDataURL(file);});body={revision:baseRevision,data,mime:file.type,light,x,y};}const result=await api<{record:MediaEntity}>(`/${kind}/${record.id}/media/${slot}`,body);setEditing(false);setFile(null);setNotice(remove?"Đã gỡ ảnh. Ảnh trong đăng ký cũ giữ nguyên.":"Đã lưu ảnh. Ảnh trong đăng ký cũ giữ nguyên.");try{await onSaved(result.record);}catch{setError("Ảnh đã lưu. Chưa tải được hồ sơ mới. Tải lại trước khi sửa tiếp.");}}catch(problem){setError(problem instanceof Error?problem.message:"Không lưu được ảnh.");}finally{setBusy(false);}}
  const label=slot==="logo"?"logo đội":slot==="cover"?"ảnh bìa":"ảnh tuyển thủ";
  return <section className="media-editor" aria-label={`Chỉnh ${label}`}><button type="button" disabled={busy} onClick={open}><ImagePlus size={16}/> {existing?"Thay":"Thêm"} {label}</button>{editing&&<div className="media-editor-controls"><label>Chọn {label}<input ref={input} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={select}/></label><p>PNG, JPEG, WebP tĩnh · tối đa 10MB, 24 megapixel, 8192px mỗi chiều.</p>{(preview||existing)&&<div className={`team-media team-media-${slot} ${light?"team-media-light":""} media-editor-preview`}><img src={preview||(existing?mediaUrl(existing):"")} alt={`Xem trước ${label}`} style={{objectPosition:`${x}% ${y}%`}}/></div>}{slot==="logo"?<label>Nền logo<select value={light?"light":"dark"} disabled={busy} onChange={event=>setLight(event.target.value==="light")}><option value="dark">Tối</option><option value="light">Sáng</option></select></label>:<><label>Điểm trọng tâm ngang<input type="range" min={0} max={100} value={x} disabled={busy} onChange={event=>setX(Number(event.target.value))}/></label><label>Điểm trọng tâm dọc<input type="range" min={0} max={100} value={y} disabled={busy} onChange={event=>setY(Number(event.target.value))}/></label></>}<div className="op-inline-actions"><button type="button" className="op-primary" disabled={busy||(!file&&!existing)} onClick={()=>void save()}>{busy?"Đang lưu…":"Lưu ảnh"}</button>{existing&&<button type="button" disabled={busy} onClick={()=>void save(true)}><X size={16}/> Gỡ ảnh</button>}<button type="button" disabled={busy} onClick={()=>{setEditing(false);setFile(null);setError("");}}>Hủy</button></div></div>}{error&&<p className="op-error" role="alert">{error}</p>}{notice&&<p className="op-notice" role="status">{notice}</p>}</section>;
}


