import { api, post } from './client';
import type { Destination, GraphBundle, Page } from './model';
import { bundleMarkdown, emptyBundle, safePath } from './formats';
import { strFromU8, strToU8, Unzip, UnzipInflate, zip } from 'fflate';
export type Progress=(message:string)=>void;
const parts=['projects','folders','nodes','edges','locations','attachments'] as const;
export async function collectExport(scope:'workspace'|'project'|'argument',target:string,onProgress:Progress,signal?:AbortSignal):Promise<GraphBundle>{
  let session=await post<{id:string;status:string;nodes:number}>('/exports',{scope,project:scope==='project'?target:undefined,root:scope==='argument'?target:undefined});
  while(session.status!=='ready'){if(signal?.aborted)throw new Error('Export cancelled.');onProgress(`Gathering connected nodes… ${session.nodes.toLocaleString()} found`);session=await post(`/exports/${session.id}`,{});}
  const bundle=emptyBundle();bundle.scope=scope;bundle.complete=false;let bytes=0;
  for(const part of parts){let cursor='';do{if(signal?.aborted)throw new Error('Export cancelled.');const p=await api<Page<Record<string,unknown>>>(`/exports/${session.id}?part=${part}&limit=100&cursor=${encodeURIComponent(cursor)}`);bytes+=new TextEncoder().encode(JSON.stringify(p.items)).length;if(bytes>100_000_000)throw new Error('This export exceeds 100 MB. Export individual projects to keep browser memory bounded.');(bundle[part] as unknown[]).push(...p.items);cursor=p.nextCursor??'';onProgress(`Exporting ${part}… ${bundle[part]?.length.toLocaleString()} saved`);}while(cursor);}
  await api(`/exports/${session.id}`);bundle.complete=true;return bundle;
}
export function chunksByBytes<T>(records:T[],maxBytes=3000000,maxCount=30){const chunks:T[][]=[];let current:T[]=[],bytes=2;for(const r of records){const size=new TextEncoder().encode(JSON.stringify(r)).length+1;if(size>maxBytes)throw new Error('One note is too large for a single transfer. Split it into smaller notes.');if(current.length&&(bytes+size>maxBytes||current.length>=maxCount)){chunks.push(current);current=[];bytes=2;}current.push(r);bytes+=size;}if(current.length)chunks.push(current);return chunks;}
export function fileInDestination(bundle:GraphBundle,destination:Destination){if(bundle.projects.length||!destination.projectId)return bundle;return {...bundle,locations:bundle.nodes.map(n=>({node_id:n.id,project_id:destination.projectId!,folder_id:destination.folderId??null}))};}
export async function sendImport(bundle:GraphBundle,session:string,onProgress:Progress,signal?:AbortSignal){
  let added=0,skipped=0;
  for(const part of parts.filter(p=>p!=='attachments')){const chunks=chunksByBytes<unknown>(bundle[part]??[]);for(let i=0;i<chunks.length;i++){if(signal?.aborted)throw new Error('Import paused. Completed batches are saved; retry this import to continue.');const result=await post<{added:number;skipped:number}>('/transfers/import',{batchId:`${session}:${part}:${i}`,part,records:chunks[i]});added+=result.added;skipped+=result.skipped;onProgress(`Saving ${part}… batch ${i+1} of ${chunks.length}`);}}
  return {added,skipped};
}
export async function downloadBundleZip(bundle:GraphBundle,onProgress:Progress,signal?:AbortSignal){
  const files:Record<string,Uint8Array>={};for(const [name,content] of Object.entries(bundleMarkdown(bundle)))files['Notes/'+name]=strToU8(content);
  files['axiomer.json']=strToU8(JSON.stringify(bundle));let total=Object.values(files).reduce((n,b)=>n+b.length,0);
  for(const a of bundle.attachments??[]){if(signal?.aborted)throw new Error('Export cancelled.');onProgress(`Including ${a.name}…`);const response=await fetch(`/api/attachments/${encodeURIComponent(a.id)}`);if(!response.ok)throw new Error(`Could not export source file: ${a.name}`);const data=new Uint8Array(await response.arrayBuffer());total+=data.length;if(total>100_000_000)throw new Error('ZIP export exceeds 100 MB. Export a smaller project.');files[`Attachments/${a.id}/${a.name.replace(/[\\/]/g,'_')}`]=data;}
  onProgress('Preparing ZIP…');const bytes=await new Promise<Uint8Array>((resolve,reject)=>zip(files,{level:3},(error,data)=>error?reject(error):resolve(data)));download(bytes,'axiomer-workspace.zip','application/zip');
}
export function download(data:string|Uint8Array,name:string,mime='application/json'){const blob=new Blob([typeof data==='string'?data:new Uint8Array(data)],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export function readZip(bytes:Uint8Array):Promise<{path:string;bytes:Uint8Array}[]>{
  return new Promise((resolve,reject)=>{const files:{path:string;bytes:Uint8Array}[]=[];let total=0,pending=0,ended=false,failed=false;const paths=new Set<string>();const active:{terminate?:()=>void}[]=[];
    const fail=(error:unknown)=>{if(failed)return;failed=true;active.forEach(a=>a.terminate?.());reject(error instanceof Error?error:new Error(String(error)));};
    const unzip=new Unzip(file=>{try{const path=safePath(file.name.replace(/\/$/,''));if(file.name.endsWith('/'))return;if(paths.has(path))throw new Error('Duplicate ZIP file path: '+path);paths.add(path);if(path.split('/').some(s=>s.startsWith('.')))return;if(files.length+pending>=10000)throw new Error('Import up to 10,000 files per ZIP.');if(file.originalSize&&file.originalSize>20_000_000)throw new Error(`File exceeds 20 MB: ${path}`);pending++;const chunks:Uint8Array[]=[];let size=0;active.push(file);file.ondata=(error,data,final)=>{if(failed)return;if(error){fail(error);return;}size+=data.length;total+=data.length;if(size>20_000_000||total>100_000_000){fail(new Error('ZIP expands beyond the import limit (20 MB per file, 100 MB total).'));return;}chunks.push(data);if(final){const result=new Uint8Array(size);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}files.push({path,bytes:result});pending--;if(ended&&!pending)resolve(files);}};file.start();}catch(e){fail(e);}});
    unzip.register(UnzipInflate);try{unzip.push(bytes,true);ended=true;if(!pending&&!failed)resolve(files);}catch(e){fail(e);}
  });
}
export { strFromU8 };
