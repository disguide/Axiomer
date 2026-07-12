// The commitment system (docs/STATUS_AND_COMMITMENT.md §5).
//
// Asserting is undertaking commitments — to the claim, to what strictly
// follows from it, and to defending it when challenged (Hamblin's commitment
// stores; Brandom's scorekeeping). A STANCE is one user's commitment store:
// the nodes they explicitly accept or reject. This module computes the
// CLOSURE (everything the stance commits them to), AUDITS it for
// incoherence, and reveals the bedrock values the stance actually stands on.
//
// Stances are per-user overlays. They never touch the shared graph.
//
// Pure: no React, no DOM, no storage. Everything runs on the ACTIVE subgraph
// — dead nodes commit nobody to anything.

import type { Graph, GraphNode } from "./types";
import { isInert, isTerminalType } from "./types";
import {
  activeGraph,
  getAcceptability,
  getChildren,
  getNode,
  isNodeGrounded,
} from "./graph";

export interface Stance {
  accepted: string[];
  rejected: string[];
}

export const EMPTY_STANCE: Stance = { accepted: [], rejected: [] };

// Accept/reject are mutually exclusive per node; toggling off removes.
export function toggleAccept(stance: Stance, nodeId: string): Stance {
  const accepted = stance.accepted.includes(nodeId)
    ? stance.accepted.filter((id) => id !== nodeId)
    : [...stance.accepted, nodeId];
  return { accepted, rejected: stance.rejected.filter((id) => id !== nodeId) };
}

export function toggleReject(stance: Stance, nodeId: string): Stance {
  const rejected = stance.rejected.includes(nodeId)
    ? stance.rejected.filter((id) => id !== nodeId)
    : [...stance.rejected, nodeId];
  return { rejected, accepted: stance.accepted.filter((id) => id !== nodeId) };
}

// Why a node ended up in the closure. `via` chains back to an explicit
// acceptance/rejection (via === null).
export type CommitmentRule =
  | "explicit" // the user said so
  | "entailment" // P1: accepted A, A entails B  ⇒  committed to B
  | "grounding" // P2: accepted a chain          ⇒  committed to its bedrock
  | "presupposition" // P3: accepted A, A presupposes P ⇒ committed to P
  | "dependency" // P4: accepted an argument      ⇒  its warrants & assumptions
  | "denial"; // P5: rejected B, A entails B   ⇒  committed AGAINST A

export interface CommitmentReason {
  rule: CommitmentRule;
  via: string | null; // the node this commitment came through
}

export interface Closure {
  committed: Map<string, CommitmentReason>;
  committedAgainst: Map<string, CommitmentReason>;
}

// Compute everything the stance commits the user to. Propagation runs along
// STRICT relations only — never along defeasible support (accepting a claim
// does not force accepting every argument for it).
export function getClosure(graph: Graph, stance: Stance): Closure {
  const ag = activeGraph(graph);
  const committed = new Map<string, CommitmentReason>();
  const committedAgainst = new Map<string, CommitmentReason>();

  const queue: string[] = [];
  for (const id of stance.accepted) {
    if (!getNode(ag, id)) continue; // inert/missing nodes commit nobody
    committed.set(id, { rule: "explicit", via: null });
    queue.push(id);
  }

  const commit = (id: string, reason: CommitmentReason) => {
    if (committed.has(id)) return;
    committed.set(id, reason);
    queue.push(id);
  };

  while (queue.length > 0) {
    const id = queue.shift() as string;
    // P1 — entailment (forward, transitive).
    // P2 — grounding: you cannot stand on a chain and disown its bedrock.
    // P3 — presupposition.
    for (const e of ag.edges) {
      if (e.from !== id) continue;
      if (e.edgeType === "entails")
        commit(e.to, { rule: "entailment", via: id });
      else if (e.edgeType === "grounds-in")
        commit(e.to, { rule: "grounding", via: id });
      else if (e.edgeType === "presupposes")
        commit(e.to, { rule: "presupposition", via: id });
    }
    // P4 — an accepted node runs on its authored warrants and assumptions.
    for (const child of getChildren(ag, id)) {
      if (child.type === "warrant" || child.type === "assumption")
        commit(child.id, { rule: "dependency", via: id });
    }
  }

  // P5 — denial closure (backward along entailment: contraposition).
  const againstQueue: string[] = [];
  for (const id of stance.rejected) {
    if (!getNode(ag, id)) continue;
    committedAgainst.set(id, { rule: "explicit", via: null });
    againstQueue.push(id);
  }
  while (againstQueue.length > 0) {
    const id = againstQueue.shift() as string;
    for (const e of ag.edges) {
      if (e.edgeType !== "entails" || e.to !== id) continue;
      if (!committedAgainst.has(e.from)) {
        committedAgainst.set(e.from, { rule: "denial", via: id });
        againstQueue.push(e.from);
      }
    }
  }

  return { committed, committedAgainst };
}

// Chain of nodes from an explicit acceptance/rejection down to `nodeId`
// (inclusive), following the closure's `via` links.
export function traceToExplicit(
  graph: Graph,
  closure: Map<string, CommitmentReason>,
  nodeId: string,
): GraphNode[] {
  const chain: GraphNode[] = [];
  let current: string | null = nodeId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const node = getNode(graph, current);
    if (node) chain.unshift(node);
    current = closure.get(current)?.via ?? null;
  }
  return chain;
}

// --- The audit (rules C1–C4) -------------------------------------------------

export type AuditFinding =
  | {
      // C1/C4 — two committed claims declared incompatible. When both are
      // terminals it's a VALUE CLASH: the disagreement lives at bedrock.
      kind: "incoherence" | "value-clash";
      a: GraphNode;
      b: GraphNode;
      aTrace: GraphNode[];
      bTrace: GraphNode[];
    }
  | {
      // C2 — the tollens fork: you rejected it, but your acceptances entail
      // it. Keep the source (and this comes with it) or reject this (and the
      // source goes with it). The system prices the exits; the user chooses.
      kind: "forced-choice";
      node: GraphNode;
      trace: GraphNode[];
    }
  | {
      // C3 — commitment without entitlement (Brandom): committed to something
      // that currently doesn't survive scrutiny. An honest debt, not an error.
      kind: "undischarged";
      node: GraphNode;
      problem: "defeated" | "ungrounded";
      trace: GraphNode[];
    };

export function auditStance(graph: Graph, stance: Stance): AuditFinding[] {
  const closure = getClosure(graph, stance);
  const { committed, committedAgainst } = closure;
  const findings: AuditFinding[] = [];
  const trace = (id: string) => traceToExplicit(graph, committed, id);

  // C2 — forced choice: rejected yet committed. (Explicit rejections first —
  // the general committed∩against case reduces to the same fork.)
  for (const id of committedAgainst.keys()) {
    if (!committed.has(id)) continue;
    const node = getNode(graph, id);
    if (node) findings.push({ kind: "forced-choice", node, trace: trace(id) });
  }

  // C1/C4 — incompatibility among commitments (`contradicts` edges).
  for (const e of graph.edges) {
    if (e.edgeType !== "contradicts") continue;
    if (!committed.has(e.from) || !committed.has(e.to)) continue;
    const a = getNode(graph, e.from);
    const b = getNode(graph, e.to);
    if (!a || !b || isInert(a) || isInert(b)) continue;
    findings.push({
      kind: isTerminalType(a.type) && isTerminalType(b.type)
        ? "value-clash"
        : "incoherence",
      a,
      b,
      aTrace: trace(a.id),
      bTrace: trace(b.id),
    });
  }

  // C3 — undischarged commitments: defeated or ungrounded.
  const acceptability = getAcceptability(graph);
  for (const id of committed.keys()) {
    const node = getNode(graph, id);
    if (!node || isInert(node)) continue;
    if (acceptability.get(id) === "defeated") {
      findings.push({
        kind: "undischarged",
        node,
        problem: "defeated",
        trace: trace(id),
      });
    } else if (
      (node.type === "position" ||
        node.type === "argument-support" ||
        node.type === "argument-attack") &&
      !isNodeGrounded(graph, id)
    ) {
      findings.push({
        kind: "undischarged",
        node,
        problem: "ungrounded",
        trace: trace(id),
      });
    }
  }

  return findings;
}

// --- Revealed values ----------------------------------------------------------
// The product's most personal payoff: run the closure over what you accept and
// see which bedrock you are ACTUALLY standing on. Convergence, turned inward.

export interface RevealedValue {
  value: GraphNode;
  trace: GraphNode[]; // explicit acceptance → … → this terminal
}

export function getRevealedValues(
  graph: Graph,
  stance: Stance,
): RevealedValue[] {
  const { committed } = getClosure(graph, stance);
  const out: RevealedValue[] = [];
  for (const id of committed.keys()) {
    const node = getNode(graph, id);
    if (node && isTerminalType(node.type))
      out.push({ value: node, trace: traceToExplicit(graph, committed, id) });
  }
  return out;
}
