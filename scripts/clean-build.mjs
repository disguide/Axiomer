import { realpathSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const output=resolve(root,'dist');
if(existsSync(output)){
  const actual=realpathSync(output);const child=relative(root,actual);
  if(child!=='dist'||isAbsolute(child)||actual!==output)throw new Error('Refusing to clean an output path outside this project.');
  rmSync(actual,{recursive:true,force:true});
}
