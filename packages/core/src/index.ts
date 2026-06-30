/** @axiomer/core — the shared graph substrate for every Axiomer lens. */

export type { Id, GraphNode, GraphEdge, Graph } from "./types";
export { emptyGraph } from "./types";

export {
  // ids
  newId,
  edgeId,
  // lookups
  getNode,
  hasNode,
  getEdge,
  outgoingEdges,
  incomingEdges,
  successors,
  predecessors,
  roots,
  leaves,
  nodesOfType,
  // traversal
  descendants,
  ancestors,
  subgraph,
  hasPath,
  hasCycle,
  // mutations
  addNode,
  updateNode,
  addEdge,
  removeEdge,
  removeNode,
  mergeNodes,
} from "./graph";
