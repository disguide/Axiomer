// Import / export the graph as JSON. The exported file is the canonical store
// (data/graph.json) in the read-mostly architecture (see docs/ARCHITECTURE.md):
// an editor exports, opens a PR, and the merged JSON is published read-only.
//
// parseGraph is pure and strict so a malformed or hand-edited file is rejected
// with a clear error rather than silently corrupting the viewer.

import type { Graph, GraphEdge, GraphNode } from "./types";
import { EDGE_TYPES, NODE_TYPES, isTerminalType, migrateGraph } from "./types";
import { edgeEndpoints } from "./graph";

export const MAX_GRAPH_NODES = 10_000;
export const MAX_GRAPH_EDGES = 50_000;
export const MAX_GRAPH_BYTES = 5 * 1024 * 1024;

const NODE_TYPE_SET = new Set<string>(NODE_TYPES);
const EDGE_TYPE_SET = new Set<string>(EDGE_TYPES);

export function exportGraph(graph: Graph): string {
  return JSON.stringify(graph, null, 2) + "\n";
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseNode(value: unknown, i: number): GraphNode {
  if (!isObject(value)) throw new Error(`nodes[${i}] is not an object`);
  const { id, type, content, createdAt } = value;
  if (typeof id !== "string" || !id) throw new Error(`nodes[${i}].id missing`);
  if (typeof type !== "string" || !NODE_TYPE_SET.has(type))
    throw new Error(`nodes[${i}].type "${String(type)}" is not a valid NodeType`);
  if (typeof content !== "string")
    throw new Error(`nodes[${i}].content must be a string`);
  const node: GraphNode = { id, type: type as GraphNode["type"], content };
  if (createdAt !== undefined) {
    if (typeof createdAt !== "string") throw new Error(`nodes[${i}].createdAt must be a string`);
    node.createdAt = createdAt;
  }
  if (value.url !== undefined) {
    if (typeof value.url !== "string") throw new Error(`nodes[${i}].url must be a URL`);
    let url: URL;
    try { url = new URL(value.url); } catch { throw new Error(`nodes[${i}].url must be an absolute http(s) URL`); }
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`nodes[${i}].url must use http or https`);
    node.url = value.url;
  }
  if (value.verified !== undefined) {
    if (typeof value.verified !== "boolean") throw new Error(`nodes[${i}].verified must be a boolean`);
    node.verified = value.verified;
  }
  if (value.position !== undefined) {
    if (!isObject(value.position) || typeof value.position.x !== "number" || typeof value.position.y !== "number" || !Number.isFinite(value.position.x) || !Number.isFinite(value.position.y))
      throw new Error(`nodes[${i}].position must contain finite x and y coordinates`);
    node.position = { x: value.position.x, y: value.position.y };
  }
  return node;
}

function parseEdge(value: unknown, i: number): GraphEdge {
  if (!isObject(value)) throw new Error(`edges[${i}] is not an object`);
  const { id, from, to, edgeType } = value;
  if (typeof id !== "string" || !id) throw new Error(`edges[${i}].id missing`);
  if (typeof from !== "string" || !from)
    throw new Error(`edges[${i}].from missing`);
  if (typeof to !== "string" || !to) throw new Error(`edges[${i}].to missing`);
  if (typeof edgeType !== "string" || !EDGE_TYPE_SET.has(edgeType))
    throw new Error(
      `edges[${i}].edgeType "${String(edgeType)}" is not a valid EdgeType`,
    );
  return { id, from, to, edgeType: edgeType as GraphEdge["edgeType"] };
}

// Validate input before migration: malformed legacy rows must produce readable errors.
// Hierarchy checks use semantic parent/child direction, not raw from/to fields.
export function validateGraph(value: unknown): Graph {
  if (!isObject(value)) throw new Error("graph is not an object");
  if (!Array.isArray(value.nodes)) throw new Error("graph.nodes must be an array");
  if (!Array.isArray(value.edges)) throw new Error("graph.edges must be an array");
  if (value.nodes.length > MAX_GRAPH_NODES) throw new Error(`A map can contain at most ${MAX_GRAPH_NODES.toLocaleString("en-US")} thoughts`);
  if (value.edges.length > MAX_GRAPH_EDGES) throw new Error(`A map can contain at most ${MAX_GRAPH_EDGES.toLocaleString("en-US")} connections`);
  value.nodes.forEach((node, i) => {
    if (!isObject(node)) throw new Error(`nodes[${i}] is not an object`);
  });
  value.edges.forEach((edge, i) => {
    if (!isObject(edge)) throw new Error(`edges[${i}] is not an object`);
  });
  const migrated = migrateGraph(value as { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] });
  const nodes = migrated.nodes.map(parseNode);
  const edges = migrated.edges.map(parseEdge);
  const nodeById = new Map<string, GraphNode>();
  for (const node of nodes) {
    if (nodeById.has(node.id)) throw new Error(`Duplicate node id "${node.id}"`);
    nodeById.set(node.id, node);
  }
  const edgeIds = new Set<string>();
  const children = new Map<string, string[]>();
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  for (const [i, edge] of edges.entries()) {
    if (edgeIds.has(edge.id)) throw new Error(`Duplicate edge id "${edge.id}"`);
    edgeIds.add(edge.id);
    if (!nodeById.has(edge.from)) throw new Error(`edges[${i}].from "${edge.from}" has no node`);
    if (!nodeById.has(edge.to)) throw new Error(`edges[${i}].to "${edge.to}" has no node`);
    if (edge.from === edge.to) throw new Error(`edges[${i}] cannot connect a thought to itself`);
    const { parent, child } = edgeEndpoints(edge);
    if (isTerminalType(nodeById.get(parent)!.type)) throw new Error(`Foundation "${parent}" cannot have children`);
    const list = children.get(parent) || [];
    list.push(child);
    children.set(parent, list);
    incoming.set(child, incoming.get(child)! + 1);
  }
  // Kahn's algorithm is iterative, so deep imported maps cannot overflow the stack.
  const queue = nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id);
  let visited = 0;
  for (let index = 0; index < queue.length; index += 1) {
    visited += 1;
    for (const child of children.get(queue[index]) || []) {
      const remaining = incoming.get(child)! - 1;
      incoming.set(child, remaining);
      if (remaining === 0) queue.push(child);
    }
  }
  if (visited !== nodes.length) throw new Error("This map contains a circular argument connection. Remove the cycle before importing.");
  return { nodes, edges };
}

export function parseGraph(text: string): Graph {
  assertGraphTextSize(text);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(`invalid JSON: ${(err as Error).message}`);
  }
  return validateGraph(json);
}

export function assertGraphTextSize(text: string): void {
  if (new TextEncoder().encode(text).byteLength > MAX_GRAPH_BYTES)
    throw new Error("Choose a map file smaller than 5 MiB");
}

// --- Browser helpers (DOM; not used by the pure tests above) ---------------

export function downloadGraph(graph: Graph, filename = "graph.json"): void {
  const blob = new Blob([exportGraph(graph)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readGraphFile(file: File): Promise<Graph> {
  if (file.size > MAX_GRAPH_BYTES) return Promise.reject(new Error("Choose a map file smaller than 5 MiB"));
  return file.text().then(parseGraph);
}
