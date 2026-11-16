import type { Graph, GraphEdge, GraphNode } from './types';
import { isTerminalType } from './types';
import { edgeEndpoints, type Acceptability } from './graph';

export interface GraphIndex {
  nodes: Map<string, GraphNode>;
  children: Map<string, string[]>;
  parents: Map<string, string[]>;
  childEdges: Map<string, GraphEdge[]>;
  roots: GraphNode[];
}

/** One linear scan supplies every map-navigation query. Session scope is not document data. */
export function indexGraph(graph: Graph): GraphIndex {
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const children = new Map(graph.nodes.map(node => [node.id, [] as string[]]));
  const parents = new Map(graph.nodes.map(node => [node.id, [] as string[]]));
  const childEdges = new Map(graph.nodes.map(node => [node.id, [] as GraphEdge[]]));
  for (const edge of graph.edges) {
    const { parent, child } = edgeEndpoints(edge);
    if (!nodes.has(parent) || !nodes.has(child)) continue;
    children.get(parent)!.push(child);
    parents.get(child)!.push(parent);
    childEdges.get(parent)!.push(edge);
  }
  return { nodes, children, parents, childEdges, roots: graph.nodes.filter(node => !parents.get(node.id)?.length) };
}

/** Iterative traversal also tolerates an old malformed cyclic document without hanging. */
export function relatedIds(index: GraphIndex, start: string, direction: 'children' | 'parents'): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  for (let offset = 0; offset < queue.length; offset += 1) {
    const current = queue[offset];
    if (seen.has(current) || !index.nodes.has(current)) continue;
    seen.add(current);
    for (const id of index[direction].get(current) || []) if (!seen.has(id)) queue.push(id);
  }
  return seen;
}

export interface MapScope { focusId?: string | null; depth?: number; maxNodes?: number }
export interface VisibleGraph { graph: Graph; truncated: boolean; reachableCount: number }

/** Breadth-first scope, so a large branch shows its nearest reasoning before distant details. */
export function selectVisibleGraph(graph: Graph, index: GraphIndex, { focusId, depth = Infinity, maxNodes = 200 }: MapScope = {}): VisibleGraph {
  const budget = Math.max(1, Math.floor(maxNodes));
  const selected = new Set<string>();
  const seen = new Set<string>();
  const starts = focusId && index.nodes.has(focusId) ? [focusId] : index.roots.map(node => node.id);
  // A cyclic legacy graph can have no root; still give it a reachable entry.
  if (starts.length === 0 && graph.nodes.length) starts.push(graph.nodes[0].id);
  const queue = starts.map(id => ({ id, level: 0 }));
  let reachableCount = 0;
  for (let offset = 0; offset < queue.length; offset += 1) {
    const { id, level } = queue[offset];
    if (seen.has(id) || !index.nodes.has(id)) continue;
    seen.add(id);
    reachableCount += 1;
    if (level <= depth && selected.size < budget) selected.add(id);
    for (const child of index.children.get(id) || []) if (!seen.has(child)) queue.push({ id: child, level: level + 1 });
  }
  return {
    graph: { nodes: graph.nodes.filter(node => selected.has(node.id)), edges: graph.edges.filter(edge => selected.has(edge.from) && selected.has(edge.to)) },
    truncated: selected.size < reachableCount,
    reachableCount,
  };
}

/** Same structural labels as graph.ts, computed once using indexed children and a leaf queue. */
export function indexedNodeStates(index: GraphIndex): { grounded: Map<string, boolean>; acceptability: Map<string, Acceptability> } {
  const grounded = new Map<string, boolean>();
  const acceptability = new Map<string, Acceptability>();
  const pending = new Map([...index.nodes].map(([id]) => [id, index.children.get(id)?.length || 0]));
  const queue = [...pending].filter(([, count]) => count === 0).map(([id]) => id);
  for (let offset = 0; offset < queue.length; offset += 1) {
    const id = queue[offset];
    const node = index.nodes.get(id)!;
    const edges = index.childEdges.get(id) || [];
    const directGround = edges.find(edge => edge.edgeType === 'grounds' && edge.from === id);
    const hasFoundation = Boolean(directGround && isTerminalType(index.nodes.get(directGround.to)!.type));
    if (node.type === 'claim') {
      const argumentsForClaim = edges.filter(edge => ['supports', 'conflicts'].includes(edge.edgeType)).map(edge => index.nodes.get(edgeEndpoints(edge).child)!).filter(child => child.type === 'support' || child.type === 'conflict');
      grounded.set(id, hasFoundation || (argumentsForClaim.length > 0 && argumentsForClaim.every(child => grounded.get(child.id))));
    } else grounded.set(id, node.type === 'support' || node.type === 'conflict' ? hasFoundation : true);
    const conflicts = (index.children.get(id) || []).filter(child => index.nodes.get(child)?.type === 'conflict');
    acceptability.set(id, conflicts.some(child => acceptability.get(child) === 'coherent') ? 'conflicted' : conflicts.every(child => acceptability.get(child) === 'conflicted') ? 'coherent' : 'contested');
    for (const parent of index.parents.get(id) || []) {
      const next = pending.get(parent)! - 1;
      pending.set(parent, next);
      if (next === 0) queue.push(parent);
    }
  }
  // Cycles are rejected at import. Defensive values keep legacy data navigable until repaired.
  for (const [id, node] of index.nodes) {
    if (!grounded.has(id)) grounded.set(id, !['claim', 'support', 'conflict'].includes(node.type));
    if (!acceptability.has(id)) acceptability.set(id, 'contested');
  }
  return { grounded, acceptability };
}
