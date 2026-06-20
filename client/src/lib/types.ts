// Core data model for Axiomer.
// 21 node types, 11 edge types. Keep this in sync with NODE_META (meta.ts),
// the Legend, and the context-sensitive dropdown rules in graph.ts.
// `premise` is a non-terminal foundation you reason FORWARD from (reverse
// authoring); `entails` connects a premise to what it leads to.

export type NodeType =
  | "question"
  | "position"
  | "argument-support"
  | "argument-attack"
  | "evidence-empirical"
  | "evidence-anecdotal"
  | "assumption"
  | "definition"
  | "caveat"
  | "clarification"
  | "counter-argument"
  | "objection"
  | "rebuttal"
  | "analogy"
  | "thought-experiment"
  | "related-concept"
  | "logical-fallacy"
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
  | "entails";

export interface GraphNode {
  id: string;
  type: NodeType;
  content: string;
  createdAt?: string;
}

export interface GraphEdge {
  id: string;
  from: string; // source node id (semantic source of the relationship)
  to: string; // target node id (semantic target of the relationship)
  edgeType: EdgeType;
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

export function isTerminalType(type: NodeType): boolean {
  return TERMINAL_TYPES.includes(type);
}
