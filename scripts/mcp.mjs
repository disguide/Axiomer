// A thin MCP stdio transport over the same persistent API used by the UI.
import { createInterface } from 'node:readline';
const base=(process.env.AXIOMER_URL||'http://127.0.0.1:4174').replace(/\/$/,'');
async function request(path,body){const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(process.env.AXIOMER_COOKIE?{Cookie:process.env.AXIOMER_COOKIE}:{})},body:body?JSON.stringify(body):undefined});if(!response.ok)throw new Error(`Axiomer request failed (${response.status})`);return response.json();}
const input=createInterface({input:process.stdin});
for await(const line of input){let message;try{message=JSON.parse(line);if(message.id===undefined)continue;let result;
  if(message.method==='initialize')result={protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'axiomer',version:'2.0.0'}};
  else if(message.method==='ping')result={};
  else if(message.method==='tools/list')result={tools:(await request('/api/agent-tools')).tools};
  else if(message.method==='tools/call'){try{result={content:[{type:'text',text:JSON.stringify(await request('/api/agent-call',{name:message.params.name,arguments:message.params.arguments??{}}))}]};}catch(e){result={isError:true,content:[{type:'text',text:e.message}]};}}
  else{process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'Method not found'}})+'\n');continue;}
  process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result})+'\n');
}catch(e){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message?.id??null,error:{code:-32603,message:e.message}})+'\n');}}
