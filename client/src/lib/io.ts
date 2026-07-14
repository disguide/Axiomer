// Import / export the graph as JSON. The exported file is the canonical store
// (data/graph.json) in the read-mostly architecture (see docs/ARCHITECTURE.md):
// an editor exports, opens a PR, and the merged JSON is published read-only.
//
// parseGraph is pure and strict so a malformed or hand-edited file is rejected
// with a clear error rather than silently corrupting the viewer.

import type { Graph, GraphEdge, GraphNode, StatusMeta } from "./types";
import {
  CONTENT_KINDS,
  EDGE_TYPES,
  INFERENCE_STRENGTHS,
  NODE_STATUSES,
  NODE_TYPES,
  PROOF_STANDARDS,
} from "./types";

const NODE_TYPE_SET = new Set<string>(NODE_TYPES);
const EDGE_TYPE_SET = new Set<string>(EDGE_TYPES);
const NODE_STATUS_SET = new Set<string>(NODE_STATUSES);
const CONTENT_KIND_SET = new Set<string>(CONTENT_KINDS);
const STRENGTH_SET = new Set<string>(INFERENCE_STRENGTHS);
const PROOF_STANDARD_SET = new Set<string>(PROOF_STANDARDS);

export function exportGraph(graph: Graph): string {
  return JSON.stringify(graph, null, 2) + "\n";
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseNode(value: unknown, i: number): GraphNode {
  if (!isObject(value)) throw new Error(`nodes[${i}] is not an object`);
  const {
    id,
    type,
    content,
    createdAt,
    status,
    statusMeta,
    contentKind,
    schemeTag,
    proofStandard,
  } = value;
  if (typeof id !== "string" || !id) throw new Error(`nodes[${i}].id missing`);
  if (typeof type !== "string" || !NODE_TYPE_SET.has(type))
    throw new Error(`nodes[${i}].type "${String(type)}" is not a valid NodeType`);
  if (typeof content !== "string")
    throw new Error(`nodes[${i}].content must be a string`);
  const node: GraphNode = { id, type: type as GraphNode["type"], content };
  if (typeof createdAt === "string") node.createdAt = createdAt;
  if (status !== undefined) {
    if (typeof status !== "string" || !NODE_STATUS_SET.has(status))
      throw new Error(
        `nodes[${i}].status "${String(status)}" is not a valid NodeStatus`,
      );
    node.status = status as GraphNode["status"];
  }
  if (statusMeta !== undefined) {
    if (!isObject(statusMeta))
      throw new Error(`nodes[${i}].statusMeta must be an object`);
    const meta: StatusMeta = {};
    if (typeof statusMeta.by === "string") meta.by = statusMeta.by;
    if (typeof statusMeta.at === "string") meta.at = statusMeta.at;
    if (typeof statusMeta.reason === "string") meta.reason = statusMeta.reason;
    node.statusMeta = meta;
  }
  if (contentKind !== undefined) {
    if (typeof contentKind !== "string" || !CONTENT_KIND_SET.has(contentKind))
      throw new Error(
        `nodes[${i}].contentKind "${String(contentKind)}" is not a valid ContentKind`,
      );
    node.contentKind = contentKind as GraphNode["contentKind"];
  }
  if (schemeTag !== undefined) {
    if (typeof schemeTag !== "string")
      throw new Error(`nodes[${i}].schemeTag must be a string`);
    node.schemeTag = schemeTag;
  }
  if (proofStandard !== undefined) {
    if (
      typeof proofStandard !== "string" ||
      !PROOF_STANDARD_SET.has(proofStandard)
    )
      throw new Error(
        `nodes[${i}].proofStandard "${String(proofStandard)}" is not a valid ProofStandard`,
      );
    node.proofStandard = proofStandard as GraphNode["proofStandard"];
  }
  const { x, y } = value;
  if (x !== undefined) {
    if (typeof x !== "number" || !Number.isFinite(x))
      throw new Error(`nodes[${i}].x must be a finite number`);
    node.x = x;
  }
  if (y !== undefined) {
    if (typeof y !== "number" || !Number.isFinite(y))
      throw new Error(`nodes[${i}].y must be a finite number`);
    node.y = y;
  }
  return node;
}

function parseEdge(value: unknown, i: number): GraphEdge {
  if (!isObject(value)) throw new Error(`edges[${i}] is not an object`);
  const { id, from, to, edgeType, strength } = value;
  if (typeof id !== "string" || !id) throw new Error(`edges[${i}].id missing`);
  if (typeof from !== "string" || !from)
    throw new Error(`edges[${i}].from missing`);
  if (typeof to !== "string" || !to) throw new Error(`edges[${i}].to missing`);
  if (typeof edgeType !== "string" || !EDGE_TYPE_SET.has(edgeType))
    throw new Error(
      `edges[${i}].edgeType "${String(edgeType)}" is not a valid EdgeType`,
    );
  const edge: GraphEdge = {
    id,
    from,
    to,
    edgeType: edgeType as GraphEdge["edgeType"],
  };
  if (strength !== undefined) {
    if (typeof strength !== "string" || !STRENGTH_SET.has(strength))
      throw new Error(
        `edges[${i}].strength "${String(strength)}" is not a valid InferenceStrength`,
      );
    edge.strength = strength as GraphEdge["strength"];
  }
  return edge;
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
