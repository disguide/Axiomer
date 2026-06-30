# @axiomer/core

The **shared graph substrate** every Axiomer lens builds on:

- **Reasoning** (Axiomer) — questions/arguments/values, grounding, convergence.
- **Skills** — a skill tree (skills + prerequisite edges, XP/unlock state).
- **Status** — a dashboard of aggregates derived from the graph.

They're all the same shape: **typed nodes + typed, directed edges + open `data`**.
This package owns that shape and the pure operations over it; it knows nothing
about any specific lens's vocabulary. Each lens defines its own node types,
relationships, and edge-direction meaning on top.

## What's here

- `types.ts` — `GraphNode`, `GraphEdge`, `Graph`.
- `graph.ts` — pure, immutable operations:
  - lookups: `getNode`, `outgoingEdges`/`incomingEdges`, `successors`/`predecessors`, `roots`/`leaves`, `nodesOfType`
  - traversal (cycle-safe): `descendants`, `ancestors`, `subgraph`, `hasPath`, `hasCycle`
  - mutations (return a new graph): `addNode`, `updateNode`, `addEdge`, `removeEdge`, `removeNode`, `mergeNodes`
- `mergeNodes` is the substrate-level primitive behind **convergence/dedup**:
  fold duplicate nodes into one canonical node, re-pointing edges.

## Rules

- **Pure.** No React, DOM, or network. All lens/LLM/storage code lives elsewhere
  and reads from here.
- **Immutable.** Every mutation returns a new `Graph`.
- **Fully tested.** New logic ships with Vitest coverage (`npm test`).

Run `npm test` (from the repo root, runs all workspaces) or
`npm run typecheck --workspace @axiomer/core`.
