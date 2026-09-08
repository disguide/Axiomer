import { build } from 'esbuild';
import { spawn } from 'node:child_process';
await build({entryPoints:['server/dev.ts'],outfile:'.local/dev.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});
const api=spawn(process.execPath,['.local/dev.mjs'],{stdio:'inherit'});
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{stdio:'inherit'});
function close(){api.kill();vite.kill();}process.on('SIGINT',()=>{close();process.exit();});process.on('SIGTERM',()=>{close();process.exit();});api.on('exit',code=>{if(code){close();process.exit(code);}});
