import type { Database, Prepared } from './database';
import type { Statement, Summary, NodeDraft, Relation, Neighborhood, Proposal, Overview, Project, Folder, Destination, NodeDetails } from '../client/src/atlas/model';
import { exampleNodes, exampleConnections } from '../client/src/atlas/example';
export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
const relations:Relation[]=['supports','challenges','context','source'];
const columns = 'id,title,body,kind,topic,url,publisher,locator,version,created_at,updated_at';
const summary = `n.*, (SELECT json_object('labels',json(d.labels),'labelsOrigin',d.labels_origin,'abstract',d.abstract,'provenance',json(d.provenance),'listed',d.listed) FROM node_details d WHERE d.node_id=n.id) detail_json, (SELECT project_id FROM item_locations l WHERE l.node_id=n.id) project_id, (SELECT folder_id FROM item_locations l WHERE l.node_id=n.id) folder_id, (SELECT count(*) FROM edges e WHERE e.parent=n.id AND e.relation!='source') connections, (SELECT count(*) FROM edges e WHERE e.parent=n.id AND e.relation='source') sources`;
export function decorated<T>(row:T):T { const {detail_json,...rest}=row as T & {detail_json?:string};return {...rest,...(detail_json?JSON.parse(detail_json):{labels:[],labelsOrigin:'manual',abstract:'',provenance:{}})} as T; }
export function labelsValue(input:unknown):string[]{if(!Array.isArray(input)||input.length>20||input.some(v=>typeof v!=='string'||!v.trim()||v.length>60))throw new ApiError(400,'Use up to 20 labels, each under 60 characters.');return [...new Set((input as string[]).map(v=>v.trim()))];}
export function validRelation(value:unknown):Relation { if(!relations.includes(value as Relation))throw new ApiError(400,'Choose supports, challenges, context, or source.');return value as Relation; }
export function textField(value:unknown,name:string,max:number,required=false):string { if(value===undefined&&!required)return '';if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new ApiError(400,`${name} must be ${required?'non-empty text':'text'} up to ${max} characters.`);return value.trim(); }
export function validateDraft(input:unknown):Required<NodeDraft> {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiError(400,'An argument object is required.');
  const d=input as Record<string,unknown>;const kind=d.kind??'claim';if(!['claim','question','source'].includes(String(kind)))throw new ApiError(400,'Unknown argument kind.');
  const url=textField(d.url,'Source URL',2000);if(url){try{if(!['https:','http:'].includes(new URL(url).protocol))throw new Error();}catch{throw new ApiError(400,'Sources need a valid http or https URL.');}}
  if(kind==='source'&&!url)throw new ApiError(400,'Add a URL for this source.');
  return {title:textField(d.title,'Title',500,true),body:typeof d.body==='string'&&d.body.length<=500000?d.body:textField(d.body,'Explanation',500000),kind:kind as Statement['kind'],topic:textField(d.topic??'General','Topic',100,true),url,publisher:textField(d.publisher,'Publisher',200),locator:textField(d.locator,'Passage or page',500)};
}
export function pagination(params:URLSearchParams){const raw=params.get('limit')??'30';const limit=Number(raw);if(!Number.isInteger(limit)||limit<1||limit>100)throw new ApiError(400,'Limit must be between 1 and 100.');const cursor=params.get('cursor')??'';if(cursor.length>200)throw new ApiError(400,'Invalid cursor.');return {limit,cursor};}
export class Repository {
  constructor(readonly db:Database){}
  async seed(){
    if(!await this.db.prepare("SELECT value FROM metadata WHERE key='counters-v1'").first()){
      await this.db.batch([
        this.db.prepare("INSERT OR REPLACE INTO counters (key,value) SELECT 'nodes',count(*) FROM nodes"),
        this.db.prepare("INSERT OR REPLACE INTO counters (key,value) SELECT 'sources',count(*) FROM nodes WHERE kind='source'"),
        this.db.prepare("INSERT OR REPLACE INTO counters (key,value) SELECT 'connections',count(*) FROM edges"),
        this.db.prepare("INSERT OR REPLACE INTO counters (key,value) SELECT 'proposals',count(*) FROM proposals WHERE status='pending'"),
        this.db.prepare('INSERT OR REPLACE INTO topic_counts (topic,count) SELECT topic,count(*) FROM nodes GROUP BY topic'),
        this.db.prepare("INSERT OR IGNORE INTO metadata (key,value) VALUES ('counters-v1','1')"),
      ]);
    }
    if(!await this.db.prepare("SELECT value FROM metadata WHERE key='example-v2'").first())
      await this.db.batch([...exampleNodes.map(n=>this.insert(n,true)),...exampleConnections.map(e=>this.db.prepare('INSERT OR IGNORE INTO edges (id,parent,child,relation) VALUES (?,?,?,?)').bind(e.id,e.parent,e.child,e.relation)),this.db.prepare("INSERT OR IGNORE INTO metadata (key,value) VALUES ('example-v2','1')")]);
    if(!await this.db.prepare("SELECT value FROM metadata WHERE key='example-folders-v1'").first()){
      const now=new Date().toISOString();
      await this.db.batch([
        this.db.prepare('INSERT OR IGNORE INTO projects (id,name,description,created_at,updated_at) VALUES (?,?,?,?,?)').bind('example-project','Better public transport','An example project. Open a question to follow its reasons and sources.',now,now),
        this.db.prepare('INSERT OR IGNORE INTO folders (id,project_id,name,created_at,updated_at) VALUES (?,?,?,?,?)').bind('example-sources','example-project','Research & sources',now,now),
        ...exampleNodes.map(n=>this.db.prepare('INSERT OR IGNORE INTO item_locations (node_id,project_id,folder_id) SELECT id,?,? FROM nodes WHERE id=?').bind('example-project',n.kind==='source'?'example-sources':null,n.id)),
        this.db.prepare("INSERT OR IGNORE INTO metadata (key,value) VALUES ('example-folders-v1','1')"),
      ]);
    }
  }
  insert(n:Statement,ignore=false):Prepared{return this.db.prepare(`INSERT ${ignore?'OR IGNORE ':''}INTO nodes (${columns}) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(...columns.split(',').map(k=>n[k as keyof Statement]));}
  async node(id:string):Promise<Summary>{const n=await this.db.prepare(`SELECT ${summary} FROM nodes n WHERE n.id=?`).bind(id).first<Summary>();if(!n)throw new ApiError(404,'This argument could not be found.');return decorated(n);}
  async search(params:URLSearchParams){
    const {limit,cursor}=pagination(params);const q=textField(params.get('q')??'','Search',200);const topic=params.get('topic');const kind=params.get('kind');
    const project=params.get('project');const folder=params.get('folder');
    const predicates:string[]=[];const args:unknown[]=[];
    if(q){const words=q.match(/[\p{L}\p{N}]+/gu)?.slice(0,12)??[];if(!words.length)return {items:[],nextCursor:null};if(cursor&&!/^fts:\d+$/.test(cursor))throw new ApiError(400,'Invalid search cursor.');predicates.push('nodes_fts MATCH ?','nodes_fts.rowid > ?');args.push(words.map(w=>`"${w}"*`).join(' AND '),cursor?Number(cursor.slice(4)):0);}
    else{predicates.push(project?'l.node_id > ?':'n.id > ?');args.push(cursor);}
    if(topic){predicates.push('n.topic=?');args.push(topic);}if(kind){if(kind==='argument')predicates.push("n.kind!='source'");else if(kind==='source')predicates.push("(n.kind='source' OR n.url!='')");else{predicates.push('n.kind=?');args.push(kind);}}
    if(params.get('label')){predicates.push('EXISTS(SELECT 1 FROM node_labels nl WHERE nl.node_id=n.id AND nl.label=?)');args.push(textField(params.get('label'),'Label',60,true));}
    if(params.get('roots')==='true'&&!q)predicates.push("COALESCE((SELECT listed FROM node_details d WHERE d.node_id=n.id),CASE WHEN n.kind='source' OR NOT EXISTS(SELECT 1 FROM edges e WHERE e.child=n.id) THEN 1 ELSE 0 END)=1");
    if(folder&&!project)throw new ApiError(400,'Choose a project for the folder.');
    if(project){predicates.push('l.project_id=?');args.push(project);if(folder==='root')predicates.push('l.folder_id IS NULL');else if(folder){predicates.push('l.folder_id=?');args.push(folder);}}
    if(params.get('inbox')==='true')predicates.push('NOT EXISTS(SELECT 1 FROM item_locations il WHERE il.node_id=n.id)');
    // Order by the membership index itself so large folders do not require a temporary sort.
    const from=q?`nodes_fts JOIN nodes n ON n.rowid=nodes_fts.rowid${project?' JOIN item_locations l ON l.node_id=n.id':''}`:project?`item_locations l INDEXED BY ${folder?'locations_project_folder_node':'locations_project_node'} JOIN nodes n ON n.id=l.node_id`:'nodes n';
    const {results}=await this.db.prepare(`SELECT ${summary}, n.rowid cursorRow FROM ${from} WHERE ${predicates.join(' AND ')} ORDER BY ${q?'nodes_fts.rowid':project?'l.node_id':'n.id'} LIMIT ?`).bind(...args,limit+1).all<Summary & {cursorRow:number}>();
    return {items:results.slice(0,limit).map(({cursorRow:_,...n})=>decorated(n)),nextCursor:results.length>limit?(q?`fts:${results[limit-1].cursorRow}`:results[limit-1].id):null};
  }
  async neighborhood(id:string,params:URLSearchParams):Promise<Neighborhood>{
    const {limit,cursor}=pagination(params);const selected=params.get('compact')==='true'?summary.replace('n.*,',`n.id,n.title,substr(n.body,1,240) body,n.kind,n.topic,n.url,n.publisher,n.locator,n.version,n.created_at,n.updated_at,`):summary;const node=await this.node(id);const relation=params.get('relation');if(relation)validRelation(relation);const incoming=params.get('direction')==='parents';const parentLimit=incoming?limit:20;
    const {results}=incoming?{results:[]}:await this.db.prepare(`SELECT ${selected},e.relation,e.id edgeId,COALESCE(ed.origin,'manual') origin,COALESCE(ed.rationale,'') rationale FROM edges e JOIN nodes n ON n.id=e.child LEFT JOIN edge_details ed ON ed.edge_id=e.id WHERE e.parent=? AND e.id>? ${relation?'AND e.relation=?':''} ORDER BY e.id LIMIT ?`).bind(...[id,cursor,...(relation?[relation]:[]),limit+1]).all<Neighborhood['children'][number]>();
    const {results:parents}=await this.db.prepare(`SELECT ${selected},e.relation,e.id edgeId FROM edges e JOIN nodes n ON n.id=e.parent WHERE e.child=? AND e.id>? ORDER BY e.id LIMIT ?`).bind(id,incoming?cursor:'',parentLimit+1).all<Neighborhood['parents'][number]>();
    const {results:counts}=await this.db.prepare('SELECT relation,count(*) count FROM edges WHERE parent=? GROUP BY relation').bind(id).all<{relation:Relation;count:number}>();
    return {node,children:results.slice(0,limit).map(decorated),parents:parents.slice(0,parentLimit).map(decorated),parentsNextCursor:parents.length>parentLimit?parents[parentLimit-1].edgeId:null,counts:Object.fromEntries(relations.map(r=>[r,counts.find(c=>c.relation===r)?.count??0])) as Record<Relation,number>,nextCursor:results.length>limit?results[limit-1].edgeId:null};
  }
  async overview():Promise<Overview>{
    const {results:totals}=await this.db.prepare('SELECT key,value FROM counters').all<{key:string;value:number}>();
    const {results:topics}=await this.db.prepare('SELECT topic,count FROM topic_counts WHERE count>0 ORDER BY count DESC LIMIT 100').all<{topic:string;count:number}>();const values=Object.fromEntries(totals.map(c=>[c.key,c.value]));return {nodes:values.nodes??0,sources:values.sources??0,connections:values.connections??0,proposals:values.proposals??0,topics};
  }
  makeNode(d:Required<NodeDraft>):Statement{const time=new Date().toISOString();return {...d,id:crypto.randomUUID(),version:1,created_at:time,updated_at:time};}
  async create(input:unknown,parent?:string,relation?:unknown,destination?:unknown){
    const d=validateDraft(input);const n=this.makeNode(d);const initialLabels=(input as Record<string,unknown>).labels===undefined?[]:labelsValue((input as Record<string,unknown>).labels);const statements=[this.insert(n),this.db.prepare('INSERT INTO node_details (node_id,listed,location_locked,labels,labels_origin) VALUES (?,?,?,?,?)').bind(n.id,parent?0:1,destination&&(destination as {projectId?:string}).projectId?1:0,JSON.stringify(initialLabels),(input as Record<string,unknown>).labels===undefined?'unset':'manual')];
    if(parent){await this.node(parent);const r=validRelation(relation);if((r==='source')!==(n.kind==='source'))throw new ApiError(400,'Sources must use the source relationship.');statements.push(this.db.prepare('INSERT INTO edges (id,parent,child,relation) VALUES (?,?,?,?)').bind(crypto.randomUUID(),parent,n.id,r),this.db.prepare('UPDATE nodes SET version=version+1,updated_at=? WHERE id=?').bind(n.updated_at,parent));}
    if(destination!==undefined){const place=await this.validateDestination(destination);if(place.projectId)statements.push(this.placeStatement(n.id,place));}
    else if(parent)statements.push(this.db.prepare('INSERT INTO item_locations (node_id,project_id,folder_id) SELECT ?,project_id,folder_id FROM item_locations WHERE node_id=?').bind(n.id,parent));
    await this.db.batch(statements);return this.node(n.id);
  }
  async edit(id:string,input:unknown,version:number){const d=validateDraft(input);const old=await this.node(id);if(old.version!==version)throw new ApiError(409,'This argument changed. Reload it before saving your edit.');if(old.kind!==d.kind)throw new ApiError(400,'The kind of an existing node cannot be changed.');
    const now=new Date().toISOString();const revisionId=crypto.randomUUID();const supplied=(input as Record<string,unknown>).labels;const nextLabels=supplied===undefined?null:labelsValue(supplied);const result=await this.db.batch([
      this.db.prepare('INSERT INTO revisions (id,node_id,version,snapshot,created_at) SELECT ?,id,version,?,? FROM nodes WHERE id=? AND version=?').bind(revisionId,JSON.stringify(old),now,id,version),
      this.db.prepare('UPDATE nodes SET title=?,body=?,topic=?,url=?,publisher=?,locator=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(d.title,d.body,d.topic,d.url,d.publisher,d.locator,now,id,version),
      ...(nextLabels===null?[]:[this.db.prepare("INSERT INTO node_details(node_id,labels,labels_origin) SELECT ?,?,'manual' WHERE EXISTS(SELECT 1 FROM revisions WHERE id=?) ON CONFLICT(node_id) DO UPDATE SET labels=excluded.labels,labels_origin='manual'").bind(id,JSON.stringify(nextLabels),revisionId)]),
    ]);if(!(result[1] as {meta:{changes:number}}).meta.changes)throw new ApiError(409,'This argument changed. Reload and try again.');return this.node(id);
  }
  async connect(parent:string,child:string,relation:unknown){if(parent===child)throw new ApiError(400,'An argument cannot connect to itself.');const r=validRelation(relation);await this.node(parent);const c=await this.node(child);if((r==='source')!==(c.kind==='source'))throw new ApiError(400,'Sources must use the source relationship.');
    // Shared statements and even cycles are legitimate. The UI only expands one hop.
    const id=crypto.randomUUID();await this.db.batch([this.db.prepare('INSERT OR IGNORE INTO edges (id,parent,child,relation) VALUES (?,?,?,?)').bind(id,parent,child,r),this.db.prepare('UPDATE nodes SET version=version+1,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM edges WHERE id=?)').bind(new Date().toISOString(),parent,id)]);return {parent,child,relation:r};
  }
  async unlink(id:string){const edge=await this.db.prepare('SELECT parent FROM edges WHERE id=?').bind(id).first<{parent:string}>();if(!edge)throw new ApiError(404,'Connection not found.');await this.db.batch([this.db.prepare('DELETE FROM edge_details WHERE edge_id=?').bind(id),this.db.prepare('DELETE FROM edges WHERE id=?').bind(id),this.db.prepare('UPDATE nodes SET version=version+1 WHERE id=?').bind(edge.parent)]);return {removed:id};}
  async propose(input:Record<string,unknown>){const parent=textField(input.parent,'Parent ID',200,true);const n=await this.node(parent);const relation=validRelation(input.relation);const draft=validateDraft(input.draft);if((relation==='source')!==(draft.kind==='source'))throw new ApiError(400,'Sources must use the source relationship.');const version=input.baseVersion;if(version!==n.version)throw new ApiError(409,'The parent changed. Read it again before proposing.');const id=crypto.randomUUID();await this.db.prepare('INSERT INTO proposals (id,parent,base_version,relation,draft,rationale,status,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,parent,version,relation,JSON.stringify(draft),textField(input.rationale,'Rationale',4000,true),'pending',new Date().toISOString()).run();return {id,status:'pending'};}
  async listProposals(params:URLSearchParams){const {limit,cursor}=pagination(params);const {results}=await this.db.prepare("SELECT * FROM proposals WHERE status='pending' AND id>? ORDER BY id LIMIT ?").bind(cursor,limit+1).all<Proposal & {draft:string}>();return {items:results.slice(0,limit).map(p=>({...p,draft:JSON.parse(p.draft)})),nextCursor:results.length>limit?results[limit-1].id:null};}
  async review(id:string,accept:boolean){const p=await this.db.prepare("SELECT * FROM proposals WHERE id=? AND status='pending'").bind(id).first<Proposal & {draft:string}>();if(!p)throw new ApiError(404,'Pending proposal not found.');if(!accept){await this.db.prepare("UPDATE proposals SET status='rejected' WHERE id=? AND status='pending'").bind(id).run();return {status:'rejected'};}
    const old=await this.node(p.parent);if(old.version!==p.base_version)throw new ApiError(409,'This argument changed since the proposal. Reject it and request a fresh proposal.');const n=this.makeNode(validateDraft(JSON.parse(p.draft)));
    // A conditional batch is atomic. The proposal status locks acceptance to one application.
    const condition="EXISTS(SELECT 1 FROM proposals p JOIN nodes n ON n.id=p.parent WHERE p.id=? AND p.status='pending' AND n.version=p.base_version)";
    const result=await this.db.batch([
      this.db.prepare(`INSERT INTO nodes (${columns}) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE ${condition}`).bind(...columns.split(',').map(k=>n[k as keyof Statement]),id),
      this.db.prepare("INSERT INTO node_details(node_id,listed,location_locked,labels_origin) SELECT id,0,1,'unset' FROM nodes WHERE id=?").bind(n.id),
      this.db.prepare('INSERT INTO item_locations (node_id,project_id,folder_id) SELECT ?,project_id,folder_id FROM item_locations WHERE node_id=? AND EXISTS(SELECT 1 FROM nodes WHERE id=?)').bind(n.id,p.parent,n.id),
      this.db.prepare(`INSERT INTO edges (id,parent,child,relation) SELECT ?,?,?,? WHERE ${condition}`).bind(crypto.randomUUID(),p.parent,n.id,p.relation,id),
      this.db.prepare(`UPDATE proposals SET status='accepted' WHERE id=? AND ${condition}`).bind(id,id),
      this.db.prepare('UPDATE nodes SET version=version+1 WHERE id=? AND EXISTS (SELECT 1 FROM nodes WHERE id=?)').bind(p.parent,n.id),
    ]);if(!(result[0] as {meta:{changes:number}}).meta.changes)throw new ApiError(409,'The proposal or argument changed. Reload before reviewing.');return {status:'accepted',nodeId:n.id};
  }
  async history(id:string){return (await this.db.prepare('SELECT version,snapshot,created_at FROM revisions WHERE node_id=? ORDER BY version DESC LIMIT 30').bind(id).all()).results;}

  async project(id:string):Promise<Project>{
    const p=await this.db.prepare('SELECT p.*,(SELECT count(*) FROM item_locations l WHERE l.project_id=p.id) items,(SELECT count(*) FROM folders f WHERE f.project_id=p.id) folders FROM projects p WHERE p.id=?').bind(id).first<Project>();
    if(!p)throw new ApiError(404,'Project not found.');return p;
  }
  async listProjects(params:URLSearchParams){
    const {limit,cursor}=pagination(params);const {results}=await this.db.prepare('SELECT p.*,(SELECT count(*) FROM item_locations l WHERE l.project_id=p.id) items,(SELECT count(*) FROM folders f WHERE f.project_id=p.id) folders FROM projects p WHERE p.id>? ORDER BY p.id LIMIT ?').bind(cursor,limit+1).all<Project>();
    return {items:results.slice(0,limit),nextCursor:results.length>limit?results[limit-1].id:null};
  }
  async listFolders(project:string,params:URLSearchParams){
    await this.project(project);const {limit,cursor}=pagination(params);
    const {results}=await this.db.prepare('SELECT f.*,(SELECT count(*) FROM item_locations l WHERE l.project_id=f.project_id AND l.folder_id=f.id) items FROM folders f WHERE f.project_id=? AND f.id>? ORDER BY f.id LIMIT ?').bind(project,cursor,limit+1).all<Folder>();
    return {items:results.slice(0,limit),nextCursor:results.length>limit?results[limit-1].id:null};
  }
  async folder(id:string):Promise<Folder>{
    const f=await this.db.prepare('SELECT f.*,(SELECT count(*) FROM item_locations l WHERE l.project_id=f.project_id AND l.folder_id=f.id) items FROM folders f WHERE f.id=?').bind(id).first<Folder>();
    if(!f)throw new ApiError(404,'Folder not found.');return f;
  }
  async createContainer(type:'project'|'folder',input:Record<string,unknown>){
    const name=textField(input.name,'Name',100,true);const id=crypto.randomUUID();const now=new Date().toISOString();
    if(type==='project'){
      await this.db.prepare('INSERT INTO projects (id,name,description,created_at,updated_at) VALUES (?,?,?,?,?)').bind(id,name,textField(input.description,'Description',500),now,now).run();return this.project(id);
    }
    const project=textField(input.projectId,'Project',200,true);await this.project(project);
    await this.db.prepare('INSERT INTO folders (id,project_id,name,created_at,updated_at) VALUES (?,?,?,?,?)').bind(id,project,name,now,now).run();return {id,name,project_id:project,created_at:now,updated_at:now,items:0};
  }
  async renameContainer(type:'project'|'folder',id:string,input:Record<string,unknown>){
    const name=textField(input.name,'Name',100,true);const now=new Date().toISOString();
    const result=type==='project'?await this.db.prepare('UPDATE projects SET name=?,description=COALESCE(?,description),updated_at=? WHERE id=?').bind(name,input.description===undefined?null:textField(input.description,'Description',500),now,id).run():await this.db.prepare('UPDATE folders SET name=?,updated_at=? WHERE id=?').bind(name,now,id).run();
    if(!result.meta?.changes)throw new ApiError(404,'This location no longer exists.');return {id,name};
  }
  async removeContainer(type:'project'|'folder',id:string){
    // Unfile items; never delete their reasoning, citations or connections.
    if(type==='project'){await this.project(id);await this.db.batch([
      this.db.prepare('DELETE FROM item_locations WHERE project_id=?').bind(id),
      this.db.prepare('DELETE FROM folders WHERE project_id=?').bind(id),
      this.db.prepare('DELETE FROM projects WHERE id=?').bind(id),
    ]);}else{
      if(!await this.db.prepare('SELECT id FROM folders WHERE id=?').bind(id).first())throw new ApiError(404,'Folder not found.');
      await this.db.batch([this.db.prepare('UPDATE item_locations SET folder_id=NULL WHERE folder_id=?').bind(id),this.db.prepare('DELETE FROM folders WHERE id=?').bind(id)]);
    }return {removed:id};
  }
  async validateDestination(input:unknown):Promise<Destination>{
    if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiError(400,'Choose a save location.');
    const d=input as Record<string,unknown>;
    if(d.projectId===null){if(d.folderId)throw new ApiError(400,'A folder needs a project.');return {projectId:null,folderId:null};}
    const projectId=textField(d.projectId,'Project',200,true);const folderId=d.folderId==null?null:textField(d.folderId,'Folder',200,true);await this.project(projectId);
    if(folderId&&!await this.db.prepare('SELECT id FROM folders WHERE project_id=? AND id=?').bind(projectId,folderId).first())throw new ApiError(400,'Choose a folder in this project.');
    return {projectId,folderId};
  }
  placeStatement(nodeId:string,place:Destination){return this.db.prepare('INSERT INTO item_locations (node_id,project_id,folder_id) VALUES (?,?,?) ON CONFLICT(node_id) DO UPDATE SET project_id=excluded.project_id,folder_id=excluded.folder_id').bind(nodeId,place.projectId,place.folderId??null);}
  async moveItems(input:Record<string,unknown>){
    if(!Array.isArray(input.ids)||!input.ids.length||input.ids.length>100||input.ids.some(id=>typeof id!=='string'||id.length>200))throw new ApiError(400,'Choose 1 to 100 items to move.');
    const ids=[...new Set(input.ids as string[])];const place=await this.validateDestination(input.destination);
    const rows=await this.db.prepare(`SELECT id FROM nodes WHERE id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all();if(rows.results.length!==ids.length)throw new ApiError(404,'One of these items no longer exists.');
    await this.db.batch(ids.flatMap(id=>[place.projectId?this.placeStatement(id,place):this.db.prepare('DELETE FROM item_locations WHERE node_id=?').bind(id),this.db.prepare('INSERT INTO node_details(node_id,location_locked,listed) VALUES(?,1,1) ON CONFLICT(node_id) DO UPDATE SET location_locked=1,listed=1').bind(id)]));
    return {moved:ids.length,destination:place};
  }
  async details(id:string):Promise<NodeDetails>{
    return await this.db.prepare('SELECT * FROM node_details WHERE node_id=?').bind(id).first<NodeDetails>()??{node_id:id,labels:'[]',labels_origin:'manual',abstract:'',provenance:'{}',listed:1,location_locked:1,analyzed_version:0};
  }
  async revision(){return Number((await this.db.prepare("SELECT value FROM counters WHERE key='revision'").first<{value:number}>())?.value??0);}
}
