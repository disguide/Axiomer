import type { Neighborhood } from './model';
export function exportNeighborhood(graph:Neighborhood){
  return {schemaVersion:2,scope:'Displayed neighborhood',nodes:[...new Map([graph.node,...graph.children].map(n=>[n.id,n])).values()],edges:graph.children.map(n=>({id:n.edgeId,parent:graph.node.id,child:n.id,relation:n.relation})),truncated:!!graph.nextCursor};
}
