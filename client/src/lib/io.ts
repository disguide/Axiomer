// Import / export the graph as JSON. The exported file is the canonical store
// (data/graph.json) in the read-mostly architecture (see docs/ARCHITECTURE.md):
// an editor exports, opens a PR, and the merged JSON is published read-only.
//
// parseGraph is pure and strict so a malformed or hand-edited file is rejected
// with a clear error rather than silently corrupting the viewer.

import type { Graph, GraphEdge, GraphNode } from "./types";
import { EDGE_TYPES, NODE_TYPES } from "./types";

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
  if (typeof createdAt === "string") node.createdAt = createdAt;
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

// Validate a parsed/loaded object into a Graph (throws on any problem).
export function validateGraph(value: unknown): Graph {
  if (!isObject(value)) throw new Error("graph is not an object");
  if (!Array.isArray(value.nodes)) throw new Error("graph.nodes must be an array");
  if (!Array.isArray(value.edges)) throw new Error("graph.edges must be an array");
  const nodes = value.nodes.map(parseNode);
  const edges = value.edges.map(parseEdge);
  // Referential integrity: every edge endpoint must exist.
  const ids = new Set(nodes.map((n) => n.id));
  for (const [i, e] of edges.entries()) {
    if (!ids.has(e.from)) throw new Error(`edges[${i}].from "${e.from}" has no node`);
    if (!ids.has(e.to)) throw new Error(`edges[${i}].to "${e.to}" has no node`);
  }
  return { nodes, edges };
}

export function parseGraph(text: string): Graph {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(`invalid JSON: ${(err as Error).message}`);
  }
  return validateGraph(json);
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
  return file.text().then(parseGraph);
}
