import type { GraphBundle, Relation } from './model';
export const emptyBundle=():GraphBundle=>({format:'axiomer',schemaVersion:3,scope:'import',exportedAt:new Date().toISOString(),complete:true,projects:[],folders:[],nodes:[],edges:[],locations:[],attachments:[]});
const now=()=>new Date().toISOString();
export function safePath(value:string){const path=value.replaceAll('\\','/');if(!path||path.startsWith('/')||/^[a-z]:/i.test(path)||path.split('/').some(p=>p==='..'||p==='.'||!p)||path.includes('\0'))throw new Error(`Unsafe file path: ${value}`);return path;}
export function note(title:string,body='',id:string=crypto.randomUUID()):GraphBundle['nodes'][number]{if(title.length>500)throw new Error('A note title is too long. Keep the title under 500 characters.');return {id,title:title||'Untitled',body,kind:'claim',topic:'General',url:'',publisher:'',locator:'',version:1,created_at:now(),updated_at:now()};}
export function parseOutline(text:string,defaultRelation:Relation='context'){
  const bundle=emptyBundle();const stack:{indent:number;id:string}[]=[];let fenced=false;let current:GraphBundle['nodes'][number]|undefined;
  const lines=text.replace(/\r\n?/g,'\n').split('\n');const hasList=lines.some(l=>/^\s*(?:[-*+] |\d+[.)] )/.test(l));
  if(!hasList){const title=lines.find(l=>l.trim())?.replace(/^#+\s*/,'').slice(0,500)||'Pasted note';bundle.nodes.push(note(title,text));return bundle;}
  for(const line of lines){
    if(/^\s*(```|~~~)/.test(line)){fenced=!fenced;if(current)current.body+=(current.body?'\n':'')+line;continue;}
    const match=!fenced&&line.match(/^(\s*)(?:[-*+] |\d+[.)] )(.+)$/);
    if(!match){if(current)current.body+=(current.body?'\n':'')+line;else if(line.trim()){current=note(line.replace(/^#+\s*/,''));bundle.nodes.push(current);stack.push({indent:-1,id:current.id});}continue;}
    const indent=match[1].replaceAll('\t','  ').length;const explicit=match[2].match(/^(for|against|context|source):\s*(.+)$/i);const title=explicit?explicit[2]:match[2];const relation:Relation=explicit?({for:'supports',against:'challenges',context:'context',source:'source'} as const)[explicit[1].toLowerCase() as 'for']:defaultRelation;
    current=note(title);if(/^https?:\/\/\S+$/.test(title)){current.url=title;current.kind='source';}
    while(stack.length&&stack[stack.length-1].indent>=indent)stack.pop();
    if(stack.length)bundle.edges.push({id:crypto.randomUUID(),parent:stack[stack.length-1].id,child:current.id,relation:current.url?'source':relation,origin:'extracted'});
    current.details={listed:stack.length?0:1,location_locked:0};bundle.nodes.push(current);stack.push({indent,id:current.id});
  }
  return bundle;
}
export function normalizeGraph(input:unknown):GraphBundle{
  if(!input||typeof input!=='object')throw new Error('Choose a graph JSON file.');const raw=input as Record<string,unknown>;
  if(raw.format==='axiomer'&&raw.schemaVersion===3){if(raw.complete!==true)throw new Error('This export is incomplete. Use a completed export.');for(const key of ['nodes','edges','projects','folders','locations'])if(!Array.isArray(raw[key]))throw new Error(`The export is missing ${key}.`);return raw as unknown as GraphBundle;}
  if(!Array.isArray(raw.nodes)||!Array.isArray(raw.edges??raw.links))throw new Error('The JSON needs nodes and connections.');
  const b=emptyBundle();const remap=new Map<string,string>();const legacy=raw.nodes.some(n=>n&&typeof n==='object'&&'content' in n);
  for(const value of raw.nodes){const r=value as Record<string,unknown>;const oldId=String(r.id);if(remap.has(oldId))throw new Error('Duplicate node IDs in this file.');const id=crypto.randomUUID();remap.set(oldId,id);
    const content=String(r.title??r.label??r.content??'Untitled');const n=note(content.slice(0,500),String(r.body??(content.length>500?content:'')),id);
    if(typeof r.url==='string'&&/^https?:\/\//.test(r.url)){n.url=r.url;n.kind='source';}n.publisher=String(r.publisher??'');n.locator=String(r.locator??r.source_location??'');
    n.details={labels:JSON.stringify(Array.isArray(r.labels)?r.labels:[]),labels_origin:'import',provenance:JSON.stringify({source_file:r.source_file,source_location:r.source_location,original_id:r.id,original_type:r.type,original_relation:r.relation}),location_locked:0};b.nodes.push(n);
  }
  const sourceIds=new Set(b.nodes.filter(n=>n.kind==='source').map(n=>n.id));
  for(const value of (raw.edges??raw.links) as unknown[]){const r=value as Record<string,unknown>;let parent=r.parent??r.source??r.from,child=r.child??r.target??r.to;let rel=String(r.relation??r.edgeType??r.label??'context');
    if(legacy&&r.edgeType){const down=['grounds','cites','grounds-in'].includes(String(r.edgeType));parent=down?r.from:r.to;child=down?r.to:r.from;rel=['conflicts','attacks','argues-against','objects-to'].includes(rel)?'challenges':['annotates','connects-to','illustrates','raises'].includes(rel)?'context':'supports';}
    const p=remap.get(String(parent)),c=remap.get(String(child));if(!p||!c)throw new Error('A connection refers to a missing node.');if(p===c)continue;
    const source=sourceIds.has(c);const relation:Relation=source?'source':['supports','challenges','context','source'].includes(rel)?rel as Relation:'context';
    const confidence=String(r.confidence??r.origin??'extracted').toLowerCase();b.edges.push({id:crypto.randomUUID(),parent:p,child:c,relation,origin:['extracted','inferred','ambiguous','manual'].includes(confidence)?confidence:'import',rationale:String(r.rationale??r.explanation??(rel!==relation?`Original relationship: ${rel}`:'')).slice(0,4000)});
  }
  const childIds=new Set(b.edges.map(e=>e.child));b.nodes.forEach(n=>{n.details={...n.details,listed:childIds.has(n.id)&&!n.url?0:1};});return b;
}
export function copyBundle(bundle:GraphBundle):GraphBundle{
  const ids=new Map<string,string>();const map=(id:string)=>{if(!ids.has(id))ids.set(id,crypto.randomUUID());return ids.get(id)!;};
  return {...bundle,projects:bundle.projects.map(p=>({...p,id:map(p.id)})),folders:bundle.folders.map(f=>({...f,id:map(f.id),project_id:map(f.project_id)})),nodes:bundle.nodes.map(n=>({...n,id:map(n.id),details:n.details?{...n.details,node_id:map(n.id),provenance:remapProvenance(n.details.provenance,map)}:undefined})),edges:bundle.edges.map(e=>({...e,id:map(e.id),parent:map(e.parent),child:map(e.child)})),locations:bundle.locations.map(l=>({...l,node_id:map(l.node_id),project_id:map(l.project_id),folder_id:l.folder_id?map(l.folder_id):null})),attachments:bundle.attachments?.map(a=>({...a,id:map(a.id),node_id:map(a.node_id)}))};
}
function remapProvenance(value:unknown,map:(id:string)=>string){const p=typeof value==='string'?JSON.parse(value):value??{};if(p.wiki_targets)p.wiki_targets=Object.fromEntries(Object.entries(p.wiki_targets).map(([key,id])=>[key,map(String(id))]));return JSON.stringify(p);}
function decoded(text:string){try{return decodeURIComponent(text);}catch{return text;}}
export function markdownVault(files:{path:string;text:string;binary?:boolean}[],projectName:string){
  const b=emptyBundle();const projectId=crypto.randomUUID();b.projects.push({id:projectId,name:projectName.slice(0,100),description:'Imported notes',created_at:now(),updated_at:now(),items:0,folders:0});
  const seenIds=new Set<string>();const byPath=new Map<string,string>();const byBase=new Map<string,string[]>();const directories=new Map<string,string>();const warnings:string[]=[];
  for(const file of files){const path=safePath(file.path);const without=path.replace(/\.md$/i,'');const name=without.split('/').pop()!;
    const front=file.text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]??'';const savedId=front.match(/^axiomer_id:\s*["']?([^\s"']+)["']?\s*$/m)?.[1];const title=file.text.match(/^#\s+(.+)$/m)?.[1]??name;const n=note(title,file.text,savedId||crypto.randomUUID());
    let labels:string[]=[];const line=front.match(/^labels:\s*(\[.*\])\s*$/m)?.[1];if(line){try{labels=JSON.parse(line);}catch{warnings.push(`Labels in ${path} could not be read.`);}}
    n.details={labels:JSON.stringify(labels),labels_origin:'import',provenance:JSON.stringify({path}),listed:1,location_locked:1};if(byPath.has(without)||seenIds.has(n.id))throw new Error('Duplicate note IDs or paths in this vault. Import a copy with unique IDs.');seenIds.add(n.id);b.nodes.push(n);byPath.set(without,n.id);byBase.set(name,[...(byBase.get(name)??[]),n.id]);
    const directory=path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';let folderId:string|null=null;
    if(directory){if(!directories.has(directory)){const id=crypto.randomUUID();directories.set(directory,id);b.folders.push({id,project_id:projectId,name:directory.length<=100?directory:directory.slice(-100),created_at:now(),updated_at:now(),items:0});}folderId=directories.get(directory)!;}
    b.locations.push({node_id:n.id,project_id:projectId,folder_id:folderId});
  }
  const binaries=new Set(files.flatMap((f,i)=>f.binary?[b.nodes[i].id]:[]));const linked=new Set<string>();
  for(let i=0;i<files.length;i++){
    const file=files[i],node=b.nodes[i];const directory=file.path.includes('/')?file.path.slice(0,file.path.lastIndexOf('/')+1):'';const targets:Record<string,string>={};
    const clean=file.text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g,'');const links=[...clean.matchAll(/!?\[\[([^\]]+)\]\]|\[[^\]]*\]\(([^)]+)\)/g)];
    for(const match of links){const original=match[1]?.split('|')[0]??match[2];const target=decoded(original).split('#')[0].replace(/\.md$/i,'');if(!target||/^(https?:|mailto:|data:)/i.test(target))continue;
      const normalize=(p:string)=>{const segments:string[]=[];for(const piece of p.split('/')){if(piece==='..')segments.pop();else if(piece!=='.'&&piece)segments.push(piece);}return segments.join('/');};
      let id=byPath.get(normalize(directory+target))??byPath.get(normalize(target));if(!id&&!target.includes('/')){const candidates=byBase.get(target);if(candidates?.length===1)id=candidates[0];else if(candidates?.length)warnings.push(`Ambiguous link “${target}” in ${file.path}.`);}
      if(!id){if(/\.(png|jpg|jpeg|gif|pdf|webp|svg)$/i.test(target))continue;warnings.push(`Unresolved link “${target}” in ${file.path}.`);continue;}
      targets[original]=id;if(id===node.id)continue;const key=node.id+':'+id;if(linked.has(key))continue;linked.add(key);b.edges.push({id:crypto.randomUUID(),parent:node.id,child:id,relation:binaries.has(id)?'source':'context',origin:'extracted'});
    }
    node.details!.provenance=JSON.stringify({path:file.path,wiki_targets:targets});
  }
  return {bundle:b,warnings:[...new Set(warnings)]};
}
export function fileName(title:string,id:string){const safe=title.replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/[. ]+$/,'').trim().slice(0,90)||'Note';const stem=/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(safe)?'Note '+safe:safe;return `${stem}--${id.replace(/[^a-z0-9-]/gi,'').slice(0,36)}.md`;}
export function bundleMarkdown(bundle:GraphBundle){
  const component=(name:string,id:string)=>fileName(name,id).replace(/\.md$/,'');
  const projectNames=new Map(bundle.projects.map(p=>[p.id,component(p.name,p.id)]));const folderNames=new Map(bundle.folders.map(f=>[f.id,component(f.name,f.id)]));const homes=new Map(bundle.locations.map(l=>[l.node_id,l]));
  const paths=new Map(bundle.nodes.map(n=>{const home=homes.get(n.id);return [n.id,[home?projectNames.get(home.project_id)||'Project':'Unfiled',home?.folder_id?folderNames.get(home.folder_id):'',fileName(n.title,n.id)].filter(Boolean).join('/')];}));
  const files:Record<string,string>={};const outgoing=new Map<string,GraphBundle['edges']>();for(const e of bundle.edges){const list=outgoing.get(e.parent)??[];list.push(e);outgoing.set(e.parent,list);}
  const attached=new Map<string,NonNullable<GraphBundle['attachments']>>();for(const a of bundle.attachments??[]){const list=attached.get(a.node_id)??[];list.push(a);attached.set(a.node_id,list);}
  for(const n of bundle.nodes){const labels=n.details?.labels??'[]';const refs=(outgoing.get(n.id)??[]).map(e=>`- ${e.relation==='supports'?'For':e.relation==='challenges'?'Against':e.relation==='source'?'Source':'Related'}: [[Notes/${paths.get(e.child)?.replace(/\.md$/,'')??e.child}]]${e.origin==='inferred'?' (AI suggestion)':''}`).join('\n');
    const provenance=typeof n.details?.provenance==='string'?JSON.parse(n.details.provenance):n.details?.provenance??{};const targets=provenance.wiki_targets??{};
    const rewritten=n.body.replace(/\[\[([^\]]+)\]\]/g,(match,raw:string)=>{const [target,label]=raw.split('|');const id=targets[target];return id&&paths.has(id)?`[[Notes/${paths.get(id)!.replace(/\.md$/,'')}|${label||target}]]`:match;});
    const sources=(attached.get(n.id)??[]).map(a=>`- [[Attachments/${a.id}/${a.name.replace(/[\\/]/g,'_')}|${a.name}]]`).join('\n');
    files[paths.get(n.id)!]=`---\naxiomer_id: ${JSON.stringify(n.id)}\nlabels: ${typeof labels==='string'?labels:JSON.stringify(labels)}\n---\n\n# ${n.title}\n\n${rewritten}${n.url?`\n\nSource: ${n.url}\n${n.publisher} ${n.locator}`:''}${refs?'\n\n## Connections\n\n'+refs:''}${sources?'\n\n## Files\n\n'+sources:''}\n`;
  }return files;
}
export function outlineText(bundle:GraphBundle,root?:string){
  const nodes=new Map(bundle.nodes.map(n=>[n.id,n]));const childIds=new Set(bundle.edges.map(e=>e.child));const outgoing=new Map<string,GraphBundle['edges']>();for(const e of bundle.edges){const list=outgoing.get(e.parent)??[];list.push(e);outgoing.set(e.parent,list);}
  const roots=root?[root]:bundle.nodes.filter(n=>!childIds.has(n.id)).map(n=>n.id);if(!roots.length&&bundle.nodes.length)roots.push(bundle.nodes[0].id);
  const rootIds=new Set(roots);const seeds=root?roots:[...roots,...bundle.nodes.filter(n=>!rootIds.has(n.id)).map(n=>n.id)];const stack=seeds.reverse().map(id=>({id,depth:0,relation:''}));const seen=new Set<string>();const lines:string[]=[];
  while(stack.length){const item=stack.pop()!,n=nodes.get(item.id);if(!n)continue;const repeat=seen.has(n.id);if(repeat&&item.depth===0)continue;if(item.depth>2000)throw new Error('This outline is too deep for plain-text indentation. Export JSON or ZIP to preserve its structure.');lines.push('  '.repeat(item.depth)+`- ${item.relation}${n.title}${repeat?' (see earlier node)':''}`);if(repeat)continue;seen.add(n.id);
    if(n.url)lines.push('  '.repeat(item.depth+1)+n.url);const edges=outgoing.get(n.id)??[];for(let i=edges.length-1;i>=0;i--){const e=edges[i];stack.push({id:e.child,depth:item.depth+1,relation:e.relation==='supports'?'for: ':e.relation==='challenges'?'against: ':e.relation==='source'?'source: ':'context: '});}
    if(lines.length>200000)throw new Error('This outline is too large for text. Use JSON or ZIP.');
  }return lines.join('\n');
}
