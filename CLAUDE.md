# Working on Axiomer

This is the current implementation guide. `docs/SPECIFICATION.md` and
`STATUS_WINDOW_PLAN.md` describe earlier product iterations and are not the
source of truth for the UI or ontology.

## Product rule

Axiomer should make one loop effortless:

> State a thought → add what supports or challenges it → ground it in a
> foundation.

The software is a neutral thinking tool. It does not coach, judge, score, or
nag. Prefer plain language, visible actions, inline editing, and progressive
disclosure. A first-time user should not need to understand graph terminology.

## Stack and commands

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- `wouter` routing
- React Flow + dagre for the lazy-loaded Map
- `localStorage` in authoring mode; static JSON in public read-only mode

```bash
npm run typecheck
npm test
npm run build
```

All three must pass before handoff.

## Current product structure

```text
client/src/
├── pages/
│   ├── Dashboard.tsx       map library and first-run explanation
│   └── Home.tsx            editor shell; Map and Outline modes
├── components/
│   ├── GraphMap.tsx        visual graph, search, inspector, authoring
│   ├── ArgumentView.tsx    readable recursive outline and authoring
│   ├── ExportModal.tsx
│   └── TutorialOverlay.tsx
├── hooks/
│   ├── useGraph.ts         persistence and graph mutations
│   └── useProjects.ts      lightweight local map library
└── lib/
    ├── types.ts            graph schema and legacy migration
    ├── meta.tsx            display metadata and child rules
    ├── graph.ts            pure graph logic
    ├── flowLayout.ts       dagre layout
    ├── seed.ts             two compact worked examples
    ├── io.ts               validated import/export
    └── dataSource.ts       authoring vs. public data source
```

The example map uses `graphId === "starter"`. New maps start empty. Do not make
every new graph load the examples.

## Graph model

There are exactly 10 node types:

```ts
type NodeType =
  | "claim" | "premise" | "support" | "conflict" | "note"
  | "value" | "source" | "limit" | "bedrock" | "preference";
```

The five foundation types are terminal and cannot have children. Keep
`types.ts`, `meta.tsx`, import validation, and UI choices in sync.

There are five edge types:

```ts
type EdgeType = "supports" | "conflicts" | "annotates" | "grounds" | "cites";
```

### Edge direction

Edge direction is semantic, not visual:

- `supports`, `conflicts`, and `annotates` are stored child → parent.
- `grounds` and `cites` are stored parent → foundation.

Never infer hierarchy by directly reading `from` and `to`. Use
`edgeEndpoints`, `getChildren`, `getParent`, `getParents`, and `getRoots` from
`lib/graph.ts`. Use `addNode`/`edgeTypeFor` to construct relationships.

### Grounding

Grounding answers whether a claim's reasoning reaches a terminal foundation.
Use `isFullyGrounded` for root claims and `isNodeGrounded` for node-level UI.
Grounding and conflict acceptability are separate signals. The UI shows one
primary status: Conflicted takes priority, otherwise Grounded or Open.

### Reuse and convergence

Reuse is the core differentiator. `linkToExistingValue` links a reasoning node
to an existing terminal instead of duplicating it. The Map and Outline both
surface this action only after a user has selected a thought. Keep graph queries
pure and reuse `getValueUsage`, `getValueClashes`, and `findSimilarTerminals`.

## UI conventions

- The Map is the default view; the Outline is the readable alternative.
- Node creation and editing happen in context. Do not use `prompt`, `alert`, or
  `confirm`.
- Do not require hover for essential actions; controls must remain usable on
  touch devices.
- Use five calm visual families: blue claim, violet premise, green support,
  rose conflict, slate note, with warm foundation accents.
- Keep graph nodes compact. Full content and authoring actions belong in the
  inspector.
- React Flow stays lazy-loaded through `Home.tsx`.
- Preserve read-only mode by omitting mutation callbacks and controls.
- Avoid adding dependencies for interaction patterns React and Tailwind can
  express directly.

## Persistence

Authoring graphs are stored under `axiomer_graph_<graphId>`. The library is
stored under `axiomer_projects`. Shared links may hydrate a graph from the URL
hash. Public mode is selected by `VITE_PUBLIC_READONLY` and loads
`client/public/graph.json`.

Graph transforms belong in `lib/graph.ts` and must remain pure. React, DOM,
storage, network, and presentation logic do not belong there.
