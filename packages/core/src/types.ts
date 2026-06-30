/**
 * The shared graph substrate.
 *
 * Every Axiomer "lens" — the reasoning graph, the skill tree, the status
 * dashboard — is the same shape: typed nodes connected by typed, directed edges,
 * with open `data` for per-lens attributes (XP, grounded?, defeated?, …).
 *
 * This module is deliberately domain-agnostic: it knows nothing about
 * "questions", "values", or "skills". Each lens defines its own node-type and
 * relationship vocabulary (and the meaning/direction of its edges) on top of
 * these primitives. Keep this package pure — no React, DOM, or network.
 */

/** Stable identifier for a node or edge. */
export type Id = string;

/**
 * A node. `type` and the contents of `data` are owned by whichever lens created
 * the node; core treats them opaquely.
 */
export interface GraphNode {
  id: Id;
  /** Lens-defined kind, e.g. "question" | "value" | "skill". */
  type: string;
  /** Short human-readable label / title. */
  label: string;
  /** Optional longer body text. */
  body?: string;
  /** Open bag for lens-specific attributes (xp, level, grounded, weight, …). */
  data?: Record<string, unknown>;
}

/**
 * A directed edge from `from` → `to` with a lens-defined relationship.
 * Direction is meaningful; each lens decides what "from → to" means for a given
 * `rel` (e.g. argument `grounds-in` value; skill `prerequisite-of` skill).
 */
export interface GraphEdge {
  id: Id;
  from: Id;
  to: Id;
  /** Lens-defined relationship, e.g. "grounds-in" | "prerequisite-of". */
  rel: string;
  data?: Record<string, unknown>;
}

/** The whole graph: a flat node table and edge table. */
export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** An empty graph literal. */
export const emptyGraph = (): Graph => ({ nodes: [], edges: [] });
