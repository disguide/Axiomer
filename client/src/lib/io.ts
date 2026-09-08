// Import / export the graph as JSON or Markdown with strict schema validation.
// Supports both canonical JSON store and readable Markdown trees.

import type { Graph, GraphEdge, GraphNode } from "./types";
import { EDGE_TYPES, NODE_TYPES, migrateGraph } from "./types";
import {
  exportGraphToMarkdown,
  parseMarkdownGraph,
  parseMarkdownToGraph,
  importGraphFromMarkdown,
} from "./markdown";

export {
  exportGraphToMarkdown,
  parseMarkdownGraph,
  parseMarkdownToGraph,
  importGraphFromMarkdown,
};

const NODE_TYPE_SET = new Set<string>(NODE_TYPES);
const EDGE_TYPE_SET = new Set<string>(EDGE_TYPES);

export type ExportFormat = "json" | "markdown";
export type ImportFormat = "json" | "markdown" | "auto";

export function exportGraph(graph: Graph, format: ExportFormat = "json"): string {
  if (format === "markdown") {
    return exportGraphToMarkdown(graph);
  }
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
  if (typeof value.url === "string") {
    if (!/^https?:\/\//i.test(value.url)) throw new Error(`nodes[${i}].url must use http or https`);
    node.url = value.url;
  }
  if (typeof value.verified === "boolean") node.verified = value.verified;
  if (isObject(value.position) && typeof value.position.x === "number" && typeof value.position.y === "number" && Number.isFinite(value.position.x) && Number.isFinite(value.position.y)) {
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

// Validate a parsed/loaded object into a Graph (throws on any problem).
export function validateGraph(value: unknown): Graph {
  if (!isObject(value)) throw new Error("graph is not an object");
  if (!Array.isArray(value.nodes)) throw new Error("graph.nodes must be an array");
  if (!Array.isArray(value.edges)) throw new Error("graph.edges must be an array");
  const migrated = migrateGraph(value as { nodes: any[]; edges: any[] });
  const nodes = migrated.nodes.map(parseNode);
  const edges = migrated.edges.map(parseEdge);
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

export function importGraph(text: string, format: ImportFormat = "auto"): Graph {
  if (typeof text !== "string") {
    throw new Error("Cannot import non-string graph content");
  }

  const trimmed = text.trim();
  if (format === "markdown") {
    const mdGraph = parseMarkdownGraph(text);
    return validateGraph(mdGraph);
  }

  if (format === "json") {
    return parseGraph(text);
  }

  // format === "auto"
  if (trimmed.startsWith("{")) {
    return parseGraph(text);
  }

  // Attempt markdown parse
  try {
    const mdGraph = parseMarkdownGraph(text);
    return validateGraph(mdGraph);
  } catch (mdErr) {
    // If it started with [ or looks like bad JSON, try JSON to produce clear message
    try {
      return parseGraph(text);
    } catch {
      throw mdErr;
    }
  }
}

// --- Browser helpers (DOM; not used by the pure tests above) ---------------

export function downloadGraph(
  graph: Graph,
  filename?: string,
  format: ExportFormat = "json",
): void {
  const content = exportGraph(graph, format);
  const defaultExt = format === "markdown" ? "md" : "json";
  const defaultMime = format === "markdown" ? "text/markdown" : "application/json";
  const name = filename || `axiomer-export-${Date.now()}.${defaultExt}`;
  const blob = new Blob([content], { type: defaultMime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function readGraphFile(file: File): Promise<Graph> {
  const isMd = /\.md$/i.test(file.name) || /\.markdown$/i.test(file.name);
  const isJson = /\.json$/i.test(file.name);
  const format: ImportFormat = isMd ? "markdown" : isJson ? "json" : "auto";
  return file.text().then((text) => importGraph(text, format));
}
