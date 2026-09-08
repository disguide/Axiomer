import { expect, it } from 'vitest';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { localDatabase } from './local-database';
import { Repository } from './repository';
import { handleApi } from './api';
it('the real stdio bridge discovers, reads, proposes and reports tool errors',async()=>{
  const sqlite=new DatabaseSync(':memory:');for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(`drizzle/${f}`,'utf8'));
  const db=localDatabase(sqlite);const repo=new Repository(db);await repo.seed();
  const server=createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);const data=Buffer.concat(chunks).toString();const response=await handleApi(new Request(`http://127.0.0.1${req.url}`,{method:req.method,headers:{'Content-Type':'application/json'},body:data||undefined}),db);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port;
  const child=spawn(process.execPath,['scripts/mcp.mjs'],{env:{...process.env,AXIOMER_URL:`http://127.0.0.1:${port}`,AXIOMER_COOKIE:''},stdio:['pipe','pipe','pipe']});
  try{
    let output='';child.stdout.on('data',b=>output+=b.toString());
    const done=new Promise<number|null>((resolve,reject)=>{child.on('exit',resolve);child.on('error',reject);});
    child.stdin.end([
      {jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05'}},
      {jsonrpc:'2.0',method:'notifications/initialized'},
      {jsonrpc:'2.0',id:2,method:'tools/list'},
      {jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'read_argument',arguments:{id:'transport'}}},
      {jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'read_argument',arguments:{id:'missing'}}},
      {jsonrpc:'2.0',id:5,method:'tools/call',params:{name:'propose_argument',arguments:{parent:'transport',baseVersion:1,relation:'supports',draft:{title:'Transport test proposal'},rationale:'Integration test'}}},
    ].map(v=>JSON.stringify(v)).join('\n')+'\n');
    expect(await done).toBe(0);const messages=output.trim().split('\n').map(line=>JSON.parse(line));expect(messages).toHaveLength(5);
    expect(messages[1].result.tools.map((t:{name:string})=>t.name)).toContain('propose_argument');
    expect(JSON.parse(messages[2].result.content[0].text).node.id).toBe('transport');expect(messages[3].result.isError).toBe(true);
    expect((await repo.listProposals(new URLSearchParams())).items[0].draft.title).toBe('Transport test proposal');expect((await repo.neighborhood('transport',new URLSearchParams())).counts.supports).toBe(3);
  }finally{child.kill();await new Promise<void>(resolve=>server.close(()=>resolve()));sqlite.close();}
},20000);
