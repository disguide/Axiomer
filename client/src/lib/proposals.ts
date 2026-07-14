// Proposals: the safety boundary between AI output and the graph.
//
// Agents (lib/ai/) never mutate anything. They emit a Proposal — a summary
// plus typed ops — which is parsed and validated here against the actual
// graph and the authoring rules (ALLOWED_CHILDREN, statuses, terminals).
// A human accepts ops one by one; only then does applyOp run the same pure
// graph.ts mutations the UI uses. This is propose-and-review
// (docs/ROADMAP.md), in miniature, in the client.
//
// Pure: no fetch, no DOM. parseProposal takes untrusted text; nothing here
// trusts it.

import type {
  ContentKind,
  EdgeType,
  Graph,
  NodeStatus,
  NodeType,
} from "./types";
import {
  CONTENT_KINDS,
  EDGE_TYPES,
  NODE_STATUSES,
  NODE_TYPES,
  isInert,
  isTerminalType,
} from "./types";
import { ALLOWED_CHILDREN } from "./meta";
import {
  addContradiction,
  addNode,
  canSetStatus,
  getChildren,
  getNode,
  getParent,
  linkToExistingValue,
  mergeTerminals,
  relabelNode,
  setNodeStatus,
} from "./graph";

export type ProposalOp =
  | {
      op: "add-node";
      parentId: string;
      type: NodeType;
      content: string;
      edgeType?: EdgeType; // only honored for real overrides (e.g. undercuts)
      contentKind?: ContentKind;
    }
  | { op: "link-value"; argumentId: string; valueId: string }
  | { op: "merge-terminals"; keepId: string; dropId: string }
  | { op: "set-status"; nodeId: string; status: NodeStatus; reason?: string }
  | { op: "add-contradiction"; aId: string; bId: string }
  | {
      // Assign/reassign a node's type — the Labeler's core move (usually on an
      // `unlabeled` note). Rebuilds the parent edge for the new type.
      op: "relabel-node";
      nodeId: string;
      type: NodeType;
      edgeType?: EdgeType;
      contentKind?: ContentKind;
    };

export interface Proposal {
  summary: string;
  ops: ProposalOp[];
}

export interface InvalidOp {
  raw: unknown;
  reason: string;
}

export interface ParsedProposal {
  proposal: Proposal;
  invalid: InvalidOp[];
}

// Node types that may carry a grounds-in edge (see grounding rules).
const GROUNDABLE = new Set<NodeType>([
  "argument-support",
  "argument-attack",
  "position",
  "implication",
  "criterion",
]);

export function validateOp(
  graph: Graph,
  op: ProposalOp,
): { ok: boolean; reason?: string } {
  switch (op.op) {
    case "add-node": {
      const parent = getNode(graph, op.parentId);
      if (!parent) return { ok: false, reason: `parent ${op.parentId} not found` };
      if (isInert(parent)) return { ok: false, reason: "parent is inert" };
      if (!NODE_TYPES.includes(op.type))
        return { ok: false, reason: `unknown type "${op.type}"` };
      if (!ALLOWED_CHILDREN[parent.type].includes(op.type))
        return {
          ok: false,
          reason: `${op.type} is not an allowed child of ${parent.type}`,
        };
      if (!op.content.trim()) return { ok: false, reason: "empty content" };
      if (op.edgeType !== undefined && !EDGE_TYPES.includes(op.edgeType))
        return { ok: false, reason: `unknown edge "${op.edgeType}"` };
      if (op.contentKind !== undefined && !CONTENT_KINDS.includes(op.contentKind))
        return { ok: false, reason: `unknown contentKind "${op.contentKind}"` };
      return { ok: true };
    }
    case "link-value": {
      const from = getNode(graph, op.argumentId);
      const value = getNode(graph, op.valueId);
      if (!from) return { ok: false, reason: `node ${op.argumentId} not found` };
      if (!value) return { ok: false, reason: `terminal ${op.valueId} not found` };
      if (isInert(from) || isInert(value))
        return { ok: false, reason: "cannot link inert nodes" };
      if (!GROUNDABLE.has(from.type))
        return { ok: false, reason: `${from.type} cannot ground in a terminal` };
      if (!isTerminalType(value.type))
        return { ok: false, reason: `${value.type} is not a terminal` };
      return { ok: true };
    }
    case "merge-terminals": {
      const keep = getNode(graph, op.keepId);
      const drop = getNode(graph, op.dropId);
      if (!keep || !drop) return { ok: false, reason: "node not found" };
      if (op.keepId === op.dropId)
        return { ok: false, reason: "cannot merge a node into itself" };
      if (!isTerminalType(keep.type) || !isTerminalType(drop.type))
        return { ok: false, reason: "both nodes must be terminals" };
      if (keep.type !== drop.type)
        return { ok: false, reason: "terminals of different types" };
      if (isInert(keep) || isInert(drop))
        return { ok: false, reason: "cannot merge inert terminals" };
      return { ok: true };
    }
    case "set-status": {
      if (!NODE_STATUSES.includes(op.status))
        return { ok: false, reason: `unknown status "${op.status}"` };
      const check = canSetStatus(graph, op.nodeId, op.status);
      return check.ok ? { ok: true } : { ok: false, reason: check.reason };
    }
    case "add-contradiction": {
      const a = getNode(graph, op.aId);
      const b = getNode(graph, op.bId);
      if (!a || !b) return { ok: false, reason: "node not found" };
      if (op.aId === op.bId)
        return { ok: false, reason: "a node cannot contradict itself" };
      return { ok: true };
    }
    case "relabel-node": {
      const node = getNode(graph, op.nodeId);
      if (!node) return { ok: false, reason: `node ${op.nodeId} not found` };
      if (isInert(node)) return { ok: false, reason: "cannot relabel an inert node" };
      if (!NODE_TYPES.includes(op.type))
        return { ok: false, reason: `unknown type "${op.type}"` };
      if (op.type === "unlabeled")
        return { ok: false, reason: "relabel must assign a real type" };
      // The new type must be a legal child of the current parent.
      const parent = getParent(graph, op.nodeId);
      if (parent && !ALLOWED_CHILDREN[parent.type].includes(op.type))
        return {
          ok: false,
          reason: `${op.type} is not an allowed child of ${parent.type}`,
        };
      if (isTerminalType(op.type) && getChildren(graph, op.nodeId).length > 0)
        return { ok: false, reason: "a terminal cannot have children" };
      if (op.edgeType !== undefined && !EDGE_TYPES.includes(op.edgeType))
        return { ok: false, reason: `unknown edge "${op.edgeType}"` };
      return { ok: true };
    }
  }
}

// Apply one accepted op with the same pure mutations the UI uses.
export function applyOp(graph: Graph, op: ProposalOp): Graph {
  if (!validateOp(graph, op).ok) return graph;
  switch (op.op) {
    case "add-node":
      return addNode(graph, op.type, op.content.trim(), op.parentId, {
        edgeType: op.edgeType,
        contentKind: op.contentKind,
      });
    case "link-value":
      return linkToExistingValue(graph, op.argumentId, op.valueId);
    case "merge-terminals":
      return mergeTerminals(graph, op.keepId, op.dropId);
    case "set-status":
      return setNodeStatus(
        graph,
        op.nodeId,
        op.status,
        op.reason ? { reason: op.reason, by: "ai-proposal (accepted)" } : { by: "ai-proposal (accepted)" },
      );
    case "add-contradiction":
      return addContradiction(graph, op.aId, op.bId);
    case "relabel-node":
      return relabelNode(graph, op.nodeId, op.type, {
        edgeType: op.edgeType,
        contentKind: op.contentKind,
      });
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

// Coerce one untrusted op object into a typed ProposalOp (structure only —
// graph-level validity is validateOp's job and is re-checked at apply time).
function coerceOp(raw: unknown): ProposalOp | string {
  if (!isObject(raw)) return "op is not an object";
  switch (raw.op) {
    case "add-node": {
      const parentId = str(raw.parentId);
      const type = str(raw.type);
      const content = str(raw.content);
      if (!parentId || !type || !content)
        return "add-node needs parentId, type, content";
      const op: ProposalOp = {
        op: "add-node",
        parentId,
        type: type as NodeType,
        content,
      };
      const edgeType = str(raw.edgeType);
      if (edgeType) op.edgeType = edgeType as EdgeType;
      const contentKind = str(raw.contentKind);
      if (contentKind) op.contentKind = contentKind as ContentKind;
      return op;
    }
    case "link-value": {
      const argumentId = str(raw.argumentId);
      const valueId = str(raw.valueId);
      if (!argumentId || !valueId) return "link-value needs argumentId, valueId";
      return { op: "link-value", argumentId, valueId };
    }
    case "merge-terminals": {
      const keepId = str(raw.keepId);
      const dropId = str(raw.dropId);
      if (!keepId || !dropId) return "merge-terminals needs keepId, dropId";
      return { op: "merge-terminals", keepId, dropId };
    }
    case "set-status": {
      const nodeId = str(raw.nodeId);
      const status = str(raw.status);
      if (!nodeId || !status) return "set-status needs nodeId, status";
      return {
        op: "set-status",
        nodeId,
        status: status as NodeStatus,
        reason: str(raw.reason),
      };
    }
    case "add-contradiction": {
      const aId = str(raw.aId);
      const bId = str(raw.bId);
      if (!aId || !bId) return "add-contradiction needs aId, bId";
      return { op: "add-contradiction", aId, bId };
    }
    case "relabel-node": {
      const nodeId = str(raw.nodeId);
      const type = str(raw.type);
      if (!nodeId || !type) return "relabel-node needs nodeId, type";
      const op: ProposalOp = {
        op: "relabel-node",
        nodeId,
        type: type as NodeType,
      };
      const edgeType = str(raw.edgeType);
      if (edgeType) op.edgeType = edgeType as EdgeType;
      const contentKind = str(raw.contentKind);
      if (contentKind) op.contentKind = contentKind as ContentKind;
      return op;
    }
    default:
      return `unknown op "${String(raw.op)}"`;
  }
}

// Extract the first JSON object from model output (tolerates code fences and
// prose around it).
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  return candidate.slice(start, end + 1);
}

// Parse untrusted model output into a validated Proposal. Ops that fail
// structural coercion OR graph validation land in `invalid` with a reason —
// the UI shows them greyed out, never applies them.
export function parseProposal(graph: Graph, text: string): ParsedProposal {
  let json: unknown;
  try {
    json = JSON.parse(extractJson(text));
  } catch (err) {
    throw new Error(`could not parse proposal JSON: ${(err as Error).message}`);
  }
  if (!isObject(json)) throw new Error("proposal is not an object");
  const summary = str(json.summary) ?? "";
  const rawOps = Array.isArray(json.ops) ? json.ops : [];
  const ops: ProposalOp[] = [];
  const invalid: InvalidOp[] = [];
  for (const raw of rawOps) {
    const coerced = coerceOp(raw);
    if (typeof coerced === "string") {
      invalid.push({ raw, reason: coerced });
      continue;
    }
    const check = validateOp(graph, coerced);
    if (!check.ok) {
      invalid.push({ raw, reason: check.reason ?? "invalid" });
      continue;
    }
    ops.push(coerced);
  }
  return { proposal: { summary, ops }, invalid };
}
