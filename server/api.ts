import type { Database } from './database';
import { ApiError, Repository, textField } from './repository';
import { importMap } from './import';
import { agentTools } from '../client/src/atlas/agent-contract';
import { beginExport, expandExport, exportPage, exportProgress, importBatch } from './transfers';
import { attachmentResponse, listAttachments, uploadAttachment } from './files';
import type { FileBucket } from './files';
import { applyOrganization, changedNodes, organizationHistory, organizationStatus, runOrganization, setOrganization, undoOrganization } from './organizer';
import type { ModelConnection } from './organizer';
import { boundedBody } from './request-body';
export async function executeAgent(repo:Repository,name:string,args:Record<string,unknown>){const params=new URLSearchParams();for(const[k,v]of Object.entries(args))if(v!==undefined)params.set(k,String(v));if(name==='read_changed_nodes')return changedNodes(repo,params);if(name==='organize_node')return applyOrganization(repo,args);if(name==='list_projects')return repo.listProjects(params);if(name==='list_folders')return repo.listFolders(textField(args.project,'Project',200,true),params);if(name==='search_arguments')return repo.search(params);if(name==='read_argument')return repo.neighborhood(textField(args.id,'ID',200,true),params);if(name==='propose_argument')return repo.propose(args);throw new ApiError(404,'Unknown agent tool.');}
function json(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function handleApi(request:Request,db:Database,options:{files?:FileBucket;model?:ModelConnection}={}){
  try{
    const url=new URL(request.url);const path=url.pathname;const repo=new Repository(db);
    if(!['GET','HEAD'].includes(request.method)){
      const origin=request.headers.get('origin');if(origin&&origin!==url.origin)throw new ApiError(403,'Cross-origin writes are not allowed.');
      if(path==='/api/attachments'&&request.method==='POST')return json(await uploadAttachment(repo,request,options.files),201);
      if(!request.headers.get('content-type')?.includes('application/json'))throw new ApiError(415,'Send JSON.');
    }
    let body:Record<string,unknown>={};if(request.method!=='GET'&&request.method!=='HEAD'){const raw=new TextDecoder().decode(await boundedBody(request,3_200_000));try{body=JSON.parse(raw);}catch{throw new ApiError(400,'Invalid JSON.');}if(!body||typeof body!=='object'||Array.isArray(body))throw new ApiError(400,'Expected a JSON object.');}
    const id=path.split('/')[3];
    if(/^\/api\/attachments\/[^/]+$/.test(path)&&request.method==='GET')return await attachmentResponse(repo,id,options.files);
    if(/^\/api\/nodes\/[^/]+\/attachments$/.test(path)&&request.method==='GET')return json(await listAttachments(repo,id,url.searchParams));
    if(path==='/api/organization'&&request.method==='GET')return json(await organizationStatus(repo,options.model));
    if(path==='/api/organization'&&request.method==='POST')return json(await setOrganization(repo,body,options.model));
    if(path==='/api/organization/run'&&request.method==='POST')return json(await runOrganization(repo,options.model??{}));
    if(path==='/api/organization/history'&&request.method==='GET')return json(await organizationHistory(repo,url.searchParams));
    if(/^\/api\/organization\/[^/]+\/undo$/.test(path)&&request.method==='POST')return json(await undoOrganization(repo,id));
    if(path==='/api/health')return json({status:'ok',schema:2});
    if(path==='/api/agent-tools')return json({version:'1',tools:agentTools,endpoint:'/api/agent-call',authentication:'Uses the same site session as the reader. Argument changes create reviewable proposals. Metadata organization applies reversible labels and filing while preserving manual choices.'});
    if(path==='/api/agent-call'&&request.method==='POST'){
      if(body.arguments!==undefined&&(!body.arguments||typeof body.arguments!=='object'||Array.isArray(body.arguments)))throw new ApiError(400,'Tool arguments must be a JSON object.');
      return json(await executeAgent(repo,textField(body.name,'Tool name',100,true),(body.arguments??{}) as Record<string,unknown>));
    }
    if(path==='/api/overview'&&request.method==='GET')return json(await repo.overview());
    if(path==='/api/transfers/import'&&request.method==='POST')return json(await importBatch(repo,body));
    if(path==='/api/exports'&&request.method==='POST')return json(await beginExport(repo,body),201);
    if(/^\/api\/exports\/[^/]+$/.test(path)&&request.method==='POST')return json(await expandExport(repo,id));
    if(/^\/api\/exports\/[^/]+$/.test(path)&&request.method==='GET')return json(url.searchParams.has('part')?await exportPage(repo,id,url.searchParams):await exportProgress(repo,id));
    if(path==='/api/projects'&&request.method==='GET')return json(await repo.listProjects(url.searchParams));
    if(path==='/api/projects'&&request.method==='POST')return json(await repo.createContainer('project',body),201);
    if(/^\/api\/projects\/[^/]+\/folders$/.test(path)&&request.method==='GET')return json(await repo.listFolders(id,url.searchParams));
    if(/^\/api\/projects\/[^/]+$/.test(path)&&request.method==='GET')return json(await repo.project(id));
    if(/^\/api\/projects\/[^/]+$/.test(path)&&request.method==='PATCH')return json(await repo.renameContainer('project',id,body));
    if(/^\/api\/projects\/[^/]+$/.test(path)&&request.method==='DELETE')return json(await repo.removeContainer('project',id));
    if(path==='/api/folders'&&request.method==='POST')return json(await repo.createContainer('folder',body),201);
    if(/^\/api\/folders\/[^/]+$/.test(path)&&request.method==='GET')return json(await repo.folder(id));
    if(/^\/api\/folders\/[^/]+$/.test(path)&&request.method==='PATCH')return json(await repo.renameContainer('folder',id,body));
    if(/^\/api\/folders\/[^/]+$/.test(path)&&request.method==='DELETE')return json(await repo.removeContainer('folder',id));
    if(path==='/api/items/move'&&request.method==='POST')return json(await repo.moveItems(body));
    if(path==='/api/nodes'&&request.method==='GET')return json(await repo.search(url.searchParams));
    if(path==='/api/nodes'&&request.method==='POST')return json(await repo.create(body.draft,body.parent===undefined?undefined:textField(body.parent,'Parent',200,true),body.relation,body.destination),201);
    if(path==='/api/import'&&request.method==='POST'){
      const map=body.map??body;if(!map||typeof map!=='object'||Array.isArray(map))throw new ApiError(400,'Choose a valid map.');
      return json(await importMap(repo,map as Record<string,unknown>,body.destination),201);
    }
    if(/^\/api\/imports\/[^/]+$/.test(path)&&request.method==='GET'){
      const original=await db.prepare('SELECT value FROM metadata WHERE key=?').bind(`import:${id}`).first<{value:string}>();
      if(!original)throw new ApiError(404,'No original import was found for this node.');
      return json(JSON.parse(original.value));
    }
    if(/^\/api\/nodes\/[^/]+\/history$/.test(path)&&request.method==='GET')return json(await repo.history(id));
    if(/^\/api\/nodes\/[^/]+$/.test(path)&&request.method==='GET')return json(await repo.neighborhood(id,url.searchParams));
    if(/^\/api\/nodes\/[^/]+$/.test(path)&&request.method==='PATCH')return json(await repo.edit(id,body.draft,Number(body.version)));
    if(path==='/api/connections'&&request.method==='POST')return json(await repo.connect(textField(body.parent,'Parent',200,true),textField(body.child,'Child',200,true),body.relation));
    if(/^\/api\/connections\/[^/]+$/.test(path)&&request.method==='DELETE')return json(await repo.unlink(id));
    if(path==='/api/proposals'&&request.method==='GET')return json(await repo.listProposals(url.searchParams));
    if(path==='/api/proposals'&&request.method==='POST')return json(await repo.propose(body),201);
    if(/^\/api\/proposals\/[^/]+$/.test(path)&&request.method==='POST'){if(typeof body.accept!=='boolean')throw new ApiError(400,'A review decision is required.');return json(await repo.review(id,body.accept));}
    throw new ApiError(404,'Endpoint not found.');
  }catch(e){if(e instanceof ApiError)return json({error:e.message},e.status);console.error('Axiomer request failed',e);return json({error:'The request could not be saved. Please try again.'},500);}
}
