import { handleApi } from './api';
import { Repository } from './repository';
import type { Database } from './database';
import type { FileBucket } from './files';
interface Env {DB:Database;FILES?:FileBucket;OPENAI_API_KEY?:string;AXIOMER_AI_MODEL?:string;ASSETS:{fetch(request:Request):Promise<Response>};}
let initialized:Promise<void>|undefined;
export default {async fetch(request:Request,env:Env):Promise<Response>{
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/')){
    if(!env.DB)return Response.json({error:'Knowledge storage is not configured.'},{status:503});
    initialized??=new Repository(env.DB).seed().catch(e=>{initialized=undefined;throw e;});
    try{await initialized;}catch{return Response.json({error:'Knowledge storage is not ready.'},{status:503});}
    return handleApi(request,env.DB,{files:env.FILES,model:{apiKey:env.OPENAI_API_KEY,model:env.AXIOMER_AI_MODEL}});
  }
  const asset=await env.ASSETS.fetch(request);
  if(asset.status===404&&!path.split('/').pop()?.includes('.')){const u=new URL(request.url);u.pathname='/index.html';return env.ASSETS.fetch(new Request(u,request));}
  return asset;
}};
