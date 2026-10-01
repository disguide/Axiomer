import type { Neighborhood, Summary, Relation } from './model';
export interface OutlineRow {key:string;node:Summary;depth:number;parentIndex:number;relation:Relation|'root';reused:boolean;loadMore?:boolean;parentId?:string;origin?:string;}
// Iterative traversal keeps deep/cyclic graphs off the JS call stack. Shared nodes expand once.
export function flattenOutline(root:Summary,cache:Map<string,Neighborhood>,expanded:Set<string>,maxRows=20000):OutlineRow[]{
  const rows:OutlineRow[]=[];const seen=new Set<string>();
  const stack:OutlineRow[]=[{key:root.id,node:root,depth:0,parentIndex:-1,relation:'root',reused:false}];
  while(stack.length&&rows.length<maxRows){const row=stack.pop()!;if(row.loadMore){rows.push(row);continue;}row.reused=seen.has(row.node.id);const index=rows.length;rows.push(row);if(row.reused)continue;seen.add(row.node.id);
    if(!expanded.has(row.node.id))continue;const graph=cache.get(row.node.id);if(!graph)continue;
    if(graph.nextCursor)stack.push({key:'more:'+row.node.id,node:row.node,depth:row.depth+1,parentIndex:index,relation:'context',reused:false,loadMore:true,parentId:row.node.id});
    for(let i=graph.children.length-1;i>=0;i--){const n=graph.children[i];stack.push({key:n.edgeId,node:n,depth:row.depth+1,parentIndex:index,relation:n.relation,reused:false,origin:n.origin});}
  }return rows;
}
export function outlineAncestors(rows:OutlineRow[],index:number){const path:{id:string;title:string}[]=[];let parent=rows[index]?.parentIndex??-1;while(parent>=0){path.push({id:rows[parent].node.id,title:rows[parent].node.title});parent=rows[parent].parentIndex;}return path.reverse();}
