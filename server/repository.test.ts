import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Repository } from './repository';
import { localDatabase } from './local-database';
import { handleApi } from './api';
import { importMap } from './import';
import { exportNeighborhood } from '../client/src/atlas/export';
import { validateGraph } from '../client/src/lib/io';
function migrate(db:DatabaseSync){db.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(`drizzle/${f}`,'utf8'));}
let sqlite:DatabaseSync;let repo:Repository;
beforeEach(async()=>{sqlite=new DatabaseSync(':memory:');migrate(sqlite);repo=new Repository(localDatabase(sqlite));await repo.seed();});
afterEach(()=>sqlite.close());
const page=()=>new URLSearchParams();
describe('persistent argument repository',()=>{
  it('saves a question, reasons, multiple reusable sources and unlinks only the chosen edge',async()=>{
    const root=await repo.create({title:'Should this policy change?',kind:'question'});
    const reason=await repo.create({title:'It improves access.'},root.id,'supports');
    const source=await repo.create({title:'Study',kind:'source',url:'https://example.org/study',publisher:'Institute',locator:'p. 12',body:'An evidence excerpt'},reason.id,'source');
    await repo.connect(reason.id,'ipcc','source');await repo.connect(root.id,reason.id,'challenges');
    const g=await repo.neighborhood(root.id,page());expect(g.children.map(n=>n.relation).sort()).toEqual(['challenges','supports']);
    await repo.unlink(g.children.find(n=>n.relation==='challenges')!.edgeId);
    expect((await repo.neighborhood(root.id,page())).children).toHaveLength(1);
    expect((await repo.neighborhood(reason.id,page())).counts.source).toBe(2);
    expect(await repo.node(source.id)).toMatchObject({url:'https://example.org/study',publisher:'Institute',locator:'p. 12',body:'An evidence excerpt'});
  });
  it('does not change revisions for a duplicate link',async()=>{
    const v=(await repo.node('transport')).version;await repo.connect('transport','access','supports');
    expect((await repo.node('transport')).version).toBe(v);
  });
  it('keeps old content and rejects stale edits, including simultaneous saves',async()=>{
    const old=await repo.node('access');const results=await Promise.allSettled([repo.edit(old.id,{...old,title:'First edit'},old.version),repo.edit(old.id,{...old,title:'Second edit'},old.version)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect((await repo.history(old.id))).toHaveLength(1);
    expect(JSON.parse((await repo.history(old.id))[0].snapshot as string).title).toBe(old.title);
    await expect(repo.edit(old.id,{...old,title:'Stale'},old.version)).rejects.toMatchObject({status:409});
  });
  it('queues proposals without changing the graph and accepts exactly once',async()=>{
    const parent=await repo.node('transport');const before=await repo.overview();
    const p=await repo.propose({parent:parent.id,baseVersion:parent.version,relation:'supports',draft:{title:'A reviewable argument'},rationale:'Relevant because it tests the claim.'});
    expect((await repo.overview()).nodes).toBe(before.nodes);expect((await repo.overview()).proposals).toBe(1);
    const result=await Promise.allSettled([repo.review(p.id,true),repo.review(p.id,true)]);
    expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect((await repo.overview()).nodes).toBe(Number(before.nodes)+1);
    expect((await repo.overview()).proposals).toBe(0);
  });
  it('blocks a stale proposal without creating orphan nodes',async()=>{
    const parent=await repo.node('transport');const p=await repo.propose({parent:parent.id,baseVersion:parent.version,relation:'supports',draft:{title:'Stale proposal'},rationale:'Testing version conflicts'});
    await repo.create({title:'Another reason'},parent.id,'supports');const before=await repo.overview();
    await expect(repo.review(p.id,true)).rejects.toMatchObject({status:409});expect((await repo.overview()).nodes).toBe(before.nodes);
    await repo.review(p.id,false);expect((await repo.listProposals(page())).items).toHaveLength(0);
  });
  it('rolls back invalid creation and handles concurrent local writes atomically',async()=>{
    const before=await repo.overview();await expect(repo.create({title:'Invalid source',kind:'source',url:'javascript:alert(1)'},'transport','source')).rejects.toMatchObject({status:400});
    await expect(repo.create({title:'Orphan'},'missing','supports')).rejects.toMatchObject({status:404});expect((await repo.overview()).nodes).toBe(before.nodes);
    const results=await Promise.all([repo.create({title:'Concurrent A'},'transport','supports'),repo.create({title:'Concurrent B'},'transport','supports')]);expect(results).toHaveLength(2);
    await expect(repo.db.batch([repo.db.prepare("INSERT INTO nodes(id,title,created_at,updated_at) VALUES('rollback','Rollback','','')"),repo.db.prepare("INSERT INTO edges(id,parent,child,relation) VALUES('bad','rollback','missing','supports')")])).rejects.toThrow();
    await expect(repo.node('rollback')).rejects.toMatchObject({status:404});
  });
  it('full-text search reflects edits, escapes syntax and pages without duplicates',async()=>{
    for(let i=0;i<7;i++)await repo.create({title:`Common zebra argument ${i}`});
    const ids:string[]=[];let cursor:string|null='';do{const p=await repo.search(new URLSearchParams({q:'common zebra',limit:'2',cursor:cursor??''}));ids.push(...p.items.map(n=>n.id));cursor=p.nextCursor;}while(cursor);
    expect(ids).toHaveLength(7);expect(new Set(ids).size).toBe(7);
    const first=await repo.node(ids[0]);await repo.edit(first.id,{...first,title:'Changed elephant'},first.version);
    expect((await repo.search(new URLSearchParams({q:'common zebra'}))).items).toHaveLength(6);
    expect((await repo.search(new URLSearchParams({q:'" OR * --'}))).items).toEqual((await repo.search(new URLSearchParams({q:'OR'}))).items);
  });
  it('paginates outgoing and incoming links and terminates on a cycle',async()=>{
    for(let i=0;i<45;i++){const n=await repo.create({title:`Reason ${i}`},'transport','supports');await repo.connect(n.id,'ipcc','source');}
    await repo.connect('access','transport','context');const first=await repo.neighborhood('ipcc',page());expect(first.parents).toHaveLength(20);expect(first.parentsNextCursor).toBeTruthy();
    const ids=first.parents.map(p=>p.edgeId);let cursor=first.parentsNextCursor;
    while(cursor){const p=await repo.neighborhood('ipcc',new URLSearchParams({direction:'parents',cursor,limit:'20'}));ids.push(...p.parents.map(n=>n.edgeId));cursor=p.parentsNextCursor;expect(p.children).toEqual([]);}
    expect(ids).toHaveLength(46);expect(new Set(ids).size).toBe(46);
    expect((await repo.neighborhood('transport',new URLSearchParams({limit:'10'}))).children).toHaveLength(10);
  });
  it('maintains exact dashboard counters without scanning the corpus',async()=>{
    const before=await repo.overview();const n=await repo.create({title:'Topic test',topic:'New topic'});await repo.edit(n.id,{...n,topic:'Moved topic'},n.version);
    const overview=await repo.overview();expect(overview.nodes).toBe(Number(before.nodes)+1);
    expect(overview.topics).not.toContainEqual({topic:'New topic',count:0});expect(overview.topics).toContainEqual({topic:'Moved topic',count:1});
    const actual=sqlite.prepare("SELECT count(*) count FROM nodes").get();expect(overview.nodes).toBe(actual?.count);
  });
});
describe('import and compatibility',()=>{
  it('round-trips a neighborhood with a statement used in two roles',async()=>{
    await repo.connect('transport','access','challenges');const exported=exportNeighborhood(await repo.neighborhood('transport',page()));
    const result=await importMap(repo,exported);const imported=await repo.neighborhood(result.nodeId,page());
    const reused=imported.children.filter(n=>n.title==='Better transit connects more people to opportunity.');expect(reused).toHaveLength(2);expect(reused[0].id).toBe(reused[1].id);
    expect(imported.children.find(n=>n.kind==='source')?.url).toBe('https://www.itf-oecd.org/reversing-car-dependency');
  });
  it('preserves legacy direction, sources, and the exact raw backup',async()=>{
    const raw={extra:'preserve me',nodes:[{id:'q',type:'question',content:'Old question',position:{x:4,y:8}},{id:'r',type:'support',content:'A reason'},{id:'s',type:'source',content:'Citation',url:'https://example.org',verified:true}],edges:[{from:'r',to:'q',edgeType:'entails'},{from:'q',to:'s',edgeType:'cites'},{from:'s',to:'r',edgeType:'raises'}]};
    const result=await importMap(repo,raw);const imported=await repo.neighborhood(result.nodeId,page());expect(imported.node.title).toBe('Old question');expect(imported.children.find(n=>n.title==='A reason')?.relation).toBe('supports');
    const original=await repo.db.prepare('SELECT value FROM metadata WHERE key=?').bind(`import:${result.nodeId}`).first<{value:string}>();expect(JSON.parse(original!.value)).toEqual(raw);
  });
  it('rejects a broken import without partially saving it',async()=>{
    const before=await repo.overview();await expect(importMap(repo,{nodes:[{id:'a',title:'test'}],edges:[{parent:'a',child:'missing',relation:'supports'}]})).rejects.toThrow();expect(await repo.overview()).toEqual(before);
  });
  it('keeps legacy source metadata through the older export validator',()=>{
    const node={id:'s',type:'source',content:'Source',url:'https://example.org',verified:true,position:{x:3,y:4}};
    expect(validateGraph({nodes:[node],edges:[]}).nodes[0]).toEqual(node);
  });
});
describe('HTTP and durable storage',()=>{
  it('uses the same persisted data through agent calls and visible endpoints',async()=>{
    const request=(path:string,body?:unknown)=>handleApi(new Request(`http://localhost${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),repo.db);
    const tools=await request('/api/agent-tools');expect((await tools.json()).tools.map((t:{name:string})=>t.name)).toEqual(['list_projects','list_folders','search_arguments','read_argument','propose_argument']);
    const p=await request('/api/agent-call',{name:'propose_argument',arguments:{parent:'transport',baseVersion:1,relation:'supports',draft:{title:'Agent contribution'},rationale:'An explicit test proposal'}});expect(p.status).toBe(200);
    const id=(await p.json()).id;expect((await (await request('/api/proposals')).json()).items[0].id).toBe(id);
    expect((await request(`/api/proposals/${id}`,{accept:true})).status).toBe(200);
    const read=await request('/api/agent-call',{name:'read_argument',arguments:{id:'transport'}});expect((await read.json()).children.some((n:{title:string})=>n.title==='Agent contribution')).toBe(true);
    expect((await request('/api/agent-call',{name:'read_argument',arguments:[] })).status).toBe(400);
    expect((await request('/api/nodes?limit=101')).status).toBe(400);
    const bad=await handleApi(new Request('http://localhost/api/nodes',{method:'POST',headers:{Origin:'https://other.example','Content-Type':'application/json'},body:JSON.stringify({draft:{title:'Blocked'}})}),repo.db);expect(bad.status).toBe(403);
  });
  it('survives closing and reopening the database file',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'axiomer-persistence-'));const file=join(dir,'test.db');let disk:DatabaseSync|undefined;
    try{disk=new DatabaseSync(file);migrate(disk);const r=new Repository(localDatabase(disk));await r.seed();const n=await r.create({title:'Saved across sessions'});disk.close();disk=new DatabaseSync(file);expect((await new Repository(localDatabase(disk)).node(n.id)).title).toBe(n.title);}
    finally{disk?.close();unlinkSync(file);rmdirSync(dir);}
  },20000);
  it('keeps queries bounded on 100,000 nodes and a 10,000-edge hub',async()=>{
    const insert=sqlite.prepare('INSERT INTO nodes(id,title,body,topic,created_at,updated_at) VALUES(?,?,?,?,?,?)');const edge=sqlite.prepare('INSERT INTO edges(id,parent,child,relation) VALUES(?,?,?,?)');
    sqlite.exec('BEGIN');for(let i=0;i<100000;i++){const id=`large-${String(i).padStart(6,'0')}`;insert.run(id,`Common transport argument ${i}`,'Synthetic scale fixture','Scale test','','');if(i<10000)edge.run(`edge-${String(i).padStart(6,'0')}`,'transport',id,'supports');}sqlite.exec('COMMIT');
    sqlite.prepare("INSERT INTO item_locations(node_id,project_id,folder_id) SELECT id,'example-project',NULL FROM nodes WHERE id LIKE 'large-%'").run();
    const folderStart=performance.now();const folder=await repo.search(new URLSearchParams({project:'example-project',folder:'root',limit:'25'}));const folderMs=performance.now()-folderStart;expect(folder.items).toHaveLength(25);expect(folder.nextCursor).toBeTruthy();
    const start=performance.now();const g=await repo.neighborhood('transport',new URLSearchParams({limit:'40'}));const neighborhoodMs=performance.now()-start;
    const searchStart=performance.now();const s=await repo.search(new URLSearchParams({q:'common transport',limit:'25'}));const searchMs=performance.now()-searchStart;
    const dashboardStart=performance.now();const overview=await repo.overview();const dashboardMs=performance.now()-dashboardStart;
    expect(g.children).toHaveLength(40);expect(g.nextCursor).toBeTruthy();expect(g.counts.supports).toBe(10003);expect(s.items).toHaveLength(25);expect(s.nextCursor).toBeTruthy();expect(overview.nodes).toBe(100014);
    const plans=sqlite.prepare("EXPLAIN QUERY PLAN SELECT n.id FROM nodes_fts JOIN nodes n ON n.rowid=nodes_fts.rowid WHERE nodes_fts MATCH 'common*' AND nodes_fts.rowid>0 ORDER BY nodes_fts.rowid LIMIT 25").all();expect(plans.some(p=>String(p.detail).includes('TEMP B-TREE'))).toBe(false);
    console.log(JSON.stringify({scaleNodes:100014,hubEdges:10006,neighborhoodMs,searchMs,dashboardMs,folderMs,responseBytes:JSON.stringify(g).length}));
  },60000);
});
