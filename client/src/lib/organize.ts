// The organize engine: a deterministic, read-only audit of the graph that
// produces a prioritized worklist — duplicates to merge, chains to ground,
// attacks to answer, ghosts to re-home. No AI required (agents may CONSUME
// this list to prioritize their suggestions, per the "AI is optional"
// principle in docs/ROADMAP.md). Pure, like graph.ts.

import type { Graph, GraphNode } from "./types";
import { isInert, isTerminalType } from "./types";
import {
  ATTACKING_TYPES,
  activeGraph,
  getAcceptability,
  getAttackers,
  getGroundingGaps,
  getInertOrphans,
  getNode,
  getParents,
  getPresuppositions,
  similarity,
} from "./graph";

export type WorkItem =
  | {
      // Two same-type terminals with near-identical text — the convergence
      // core eroding. Action: merge (keep the more-connected one).
      kind: "duplicate-terminals";
      keep: GraphNode;
      drop: GraphNode;
      score: number;
    }
  | {
      // An argument chain that never reaches bedrock (the weakest link
      // is the shallowest). Action: ground it or retract it.
      kind: "ungrounded-argument";
      node: GraphNode;
      root: GraphNode | undefined;
      depth: number;
    }
  | {
      // A currently-winning attack nobody has answered. Action: rebut it,
      // concede it, or accept the defeat honestly.
      kind: "unanswered-attack";
      target: GraphNode;
      attacker: GraphNode;
    }
  | {
      // Active node under an inert parent — force-less until re-homed.
      kind: "inert-orphan";
      node: GraphNode;
      parent: GraphNode;
    }
  | {
      // A question with no positions at all (and not dissolved).
      kind: "positionless-question";
      node: GraphNode;
    }
  | {
      // A position with neither arguments nor a direct grounding.
      kind: "unsupported-position";
      node: GraphNode;
    };

// Priority order for the worklist (most structural damage first).
const KIND_PRIORITY: Record<WorkItem["kind"], number> = {
  "duplicate-terminals": 0, // erodes the product's core
  "unanswered-attack": 1, // actively defeating something
  "ungrounded-argument": 2, // blocks FULLY GROUNDED
  "unsupported-position": 3,
  "positionless-question": 4,
  "inert-orphan": 5,
};

export function getWorkItems(graph: Graph, dupThreshold = 0.55): WorkItem[] {
  const ag = activeGraph(graph);
  const items: WorkItem[] = [];

  // Duplicate terminals: same type, similar text. Keep = more grounding
  // parents (more established), tie-broken by age (earlier in the list).
  const terminals = ag.nodes.filter((n) => isTerminalType(n.type));
  for (let i = 0; i < terminals.length; i++) {
    for (let j = i + 1; j < terminals.length; j++) {
      const a = terminals[i];
      const b = terminals[j];
      if (a.type !== b.type) continue;
      const score = similarity(a.content, b.content);
      if (score < dupThreshold) continue;
      const aParents = getParents(ag, a.id).length;
      const bParents = getParents(ag, b.id).length;
      const [keep, drop] = bParents > aParents ? [b, a] : [a, b];
      items.push({ kind: "duplicate-terminals", keep, drop, score });
    }
  }

  // Winning attacks nobody answered: attacker is defended and has no active
  // attacking children of its own (no rebuttal/counter attempt yet). Only
  // CONSTRUCTIVE targets count — a rebuttal defeating an objection is the
  // dialectic working, not a to-do.
  const acceptability = getAcceptability(graph);
  for (const node of ag.nodes) {
    if (ATTACKING_TYPES.has(node.type)) continue;
    for (const attacker of getAttackers(ag, node.id)) {
      if (acceptability.get(attacker.id) !== "defended") continue;
      const answered = getAttackers(ag, attacker.id).length > 0;
      if (!answered)
        items.push({ kind: "unanswered-attack", target: node, attacker });
    }
  }

  // Grounding gaps (already shallowest-first).
  for (const gap of getGroundingGaps(graph)) {
    items.push({
      kind: "ungrounded-argument",
      node: gap.node,
      root: gap.root,
      depth: gap.depth,
    });
  }

  // Unsupported positions / positionless questions.
  for (const node of ag.nodes) {
    if (node.type === "position") {
      const backed = ag.edges.some(
        (e) =>
          (e.to === node.id &&
            (e.edgeType === "argues-for" || e.edgeType === "argues-against")) ||
          (e.from === node.id && e.edgeType === "grounds-in"),
      );
      if (!backed) items.push({ kind: "unsupported-position", node });
    } else if (node.type === "question") {
      const answered = ag.edges.some(
        (e) => e.to === node.id && e.edgeType === "answers",
      );
      const dissolvedish = getPresuppositions(graph, node.id).some(
        (p) => p.status === "refuted",
      );
      if (!answered && !dissolvedish)
        items.push({ kind: "positionless-question", node });
    }
  }

  // Ghost orphans.
  for (const id of getInertOrphans(graph)) {
    const node = getNode(graph, id);
    if (!node) continue;
    const parent = getParents(graph, id).find((p) => isInert(p));
    if (parent) items.push({ kind: "inert-orphan", node, parent });
  }

  return items.sort((x, y) => {
    const p = KIND_PRIORITY[x.kind] - KIND_PRIORITY[y.kind];
    if (p !== 0) return p;
    // Within duplicates: highest similarity first.
    if (x.kind === "duplicate-terminals" && y.kind === "duplicate-terminals")
      return y.score - x.score;
    // Within gaps: shallowest first (already sorted, keep stable).
    return 0;
  });
}

// Convenience: how healthy is the graph? Powers the Organize tab header.
export interface OrganizeSummary {
  total: number;
  byKind: Partial<Record<WorkItem["kind"], number>>;
}

export function summarizeWork(items: WorkItem[]): OrganizeSummary {
  const byKind: OrganizeSummary["byKind"] = {};
  for (const item of items) byKind[item.kind] = (byKind[item.kind] ?? 0) + 1;
  return { total: items.length, byKind };
}

// A one-line human label per item (shared by OrganizePanel and the AI layer,
// which feeds the worklist to agents as context).
export function describeWorkItem(item: WorkItem): string {
  switch (item.kind) {
    case "duplicate-terminals":
      return `Possible duplicate ${item.keep.type}s: "${item.keep.content}" vs "${item.drop.content}" (${Math.round(item.score * 100)}% similar) — merge to keep convergence real.`;
    case "unanswered-attack":
      return `"${item.target.content}" is currently defeated by unanswered ${item.attacker.type} "${item.attacker.content}" — rebut it or concede.`;
    case "ungrounded-argument":
      return `Argument "${item.node.content}" never reaches bedrock${item.root ? ` (under "${item.root.content}")` : ""} — ground it or retract it.`;
    case "unsupported-position":
      return `Position "${item.node.content}" has no arguments and no grounding — back it or retract it.`;
    case "positionless-question":
      return `Question "${item.node.content}" has no positions yet.`;
    case "inert-orphan":
      return `"${item.node.content}" hangs under ${item.parent.status ?? "inert"} parent "${item.parent.content}" — re-home or retract it.`;
  }
}
