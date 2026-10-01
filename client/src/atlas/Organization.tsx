import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, Folder, FolderOpen, FolderPlus, Inbox, LoaderCircle, MoreHorizontal, Network, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { api, post } from './client';
import type { Destination, Folder as FolderRecord, Page, Project, Summary } from './model';

export function Modal({ title, close, children }: { title:string; close:()=>void; children:ReactNode }) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ const d=ref.current; d?.showModal(); return ()=>d?.close(); },[]);
  return <dialog ref={ref} className="atlas-dialog" aria-label={title} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
    <div className="dialog-head"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X/></button></div>{children}
  </dialog>;
}
const blankPage={items:[],nextCursor:null};
export type Scope={projectId:string;folderId:string};
type ContainerDialog={type:'project'|'folder';id?:string;name:string;description:string;projectId:string;remove?:boolean};
export function readScope():Scope {const q=new URLSearchParams(location.search);return {projectId:q.get('project')??'',folderId:q.get('folder')??''};}
export function useOrganization() {
  const [scope,setScope]=useState<Scope>(readScope);
  const [projects,setProjects]=useState<Page<Project>>(blankPage);
  const [folders,setFolders]=useState<Page<FolderRecord>>(blankPage);
  const [project,setProject]=useState<Project|null>(null);
  const [activeFolder,setActiveFolder]=useState<FolderRecord|null>(null);
  const [dialog,setDialog]=useState<ContainerDialog|null>(null);
  const [move,setMove]=useState<{ids:string[];destination:Destination}|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [ready,setReady]=useState(false);
  const [revision,setRevision]=useState(0);
  const projectRequest=useRef(0);const scopeRef=useRef(scope);scopeRef.current=scope;
  const refresh=useCallback(()=>setRevision(n=>n+1),[]);
  const loadProjects=useCallback(async(cursor='')=>{
    const request=++projectRequest.current;
    try {const p=await api<Page<Project>>(`/projects?limit=100&cursor=${encodeURIComponent(cursor)}`);if(request===projectRequest.current)setProjects(old=>cursor?{items:[...new Map([...old.items,...p.items].map(p=>[p.id,p])).values()],nextCursor:p.nextCursor}:p);}
    catch(e){setError((e as Error).message);}finally{setReady(true);}
  },[]);
  useEffect(()=>{void loadProjects();},[loadProjects,revision]);
  useEffect(()=>{
    let alive=true;setFolders(blankPage);setProject(null);
    if(!scope.projectId||scope.projectId==='inbox')return;
    Promise.all([api<Project>(`/projects/${scope.projectId}`),api<Page<FolderRecord>>(`/projects/${scope.projectId}/folders?limit=100`)]).then(([p,f])=>{if(alive){setProject(p);setFolders(f);}}).catch(e=>{if(alive)setError(e.message);});
    return()=>{alive=false;};
  },[scope.projectId,revision]);
  useEffect(()=>{
    let alive=true;setActiveFolder(null);
    if(scope.folderId)api<FolderRecord>(`/folders/${scope.folderId}`).then(f=>{if(alive){if(f.project_id!==scope.projectId)setError('This folder belongs to another project.');else setActiveFolder(f);}}).catch(e=>{if(alive)setError(e.message);});
    return()=>{alive=false;};
  },[scope.projectId,scope.folderId,revision]);
  async function moreFolders(){const expected=scope.projectId;if(!folders.nextCursor)return;try{const p=await api<Page<FolderRecord>>(`/projects/${expected}/folders?limit=100&cursor=${encodeURIComponent(folders.nextCursor)}`);if(scopeRef.current.projectId===expected)setFolders(old=>({items:[...new Map([...old.items,...p.items].map(f=>[f.id,f])).values()],nextCursor:p.nextCursor}));}catch(e){setError((e as Error).message);}}
  function go(projectId='',folderId=''){setScope({projectId,folderId});const url=new URL(location.href);url.search='';if(projectId)url.searchParams.set('project',projectId);if(folderId)url.searchParams.set('folder',folderId);window.history.pushState(null,'',url);}
  const folder=activeFolder?.id===scope.folderId&&activeFolder.project_id===scope.projectId?activeFolder:folders.items.find(f=>f.id===scope.folderId&&f.project_id===scope.projectId);
  const destination:Destination={projectId:scope.projectId&&scope.projectId!=='inbox'?scope.projectId:null,folderId:scope.folderId||null};
  function create(type:'project'|'folder'){setError('');setDialog({type,name:'',description:'',projectId:scope.projectId});}
  function edit(item:Project|FolderRecord,remove=false){setError('');setDialog({type:'project_id' in item?'folder':'project',id:item.id,name:item.name,description:'description' in item?item.description:'',projectId:'project_id' in item?item.project_id:item.id,remove});}
  async function saveContainer(e:FormEvent,onSaved:()=>void){
    e.preventDefault();if(!dialog)return;setBusy(true);setError('');
    try {
      const path=`/${dialog.type}s${dialog.id?'/'+dialog.id:''}`;
      const result=await api<{id:string}>(path,{method:dialog.remove?'DELETE':dialog.id?'PATCH':'POST',body:JSON.stringify({name:dialog.name,description:dialog.description,projectId:dialog.projectId})});
      if(dialog.remove)go(dialog.type==='folder'?dialog.projectId:'');else go(dialog.type==='project'?result.id:dialog.projectId,dialog.type==='folder'?result.id:'');
      setDialog(null);refresh();onSaved();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function saveMove(onSaved:()=>void){if(!move)return;setBusy(true);setError('');try{await post('/items/move',{ids:move.ids,destination:move.destination});setMove(null);refresh();onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const visibleFolders={items:folders.items.filter(f=>f.project_id===scope.projectId),nextCursor:project?.id===scope.projectId?folders.nextCursor:null};
  return {scope,setScope,projects,folders:visibleFolders,project:project?.id===scope.projectId?project:null,folder,destination,dialog,setDialog,move,setMove,error,setError,busy,ready,revision,refresh,loadProjects,moreFolders,go,create,edit,saveContainer,saveMove};
}
export type Organization=ReturnType<typeof useOrganization>;

export function DestinationPicker({ value, onChange }: {value:Destination;onChange:(d:Destination)=>void}) {
  const [projects,setProjects]=useState<Page<Project>>(blankPage);const [folders,setFolders]=useState<Page<FolderRecord>>(blankPage);const [error,setError]=useState('');
  const valueRef=useRef(value);valueRef.current=value;
  useEffect(()=>{let alive=true;api<Page<Project>>('/projects?limit=100').then(p=>{if(alive)setProjects(p);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  useEffect(()=>{let alive=true;setFolders(blankPage);if(value.projectId)api<Page<FolderRecord>>(`/projects/${value.projectId}/folders?limit=100`).then(p=>{if(alive)setFolders(p);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[value.projectId]);
  async function more(kind:'projects'|'folders'){try{const old=kind==='projects'?projects:folders;const projectId=value.projectId;const path=kind==='projects'?'/projects':`/projects/${projectId}/folders`;const p=await api<Page<Project&FolderRecord>>(`${path}?limit=100&cursor=${encodeURIComponent(old.nextCursor!)}`);if(kind==='projects')setProjects(s=>({items:[...new Map([...s.items,...p.items].map(p=>[p.id,p])).values()],nextCursor:p.nextCursor}));else if(valueRef.current.projectId===projectId)setFolders(s=>({items:[...new Map([...s.items,...p.items].map(p=>[p.id,p])).values()],nextCursor:p.nextCursor}));}catch(e){setError((e as Error).message);}}
  return <fieldset className="destination-picker"><legend>Save in</legend><div className="destination-fields">
    <label className="form-label"><span className="sr-only">Project</span><select aria-label="Project" value={value.projectId??''} onChange={e=>onChange({projectId:e.target.value||null,folderId:null})}><option value="">Unfiled</option>{value.projectId&&!projects.items.some(p=>p.id===value.projectId)&&<option value={value.projectId}>Selected project</option>}{projects.items.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {value.projectId&&<label className="form-label"><span className="sr-only">Folder</span><select aria-label="Folder" value={value.folderId??''} onChange={e=>onChange({...value,folderId:e.target.value||null})}><option value="">Project home</option>{value.folderId&&!folders.items.some(f=>f.id===value.folderId)&&<option value={value.folderId}>Selected folder</option>}{folders.items.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
  </div>{projects.nextCursor&&<button className="text-button" type="button" onClick={()=>void more('projects')}>Load more projects</button>}{folders.nextCursor&&<button className="text-button" type="button" onClick={()=>void more('folders')}>Load more folders</button>}{error&&<p role="alert" className="form-error">{error}</p>}</fieldset>;
}

export function OrganizationDialogs({org,onSaved,onContainerSaved}:{org:Organization;onSaved:()=>void;onContainerSaved:()=>void}) {
  const d=org.dialog;
  return <>{d&&<Modal title={d.remove?`Remove ${d.type}?`:d.id?`Edit ${d.type}`:`New ${d.type}`} close={()=>{if(!org.busy)org.setDialog(null);}}><form className="composer-body" onSubmit={e=>void org.saveContainer(e,onContainerSaved)}>
    {org.error&&<p className="form-error" role="alert">{org.error}</p>}
    {d.remove?<p className="muted">{d.type==='folder'?`Items in “${d.name}” will move to the project home.`:`Items in “${d.name}” will move to Unfiled.`} All arguments, sources, and connections are kept.</p>:<><label className="form-label">Name<input autoFocus value={d.name} maxLength={100} required placeholder={d.type==='project'?'e.g. My research':'e.g. Reading & references'} onChange={e=>org.setDialog({...d,name:e.target.value})}/></label>{d.type==='project'&&<label className="form-label">Description <span>optional</span><textarea rows={2} value={d.description} maxLength={500} placeholder="What are you exploring?" onChange={e=>org.setDialog({...d,description:e.target.value})}/></label>}</>}
    <div className="form-actions"><button type="button" className="outline" disabled={org.busy} onClick={()=>org.setDialog(null)}>Cancel</button><button className={d.remove?'danger':'primary'} disabled={org.busy||!d.name.trim()}>{org.busy?<LoaderCircle className="spin"/>:d.remove?<Trash2/>:<Check/>}{d.remove?'Remove':d.id?'Save changes':`Create ${d.type}`}</button></div>
  </form></Modal>}{org.move&&<Modal title={`Move ${org.move.ids.length===1?'item':`${org.move.ids.length} items`}`} close={()=>{if(!org.busy)org.setMove(null);}}><div className="composer-body"><p className="muted">Choose a home for these items. Their sources and connections stay attached.</p><DestinationPicker value={org.move.destination} onChange={destination=>org.setMove(m=>m?{...m,destination}:m)}/>{org.error&&<p className="form-error" role="alert">{org.error}</p>}<div className="form-actions"><button className="outline" disabled={org.busy} onClick={()=>org.setMove(null)}>Cancel</button><button className="primary" disabled={org.busy} onClick={()=>void org.saveMove(onSaved)}><FolderOpen/>Move here</button></div></div></Modal>}</>;
}

function ContainerMenu({org,item}:{org:Organization;item:Project|FolderRecord}) {
  return <details className="more-menu"><summary aria-label={`Options for ${item.name}`}><MoreHorizontal/></summary><div><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');org.edit(item);}}><Pencil/>Rename</button><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');org.edit(item,true);}}><Trash2/>Remove</button></div></details>;
}

export function ProjectHome({org,open,onCreate}:{org:Organization;open:(projectId:string,folderId?:string)=>void;onCreate:()=>void}) {
  return <div className="library-page"><div className="page-heading"><div><div className="eyebrow">A PLACE FOR YOUR THINKING</div><h1>Your projects</h1><p>Keep your questions, arguments, and sources together.</p></div><button className="primary" onClick={()=>org.create('project')}><Plus/>New project</button></div>
    <div className="project-grid">{org.projects.items.map(p=><article className="project-card" key={p.id}><div className="project-card-top"><span className="project-icon"><FolderOpen/></span><ContainerMenu org={org} item={p}/></div><button className="project-open" onClick={()=>open(p.id)}><h2>{p.name}</h2><p>{p.description||'A space for questions, reasoning, and research.'}</p><span>{p.items} {p.items===1?'item':'items'} <span>·</span> {p.folders} {p.folders===1?'folder':'folders'}<ArrowRight/></span></button></article>)}
      <button className="new-project-card" onClick={()=>org.create('project')}><Plus/><strong>A new line of thinking</strong><span>Create a project</span></button>
    </div>{org.projects.nextCursor&&<button className="outline load-more" onClick={()=>void org.loadProjects(org.projects.nextCursor!)}>More projects</button>}
    {!org.ready&&<div className="loading-line"><LoaderCircle className="spin"/>Loading your projects…</div>}
    <div className="home-inbox"><span className="inbox-icon"><Inbox/></span><div><h2>Just need to save an idea?</h2><p>Start in Unfiled. Give it a project when you’re ready.</p></div><button className="outline" onClick={onCreate}><Plus/>New argument</button><button className="icon-button" aria-label="Open Unfiled" onClick={()=>open('inbox')}><ArrowRight/></button></div>
    <div className="home-guide"><span>1 <b>Create a project</b></span><ChevronRight/><span>2 <b>Save a question or source</b></span><ChevronRight/><span>3 <b>Connect the reasoning</b></span></div>
  </div>;
}

export function FolderLibrary({org,open,onOpen,onCreate}:{org:Organization;open:(projectId:string,folderId?:string)=>void;onOpen:(id:string)=>void;onCreate:(source?:boolean)=>void}) {
  const [page,setPage]=useState<Page<Summary>>(blankPage);const [query,setQuery]=useState('');const [kind,setKind]=useState('');const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [selected,setSelected]=useState<string[]>([]);const request=useRef(0);
  const {projectId,folderId}=org.scope;
  const load=useCallback(async(cursor='')=>{
    const serial=++request.current;setLoading(true);setError('');
    if(!cursor)setPage(blankPage);
    const params=new URLSearchParams({limit:'30',q:query.startsWith('#')?'':query,kind,roots:kind==='source'||query?'false':'true'});if(query.startsWith('#'))params.set('label',query.slice(1).trim());if(projectId==='inbox')params.set('inbox','true');else{params.set('project',projectId);params.set('folder',folderId||'root');}if(cursor)params.set('cursor',cursor);
    try{const p=await api<Page<Summary>>(`/nodes?${params}`);if(serial===request.current)setPage(old=>cursor?{items:[...new Map([...old.items,...p.items].map(n=>[n.id,n])).values()],nextCursor:p.nextCursor}:p);}
    catch(e){if(serial===request.current)setError((e as Error).message);}finally{if(serial===request.current)setLoading(false);}
  },[projectId,folderId,query,kind]);
  useEffect(()=>{setSelected([]);const timer=setTimeout(()=>void load(),query?180:0);return()=>{clearTimeout(timer);request.current++;};},[load,org.revision]);
  const item=folderId?org.folder:org.project;
  const title=projectId==='inbox'?'Unfiled':folderId?org.folder?.name||'Folder':org.project?.name||'Project';
  return <div className="library-page"><div className="page-heading"><div><div className="eyebrow">{folderId?'FOLDER':projectId==='inbox'?'SAVE NOW, ORGANIZE LATER':'PROJECT'}</div><h1>{title}</h1><p>{folderId?'Your arguments and sources, in one place.':projectId==='inbox'?'Ideas and references waiting for a project.':org.project?.description||'A home for your questions, arguments, and sources.'}</p></div><div className="heading-actions"><button className="primary" onClick={()=>onCreate()}><Plus/>New argument</button>{item&&<ContainerMenu org={org} item={item}/>}</div></div>
    {projectId!=='inbox'&&!folderId&&<section className="folders-section"><div className="list-heading"><h2>Folders</h2><button className="text-button" onClick={()=>org.create('folder')}><FolderPlus/>New folder</button></div><div className="folder-grid">{org.folders.items.map(f=><div className="folder-tile" key={f.id}><button onClick={()=>open(projectId,f.id)}><Folder/><span><strong>{f.name}</strong><small>{f.items} {f.items===1?'item':'items'}</small></span></button><ContainerMenu org={org} item={f}/></div>)}{!org.folders.items.length&&<button className="folder-empty" onClick={()=>org.create('folder')}><FolderPlus/>Add a folder to organize this project</button>}</div>{org.folders.nextCursor&&<button className="text-button" onClick={()=>void org.moreFolders()}>More folders</button>}</section>}
    <section className="items-section"><div className="list-heading"><h2>{folderId||projectId==='inbox'?'Saved items':'In this project'}</h2><button className="text-button" onClick={()=>onCreate(true)}><Plus/>Add source</button></div>
      <div className="items-toolbar"><div className="item-tabs" aria-label="Item type">{[['','All'],['argument','Arguments'],['source','Sources']].map(([v,label])=><button key={v} className={kind===v?'active':''} aria-pressed={kind===v} onClick={()=>setKind(v)}>{label}</button>)}</div><label className="filter-search"><Search/><input aria-label="Filter this folder" placeholder="Find in this folder…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
      {selected.length>0&&<div className="selection-bar"><span>{selected.length} selected</span><button className="text-button" onClick={()=>org.setMove({ids:selected,destination:org.destination})}><FolderOpen/>Move to…</button><button className="icon-button" aria-label="Clear selection" onClick={()=>setSelected([])}><X/></button></div>}
      <div className="item-list">{page.items.length>0&&<div className="item-list-label"><input type="checkbox" aria-label="Select all displayed items" checked={page.items.every(n=>selected.includes(n.id))} onChange={e=>setSelected(e.target.checked?page.items.slice(0,100).map(n=>n.id):[])}/><span>Name</span><span>Updated</span></div>}{page.items.map(n=><div className="item-row" key={n.id}><input type="checkbox" aria-label={`Select ${n.title}`} checked={selected.includes(n.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,n.id].slice(0,100):old.filter(id=>id!==n.id))}/><button className="item-open" onClick={()=>onOpen(n.id)}><span className={`item-icon ${n.kind}`}>{n.kind==='source'?<BookOpen/>:<Network/>}</span><span className="item-name"><strong>{n.title}</strong><small>{n.kind==='source'?n.publisher||'Source':`${n.connections} reasons · ${n.sources} sources`}</small></span><time>{new Date(n.updated_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time></button><button className="icon-button row-move" aria-label={`Move ${n.title}`} title="Move to folder" onClick={()=>org.setMove({ids:[n.id],destination:{projectId:n.project_id??null,folderId:n.folder_id??null}})}><FolderOpen/></button></div>)}</div>
      {loading&&<div className="loading-line"><LoaderCircle className="spin"/>Loading items…</div>}{error&&<p className="form-error" role="alert">{error} <button onClick={()=>void load()}>Try again</button></p>}
      {!loading&&!error&&!page.items.length&&<div className="folder-empty-state"><span className="empty-folder"><FolderOpen/></span><h2>{query?'No matching items':kind==='source'?'No sources here yet':kind==='argument'?'No arguments here yet':'Make room for a good question.'}</h2><p>{query?'Try fewer words, or use the search at the top to look everywhere.':'Save an argument or a source. Connect the reasons as your thinking develops.'}</p>{!query&&<button className="outline" onClick={()=>onCreate(kind==='source')}><Plus/>{kind==='source'?'Add a source':'Write your first argument'}</button>}</div>}
      {page.nextCursor&&<button className="outline load-more" disabled={loading} onClick={()=>void load(page.nextCursor!)}>More items</button>}
    </section>
  </div>;
}
