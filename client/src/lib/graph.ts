// Pure graph utilities. No mutation — every transform returns a new Graph.
//
// EDGE DIRECTION IS SEMANTIC, NOT VISUAL.
// An edge `from -> to` encodes a relationship. Most relationships run
// child -> parent (a position `answers` a question; an argument `argues-for` a
// position). A few run the other way, parent -> child (DOWNWARD below).
// `endpoints` normalizes this so the rest of the tree logic is direction
// agnostic.
//
// STATUS FILTERS THE GRAPH THE ALGORITHMS SEE (docs/STATUS_AND_COMMITMENT.md).
// Tree traversal (getChildren/getParent/…) works on the FULL graph so inert
// ("dead") nodes still render as ghosts. Computation (grounding,
// acceptability, convergence, resolution) runs on activeGraph(g) — the
// subgraph of active nodes — so retracted/refuted/invalid/superseded/merged
// nodes have no force.

import type {
  ContentKind,
  EdgeType,
  Graph,
  GraphEdge,
  GraphNode,
  NodeStatus,
  NodeType,
  ProofStandard,
  StatusMeta,
} from "./types";
import { isInert, isTerminalType } from "./types";

// Edge types whose direction runs parent(from) -> child(to).
// `entails` is any claim (parent) entailing its consequence (child);
// `presupposes` is a question/claim (parent) surfacing its assumption (child).
const DOWNWARD: readonly EdgeType[] = [
  "raises",
  "grounds-in",
  "entails",
  "presupposes",
];

// Lateral edges encode constraints/redirects, NOT tree structure. They are
// invisible to parent/child traversal (and so to deletion and layout).
const LATERAL: readonly EdgeType[] = ["contradicts", "supersedes"];

// True for edges that participate in the parent/child tree structure.
export function isStructuralEdge(edge: GraphEdge): boolean {
  return !LATERAL.includes(edge.edgeType);
}

function endpoints(edge: GraphEdge): { parent: string; child: string } {
  return DOWNWARD.includes(edge.edgeType)
    ? { parent: edge.from, child: edge.to }
    : { parent: edge.to, child: edge.from };
}

// Public accessor for an edge's parent/child, used by the graph-map layout.
export function edgeEndpoints(edge: GraphEdge): {
  parent: string;
  child: string;
} {
  return endpoints(edge);
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getNode(graph: Graph, nodeId: string): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

// The subgraph the computations see: active nodes and the edges among them.
export function activeGraph(graph: Graph): Graph {
  const nodes = graph.nodes.filter((n) => !isInert(n));
  if (nodes.length === graph.nodes.length) return graph;
  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    edges: graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
  };
}

// Children = nodes nested under this one in the tree.
export function getChildren(graph: Graph, nodeId: string): GraphNode[] {
  return graph.edges
    .filter((e) => isStructuralEdge(e) && endpoints(e).parent === nodeId)
    .map((e) => getNode(graph, endpoints(e).child))
    .filter((n): n is GraphNode => Boolean(n));
}

// Parent = the node this one is nested under (first, if a value is shared).
export function getParent(graph: Graph, nodeId: string): GraphNode | undefined {
  const edge = graph.edges.find(
    (e) => isStructuralEdge(e) && endpoints(e).child === nodeId,
  );
  return edge ? getNode(graph, endpoints(edge).parent) : undefined;
}

// All parents — a shared value has several (one per grounding argument).
export function getParents(graph: Graph, nodeId: string): GraphNode[] {
  return graph.edges
    .filter((e) => isStructuralEdge(e) && endpoints(e).child === nodeId)
    .map((e) => getNode(graph, endpoints(e).parent))
    .filter((n): n is GraphNode => Boolean(n));
}

// Every node reachable downward FROM nodeId (descendants, including nodeId).
export function getDescendantIds(graph: Graph, nodeId: string): Set<string> {
  const seen = new Set<string>([nodeId]);
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const child of getChildren(graph, current)) {
      if (!seen.has(child.id)) {
        seen.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return seen;
}

// Every node with a downward path INTO nodeId (its ancestors in the
// parent→child DAG). For a value, that's everything that grounds in it —
// the convergence highlight in the map view.
export function getAncestors(graph: Graph, nodeId: string): Set<string> {
  const result = new Set<string>();
  const queue = [nodeId];
  const seen = new Set<string>([nodeId]);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const parent of getParents(graph, current)) {
      if (!seen.has(parent.id)) {
        seen.add(parent.id);
        result.add(parent.id);
        queue.push(parent.id);
      }
    }
  }
  return result;
}

function isRootShaped(graph: Graph, node: GraphNode): boolean {
  return !graph.edges.some(
    (e) => isStructuralEdge(e) && endpoints(e).child === node.id,
  );
}

// Root questions: questions that are nobody's child. (Grounding/clash logic is
// question-centric, so it uses this rather than getRoots.)
export function getRootQuestions(graph: Graph): GraphNode[] {
  return graph.nodes.filter(
    (n) => n.type === "question" && isRootShaped(graph, n),
  );
}

// Tree entry points: top-level questions AND premises (nobody's child).
// Premises are forward-reasoning roots — you build conclusions down from them.
export function getRoots(graph: Graph): GraphNode[] {
  return graph.nodes.filter(
    (n) =>
      (n.type === "question" || n.type === "premise") && isRootShaped(graph, n),
  );
}

// All bedrock values (for the "link to existing value" picker). Active only —
// a dead value is not a linking target.
export function getValues(graph: Graph): GraphNode[] {
  return graph.nodes.filter((n) => n.type === "value" && !isInert(n));
}

// Edge type connecting a new child of `childType` to a parent of `parentType`.
export function edgeTypeFor(
  childType: NodeType,
  parentType: NodeType,
): EdgeType {
  // Anything built directly on a premise is entailed by it.
  if (parentType === "premise") return "entails";
  if (childType === "position" && parentType === "question") return "answers";
  if (childType === "presupposition") return "presupposes";
  if (childType === "implication") return "entails";
  if (childType === "warrant") return "supports"; // licenses the inference
  if (childType === "example") return "exemplifies";
  if (childType === "counter-example") return "objects-to";
  if (childType === "concession") return "concedes";
  if (childType === "caveat" || childType === "criterion") return "qualifies";
  if (childType === "argument-support") return "argues-for";
  if (childType === "argument-attack") return "argues-against";
  if (childType === "evidence-empirical" || childType === "evidence-anecdotal")
    return "supports";
  if (childType === "question") return "raises"; // argument drills deeper
  if (childType === "objection") return "objects-to";
  if (childType === "rebuttal") return "rebuts";
  if (childType === "analogy" || childType === "thought-experiment")
    return "illustrates";
  if (isTerminalType(childType)) return "grounds-in";
  return "connects-to";
}

// Build an edge with the correct orientation for its type.
function makeEdge(
  parentId: string,
  childId: string,
  edgeType: EdgeType,
): GraphEdge {
  const downward = DOWNWARD.includes(edgeType);
  return {
    id: uid("edge"),
    from: downward ? parentId : childId,
    to: downward ? childId : parentId,
    edgeType,
  };
}

export interface AddNodeOpts {
  // Override the default edge for this parent/child pairing — e.g. an
  // objection that UNDERCUTS the inference instead of rebutting the claim.
  edgeType?: EdgeType;
  contentKind?: ContentKind;
  schemeTag?: string;
}

export function addNode(
  graph: Graph,
  nodeType: NodeType,
  content: string,
  parentId: string,
  opts?: AddNodeOpts,
): Graph {
  const parent = getNode(graph, parentId);
  const newNode: GraphNode = {
    id: uid("node"),
    type: nodeType,
    content,
    createdAt: new Date().toISOString(),
  };
  if (opts?.contentKind) newNode.contentKind = opts.contentKind;
  if (opts?.schemeTag) newNode.schemeTag = opts.schemeTag;
  const edgeType =
    opts?.edgeType ??
    (parent ? edgeTypeFor(nodeType, parent.type) : "connects-to");
  return {
    nodes: [...graph.nodes, newNode],
    edges: [...graph.edges, makeEdge(parentId, newNode.id, edgeType)],
  };
}

// Create a brand new root question (no parent edge).
export function addRootQuestion(graph: Graph, content: string): Graph {
  return addRoot(graph, "question", content);
}

// Create a brand new root premise — a base to reason forward from.
export function addRootPremise(graph: Graph, content: string): Graph {
  return addRoot(graph, "premise", content);
}

function addRoot(graph: Graph, type: NodeType, content: string): Graph {
  const newNode: GraphNode = {
    id: uid("node"),
    type,
    content,
    createdAt: new Date().toISOString(),
  };
  return { nodes: [...graph.nodes, newNode], edges: graph.edges };
}

export function editNode(
  graph: Graph,
  nodeId: string,
  newContent: string,
): Graph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === nodeId ? { ...n, content: newContent } : n,
    ),
  };
}

// Set a question's declared proof standard (Carneades; TAXONOMY §4.4).
export function setProofStandard(
  graph: Graph,
  questionId: string,
  standard: ProofStandard,
): Graph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === questionId && n.type === "question"
        ? { ...n, proofStandard: standard }
        : n,
    ),
  };
}

// --- Status lifecycle (docs/STATUS_AND_COMMITMENT.md §2) ---------------------
// Asserted statuses are speech acts, recorded on the node; they never blur
// with computed standing. Any non-active node is inert (no force anywhere).

export interface StatusCheck {
  ok: boolean;
  reason?: string;
}

// A shared terminal that other active chains still ground in can only be
// superseded or merged — mirrors deleteNode's doomedSet sparing rule.
export function canSetStatus(
  graph: Graph,
  nodeId: string,
  status: NodeStatus,
): StatusCheck {
  const node = getNode(graph, nodeId);
  if (!node) return { ok: false, reason: "node not found" };
  if (
    isTerminalType(node.type) &&
    status !== "active" &&
    status !== "superseded" &&
    status !== "merged"
  ) {
    const dependents = graph.edges.filter((e) => {
      if (e.edgeType !== "grounds-in" || e.to !== nodeId) return false;
      const parent = getNode(graph, e.from);
      return Boolean(parent) && !isInert(parent as GraphNode);
    });
    if (dependents.length > 0) {
      return {
        ok: false,
        reason: `${dependents.length} active chain(s) still ground in this terminal — supersede or merge it instead`,
      };
    }
  }
  return { ok: true };
}

export function setNodeStatus(
  graph: Graph,
  nodeId: string,
  status: NodeStatus,
  meta?: StatusMeta,
): Graph {
  if (!canSetStatus(graph, nodeId, status).ok) return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      if (n.id !== nodeId) return n;
      if (status === "active") {
        // Absent status = active; drop the stale meta with it.
        const { status: _s, statusMeta: _m, ...rest } = n;
        return rest as GraphNode;
      }
      return { ...n, status, statusMeta: { at: new Date().toISOString(), ...meta } };
    }),
  };
}

// Replace a node with a better formulation: mark it superseded and record the
// successor with a lateral `supersedes` edge (successor → old).
export function supersedeNode(
  graph: Graph,
  oldId: string,
  successorId: string,
  meta?: StatusMeta,
): Graph {
  if (!getNode(graph, oldId) || !getNode(graph, successorId)) return graph;
  const marked = setNodeStatus(graph, oldId, "superseded", meta);
  if (marked === graph) return graph;
  return {
    nodes: marked.nodes,
    edges: [
      ...marked.edges,
      {
        id: uid("edge"),
        from: successorId,
        to: oldId,
        edgeType: "supersedes",
      },
    ],
  };
}

// Active nodes whose parent (any structural parent) is inert — flagged for
// review: re-attach, retract, or keep as record. Never auto-killed.
export function getInertOrphans(graph: Graph): Set<string> {
  const orphans = new Set<string>();
  for (const n of graph.nodes) {
    if (isInert(n)) continue;
    if (getParents(graph, n.id).some((p) => isInert(p))) orphans.add(n.id);
  }
  return orphans;
}

// --- Incompatibility (lateral constraint) ------------------------------------
// `contradicts` says two claims cannot both hold. It is not an attack — it is
// the constraint the commitment audit (lib/commitment.ts) runs on.

export function addContradiction(
  graph: Graph,
  aId: string,
  bId: string,
): Graph {
  if (aId === bId) return graph;
  if (!getNode(graph, aId) || !getNode(graph, bId)) return graph;
  const exists = graph.edges.some(
    (e) =>
      e.edgeType === "contradicts" &&
      ((e.from === aId && e.to === bId) || (e.from === bId && e.to === aId)),
  );
  if (exists) return graph;
  return {
    nodes: graph.nodes,
    edges: [
      ...graph.edges,
      { id: uid("edge"), from: aId, to: bId, edgeType: "contradicts" },
    ],
  };
}

// Nodes declared incompatible with nodeId (symmetric).
export function getContradictions(graph: Graph, nodeId: string): GraphNode[] {
  return graph.edges
    .filter(
      (e) =>
        e.edgeType === "contradicts" &&
        (e.from === nodeId || e.to === nodeId),
    )
    .map((e) => getNode(graph, e.from === nodeId ? e.to : e.from))
    .filter((n): n is GraphNode => Boolean(n));
}

// --- Canonical merge (convergence, enforced) ---------------------------------
// Fold a duplicate terminal into the canonical one: every edge touching the
// duplicate is re-pointed at the keeper (skipping edges that would duplicate
// an existing one), the duplicate is marked `merged`, and a `supersedes` edge
// records the redirect (keep → drop). Provenance survives; the convergence
// core stays small. This is the Phase-4 dedup queue's primitive.
export function mergeTerminals(
  graph: Graph,
  keepId: string,
  dropId: string,
): Graph {
  const keep = getNode(graph, keepId);
  const drop = getNode(graph, dropId);
  if (!keep || !drop || keepId === dropId) return graph;
  if (!isTerminalType(keep.type) || !isTerminalType(drop.type)) return graph;
  if (keep.type !== drop.type) return graph; // a value is not a principle

  const redirected: GraphEdge[] = [];
  const exists = (candidate: GraphEdge) =>
    graph.edges.some(
      (e) =>
        e.edgeType === candidate.edgeType &&
        e.from === candidate.from &&
        e.to === candidate.to,
    ) ||
    redirected.some(
      (e) =>
        e.edgeType === candidate.edgeType &&
        e.from === candidate.from &&
        e.to === candidate.to,
    );

  for (const e of graph.edges) {
    if (e.from !== dropId && e.to !== dropId) {
      redirected.push(e);
      continue;
    }
    const moved: GraphEdge = {
      ...e,
      from: e.from === dropId ? keepId : e.from,
      to: e.to === dropId ? keepId : e.to,
    };
    // Drop self-loops and edges that already exist on the keeper.
    if (moved.from === moved.to) continue;
    if (exists(moved)) continue;
    redirected.push(moved);
  }

  const merged = setNodeStatus(
    { nodes: graph.nodes, edges: redirected },
    dropId,
    "merged",
    { reason: `merged into "${keep.content}"` },
  );
  return {
    nodes: merged.nodes,
    edges: [
      ...merged.edges,
      { id: uid("edge"), from: keepId, to: dropId, edgeType: "supersedes" },
    ],
  };
}

// Collect a node and all descendants, EXCEPT shared terminals that are still
// grounded by an argument outside the deletion set (so reused values survive).
function doomedSet(graph: Graph, nodeId: string): Set<string> {
  const doomed = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (doomed.has(current)) continue;
    doomed.add(current);
    for (const child of getChildren(graph, current)) {
      if (!doomed.has(child.id)) queue.push(child.id);
    }
  }
  // Spare shared terminals with a surviving parent.
  for (const id of [...doomed]) {
    const node = getNode(graph, id);
    if (node && isTerminalType(node.type) && id !== nodeId) {
      const hasSurvivingParent = graph.edges.some(
        (e) =>
          e.edgeType === "grounds-in" &&
          e.to === id &&
          !doomed.has(e.from),
      );
      if (hasSurvivingParent) doomed.delete(id);
    }
  }
  return doomed;
}

// Number of nodes (excluding the target itself) that deletion would remove.
export function countDescendants(graph: Graph, nodeId: string): number {
  return doomedSet(graph, nodeId).size - 1;
}

// Delete a node, its descendants, and any edges touching removed nodes.
// (Local authoring only — the wiki lifecycle prefers setNodeStatus.)
export function deleteNode(graph: Graph, nodeId: string): Graph {
  const doomed = doomedSet(graph, nodeId);
  return {
    nodes: graph.nodes.filter((n) => !doomed.has(n.id)),
    edges: graph.edges.filter((e) => !doomed.has(e.from) && !doomed.has(e.to)),
  };
}

// Ground an argument in an EXISTING terminal node. Replaces any prior
// grounds-in edge from this argument. Never duplicates the value.
export function linkToExistingValue(
  graph: Graph,
  argumentId: string,
  valueId: string,
): Graph {
  const edges = graph.edges.filter(
    (e) => !(e.from === argumentId && e.edgeType === "grounds-in"),
  );
  edges.push(makeEdge(argumentId, valueId, "grounds-in"));
  return { nodes: graph.nodes, edges };
}

// --- Grounding ---------------------------------------------------------------
// A question is FULLY GROUNDED when every argument chain beneath it bottoms out
// at a terminal node. Walkers traverse edges in semantic direction and guard
// against cycles. All grounding runs on the ACTIVE subgraph: a retracted
// argument can no longer carry a chain (and can honestly reopen a question).

export function isFullyGrounded(graph: Graph, questionId: string): boolean {
  return groundedQuestion(activeGraph(graph), questionId, new Set());
}

// Is this specific node grounded? Questions/positions/arguments are evaluated
// by their respective rules; terminals are inherently grounded; other node
// types (evidence, definitions, annotations…) don't participate, so `true`.
// Inert nodes are `true` too — a dead chain owes nothing.
// Powers the "what's left to ground" cue in the tree.
export function isNodeGrounded(graph: Graph, nodeId: string): boolean {
  const node = getNode(graph, nodeId);
  if (!node) return false;
  if (isInert(node)) return true;
  const ag = activeGraph(graph);
  switch (node.type) {
    case "question":
      return groundedQuestion(ag, nodeId, new Set());
    case "position":
      return groundedPosition(ag, nodeId, new Set());
    case "argument-support":
    case "argument-attack":
      return groundedArgument(ag, nodeId, new Set());
    default:
      return true;
  }
}

function groundedQuestion(
  graph: Graph,
  questionId: string,
  visiting: Set<string>,
): boolean {
  const question = getNode(graph, questionId);
  if (!question || question.type !== "question") return false;
  if (visiting.has(questionId)) return false;
  const next = new Set(visiting).add(questionId);

  const positions = graph.edges
    .filter((e) => e.to === questionId && e.edgeType === "answers")
    .map((e) => getNode(graph, e.from))
    .filter((n): n is GraphNode => Boolean(n));

  if (positions.length === 0) return false;
  return positions.every((p) => groundedPosition(graph, p.id, next));
}

function groundedPosition(
  graph: Graph,
  positionId: string,
  visiting: Set<string>,
): boolean {
  // A position may rest directly on a terminal (some seed data does this), or
  // be backed by arguments that each ground out.
  const direct = graph.edges.find(
    (e) => e.from === positionId && e.edgeType === "grounds-in",
  );
  if (direct) {
    const terminal = getNode(graph, direct.to);
    if (terminal && isTerminalType(terminal.type)) return true;
  }

  const args = graph.edges
    .filter(
      (e) =>
        e.to === positionId &&
        (e.edgeType === "argues-for" || e.edgeType === "argues-against"),
    )
    .map((e) => getNode(graph, e.from))
    .filter((n): n is GraphNode => Boolean(n));

  if (args.length === 0) return false;
  return args.every((a) => groundedArgument(graph, a.id, visiting));
}

function groundedArgument(
  graph: Graph,
  argumentId: string,
  visiting: Set<string>,
): boolean {
  // Grounds out directly at a terminal node?
  const groundsIn = graph.edges.find(
    (e) => e.from === argumentId && e.edgeType === "grounds-in",
  );
  if (groundsIn) {
    const terminal = getNode(graph, groundsIn.to);
    return Boolean(terminal && isTerminalType(terminal.type));
  }

  // Or raises a child question that is itself fully grounded?
  const raises = graph.edges.find(
    (e) => e.from === argumentId && e.edgeType === "raises",
  );
  if (raises) return groundedQuestion(graph, raises.to, visiting);

  return false;
}

// Trace from a node down its grounds-in / raises chain to the terminal it
// reaches, if any.
export function getGroundingTerminal(
  graph: Graph,
  nodeId: string,
): GraphNode | undefined {
  let current: string | undefined = nodeId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const node = getNode(graph, current);
    if (node && isTerminalType(node.type)) return node;
    const next = graph.edges.find(
      (e) =>
        e.from === current &&
        (e.edgeType === "grounds-in" || e.edgeType === "raises"),
    );
    current = next?.to;
  }
  return undefined;
}

// --- Acceptability (Dung-style defeat analysis) -----------------------------
// Attacks are cosmetic until they have consequences. Here we compute, for every
// active node, whether it is DEFENDED, DEFEATED, or CONTESTED under grounded
// semantics — so an objection can defeat an argument, and a rebuttal can
// revive it.
//
// Attack relation: a node is attacked by its *attacking-type children* — and,
// via warrants, by the undercutters of its warrant children: defeating the
// license of an inference defeats the inference (Pollock via Toulmin). Because
// these run child→parent over the tree, the attack graph is acyclic, so
// grounded labelling is total (every node ends up defended or defeated;
// CONTESTED is reserved for the degenerate cyclic case and shouldn't arise
// from normal authoring). Inert nodes neither attack nor get labels.

export type Acceptability = "defended" | "defeated" | "contested";

// Exported for the organize engine: attacks on these types are dialectical
// moves (a rebuttal defeating an objection is progress, not a problem).
export const ATTACKING_TYPES: ReadonlySet<NodeType> = new Set<NodeType>([
  "argument-attack",
  "objection",
  "rebuttal",
  "counter-argument",
  "counter-example",
  "logical-fallacy",
]);

// The nodes that attack `nodeId`: its active attacking-type children, plus the
// attackers of any active warrant child (undercutting the warrant undercuts
// the licensed node).
export function getAttackers(graph: Graph, nodeId: string): GraphNode[] {
  const out = new Map<string, GraphNode>();
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const child of getChildren(graph, id)) {
      if (isInert(child)) continue;
      if (ATTACKING_TYPES.has(child.type)) out.set(child.id, child);
      else if (child.type === "warrant") visit(child.id);
    }
  };
  visit(nodeId);
  return [...out.values()];
}

// Grounded labelling for the whole (active) graph.
export function getAcceptability(graph: Graph): Map<string, Acceptability> {
  const ag = activeGraph(graph);
  const attackers = new Map<string, string[]>();
  for (const n of ag.nodes) {
    attackers.set(
      n.id,
      getAttackers(ag, n.id).map((a) => a.id),
    );
  }

  // "in" = defended, "out" = defeated; unlabelled until decided.
  const label = new Map<string, "in" | "out">();
  let changed = true;
  while (changed) {
    changed = false;
    // A node is defended once all of its attackers are defeated.
    for (const n of ag.nodes) {
      if (label.has(n.id)) continue;
      const atk = attackers.get(n.id) as string[];
      if (atk.every((a) => label.get(a) === "out")) {
        label.set(n.id, "in");
        changed = true;
      }
    }
    // A node is defeated once any attacker is defended.
    for (const n of ag.nodes) {
      if (label.has(n.id)) continue;
      const atk = attackers.get(n.id) as string[];
      if (atk.some((a) => label.get(a) === "in")) {
        label.set(n.id, "out");
        changed = true;
      }
    }
  }

  const result = new Map<string, Acceptability>();
  for (const n of ag.nodes) {
    const l = label.get(n.id);
    result.set(
      n.id,
      l === "in" ? "defended" : l === "out" ? "defeated" : "contested",
    );
  }
  return result;
}

// --- Resolution (docs/STATUS_AND_COMMITMENT.md §4) ---------------------------
// Grounding asks "did we dig to bedrock?"; resolution asks "did anything win,
// by the bar this question declares?" — and a question whose presupposition
// falls doesn't get an answer at all: it DISSOLVES.

export type ResolutionState = "dissolved" | "resolved" | "grounded" | "open";

export interface Resolution {
  state: ResolutionState;
  standard: ProofStandard;
  survivors: GraphNode[]; // positions passing the standard (resolved only)
  dissolvedBy: GraphNode[]; // fallen presuppositions (dissolved only)
}

// The presuppositions attached to a question (full graph — ghosts included so
// the UI can show why something dissolved even after cleanup).
export function getPresuppositions(
  graph: Graph,
  questionId: string,
): GraphNode[] {
  return graph.edges
    .filter((e) => e.edgeType === "presupposes" && e.from === questionId)
    .map((e) => getNode(graph, e.to))
    .filter((n): n is GraphNode => Boolean(n));
}

export function getResolution(graph: Graph, questionId: string): Resolution {
  const question = getNode(graph, questionId);
  const standard: ProofStandard = question?.proofStandard ?? "preponderance";
  const empty: Resolution = {
    state: "open",
    standard,
    survivors: [],
    dissolvedBy: [],
  };
  if (!question || question.type !== "question") return empty;

  const acceptability = getAcceptability(graph);

  // Dissolution: a presupposition editorially refuted, or actively defeated.
  const dissolvedBy = getPresuppositions(graph, questionId).filter(
    (p) =>
      p.status === "refuted" ||
      (!isInert(p) && acceptability.get(p.id) === "defeated"),
  );
  if (dissolvedBy.length > 0)
    return { state: "dissolved", standard, survivors: [], dissolvedBy };

  const ag = activeGraph(graph);
  if (!groundedQuestion(ag, questionId, new Set()))
    return { state: "open", standard, survivors: [], dissolvedBy: [] };

  const positions = ag.edges
    .filter((e) => e.to === questionId && e.edgeType === "answers")
    .map((e) => getNode(ag, e.from))
    .filter((n): n is GraphNode => Boolean(n));

  const defended = (id: string) => acceptability.get(id) === "defended";

  const passes = (p: GraphNode): boolean => {
    if (!defended(p.id)) return false;
    if (standard === "preponderance") return true;
    const positionGrounded = groundedPosition(ag, p.id, new Set());
    if (standard === "clear-and-convincing") return positionGrounded;
    // beyond-reasonable-doubt: also every supporting argument survives.
    const supports = ag.edges
      .filter((e) => e.to === p.id && e.edgeType === "argues-for")
      .map((e) => e.from);
    const brd =
      positionGrounded && supports.length > 0 && supports.every(defended);
    if (standard === "beyond-reasonable-doubt") return brd;
    // dialectical-validity: the entire constructive skeleton beneath the
    // position survives — no supporting element anywhere is defeated. (A
    // defended rebuttal is fine: it answers a challenge, it isn't one.)
    if (!brd) return false;
    for (const id of getDescendantIds(ag, p.id)) {
      const node = getNode(ag, id);
      if (node && !ATTACKING_TYPES.has(node.type) && !defended(node.id))
        return false;
    }
    return true;
  };

  const survivors = positions.filter(passes);
  return {
    state: survivors.length > 0 ? "resolved" : "grounded",
    standard,
    survivors,
    dissolvedBy: [],
  };
}

// --- Depth metrics ----------------------------------------------------------
// The product is about depth — so surface it. These read-only queries power the
// insights panel and the "weakest link" finder.

// Steps from a node up to its root (0 for a root).
export function getDepth(graph: Graph, nodeId: string): number {
  let depth = 0;
  let current = getParent(graph, nodeId);
  const seen = new Set<string>([nodeId]);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    depth++;
    current = getParent(graph, current.id);
  }
  return depth;
}

// Longest downward path from a node to a leaf (cycle-guarded, memoized).
function longestPath(
  graph: Graph,
  nodeId: string,
  memo: Map<string, number>,
  visiting: Set<string>,
): number {
  const cached = memo.get(nodeId);
  if (cached !== undefined) return cached;
  if (visiting.has(nodeId)) return 0;
  visiting.add(nodeId);
  const children = getChildren(graph, nodeId);
  const depth =
    children.length === 0
      ? 0
      : 1 +
        Math.max(...children.map((c) => longestPath(graph, c.id, memo, visiting)));
  visiting.delete(nodeId);
  memo.set(nodeId, depth);
  return depth;
}

export interface GraphStats {
  questions: number;
  premises: number;
  positions: number;
  arguments: number;
  terminals: number;
  groundedQuestions: number;
  openQuestions: number;
  convergentValues: number;
  clashes: number;
  maxDepth: number;
}

// Stats describe the LIVING graph — inert nodes don't count.
export function getGraphStats(graph: Graph): GraphStats {
  const ag = activeGraph(graph);
  const questions = getRootQuestions(ag);
  const grounded = questions.filter((q) => isFullyGrounded(ag, q.id)).length;
  const memo = new Map<string, number>();
  const roots = getRoots(ag);
  const maxDepth = roots.reduce(
    (m, r) => Math.max(m, longestPath(ag, r.id, memo, new Set())),
    0,
  );
  return {
    questions: ag.nodes.filter((n) => n.type === "question").length,
    premises: ag.nodes.filter((n) => n.type === "premise").length,
    positions: ag.nodes.filter((n) => n.type === "position").length,
    arguments: ag.nodes.filter(
      (n) => n.type === "argument-support" || n.type === "argument-attack",
    ).length,
    terminals: getTerminals(ag).length,
    groundedQuestions: grounded,
    openQuestions: questions.length - grounded,
    convergentValues: getValueUsage(ag).filter((u) => u.convergent).length,
    clashes: getValueClashes(ag).length,
    maxDepth,
  };
}

export interface GroundingGap {
  node: GraphNode;
  root: GraphNode | undefined;
  depth: number;
}

// Arguments that don't yet reach a foundation — the concrete grounding to-do
// list, shallowest first (the shallowest is the "weakest link", closest to a
// root and blocking the most). Dead arguments owe nothing.
export function getGroundingGaps(graph: Graph): GroundingGap[] {
  const ag = activeGraph(graph);
  return ag.nodes
    .filter(
      (n) =>
        (n.type === "argument-support" || n.type === "argument-attack") &&
        !isNodeGrounded(ag, n.id),
    )
    .map((n) => ({
      node: n,
      root: getRootFor(ag, n.id),
      depth: getDepth(ag, n.id),
    }))
    .sort((a, b) => a.depth - b.depth);
}

// --- Convergence ------------------------------------------------------------
// The product thesis: many questions resolving to the same bedrock values.
// These read-only queries power the Values index and clash detection.

// All active terminal nodes (value / principle / epistemic-limit).
export function getTerminals(graph: Graph): GraphNode[] {
  return graph.nodes.filter((n) => isTerminalType(n.type) && !isInert(n));
}

// Walk up the parent chain to the root a node ultimately sits under — a
// top-level question or premise. Returns undefined if the chain dead-ends
// somewhere else (e.g. an orphaned terminal).
export function getRootFor(
  graph: Graph,
  nodeId: string,
): GraphNode | undefined {
  let node = getNode(graph, nodeId);
  const seen = new Set<string>();
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    const parent = getParent(graph, node.id);
    if (!parent) {
      return node.type === "question" || node.type === "premise"
        ? node
        : undefined;
    }
    node = parent;
  }
  return undefined;
}

export interface ValueUsage {
  value: GraphNode;
  // Nodes (arguments or positions) that ground directly in this terminal.
  groundingNodes: GraphNode[];
  // Distinct roots (questions or premises) whose chains reach this terminal.
  roots: GraphNode[];
  // True when reached from more than one distinct root.
  convergent: boolean;
}

// Usage summary for every terminal, sorted by how many roots converge on it.
export function getValueUsage(graph: Graph): ValueUsage[] {
  const ag = activeGraph(graph);
  return getTerminals(ag)
    .map((value) => {
      const groundingNodes = ag.edges
        .filter((e) => e.edgeType === "grounds-in" && e.to === value.id)
        .map((e) => getNode(ag, e.from))
        .filter((n): n is GraphNode => Boolean(n));

      const rootMap = new Map<string, GraphNode>();
      for (const node of groundingNodes) {
        const root = getRootFor(ag, node.id);
        if (root) rootMap.set(root.id, root);
      }
      const roots = [...rootMap.values()];
      return {
        value,
        groundingNodes,
        roots,
        convergent: roots.length > 1,
      };
    })
    .sort((a, b) => b.roots.length - a.roots.length);
}

export interface ValueClash {
  question: GraphNode;
  values: GraphNode[]; // the distinct terminals its chains bottom out at
}

// A root question "clashes" when its chains ground in more than one distinct
// terminal — the real value disagreement the product aims to surface.
export function getValueClashes(graph: Graph): ValueClash[] {
  const ag = activeGraph(graph);
  const clashes: ValueClash[] = [];
  for (const question of getRootQuestions(ag)) {
    const terminals = new Map<string, GraphNode>();
    for (const t of getTerminals(ag)) {
      const reaches = ag.edges.some(
        (e) =>
          e.edgeType === "grounds-in" &&
          e.to === t.id &&
          getRootFor(ag, e.from)?.id === question.id,
      );
      if (reaches) terminals.set(t.id, t);
    }
    if (terminals.size > 1) {
      clashes.push({ question, values: [...terminals.values()] });
    }
  }
  return clashes;
}

// --- Value de-duplication ---------------------------------------------------
// Convergence depends on REUSING bedrock nodes, not re-typing near-identical
// ones. A lightweight text similarity nudges the user to link instead.

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// 0..1 similarity: 1 = identical (after normalization), else the larger of
// token-set Jaccard overlap and a containment boost.
export function similarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = new Set([...ta, ...tb]).size;
  const jaccard = union ? inter / union : 0;
  const contained = na.includes(nb) || nb.includes(na) ? 0.6 : 0;
  return Math.max(jaccard, contained);
}

export interface TerminalMatch {
  node: GraphNode;
  score: number;
}

// Existing terminals of `type` similar to `text`, most similar first.
export function findSimilarTerminals(
  graph: Graph,
  text: string,
  type: NodeType,
  threshold = 0.5,
): TerminalMatch[] {
  if (!text.trim()) return [];
  return graph.nodes
    .filter((n) => n.type === type && !isInert(n))
    .map((node) => ({ node, score: similarity(text, node.content) }))
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
