import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { FileBucket } from './files';
export function localFiles(root:string):FileBucket{
  const directory=resolve(root);const path=(key:string)=>{if(!/^[a-z0-9_-]+$/i.test(key))throw new Error('Invalid file key.');return join(directory,key);};
  return {async put(key,value){await mkdir(directory,{recursive:true});await writeFile(path(key),new Uint8Array(value));},async get(key){try{const data=await readFile(path(key));const bytes=new Uint8Array(data);return {body:new ReadableStream({start(c){c.enqueue(bytes);c.close();}}),async arrayBuffer(){return bytes.buffer;}};}catch(e){if((e as {code?:string}).code==='ENOENT')return null;throw e;}},async delete(key){try{await unlink(path(key));}catch(e){if((e as {code?:string}).code!=='ENOENT')throw e;}}};
}
