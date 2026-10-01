import type { Prepared } from './database';
import { ApiError, labelsValue, pagination, Repository, textField, validateDraft, validRelation } from './repository';
import type { NodeDetails, Statement } from '../client/src/atlas/model';
export const transferParts=['projects','folders','nodes','edges','locations','attachments'] as const;
export type TransferPart=typeof transferParts[number];
const nodeFields=['id','title','body','kind','topic','url','publisher','locator','version','created_at','updated_at'];
const plain=(value:unknown):Record<string,unknown>=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new ApiError(400,'Invalid transfer record.');return value as Record<string,unknown>;};
const identifier=(value:unknown)=>textField(value,'Record ID',200,true);
export function normalizeDetails(nodeId:string,value:unknown):NodeDetails{
  const d=value===undefined?{}:plain(value);let labels=d.labels??[];if(typeof labels==='string'){try{labels=JSON.parse(labels);}catch{throw new ApiError(400,'Invalid labels.');}}
  let provenance=d.provenance??{};if(typeof provenance==='string'){try{provenance=JSON.parse(provenance);}catch{throw new ApiError(400,'Invalid provenance.');}}
  plain(provenance);const provenanceText=JSON.stringify(provenance);if(provenanceText.length>20000)throw new ApiError(400,'Source metadata is too large.');
  return {node_id:nodeId,labels:JSON.stringify(labelsValue(labels)),labels_origin:textField(d.labels_origin??'import','Label origin',30),abstract:textField(d.abstract,'Summary',4000),provenance:provenanceText,listed:d.listed===0?0:1,location_locked:d.location_locked===0?0:1,analyzed_version:0};
}
export function detailsStatement(repo:Repository,d:NodeDetails){return repo.db.prepare('INSERT INTO node_details(node_id,labels,labels_origin,abstract,provenance,listed,location_locked,analyzed_version) VALUES(?,?,?,?,?,?,?,?)').bind(d.node_id,d.labels,d.labels_origin,d.abstract,d.provenance,d.listed,d.location_locked,d.analyzed_version);}
async function checksum(value:unknown){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(n=>n.toString(16).padStart(2,'0')).join('');}

export async function importBatch(repo:Repository,input:Record<string,unknown>){
  const batchId=identifier(input.batchId);const part=textField(input.part,'Transfer part',30,true) as TransferPart;
  if(!transferParts.includes(part)||part==='attachments')throw new ApiError(400,'Unsupported transfer part. Upload source files separately.');
  if(!Array.isArray(input.records)||input.records.length>40)throw new ApiError(400,'Import up to 40 records per batch.');
  const digest=await checksum({part,records:input.records});const seen=await repo.db.prepare('SELECT checksum,result FROM transfer_batches WHERE id=?').bind(batchId).first<{checksum:string;result:string}>();
  if(seen){if(seen.checksum!==digest)throw new ApiError(409,'This batch ID was already used for different content.');return {...JSON.parse(seen.result),replayed:true};}
  const statements:Prepared[]=[];let added=0,skipped=0;const within=new Set<string>();
  for(const value of input.records){
    const r=plain(value);const id=identifier(part==='locations'?r.node_id:r.id);if(within.has(id))throw new ApiError(400,'A batch contains duplicate IDs.');within.add(id);
    if(part==='nodes'){
      const draft=validateDraft(r);const version=Number(r.version??1);if(!Number.isSafeInteger(version)||version<1)throw new ApiError(400,'Invalid node version.');
      const n:Statement={...draft,id,version,created_at:textField(r.created_at??new Date().toISOString(),'Created time',100),updated_at:textField(r.updated_at??new Date().toISOString(),'Updated time',100)};
      const details=normalizeDetails(id,r.details);
      const old=await repo.db.prepare('SELECT * FROM nodes WHERE id=?').bind(id).first<Statement>();
      if(old){const oldDetails=await repo.details(id);if(nodeFields.some(k=>String(old[k as keyof Statement])!==String(n[k as keyof Statement]))||['labels','abstract','provenance','listed'].some(k=>String(oldDetails[k as keyof NodeDetails])!==String(details[k as keyof NodeDetails])))throw new ApiError(409,`“${n.title}” already exists with different content. Import a copy to keep both.`);skipped++;continue;}
      statements.push(repo.insert(n),detailsStatement(repo,details));added++;
    }else if(part==='edges'){
      const parent=identifier(r.parent),child=identifier(r.child),relation=validRelation(r.relation);if(parent===child)throw new ApiError(400,'A node cannot link to itself.');
      const old=await repo.db.prepare('SELECT * FROM edges WHERE id=? OR (parent=? AND child=? AND relation=?)').bind(id,parent,child,relation).first<{id:string;parent:string;child:string;relation:string}>();
      if(old){if(old.parent!==parent||old.child!==child||old.relation!==relation)throw new ApiError(409,'A connection ID already has different endpoints.');skipped++;continue;}
      if(!await repo.db.prepare('SELECT id FROM nodes WHERE id=?').bind(parent).first()||!await repo.db.prepare('SELECT id FROM nodes WHERE id=?').bind(child).first())throw new ApiError(400,'Import nodes before their connections.');
      const origin=textField(r.origin??'import','Connection origin',30);if(!['manual','import','extracted','inferred','ambiguous'].includes(origin))throw new ApiError(400,'Unknown connection origin.');
      statements.push(repo.db.prepare('INSERT INTO edges(id,parent,child,relation) VALUES(?,?,?,?)').bind(id,parent,child,relation),repo.db.prepare('INSERT INTO edge_details(edge_id,origin,rationale) VALUES(?,?,?)').bind(id,origin,textField(r.rationale,'Connection explanation',4000)));added++;
    }else if(part==='projects'){
      const name=textField(r.name,'Project name',100,true),description=textField(r.description,'Description',500);const old=await repo.db.prepare('SELECT name,description FROM projects WHERE id=?').bind(id).first<{name:string;description:string}>();
      if(old){if(old.name!==name||old.description!==description)throw new ApiError(409,'A project ID already has different content. Import a copy.');skipped++;continue;}
      statements.push(repo.db.prepare('INSERT INTO projects(id,name,description,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,name,description,textField(r.created_at??new Date().toISOString(),'Created time',100),textField(r.updated_at??new Date().toISOString(),'Updated time',100)));added++;
    }else if(part==='folders'){
      const project=identifier(r.project_id),name=textField(r.name,'Folder name',100,true);await repo.project(project);const old=await repo.db.prepare('SELECT name,project_id FROM folders WHERE id=?').bind(id).first<{name:string;project_id:string}>();
      if(old){if(old.name!==name||old.project_id!==project)throw new ApiError(409,'A folder ID already has different content.');skipped++;continue;}
      statements.push(repo.db.prepare('INSERT INTO folders(id,project_id,name,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,project,name,textField(r.created_at??new Date().toISOString(),'Created time',100),textField(r.updated_at??new Date().toISOString(),'Updated time',100)));added++;
    }else if(part==='locations'){
      await repo.node(id);const destination=await repo.validateDestination({projectId:r.project_id,folderId:r.folder_id??null});const old=await repo.db.prepare('SELECT project_id,folder_id FROM item_locations WHERE node_id=?').bind(id).first<{project_id:string;folder_id:string|null}>();
      if(old){if(old.project_id!==destination.projectId||old.folder_id!==destination.folderId)throw new ApiError(409,'An existing item has a different saved location. Import a copy.');skipped++;continue;}
      statements.push(repo.placeStatement(id,destination));added++;
    }
  }
  const result={added,skipped,part};statements.push(repo.db.prepare('INSERT INTO transfer_batches(id,checksum,result,created_at) VALUES(?,?,?,?)').bind(batchId,digest,JSON.stringify(result),new Date().toISOString()));
  try{await repo.db.batch(statements);}catch(e){const completed=await repo.db.prepare('SELECT checksum,result FROM transfer_batches WHERE id=?').bind(batchId).first<{checksum:string;result:string}>();if(completed?.checksum===digest)return {...JSON.parse(completed.result),replayed:true};throw e;}
  return result;
}

type ExportSession={id:string;revision:number;scope:string;status:string;created_at:string};
async function exportSession(repo:Repository,id:string){const s=await repo.db.prepare('SELECT * FROM export_sessions WHERE id=?').bind(id).first<ExportSession>();if(!s)throw new ApiError(404,'Export not found.');if(s.revision!==await repo.revision())throw new ApiError(409,'Your workspace changed during export. Start again to get a consistent copy.');return s;}
export async function beginExport(repo:Repository,input:Record<string,unknown>){
  const scope=String(input.scope??'workspace');if(!['workspace','project','argument'].includes(scope))throw new ApiError(400,'Choose an argument, project, or workspace.');
  const revision=await repo.revision();const id=crypto.randomUUID();const now=new Date().toISOString();const statements=[repo.db.prepare('INSERT INTO export_sessions(id,revision,scope,status,created_at) VALUES(?,?,?,?,?)').bind(id,revision,scope==='project'?'project:'+identifier(input.project):scope,scope==='workspace'?'ready':'gathering',now)];
  if(scope==='project'){const project=identifier(input.project);await repo.project(project);statements.push(repo.db.prepare('INSERT INTO export_members(session_id,node_id) SELECT ?,node_id FROM item_locations WHERE project_id=?').bind(id,project));}
  if(scope==='argument'){const root=identifier(input.root);await repo.node(root);statements.push(repo.db.prepare('INSERT INTO export_members(session_id,node_id) VALUES(?,?)').bind(id,root));}
  await repo.db.batch(statements);return exportProgress(repo,id);
}
export async function exportProgress(repo:Repository,id:string){const s=await exportSession(repo,id);const count=s.scope==='workspace'?await repo.db.prepare('SELECT value count FROM counters WHERE key='nodes'').first<{count:number}>():await repo.db.prepare('SELECT count(*) count FROM export_members WHERE session_id=?').bind(id).first<{count:number}>();return {...s,nodes:count?.count??0};}
export async function expandExport(repo:Repository,id:string){
  const s=await exportSession(repo,id);if(s.status==='ready')return exportProgress(repo,id);
  const frontier=(await repo.db.prepare('SELECT node_id FROM export_members WHERE session_id=? AND expanded=0 ORDER BY node_id LIMIT 40').bind(id).all<{node_id:string}>()).results;
  if(frontier.length){const ids=frontier.map(n=>n.node_id),marks=ids.map(()=>'?').join(',');await repo.db.batch([
    repo.db.prepare(`INSERT OR IGNORE INTO export_members(session_id,node_id) SELECT ?,child FROM edges WHERE parent IN (${marks})`).bind(id,...ids),
    repo.db.prepare(`UPDATE export_members SET expanded=1 WHERE session_id=? AND node_id IN (${marks})`).bind(id,...ids),
  ]);}
  if(!await repo.db.prepare('SELECT node_id FROM export_members WHERE session_id=? AND expanded=0 LIMIT 1').bind(id).first())await repo.db.prepare("UPDATE export_sessions SET status='ready' WHERE id=?").bind(id).run();
  return exportProgress(repo,id);
}
export async function exportPage(repo:Repository,id:string,params:URLSearchParams){
  const s=await exportSession(repo,id);if(s.status!=='ready')throw new ApiError(409,'The argument branches are still being gathered.');
  const pageParams=new URLSearchParams(params);pageParams.delete('cursor');const {limit}=pagination(pageParams);const cursor=params.get('cursor')??'';if(cursor.length>2000)throw new ApiError(400,'Invalid export cursor.');
  const part=params.get('part') as TransferPart;if(!transferParts.includes(part))throw new ApiError(400,'Unknown export section.');
  const scoped=s.scope!=='workspace';const args:unknown[]=[];let sql:string;let compound=false;
  const detail="(SELECT json_object('labels',labels,'labels_origin',labels_origin,'abstract',abstract,'provenance',provenance,'listed',listed,'location_locked',location_locked,'analyzed_version',analyzed_version) FROM node_details d WHERE d.node_id=n.id) details";
  const composite=()=>{if(!cursor)return ['',''];try{const c=JSON.parse(cursor);if(!Array.isArray(c)||c.length!==2||c.some(v=>typeof v!=='string'||v.length>200))throw new Error();return c as string[];}catch{throw new ApiError(400,'Invalid export cursor.');}};
  if(part==='nodes'){
    sql=scoped?`SELECT n.*,${detail} FROM export_members em CROSS JOIN nodes n ON n.id=em.node_id WHERE em.session_id=? AND em.node_id>? ORDER BY em.node_id LIMIT ?`:`SELECT n.*,${detail} FROM nodes n WHERE n.id>? ORDER BY n.id LIMIT ?`;
    if(scoped)args.push(id);args.push(cursor);
  }else if(part==='edges'||part==='attachments'){
    const edge=part==='edges',table=edge?'edges':'attachments',alias=edge?'e':'a',nodeColumn=edge?'parent':'node_id';const fields=edge?"e.*,COALESCE(d.origin,'manual') origin,COALESCE(d.rationale,'') rationale":'a.*';const extra=edge?' LEFT JOIN edge_details d ON d.edge_id=e.id':'';
    if(scoped){compound=true;const [parent,last]=composite();sql=`SELECT ${fields} FROM export_members em CROSS JOIN ${table} ${alias} ON ${alias}.${nodeColumn}=em.node_id${extra} WHERE em.session_id=? AND em.node_id>=? AND (em.node_id>? OR ${alias}.id>?) ORDER BY em.node_id,${alias}.id LIMIT ?`;args.push(id,parent,parent,last);}
    else{sql=`SELECT ${fields} FROM ${table} ${alias}${extra} WHERE ${alias}.id>? ORDER BY ${alias}.id LIMIT ?`;args.push(cursor);}
  }else if(part==='locations'){
    sql=scoped?'SELECT l.* FROM export_members em CROSS JOIN item_locations l ON l.node_id=em.node_id WHERE em.session_id=? AND em.node_id>? ORDER BY em.node_id LIMIT ?':'SELECT l.* FROM item_locations l WHERE l.node_id>? ORDER BY l.node_id LIMIT ?';if(scoped)args.push(id);args.push(cursor);
  }else{
    const table=part==='projects'?'projects':'folders',key=part==='projects'?'project_id':'folder_id';
    if(!scoped){sql=`SELECT c.* FROM ${table} c WHERE c.id>? ORDER BY c.id LIMIT ?`;args.push(cursor);}
    else{const project=s.scope.startsWith('project:')?s.scope.slice(8):null;const own=project?` UNION SELECT id FROM ${table} WHERE ${part==='projects'?'id':'project_id'}=?`:'';
      sql=`SELECT c.* FROM ${table} c WHERE c.id IN (SELECT l.${key} FROM export_members em CROSS JOIN item_locations l ON l.node_id=em.node_id WHERE em.session_id=?${own}) AND c.id>? ORDER BY c.id LIMIT ?`;args.push(id,...(project?[project]:[]),cursor);}
  }
  const {results}=await repo.db.prepare(sql).bind(...args,limit+1).all<Record<string,unknown>>();
  const items=results.slice(0,limit).map(r=>part==='nodes'?{...r,details:r.details?JSON.parse(String(r.details)):undefined}:r);
  const last=results[limit-1];const nextCursor=results.length>limit?(compound?JSON.stringify([last[part==='edges'?'parent':'node_id'],last.id]):String(last[part==='locations'?'node_id':'id'])):null;
  return {items,nextCursor,revision:s.revision};
}
