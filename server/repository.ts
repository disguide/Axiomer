import type { Database, Prepared } from './database';
import type { Statement, Summary, NodeDraft, Relation, Neighborhood, Proposal, Overview } from '../client/src/atlas/model';
import { exampleNodes, exampleConnections } from '../client/src/atlas/example';
export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
const relations:Relation[]=['supports','challenges','context','source'];
const columns = 'id,title,body,kind,topic,url,publisher,locator,version,created_at,updated_at';
const summary = `n.*, (SELECT count(*) FROM edges e WHERE e.parent=n.id AND e.relation!='source') connections, (SELECT count(*) FROM edges e WHERE e.parent=n.id AND e.relation='source') sources`;
export function validRelation(value:unknown):Relation { if(!relations.includes(value as Relation))throw new ApiError(400,'Choose supports, challenges, context, or source.');return value as Relation; }
export function textField(value:unknown,name:string,max:number,required=false):string { if(value===undefined&&!required)return '';if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new ApiError(400,`${name} must be ${required?'non-empty text':'text'} up to ${max} characters.`);return value.trim(); }
export function validateDraft(input:unknown):Required<NodeDraft> {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiError(400,'An argument object is required.');
  const d=input as Record<string,unknown>;const kind=d.kind??'claim';if(!['claim','question','source'].includes(String(kind)))throw new ApiError(400,'Unknown argument kind.');
  const url=textField(d.url,'Source URL',2000);if(url){try{if(!['https:','http:'].includes(new URL(url).protocol))throw new Error();}catch{throw new ApiError(400,'Sources need a valid http or https URL.');}}
  if(kind==='source'&&!url)throw new ApiError(400,'Add a URL for this source.');
  return {title:textField(d.title,'Title',500,true),body:textField(d.body,'Explanation',12000),kind:kind as Statement['kind'],topic:textField(d.topic??'General','Topic',100,true),url,publisher:textField(d.publisher,'Publisher',200),locator:textField(d.locator,'Passage or page',500)};
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
    if(await this.db.prepare("SELECT value FROM metadata WHERE key='example-v2'").first())return;
    await this.db.batch([...exampleNodes.map(n=>this.insert(n,true)),...exampleConnections.map(e=>this.db.prepare('INSERT OR IGNORE INTO edges (id,parent,child,relation) VALUES (?,?,?,?)').bind(e.id,e.parent,e.child,e.relation)),this.db.prepare("INSERT OR IGNORE INTO metadata (key,value) VALUES ('example-v2','1')")]);
  }
  insert(n:Statement,ignore=false):Prepared{return this.db.prepare(`INSERT ${ignore?'OR IGNORE ':''}INTO nodes (${columns}) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(...columns.split(',').map(k=>n[k as keyof Statement]));}
  async node(id:string):Promise<Summary>{const n=await this.db.prepare(`SELECT ${summary} FROM nodes n WHERE n.id=?`).bind(id).first<Summary>();if(!n)throw new ApiError(404,'This argument could not be found.');return n;}
  async search(params:URLSearchParams){
    const {limit,cursor}=pagination(params);const q=textField(params.get('q')??'','Search',200);const topic=params.get('topic');const kind=params.get('kind');
    const predicates:string[]=[];const args:unknown[]=[];
    if(q){const words=q.match(/[\p{L}\p{N}]+/gu)?.slice(0,12)??[];if(!words.length)return {items:[],nextCursor:null};if(cursor&&!/^fts:\d+$/.test(cursor))throw new ApiError(400,'Invalid search cursor.');predicates.push('nodes_fts MATCH ?','nodes_fts.rowid > ?');args.push(words.map(w=>`"${w}"*`).join(' AND '),cursor?Number(cursor.slice(4)):0);}
    else{predicates.push('n.id > ?');args.push(cursor);}
    if(topic){predicates.push('n.topic=?');args.push(topic);}if(kind){predicates.push('n.kind=?');args.push(kind);}
    const {results}=await this.db.prepare(`SELECT ${summary}, n.rowid cursorRow FROM ${q?'nodes_fts JOIN nodes n ON n.rowid=nodes_fts.rowid':'nodes n'} WHERE ${predicates.join(' AND ')} ORDER BY ${q?'nodes_fts.rowid':'n.id'} LIMIT ?`).bind(...args,limit+1).all<Summary & {cursorRow:number}>();
    return {items:results.slice(0,limit).map(({cursorRow:_,...n})=>n),nextCursor:results.length>limit?(q?`fts:${results[limit-1].cursorRow}`:results[limit-1].id):null};
  }
  async neighborhood(id:string,params:URLSearchParams):Promise<Neighborhood>{
    const {limit,cursor}=pagination(params);const node=await this.node(id);const relation=params.get('relation');if(relation)validRelation(relation);const incoming=params.get('direction')==='parents';const parentLimit=incoming?limit:20;
    const {results}=incoming?{results:[]}:await this.db.prepare(`SELECT ${summary},e.relation,e.id edgeId FROM edges e JOIN nodes n ON n.id=e.child WHERE e.parent=? AND e.id>? ${relation?'AND e.relation=?':''} ORDER BY e.id LIMIT ?`).bind(...[id,cursor,...(relation?[relation]:[]),limit+1]).all<Neighborhood['children'][number]>();
    const {results:parents}=await this.db.prepare(`SELECT ${summary},e.relation,e.id edgeId FROM edges e JOIN nodes n ON n.id=e.parent WHERE e.child=? AND e.id>? ORDER BY e.id LIMIT ?`).bind(id,incoming?cursor:'',parentLimit+1).all<Neighborhood['parents'][number]>();
    const {results:counts}=await this.db.prepare('SELECT relation,count(*) count FROM edges WHERE parent=? GROUP BY relation').bind(id).all<{relation:Relation;count:number}>();
    return {node,children:results.slice(0,limit),parents:parents.slice(0,parentLimit),parentsNextCursor:parents.length>parentLimit?parents[parentLimit-1].edgeId:null,counts:Object.fromEntries(relations.map(r=>[r,counts.find(c=>c.relation===r)?.count??0])) as Record<Relation,number>,nextCursor:results.length>limit?results[limit-1].edgeId:null};
  }
  async overview():Promise<Overview>{
    const {results:totals}=await this.db.prepare('SELECT key,value FROM counters').all<{key:string;value:number}>();
    const {results:topics}=await this.db.prepare('SELECT topic,count FROM topic_counts WHERE count>0 ORDER BY count DESC LIMIT 100').all<{topic:string;count:number}>();const values=Object.fromEntries(totals.map(c=>[c.key,c.value]));return {nodes:values.nodes??0,sources:values.sources??0,connections:values.connections??0,proposals:values.proposals??0,topics};
  }
  makeNode(d:Required<NodeDraft>):Statement{const time=new Date().toISOString();return {...d,id:crypto.randomUUID(),version:1,created_at:time,updated_at:time};}
  async create(input:unknown,parent?:string,relation?:unknown){const d=validateDraft(input);const n=this.makeNode(d);const statements=[this.insert(n)];if(parent){await this.node(parent);const r=validRelation(relation);if((r==='source')!==(n.kind==='source'))throw new ApiError(400,'Sources must use the source relationship.');statements.push(this.db.prepare('INSERT INTO edges (id,parent,child,relation) VALUES (?,?,?,?)').bind(crypto.randomUUID(),parent,n.id,r),this.db.prepare('UPDATE nodes SET version=version+1,updated_at=? WHERE id=?').bind(n.updated_at,parent));}await this.db.batch(statements);return this.node(n.id);}
  async edit(id:string,input:unknown,version:number){const d=validateDraft(input);const old=await this.node(id);if(old.version!==version)throw new ApiError(409,'This argument changed. Reload it before saving your edit.');if(old.kind!==d.kind)throw new ApiError(400,'The kind of an existing node cannot be changed.');
    const now=new Date().toISOString();const result=await this.db.batch([
      this.db.prepare('INSERT INTO revisions (id,node_id,version,snapshot,created_at) SELECT ?,id,version,?,? FROM nodes WHERE id=? AND version=?').bind(crypto.randomUUID(),JSON.stringify(old),now,id,version),
      this.db.prepare('UPDATE nodes SET title=?,body=?,topic=?,url=?,publisher=?,locator=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(d.title,d.body,d.topic,d.url,d.publisher,d.locator,now,id,version),
    ]);if(!(result[1] as {meta:{changes:number}}).meta.changes)throw new ApiError(409,'This argument changed. Reload and try again.');return this.node(id);
  }
  async connect(parent:string,child:string,relation:unknown){if(parent===child)throw new ApiError(400,'An argument cannot connect to itself.');const r=validRelation(relation);await this.node(parent);const c=await this.node(child);if((r==='source')!==(c.kind==='source'))throw new ApiError(400,'Sources must use the source relationship.');
    // Shared statements and even cycles are legitimate. The UI only expands one hop.
    const id=crypto.randomUUID();await this.db.batch([this.db.prepare('INSERT OR IGNORE INTO edges (id,parent,child,relation) VALUES (?,?,?,?)').bind(id,parent,child,r),this.db.prepare('UPDATE nodes SET version=version+1,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM edges WHERE id=?)').bind(new Date().toISOString(),parent,id)]);return {parent,child,relation:r};
  }
  async unlink(id:string){const edge=await this.db.prepare('SELECT parent FROM edges WHERE id=?').bind(id).first<{parent:string}>();if(!edge)throw new ApiError(404,'Connection not found.');await this.db.batch([this.db.prepare('DELETE FROM edges WHERE id=?').bind(id),this.db.prepare('UPDATE nodes SET version=version+1 WHERE id=?').bind(edge.parent)]);return {removed:id};}
  async propose(input:Record<string,unknown>){const parent=textField(input.parent,'Parent ID',200,true);const n=await this.node(parent);const relation=validRelation(input.relation);const draft=validateDraft(input.draft);if((relation==='source')!==(draft.kind==='source'))throw new ApiError(400,'Sources must use the source relationship.');const version=input.baseVersion;if(version!==n.version)throw new ApiError(409,'The parent changed. Read it again before proposing.');const id=crypto.randomUUID();await this.db.prepare('INSERT INTO proposals (id,parent,base_version,relation,draft,rationale,status,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,parent,version,relation,JSON.stringify(draft),textField(input.rationale,'Rationale',4000,true),'pending',new Date().toISOString()).run();return {id,status:'pending'};}
  async listProposals(params:URLSearchParams){const {limit,cursor}=pagination(params);const {results}=await this.db.prepare("SELECT * FROM proposals WHERE status='pending' AND id>? ORDER BY id LIMIT ?").bind(cursor,limit+1).all<Proposal & {draft:string}>();return {items:results.slice(0,limit).map(p=>({...p,draft:JSON.parse(p.draft)})),nextCursor:results.length>limit?results[limit-1].id:null};}
  async review(id:string,accept:boolean){const p=await this.db.prepare("SELECT * FROM proposals WHERE id=? AND status='pending'").bind(id).first<Proposal & {draft:string}>();if(!p)throw new ApiError(404,'Pending proposal not found.');if(!accept){await this.db.prepare("UPDATE proposals SET status='rejected' WHERE id=? AND status='pending'").bind(id).run();return {status:'rejected'};}
    const old=await this.node(p.parent);if(old.version!==p.base_version)throw new ApiError(409,'This argument changed since the proposal. Reject it and request a fresh proposal.');const n=this.makeNode(validateDraft(JSON.parse(p.draft)));
    // A conditional batch is atomic. The proposal status locks acceptance to one application.
    const condition="EXISTS(SELECT 1 FROM proposals p JOIN nodes n ON n.id=p.parent WHERE p.id=? AND p.status='pending' AND n.version=p.base_version)";
    const result=await this.db.batch([
      this.db.prepare(`INSERT INTO nodes (${columns}) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE ${condition}`).bind(...columns.split(',').map(k=>n[k as keyof Statement]),id),
      this.db.prepare(`INSERT INTO edges (id,parent,child,relation) SELECT ?,?,?,? WHERE ${condition}`).bind(crypto.randomUUID(),p.parent,n.id,p.relation,id),
      this.db.prepare(`UPDATE proposals SET status='accepted' WHERE id=? AND ${condition}`).bind(id,id),
      this.db.prepare('UPDATE nodes SET version=version+1 WHERE id=? AND EXISTS (SELECT 1 FROM nodes WHERE id=?)').bind(p.parent,n.id),
    ]);if(!(result[0] as {meta:{changes:number}}).meta.changes)throw new ApiError(409,'The proposal or argument changed. Reload before reviewing.');return {status:'accepted',nodeId:n.id};
  }
  async history(id:string){return (await this.db.prepare('SELECT version,snapshot,created_at FROM revisions WHERE node_id=? ORDER BY version DESC LIMIT 30').bind(id).all()).results;}
}
