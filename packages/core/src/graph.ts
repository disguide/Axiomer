/**
 * Pure operations over the shared graph substrate.
 *
 * All mutations are immutable: every `add*` / `remove*` / `update*` returns a new
 * `Graph` and never touches the input. All queries are read-only. No React, DOM,
 * or network — this is the tested foundation every lens reads from.
 */

import type { Graph, GraphEdge, GraphNode, Id } from "./types";

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

let _counter = 0;

/**
 * Generate a unique id. Prefer passing explicit ids when you have stable ones
 * (e.g. from storage); this is for fresh client-side nodes/edges.
 */
export function newId(prefix = "n"): Id {
  _counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${_counter.toString(36)}`;
}

/** Deterministic edge id from its endpoints + relationship. */
export function edgeId(from: Id, rel: string, to: Id): Id {
  return `${from}--${rel}-->${to}`;
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function getNode(g: Graph, id: Id): GraphNode | undefined {
  return g.nodes.find((n) => n.id === id);
}

export function hasNode(g: Graph, id: Id): boolean {
  return g.nodes.some((n) => n.id === id);
}

export function getEdge(g: Graph, id: Id): GraphEdge | undefined {
  return g.edges.find((e) => e.id === id);
}

/** Edges leaving `id` (where `id` is the `from`). */
export function outgoingEdges(g: Graph, id: Id): GraphEdge[] {
  return g.edges.filter((e) => e.from === id);
}

/** Edges entering `id` (where `id` is the `to`). */
export function incomingEdges(g: Graph, id: Id): GraphEdge[] {
  return g.edges.filter((e) => e.to === id);
}

/** Nodes reachable by one outgoing hop. */
export function successors(g: Graph, id: Id): GraphNode[] {
  return outgoingEdges(g, id)
    .map((e) => getNode(g, e.to))
    .filter((n): n is GraphNode => n !== undefined);
}

/** Nodes that reach `id` by one incoming hop. */
export function predecessors(g: Graph, id: Id): GraphNode[] {
  return incomingEdges(g, id)
    .map((e) => getNode(g, e.from))
    .filter((n): n is GraphNode => n !== undefined);
}

/** Roots: nodes with no incoming edges. */
export function roots(g: Graph): GraphNode[] {
  const hasIncoming = new Set(g.edges.map((e) => e.to));
  return g.nodes.filter((n) => !hasIncoming.has(n.id));
}

/** Leaves: nodes with no outgoing edges. */
export function leaves(g: Graph): GraphNode[] {
  const hasOutgoing = new Set(g.edges.map((e) => e.from));
  return g.nodes.filter((n) => !hasOutgoing.has(n.id));
}

export function nodesOfType(g: Graph, type: string): GraphNode[] {
  return g.nodes.filter((n) => n.type === type);
}

// ---------------------------------------------------------------------------
// Traversal
// ---------------------------------------------------------------------------

/**
 * All nodes reachable from `id` following outgoing edges (transitive
 * successors), excluding `id` itself. Cycle-safe.
 */
export function descendants(g: Graph, id: Id): GraphNode[] {
  return traverse(g, id, "out");
}

/**
 * All nodes that can reach `id` following edges backwards (transitive
 * predecessors), excluding `id` itself. Cycle-safe.
 */
export function ancestors(g: Graph, id: Id): GraphNode[] {
  return traverse(g, id, "in");
}

function traverse(g: Graph, start: Id, dir: "in" | "out"): GraphNode[] {
  const seen = new Set<Id>([start]);
  const out: GraphNode[] = [];
  const stack: Id[] = [start];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const next = dir === "out" ? successors(g, cur) : predecessors(g, cur);
    for (const n of next) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        out.push(n);
        stack.push(n.id);
      }
    }
  }
  return out;
}

/**
 * The subgraph induced by a set of node ids: those nodes plus every edge whose
 * endpoints are both in the set.
 */
export function subgraph(g: Graph, ids: Iterable<Id>): Graph {
  const set = new Set(ids);
  return {
    nodes: g.nodes.filter((n) => set.has(n.id)),
    edges: g.edges.filter((e) => set.has(e.from) && set.has(e.to)),
  };
}

/** True if a directed path exists from `from` to `to` (following outgoing edges). */
export function hasPath(g: Graph, from: Id, to: Id): boolean {
  if (from === to) return true;
  return descendants(g, from).some((n) => n.id === to);
}

/** True if the graph contains a directed cycle. */
export function hasCycle(g: Graph): boolean {
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<Id, number>(g.nodes.map((n) => [n.id, WHITE]));
  const adj = new Map<Id, Id[]>();
  for (const n of g.nodes) adj.set(n.id, []);
  for (const e of g.edges) adj.get(e.from)?.push(e.to);

  const visit = (id: Id): boolean => {
    color.set(id, GRAY);
    for (const next of adj.get(id) ?? []) {
      const c = color.get(next);
      if (c === GRAY) return true; // back-edge → cycle
      if (c === WHITE && visit(next)) return true;
    }
    color.set(id, BLACK);
    return false;
  };

  for (const n of g.nodes) {
    if (color.get(n.id) === WHITE && visit(n.id)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Mutations (immutable — always return a new Graph)
// ---------------------------------------------------------------------------

/** Add a node. Throws if the id already exists. */
export function addNode(g: Graph, node: GraphNode): Graph {
  if (hasNode(g, node.id)) {
    throw new Error(`addNode: node "${node.id}" already exists`);
  }
  return { ...g, nodes: [...g.nodes, node] };
}

/** Shallow-merge a patch into a node's fields. No-op if the node is missing. */
export function updateNode(
  g: Graph,
  id: Id,
  patch: Partial<Omit<GraphNode, "id">>,
): Graph {
  return {
    ...g,
    nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
  };
}

/**
 * Add a directed edge. Both endpoints must exist. Idempotent: an identical
 * (from, rel, to) edge is not duplicated. Returns the graph unchanged if the
 * edge already exists.
 */
export function addEdge(
  g: Graph,
  from: Id,
  to: Id,
  rel: string,
  data?: Record<string, unknown>,
): Graph {
  if (!hasNode(g, from)) throw new Error(`addEdge: missing node "${from}"`);
  if (!hasNode(g, to)) throw new Error(`addEdge: missing node "${to}"`);
  const id = edgeId(from, rel, to);
  if (g.edges.some((e) => e.id === id)) return g;
  const edge: GraphEdge = { id, from, to, rel, ...(data ? { data } : {}) };
  return { ...g, edges: [...g.edges, edge] };
}

/** Remove an edge by id. */
export function removeEdge(g: Graph, id: Id): Graph {
  return { ...g, edges: g.edges.filter((e) => e.id !== id) };
}

/** Remove a node and every edge touching it. */
export function removeNode(g: Graph, id: Id): Graph {
  return {
    nodes: g.nodes.filter((n) => n.id !== id),
    edges: g.edges.filter((e) => e.from !== id && e.to !== id),
  };
}

/**
 * Merge `fromIds` into `into`: re-point every edge touching a merged node to
 * `into` (preserving relationships), drop the merged nodes, and de-duplicate and
 * de-loop the resulting edges. This is the substrate-level primitive behind
 * convergence/dedup (e.g. folding duplicate values into one canonical node).
 */
export function mergeNodes(g: Graph, fromIds: Id[], into: Id): Graph {
  const merged = new Set(fromIds.filter((id) => id !== into));
  if (merged.size === 0) return g;
  const remap = (id: Id) => (merged.has(id) ? into : id);

  const nodes = g.nodes.filter((n) => !merged.has(n.id));
  const seen = new Set<Id>();
  const edges: GraphEdge[] = [];
  for (const e of g.edges) {
    const from = remap(e.from);
    const to = remap(e.to);
    if (from === to) continue; // drop self-loops created by the merge
    const id = edgeId(from, e.rel, to);
    if (seen.has(id)) continue; // de-duplicate
    seen.add(id);
    edges.push({ ...e, id, from, to });
  }
  return { nodes, edges };
}
