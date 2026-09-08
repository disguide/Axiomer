import { Repository, ApiError, validateDraft, validRelation } from './repository';
import type { Statement, Relation } from '../client/src/atlas/model';
export async function importMap(repo:Repository,data:Record<string,unknown>){
  if(!Array.isArray(data.nodes)||!Array.isArray(data.edges))throw new ApiError(400,'Choose an Axiomer JSON map with nodes and edges.');
  if(data.nodes.length>200||data.edges.length>500)throw new ApiError(400,'Import up to 200 nodes and 500 connections at a time. Split larger imports into topic maps.');
  if(!data.nodes.length)throw new ApiError(400,'This map is empty.');
  const idMap=new Map<string,string>();const nodes:Statement[]=[];
  for(const raw of data.nodes){
    if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||idMap.has(raw.id))throw new ApiError(400,'Each imported node needs a unique ID.');
    const legacy=typeof raw.content==='string';const url=typeof raw.url==='string'&&/^https?:\/\//.test(raw.url)?raw.url:'';
    const draft=validateDraft(legacy?{title:raw.content.slice(0,500),body:`${raw.content.length>500?raw.content+'\n\n':''}Imported ${raw.type??'statement'}${raw.url&&!url?' · Original reference: '+raw.url:''}`,kind:raw.type==='source'&&url?'source':raw.type==='question'?'question':'claim',topic:'Imported maps',url,publisher:''}:raw);
    const n=repo.makeNode(draft);idMap.set(raw.id,n.id);nodes.push(n);
  }
  const edgeStatements=[];const incoming=new Set<string>();const seen=new Set<string>();
  for(const raw of data.edges){
    if(!raw||typeof raw!=='object')throw new ApiError(400,'Invalid connection.');
    let parent=raw.parent;let child=raw.child;let relation:Relation=raw.relation;
    if(raw.edgeType){const down=['grounds','cites','grounds-in'].includes(raw.edgeType);parent=down?raw.from:raw.to;child=down?raw.to:raw.from;relation=['conflicts','attacks','argues-against','objects-to'].includes(raw.edgeType)?'challenges':['annotates','connects-to','illustrates','raises'].includes(raw.edgeType)?'context':'supports';}
    if(!idMap.has(parent)||!idMap.has(child))throw new ApiError(400,'A connection points to a missing node.');
    const p=idMap.get(parent)!;const c=idMap.get(child)!;if(p===c)throw new ApiError(400,'Self-connections cannot be imported.');
    if(nodes.find(n=>n.id===c)?.kind==='source')relation='source';else if(relation==='source')relation='context';validRelation(relation);
    const key=`${p}:${c}:${relation}`;if(seen.has(key))continue;seen.add(key);incoming.add(c);
    edgeStatements.push(repo.db.prepare('INSERT INTO edges (id,parent,child,relation) VALUES (?,?,?,?)').bind(crypto.randomUUID(),p,c,relation));
  }
  const root=nodes.find(n=>!incoming.has(n.id))??nodes[0];if(root.kind==='claim')root.kind='question';
  // The exact original is retained as a backup, including unknown legacy metadata.
  await repo.db.batch([...nodes.map(n=>repo.insert(n)),...edgeStatements,repo.db.prepare('INSERT INTO metadata (key,value) VALUES (?,?)').bind(`import:${root.id}`,JSON.stringify(data))]);
  return {nodeId:root.id,nodes:nodes.length,connections:edgeStatements.length};
}
