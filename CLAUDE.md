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

<!-- ASTRYX:START -->
Astryx v0.7.16 · 174 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then Tailwind utilities backed by tokens. No raw hex/px.
- THEMES: palettes and custom colors go through the theme, never :root overrides. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` and open the PNGs it writes (changes nothing in the app); a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any style={{…}}, raw <div>/<span>, imported .css/@apply, or hardcoded/arbitrary value (bg-[#fff], p-[13px]) with the component or a token-backed utility.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->

## Astryx mobile controls

The Map keeps its existing canvas and semantics. `GraphMap.tsx` uses Astryx for its mobile action dock and starting-thought sheet; root CSS loads the layered compatibility styles before the theme module. See `docs/UI_IMPROVEMENTS.md` for the scope and visual verification.

## Reasoning framework and document boundaries

- `ReasoningWorkbench.tsx` owns guided argument steps, local self-authored profile, copy/attachment previews, snapshot export and AI proposal review. The ten node types are unchanged.
- `lib/framework.ts` owns pure guided construction, copied composition, graph fingerprints and additions-only proposal validation; `lib/sharing.ts` owns versioned snapshots and default profile exclusion.
- Shared snapshots are read-only and never auto-import into the active graph. Save an editable copy creates a separate project. Hash navigation remounts the shared session.
- `useGraph` validates imports and keeps a bounded in-memory undo/redo history. Invalid saved data is kept rather than overwritten by an empty graph. Project reads never write the map library on mount.
- `lib/navigation.ts` indexes documents and bounds rendered views before layout. Full-document search can reveal hidden thoughts. Do not substitute scoped graph data for the full document when mutating.
- AI integration is a structured export/paste-proposal interface with preview/apply; there is no connected provider or simulated judgment. Personal profile context is explicitly opt-in.
