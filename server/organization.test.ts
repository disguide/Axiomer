import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Repository } from './repository';
import { localDatabase } from './local-database';
import { handleApi } from './api';
import { importMap } from './import';
let db:DatabaseSync;let repo:Repository;
const migrations=readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort();
function migrate(d:DatabaseSync,files=migrations){d.exec('PRAGMA foreign_keys=ON');for(const f of files)d.exec(readFileSync(`drizzle/${f}`,'utf8'));}
beforeEach(async()=>{db=new DatabaseSync(':memory:');migrate(db);repo=new Repository(localDatabase(db));await repo.seed();});
afterEach(()=>db.close());
const params=(data:Record<string,string>={})=>new URLSearchParams(data);
const newProject=(name='Research')=>repo.createContainer('project',{name});
const newFolder=(projectId:string)=>repo.createContainer('folder',{projectId,name:'Sources'});
describe('projects and folders',()=>{
  it('saves in a folder, inherits its location for reasoning, and scopes search independently of graph reuse',async()=>{
    const a=await newProject();const b=await newProject('Other work');const f=await newFolder(a.id);
    const q=await repo.create({title:'Should we build a research library?',kind:'question'},undefined,undefined,{projectId:a.id,folderId:f.id});
    const reason=await repo.create({title:'A library makes research reusable'},q.id,'supports');
    const source=await repo.create({title:'Research report',kind:'source',url:'https://example.org'},reason.id,'source');
    const elsewhere=await repo.create({title:'Other question'},undefined,undefined,{projectId:b.id});await repo.connect(elsewhere.id,reason.id,'supports');
    const items=await repo.search(params({project:a.id,folder:f.id}));expect(items.items.map(n=>n.id).sort()).toEqual([q.id,reason.id,source.id].sort());
    expect((await repo.search(params({project:a.id,folder:'root'}))).items).toHaveLength(0);
    expect((await repo.search(params({q:'research',project:b.id}))).items).toHaveLength(0);
    expect((await repo.neighborhood(elsewhere.id,params())).children[0].id).toBe(reason.id);
    expect((await repo.project(a.id)).items).toBe(3);
  });
  it('moves several items atomically without rewriting identity, edges, revisions, or proposals',async()=>{
    const a=await newProject();const f=await newFolder(a.id);const old=await repo.node('transport');
    const proposal=await repo.propose({parent:old.id,baseVersion:old.version,relation:'supports',draft:{title:'Proposed addition'},rationale:'Fits this question'});
    const graph=await repo.neighborhood(old.id,params());
    await repo.moveItems({ids:[old.id,'ipcc'],destination:{projectId:a.id,folderId:f.id}});
    const moved=await repo.neighborhood(old.id,params());expect(moved.children.map(n=>n.edgeId)).toEqual(graph.children.map(n=>n.edgeId));expect(moved.node.version).toBe(old.version);
    expect((await repo.search(params({project:a.id}))).items.map(n=>n.id).sort()).toEqual(['ipcc','transport']);
    const accepted=await repo.review(proposal.id,true);expect((await repo.node(accepted.nodeId!)).folder_id).toBe(f.id);
    expect((await repo.history(old.id))).toEqual([]);
  });
  it('rejects a mismatched folder and all invalid bulk moves without partial writes',async()=>{
    const a=await newProject();const b=await newProject('Second');const f=await newFolder(a.id);const old=await repo.node('transport');const before=await repo.overview();
    await expect(repo.create({title:'Do not save'},undefined,undefined,{projectId:b.id,folderId:f.id})).rejects.toMatchObject({status:400});
    await expect(repo.moveItems({ids:['transport','missing'],destination:{projectId:a.id}})).rejects.toMatchObject({status:404});
    await expect(repo.moveItems({ids:['transport'],destination:{projectId:b.id,folderId:f.id}})).rejects.toMatchObject({status:400});
    await expect(repo.moveItems({ids:['transport'],destination:{projectId:null,folderId:f.id}})).rejects.toMatchObject({status:400});
    expect(await repo.node('transport')).toEqual(old);expect(await repo.overview()).toEqual(before);
    expect(()=>db.prepare('INSERT INTO item_locations VALUES(?,?,?)').run('ipcc',b.id,f.id)).toThrow();
  });
  it('removes folders to project home and projects to Unfiled, preserving every graph node',async()=>{
    const a=await newProject();const f=await newFolder(a.id);
    await repo.moveItems({ids:['transport','ipcc'],destination:{projectId:a.id,folderId:f.id}});
    const before=await repo.overview();
    await repo.renameContainer('project',a.id,{name:'Renamed project',description:'New description'});
    await repo.renameContainer('project',a.id,{name:'Only the name changes'});
    expect((await repo.project(a.id)).description).toBe('New description');
    await repo.renameContainer('folder',f.id,{name:'Renamed folder'});
    expect((await repo.listFolders(a.id,params())).items[0].name).toBe('Renamed folder');
    await repo.removeContainer('folder',f.id);expect((await repo.node('transport')).folder_id).toBeNull();expect((await repo.project(a.id)).items).toBe(2);
    await repo.removeContainer('project',a.id);expect((await repo.search(params({inbox:'true'}))).items.map(n=>n.id).sort()).toEqual(['ipcc','transport']);
    expect(await repo.overview()).toEqual(before);expect((await repo.neighborhood('transport',params())).children.length).toBeGreaterThan(0);
  });
  it('paginates containers and project search with indexed, bounded reads',async()=>{
    const a=await newProject();for(let i=0;i<5;i++)await newFolder(a.id);
    const f1=await repo.listFolders(a.id,params({limit:'2'}));const f2=await repo.listFolders(a.id,params({limit:'2',cursor:f1.nextCursor!}));expect(new Set([...f1.items,...f2.items].map(f=>f.id)).size).toBe(4);
    const p1=await repo.listProjects(params({limit:'1'}));const p2=await repo.listProjects(params({limit:'1',cursor:p1.nextCursor!}));expect(p1.items[0].id).not.toBe(p2.items[0].id);
    for(let i=0;i<7;i++)await repo.create({title:`Library evidence ${i}`},undefined,undefined,{projectId:a.id});
    const seen:string[]=[];let cursor='';do{const page=await repo.search(params({q:'library',project:a.id,limit:'2',cursor}));seen.push(...page.items.map(n=>n.id));cursor=page.nextCursor??'';}while(cursor);expect(new Set(seen).size).toBe(7);
    const plan=db.prepare('EXPLAIN QUERY PLAN SELECT n.id FROM item_locations l INDEXED BY locations_project_folder_node JOIN nodes n ON l.node_id=n.id WHERE l.node_id>? AND l.project_id=? AND l.folder_id IS NULL ORDER BY l.node_id LIMIT 31').all('',a.id);
    expect(plan.some(p=>String(p.detail).includes('locations_project_folder_node'))).toBe(true);
    expect(plan.some(p=>String(p.detail).includes('TEMP B-TREE'))).toBe(false);
    expect((await repo.folder(f2.items[1].id)).name).toBe('Sources');
    await expect(repo.listFolders(a.id,params({limit:'101'}))).rejects.toMatchObject({status:400});
  });
  it('atomically imports into a folder and retains the exact original map',async()=>{
    const p=await newProject();const f=await newFolder(p.id);
    const raw={nodes:[{id:'q',title:'Imported question',kind:'question'},{id:'a',title:'Imported reason'}],edges:[{parent:'q',child:'a',relation:'supports'}]};
    const response=await handleApi(new Request('http://localhost/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({map:raw,destination:{projectId:p.id,folderId:f.id}})}),repo.db);
    expect(response.status).toBe(201);const result=await response.json();expect((await repo.project(p.id)).items).toBe(2);
    const backup=await repo.db.prepare('SELECT value FROM metadata WHERE key=?').bind(`import:${result.nodeId}`).first<{value:string}>();expect(JSON.parse(backup!.value)).toEqual(raw);
    const before=await repo.overview();await expect(importMap(repo,raw,{projectId:p.id,folderId:'missing'})).rejects.toMatchObject({status:400});expect(await repo.overview()).toEqual(before);
  });
  it('exposes projects and folders to agents while proposals inherit the accepted parent home',async()=>{
    const request=(body:unknown)=>handleApi(new Request('http://localhost/api/agent-call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),repo.db);
    const projects=await (await request({name:'list_projects',arguments:{}})).json();expect(projects.items[0].id).toBe('example-project');
    const folders=await (await request({name:'list_folders',arguments:{project:'example-project'}})).json();expect(folders.items[0].id).toBe('example-sources');
    const sources=await (await request({name:'search_arguments',arguments:{project:'example-project',folder:'example-sources',kind:'source'}})).json();expect(sources.items.every((n:{kind:string})=>n.kind==='source')).toBe(true);
  });
  it('upgrades an existing database without hiding user work, and does not refile deleted example folders',async()=>{
    const old=new DatabaseSync(':memory:');try{
      migrate(old,migrations.filter(f=>!f.startsWith('0004')));
      old.prepare('INSERT INTO nodes(id,title,created_at,updated_at) VALUES(?,?,?,?)').run('my-old-work','Existing work','before','before');
      migrate(old,migrations.filter(f=>f.startsWith('0004')));const r=new Repository(localDatabase(old));await r.seed();
      expect((await r.search(params({inbox:'true'}))).items.map(n=>n.id)).toEqual(['my-old-work']);
      await r.removeContainer('project','example-project');await r.seed();expect((await r.listProjects(params())).items).toHaveLength(0);expect((await r.node('transport')).project_id).toBeNull();
    }finally{old.close();}
  });
  it('persists project, folder, and item location across closing and reopening the file',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'axiomer-folders-'));const file=join(dir,'test.db');let disk:DatabaseSync|undefined;
    try{disk=new DatabaseSync(file);migrate(disk);const r=new Repository(localDatabase(disk));const p=await r.createContainer('project',{name:'Persistent research'});const f=await r.createContainer('folder',{name:'Reading',projectId:p.id});const n=await r.create({title:'Saved in Reading'},undefined,undefined,{projectId:p.id,folderId:f.id});disk.close();disk=new DatabaseSync(file);const reopened=new Repository(localDatabase(disk));expect((await reopened.project(p.id)).name).toBe('Persistent research');expect((await reopened.listFolders(p.id,params())).items[0].name).toBe('Reading');expect((await reopened.node(n.id)).folder_id).toBe(f.id);}
    finally{disk?.close();unlinkSync(file);rmdirSync(dir);}
  },20000);
});
