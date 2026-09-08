import { build } from 'esbuild';
import { mkdirSync,copyFileSync } from 'node:fs';
await build({entryPoints:['server/worker.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});
mkdirSync('dist/.openai',{recursive:true});copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
