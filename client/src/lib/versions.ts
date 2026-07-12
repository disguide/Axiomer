// Versions: local drafts + graph diffing — the client-side analog of
// branches and draft pull requests (docs/ARCHITECTURE.md's propose-and-review
// model, brought into the app).
//
// A DRAFT is a named snapshot of the whole graph in localStorage. You draft
// before an experiment, keep working, then DIFF the draft against the current
// graph and either restore it, keep both, or export/share it for someone else
// to review. diffGraphs is pure and tested; storage helpers are a thin
// localStorage layer used by SharePanel.

import type { Graph, GraphEdge, GraphNode } from "./types";

// --- Diff (pure) --------------------------------------------------------------

export interface NodeChange {
  before: GraphNode;
  after: GraphNode;
  fields: string[]; // which fields differ: content, status, contentKind, …
}

export interface GraphDiff {
  addedNodes: GraphNode[];
  removedNodes: GraphNode[];
  changedNodes: NodeChange[];
  addedEdges: GraphEdge[];
  removedEdges: GraphEdge[];
  identical: boolean;
}

const NODE_FIELDS = [
  "type",
  "content",
  "status",
  "contentKind",
  "schemeTag",
  "proofStandard",
] as const;

// Edges are compared structurally (endpoints + type), not by generated id —
// two exports of the same logical edge must not read as a change.
function edgeKey(e: GraphEdge): string {
  return `${e.edgeType}|${e.from}|${e.to}|${e.strength ?? ""}`;
}

// What changed going FROM base TO next.
export function diffGraphs(base: Graph, next: Graph): GraphDiff {
  const baseNodes = new Map(base.nodes.map((n) => [n.id, n]));
  const nextNodes = new Map(next.nodes.map((n) => [n.id, n]));

  const addedNodes = next.nodes.filter((n) => !baseNodes.has(n.id));
  const removedNodes = base.nodes.filter((n) => !nextNodes.has(n.id));
  const changedNodes: NodeChange[] = [];
  for (const [id, before] of baseNodes) {
    const after = nextNodes.get(id);
    if (!after) continue;
    const fields = NODE_FIELDS.filter((f) => before[f] !== after[f]);
    if (fields.length > 0) changedNodes.push({ before, after, fields: [...fields] });
  }

  const baseEdges = new Map(base.edges.map((e) => [edgeKey(e), e]));
  const nextEdges = new Map(next.edges.map((e) => [edgeKey(e), e]));
  const addedEdges = [...nextEdges.entries()]
    .filter(([k]) => !baseEdges.has(k))
    .map(([, e]) => e);
  const removedEdges = [...baseEdges.entries()]
    .filter(([k]) => !nextEdges.has(k))
    .map(([, e]) => e);

  return {
    addedNodes,
    removedNodes,
    changedNodes,
    addedEdges,
    removedEdges,
    identical:
      addedNodes.length === 0 &&
      removedNodes.length === 0 &&
      changedNodes.length === 0 &&
      addedEdges.length === 0 &&
      removedEdges.length === 0,
  };
}

export function summarizeDiff(diff: GraphDiff): string {
  if (diff.identical) return "no changes";
  const parts: string[] = [];
  if (diff.addedNodes.length) parts.push(`+${diff.addedNodes.length} node${diff.addedNodes.length === 1 ? "" : "s"}`);
  if (diff.removedNodes.length) parts.push(`−${diff.removedNodes.length} node${diff.removedNodes.length === 1 ? "" : "s"}`);
  if (diff.changedNodes.length) parts.push(`~${diff.changedNodes.length} edited`);
  if (diff.addedEdges.length) parts.push(`+${diff.addedEdges.length} link${diff.addedEdges.length === 1 ? "" : "s"}`);
  if (diff.removedEdges.length) parts.push(`−${diff.removedEdges.length} link${diff.removedEdges.length === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

// --- Draft storage (thin localStorage layer) ----------------------------------

export interface Draft {
  id: string;
  name: string;
  savedAt: string; // ISO
  graph: Graph;
}

const STORAGE_KEY = "axiomer_drafts";

export function listDrafts(): Draft[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Draft[];
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  return [];
}

function persist(drafts: Draft[]): Draft[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  return drafts;
}

export function saveDraft(name: string, graph: Graph): Draft[] {
  const draft: Draft = {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || `Draft ${new Date().toLocaleString()}`,
    savedAt: new Date().toISOString(),
    graph,
  };
  return persist([draft, ...listDrafts()]);
}

export function deleteDraft(id: string): Draft[] {
  return persist(listDrafts().filter((d) => d.id !== id));
}
