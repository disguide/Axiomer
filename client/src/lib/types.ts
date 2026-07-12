// Core data model for Axiomer.
// 30 node types, 18 edge types (Taxonomy v2 — see docs/TAXONOMY.md).
// Keep this in sync with NODE_META (meta.ts), the Legend, and the
// context-sensitive dropdown rules.
//
// Three orthogonal axes (docs/PHILOSOPHY.md §3):
//   1. TYPE      — structural role (this file's NodeType)
//   2. FACETS    — content kind, scheme tag, edge strength, proof standard
//   3. STATUS    — asserted lifecycle state (active/retracted/refuted/…)
// Never encode a facet or a status into a type.

export type NodeType =
  // Inquiry
  | "question"
  | "presupposition"
  // Stance
  | "position"
  | "synthesis"
  // Reasoning
  | "argument-support"
  | "argument-attack"
  | "warrant"
  | "implication"
  // Evidence
  | "evidence-empirical"
  | "evidence-anecdotal"
  | "example"
  // Dialectic
  | "objection"
  | "rebuttal"
  | "counter-argument"
  | "counter-example"
  | "concession"
  | "logical-fallacy"
  // Precision
  | "assumption"
  | "definition"
  | "distinction"
  | "clarification"
  | "caveat"
  | "criterion"
  // Exploration
  | "analogy"
  | "thought-experiment"
  | "related-concept"
  // Foundation + reverse root
  | "value"
  | "principle"
  | "epistemic-limit"
  | "premise";

export type EdgeType =
  | "answers"
  | "supports"
  | "argues-for"
  | "argues-against"
  | "raises"
  | "objects-to"
  | "rebuts"
  | "grounds-in"
  | "connects-to"
  | "illustrates"
  | "entails"
  // v2 (docs/TAXONOMY.md §3)
  | "undercuts" // attacks the INFERENCE, not the conclusion (Pollock)
  | "presupposes" // question/claim → what it assumes (DOWNWARD)
  | "contradicts" // symmetric incompatibility constraint
  | "exemplifies" // example → the claim it instantiates
  | "concedes" // concession → the opposing point granted
  | "qualifies" // caveat/criterion → what it scopes / sets the standard for
  | "supersedes"; // successor → superseded node (status system)

// --- Axis 3: asserted lifecycle status (docs/STATUS_AND_COMMITMENT.md §2) ---
// Everything except "active" is INERT: kept as history, rendered as a ghost,
// excluded from grounding / acceptability / commitment computation.

export type NodeStatus =
  | "active"
  | "retracted" // author withdrew it (no verdict on truth)
  | "refuted" // judged decisively defeated, book closed (editorial verdict)
  | "invalid" // malformed as a move (not wrong — not well-formed)
  | "superseded" // replaced by a better formulation (see `supersedes` edge)
  | "merged"; // folded into a canonical duplicate

export interface StatusMeta {
  by?: string; // who set it
  at?: string; // ISO timestamp
  reason?: string; // short why
}

// --- Axis 2: facets ---------------------------------------------------------

// What sort of statement a claim-bearing node makes. Powers the is/ought
// firewall: a normative conclusion needs a normative link somewhere below.
export type ContentKind =
  | "empirical"
  | "normative"
  | "conceptual"
  | "metaphysical"
  | "logical-mathematical"
  | "practical";

// Toulmin's qualifier, on support-type edges. `entails` is always deductive.
export type InferenceStrength =
  | "deductive"
  | "strong"
  | "presumptive"
  | "speculative";

// Carneades: how decisively must a position win for the question to count as
// resolved (docs/STATUS_AND_COMMITMENT.md §4).
export type ProofStandard =
  | "preponderance"
  | "clear-and-convincing"
  | "beyond-reasonable-doubt"
  | "dialectical-validity";

export interface GraphNode {
  id: string;
  type: NodeType;
  content: string;
  createdAt?: string;
  status?: NodeStatus; // absent = "active"
  statusMeta?: StatusMeta;
  contentKind?: ContentKind;
  schemeTag?: string; // Walton scheme name, free-form (see TAXONOMY §4.3)
  proofStandard?: ProofStandard; // questions only; absent = "preponderance"
}

export interface GraphEdge {
  id: string;
  from: string; // source node id (semantic source of the relationship)
  to: string; // target node id (semantic target of the relationship)
  edgeType: EdgeType;
  strength?: InferenceStrength; // support-type edges; absent = "presumptive"
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// The three terminal node types. These can never have children.
export const TERMINAL_TYPES: readonly NodeType[] = [
  "value",
  "principle",
  "epistemic-limit",
];

// Runtime lists of every valid type — used to validate imported graph JSON.
// Typed against the unions so a typo or drift is a compile error.
export const NODE_TYPES: readonly NodeType[] = [
  "question",
  "presupposition",
  "position",
  "synthesis",
  "argument-support",
  "argument-attack",
  "warrant",
  "implication",
  "evidence-empirical",
  "evidence-anecdotal",
  "example",
  "objection",
  "rebuttal",
  "counter-argument",
  "counter-example",
  "concession",
  "logical-fallacy",
  "assumption",
  "definition",
  "distinction",
  "clarification",
  "caveat",
  "criterion",
  "analogy",
  "thought-experiment",
  "related-concept",
  "value",
  "principle",
  "epistemic-limit",
  "premise",
];

export const EDGE_TYPES: readonly EdgeType[] = [
  "answers",
  "supports",
  "argues-for",
  "argues-against",
  "raises",
  "objects-to",
  "rebuts",
  "grounds-in",
  "connects-to",
  "illustrates",
  "entails",
  "undercuts",
  "presupposes",
  "contradicts",
  "exemplifies",
  "concedes",
  "qualifies",
  "supersedes",
];

export const NODE_STATUSES: readonly NodeStatus[] = [
  "active",
  "retracted",
  "refuted",
  "invalid",
  "superseded",
  "merged",
];

export const CONTENT_KINDS: readonly ContentKind[] = [
  "empirical",
  "normative",
  "conceptual",
  "metaphysical",
  "logical-mathematical",
  "practical",
];

export const INFERENCE_STRENGTHS: readonly InferenceStrength[] = [
  "deductive",
  "strong",
  "presumptive",
  "speculative",
];

export const PROOF_STANDARDS: readonly ProofStandard[] = [
  "preponderance",
  "clear-and-convincing",
  "beyond-reasonable-doubt",
  "dialectical-validity",
];

export function isTerminalType(type: NodeType): boolean {
  return TERMINAL_TYPES.includes(type);
}

// A node participates in computation only while active.
export function isInert(node: GraphNode): boolean {
  return node.status !== undefined && node.status !== "active";
}
