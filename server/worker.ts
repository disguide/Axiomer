import { handleApi } from './api';
import { Repository } from './repository';
import type { Database } from './database';
interface Env {DB:Database;ASSETS:{fetch(request:Request):Promise<Response>};}
let initialized:Promise<void>|undefined;
export default {async fetch(request:Request,env:Env):Promise<Response>{
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/')){
    if(!env.DB)return Response.json({error:'Knowledge storage is not configured.'},{status:503});
    initialized??=new Repository(env.DB).seed().catch(e=>{initialized=undefined;throw e;});
    try{await initialized;}catch{return Response.json({error:'Knowledge storage is not ready.'},{status:503});}
    return handleApi(request,env.DB);
  }
  const asset=await env.ASSETS.fetch(request);
  if(asset.status===404&&!path.split('/').pop()?.includes('.')){const u=new URL(request.url);u.pathname='/index.html';return env.ASSETS.fetch(new Request(u,request));}
  return asset;
}};
