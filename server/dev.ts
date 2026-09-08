import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync,readFileSync,readdirSync } from 'node:fs';
import { localDatabase } from './local-database';
import { handleApi } from './api';
import { Repository } from './repository';
mkdirSync('.local',{recursive:true});
const sqlite=new DatabaseSync('.local/axiomer.db');sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){
  if(sqlite.prepare('SELECT name FROM local_migrations WHERE name=?').get(file))continue;
  sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(`drizzle/${file}`,'utf8'));sqlite.prepare('INSERT INTO local_migrations (name) VALUES (?)').run(file);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}
}
const db=localDatabase(sqlite);await new Repository(db).seed();
createServer(async(req,res)=>{try{const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100000){res.writeHead(413);res.end();return;}chunks.push(chunk);}const method=req.method??'GET';const body=['GET','HEAD'].includes(method)?undefined:Buffer.concat(chunks);const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);const request=new Request(`http://${req.headers.host}${req.url}`,{method,headers,body});const response=await handleApi(request,db);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());}catch(e){console.error(e);res.writeHead(500);res.end('{"error":"Local server error"}');}}).listen(4174,'127.0.0.1',()=>console.log('Axiomer API: http://127.0.0.1:4174'));
