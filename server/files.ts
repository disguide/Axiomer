import { ApiError, Repository, textField, pagination } from './repository';
import type { Attachment } from '../client/src/atlas/model';
import { boundedBody } from './request-body';
export interface FileBucket {
  put(key:string,value:ArrayBuffer|Uint8Array,options?:{httpMetadata?:{contentType?:string}}):Promise<unknown>;
  get(key:string):Promise<{body:ReadableStream<Uint8Array>;arrayBuffer():Promise<ArrayBuffer>}|null>;
  delete(key:string):Promise<unknown>;
}
export async function uploadAttachment(repo:Repository,request:Request,files?:FileBucket){
  if(!files)throw new ApiError(503,'File storage is not available.');const declared=Number(request.headers.get('content-length')??0);if(declared>21_000_000)throw new ApiError(413,'Attach files up to 20 MB.');
  const raw=await boundedBody(request,21_000_000);const data=await new Response(new Uint8Array(raw),{headers:{'Content-Type':request.headers.get('content-type')??''}}).formData();const file=data.get('file');if(!file||typeof file==='string')throw new ApiError(400,'Choose a file.');if(file.size>20_000_000)throw new ApiError(413,'Attach files up to 20 MB.');
  const nodeId=textField(data.get('nodeId'),'Node',200,true);await repo.node(nodeId);const id=data.get('id')?textField(data.get('id'),'File ID',200,true):crypto.randomUUID();
  if(!/^[a-z0-9_-]+$/i.test(id))throw new ApiError(400,'Invalid attachment ID.');const name=textField(file.name.replaceAll('\\','/').split('/').pop(),'Filename',250,true);const path=textField(data.get('path')??'','Path',1000);const bytes=await file.arrayBuffer();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const attachment:Attachment={id,node_id:nodeId,name,path,mime:file.type||'application/octet-stream',size:file.size,created_at:textField(data.get('created_at')??new Date().toISOString(),'Created time',100),checksum:digest};
  const read=()=>repo.db.prepare('SELECT * FROM attachments WHERE id=?').bind(id).first<Attachment>();
  const matches=(old:Attachment)=>old.node_id===nodeId&&old.name===name&&old.path===path&&old.mime===attachment.mime&&old.size===file.size&&old.checksum===digest;
  const old=await read();if(old){if(!matches(old))throw new ApiError(409,'An attachment with this ID contains different data.');return old;}
  // Content-addressed keys cannot overwrite another upload's bytes, even in concurrent retries.
  const key=id+'-'+digest;await files.put(key,bytes,{httpMetadata:{contentType:attachment.mime}});
  try{await repo.db.prepare('INSERT INTO attachments(id,node_id,name,path,mime,size,created_at,checksum) VALUES(?,?,?,?,?,?,?,?)').bind(id,nodeId,name,path,attachment.mime,file.size,attachment.created_at,digest).run();}catch(e){const winner=await read();if(winner&&matches(winner))return winner;if(winner?.checksum!==digest)await files.delete(key);if(winner)throw new ApiError(409,'An attachment with this ID contains different data.');throw e;}return attachment;
}
export async function attachmentResponse(repo:Repository,id:string,files?:FileBucket){const a=await repo.db.prepare('SELECT * FROM attachments WHERE id=?').bind(id).first<Attachment>();if(!a||!files)throw new ApiError(404,'Source file not found.');const value=await files.get(a.checksum?id+'-'+a.checksum:id);if(!value)throw new ApiError(404,'Source file is missing.');return new Response(value.body,{headers:{'Content-Type':a.mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(a.name)}`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});}
export async function listAttachments(repo:Repository,node:string,params:URLSearchParams){const {limit,cursor}=pagination(params);const {results}=await repo.db.prepare('SELECT * FROM attachments WHERE node_id=? AND id>? ORDER BY id LIMIT ?').bind(node,cursor,limit+1).all<Attachment>();return {items:results.slice(0,limit),nextCursor:results.length>limit?results[limit-1].id:null};}
