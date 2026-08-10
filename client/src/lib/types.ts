// Core data model for Axiomer.
// 8 node types, 5 edge types. Keep this in sync with NODE_META (meta.tsx),
// the Legend, and the context-sensitive dropdown rules in graph.ts.

export type NodeType =
  | "claim"
  | "premise"
  | "support"
  | "conflict"
  | "note"
  | "value"
  | "source"
  | "limit"
  | "bedrock"
  | "preference";

export type EdgeType =
  | "supports"
  | "conflicts"
  | "annotates"
  | "grounds"
  | "cites";

export interface GraphNode {
  id: string;
  type: NodeType;
  content: string;
  createdAt?: string;
  url?: string;
  verified?: boolean;
  position?: { x: number; y: number };
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

// Terminal node types. These can never have children.
export const TERMINAL_TYPES: readonly NodeType[] = [
  "value",
  "source",
  "limit",
  "bedrock",
  "preference",
];

// Runtime lists of every valid type — used to validate imported graph JSON.
export const NODE_TYPES: readonly NodeType[] = [
  "claim",
  "premise",
  "support",
  "conflict",
  "note",
  "value",
  "source",
  "limit",
  "bedrock",
  "preference",
];

export const EDGE_TYPES: readonly EdgeType[] = [
  "supports",
  "conflicts",
  "annotates",
  "grounds",
  "cites",
];

export function isTerminalType(type: NodeType): boolean {
  return TERMINAL_TYPES.includes(type);
}

// ---------------------------------------------------------------------------
// Migration: map old 22-type system → new 8-type system
// ---------------------------------------------------------------------------

type LegacyNodeType =
  | "question" | "position"
  | "argument-support" | "evidence-empirical" | "evidence-anecdotal" | "rebuttal"
  | "argument-attack" | "counter-argument" | "objection" | "logical-fallacy"
  | "attack" // Add "attack" so existing graphs can migrate to "conflict"
  | "assumption" | "definition" | "caveat" | "clarification"
  | "analogy" | "thought-experiment" | "related-concept"
  | "value" | "principle"
  | "epistemic-limit"
  | "premise"
  | "source";

const LEGACY_NODE_MAP: Record<LegacyNodeType, NodeType> = {
  "question": "claim",
  "position": "claim",
  "argument-support": "support",
  "evidence-empirical": "support",
  "evidence-anecdotal": "support",
  "rebuttal": "support",
  "argument-attack": "conflict",
  "counter-argument": "conflict",
  "objection": "conflict",
  "logical-fallacy": "conflict",
  "attack": "conflict",
  "assumption": "note",
  "definition": "note",
  "caveat": "note",
  "clarification": "note",
  "analogy": "note",
  "thought-experiment": "note",
  "related-concept": "note",
  "value": "value",
  "principle": "value",
  "epistemic-limit": "limit",
  "premise": "premise",
  "source": "source",
};

type LegacyEdgeType =
  | "answers" | "supports" | "argues-for" | "argues-against"
  | "raises" | "objects-to" | "rebuts" | "grounds-in"
  | "attacks" // Add "attacks" to migrate to "conflicts"
  | "connects-to" | "illustrates" | "entails" | "cites";

const LEGACY_EDGE_MAP: Record<LegacyEdgeType, EdgeType> = {
  "answers": "supports",
  "supports": "supports",
  "argues-for": "supports",
  "argues-against": "conflicts",
  "raises": "annotates",
  "objects-to": "conflicts",
  "rebuts": "supports",
  "grounds-in": "grounds",
  "attacks": "conflicts",
  "connects-to": "annotates",
  "illustrates": "annotates",
  "entails": "supports",
  "cites": "cites",
};

/** Migrate a graph from the old 22-type system to the new 8-type system. */
export function migrateGraph(graph: { nodes: any[]; edges: any[] }): Graph {
  const newNodeTypes = new Set<string>(NODE_TYPES);
  const newEdgeTypes = new Set<string>(EDGE_TYPES);

  return {
    nodes: graph.nodes.map((n) => ({
      ...n,
      type: newNodeTypes.has(n.type)
        ? n.type
        : (LEGACY_NODE_MAP as Record<string, NodeType>)[n.type] || n.type,
    })),
    edges: graph.edges.map((e) => ({
      ...e,
      edgeType: newEdgeTypes.has(e.edgeType)
        ? e.edgeType
        : (LEGACY_EDGE_MAP as Record<string, EdgeType>)[e.edgeType] || e.edgeType,
    })),
  };
}
