import { agentTools } from './agent-contract';
import { post } from './client';
interface ToolContext {registerTool(tool:{name:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>Promise<unknown>},options:{signal:AbortSignal}):void|Promise<void>;}
export function registerAgentTools(onProposal:()=>void){
  const context=(document as Document & {modelContext?:ToolContext}).modelContext;
  if(!context?.registerTool)return ()=>{};
  const lifecycle=new AbortController();
  for(const tool of agentTools){
    try{Promise.resolve(context.registerTool({...tool,annotations:{readOnlyHint:!['propose_argument','organize_node'].includes(tool.name),untrustedContentHint:true},async execute(input){const result=await post('/agent-call',{name:tool.name,arguments:input});if(['propose_argument','organize_node'].includes(tool.name))onProposal();return result;}},{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser integration; the HTTP interface remains available. */}
  }
  return ()=>lifecycle.abort();
}
