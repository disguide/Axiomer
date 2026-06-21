# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## Current state of the repo

**V1 is implemented and builds.** The full client (data model, graph utilities,
React UI, localStorage persistence, seed data) is in place under `client/`. The
app builds with `npm run build` and runs with `npm run dev`.

The authoritative design document is the **Axiomer V1 Master Specification &
Implementation Guide**. A few spots in that spec are internally inconsistent;
where they are, this file documents the decision that was actually implemented
(see "Resolved spec inconsistencies" below). When in doubt, the code in
`client/src/lib/` is the source of truth for behavior.

## What Axiomer is

Axiomer is a **wiki-style argument-tree platform**. Users explore a question by
tracing arguments down to their **bedrock values** — fundamental values,
principles, or epistemic limits. Think "Kialo, but it forces deep exploration":
every argument chain must eventually bottom out at a foundation.

The graph is **cumulative**. As users answer many questions, they **link to
existing bedrock values** rather than duplicating them. This produces
**convergence** — different questions resolving to the same core values, which
surfaces the real value clashes underlying disagreements.

Two key user-facing concepts:
- **Grounding status** per question: `FULLY GROUNDED` (every argument chain
  reaches a terminal value/principle/epistemic-limit) vs `OPEN` (some chain
  dead-ends or leads to an unanswered question).
- **Reuse of values** to create convergence across questions.

## Tech stack (target)

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- shadcn/ui components
- **React Flow (`@xyflow/react`) + `dagre`** — only for the Map view; lazy-loaded
  so it stays out of the main bundle.
- **No backend in V1.** All state lives in `localStorage`. No API, no DB.

## Project structure (actual)

```
/                       (repo root)
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx          ← Main page: header, New Question, TreeView + Legend
│   │   ├── components/
│   │   │   ├── TreeView.tsx      ← Recursive tree; owns expand/collapse + add-modal
│   │   │   ├── NodeCard.tsx      ← Single node: icon, label, content, badge, actions, inline edit
│   │   │   ├── AddNodeForm.tsx   ← Modal: context-sensitive type dropdown + value linking
│   │   │   ├── ValuesIndex.tsx   ← Convergence view: values + clashes (Values tab)
│   │   │   ├── GraphMap.tsx      ← Node-link DAG view (React Flow + dagre, Map tab; lazy-loaded)
│   │   │   └── Legend.tsx        ← Panel listing all node types
│   │   ├── lib/
│   │   │   ├── types.ts          ← NodeType, EdgeType, GraphNode/Edge/Graph, TERMINAL_TYPES
│   │   │   ├── meta.ts           ← NODE_META (labels/icons/colors/prompts), ALLOWED_CHILDREN, NODE_ORDER
│   │   │   ├── graph.ts          ← Pure graph utilities (see below)
│   │   │   ├── flowLayout.ts     ← dagre top-down layout for the Map view
│   │   │   ├── graph.test.ts     ← Vitest suite for graph.ts
│   │   │   └── seed.ts           ← Seed graphs (Trolley Problem, Sky Blue)
│   │   ├── hooks/
│   │   │   └── useGraph.ts       ← Graph state + localStorage persistence + auto-save
│   │   ├── App.tsx               ← Renders Home
│   │   ├── main.tsx              ← React entry point
│   │   ├── index.css             ← Tailwind import + base styles
│   │   └── vite-env.d.ts
│   └── index.html                ← Vite root is `client/`
├── package.json
├── vite.config.ts                ← root: "client", @ alias → client/src, build → dist/
├── tsconfig*.json
└── dist/                         ← build output (gitignored)
```

Note: shadcn/ui is listed in the spec's stack but was **not** pulled in for V1 —
the UI is plain Tailwind components. Add shadcn later if richer primitives are
needed; there is no `components/ui/` yet. `meta.ts` is an addition not in the
spec's file list: it centralizes per-type display data and the dropdown matrix.

## Core data model

```typescript
type NodeType =
  | "question" | "position"
  | "argument-support" | "argument-attack"
  | "evidence-empirical" | "evidence-anecdotal"
  | "assumption" | "definition" | "caveat" | "clarification"
  | "counter-argument" | "objection" | "rebuttal"
  | "analogy" | "thought-experiment" | "related-concept" | "logical-fallacy"
  | "value" | "principle" | "epistemic-limit";

type EdgeType =
  | "answers" | "supports" | "argues-for" | "argues-against"
  | "raises" | "objects-to" | "rebuts" | "grounds-in"
  | "connects-to" | "illustrates";

interface GraphNode { id: string; type: NodeType; content: string; createdAt?: string; }
interface GraphEdge { id: string; from: string; to: string; edgeType: EdgeType; }
interface Graph     { nodes: GraphNode[]; edges: GraphEdge[]; }
```

There are **21 node types** and **11 edge types** (V1 shipped with 20/10; the
`premise` type and `entails` edge were added for reverse authoring — see below).
Don't add or rename them without updating the Legend, the colors table, and the
context-sensitive dropdown rules together.

### Terminal nodes

`value`, `principle`, and `epistemic-limit` are **terminal** — they cannot have
children. The UI must not offer an "add child" affordance on them, and grounding
logic treats them as the bottom of a chain. `premise` is **not** terminal.

### Premises (reverse / forward-from-a-base authoring)

Normal authoring is top-down: `question → position → argument → grounds-in →
value`. A **premise** is the reverse entry point — a foundational assumption you
build *forward* from. It is a tree **root** (created via "New Premise", like
"New Question"), it is non-terminal, and everything added directly under it is
connected with the `entails` edge (`premise → child`, a `DOWNWARD` edge). A
premise tree uses all the normal machinery below it, so it can bottom out at the
same shared values — which feeds straight into the convergence view. There is no
separate "reverse mode": premises are just another kind of root you build down
from. `getRoots` returns questions **and** premises; `getRootQuestions` stays
question-only (grounding/clash logic is question-centric). Premises don't get a
grounding badge.

## Critical conventions — read before touching graph logic

### Edge direction is semantic, not visual

The `from`/`to` of an edge encodes the **relationship**, not the top-to-bottom
visual flow of the tree. This is the single biggest gotcha in the codebase.

| Edge | from → to | Meaning |
|------|-----------|---------|
| `answers` | Position → Question | position answers the question |
| `supports` | Evidence → Position/Argument | evidence supports it |
| `argues-for` | Argument(Support) → Position | argument backs the position |
| `argues-against` | Argument(Attack) → Position | argument undermines the position |
| `raises` | Argument → Question | argument raises a deeper question |
| `objects-to` | Objection → Argument | objection challenges the argument |
| `rebuts` | Rebuttal → Objection | rebuttal answers the objection |
| `grounds-in` | Argument → Value/Principle/Epistemic-limit | chain bottoms out here |
| `connects-to` | Any ↔ Any | related concept (bidirectional in meaning) |
| `illustrates` | Analogy/ThoughtExp → Position/Argument | illustrates it |
| `entails` | Premise → derived node | the premise leads to / entails this (DOWNWARD) |

**Important traversal subtlety (this bit the first implementation):** most edges
run **child → parent** (`answers`, `argues-for`, `argues-against`, `supports`,
`objects-to`, `rebuts`, `illustrates`, `connects-to`), so the child is `from`
and the parent is `to`. But **`raises` and `grounds-in` run parent → child** —
the argument is `from`, the question/value is `to`. If you treat all edges the
same, value nodes never render and child questions appear as duplicate roots.

`graph.ts` solves this with a `DOWNWARD = ["raises", "grounds-in", "entails"]`
set and an `endpoints(edge)` helper that returns `{parent, child}` regardless of
direction.
**Always go through `getChildren`/`getParent`/`getRootQuestions`** rather than
reading `edge.from`/`edge.to` directly when you mean tree structure.
`makeEdge(parentId, childId, edgeType)` builds edges with the correct
orientation — use it instead of constructing edges by hand.

### Grounding calculation

`isFullyGrounded(graph, questionId)` is the most important piece of logic.
Traverse edges in their semantic direction:

- A **question** is fully grounded iff it has ≥1 answering position and **every**
  such position is fully grounded.
- A **position** is fully grounded iff it has ≥1 supporting/attacking argument and
  **every** such argument is fully grounded.
- An **argument** is grounded iff it has an outgoing `grounds-in` edge to a
  terminal node, **or** it `raises` a child question that is itself fully
  grounded.
- An argument with neither is **not** grounded → the question is `OPEN`.

Keep these functions **pure** (no mutation; return new graphs). One extension
beyond the spec's code: a **position may also ground directly** in a terminal
(the Sky Blue seed does this), so `groundedPosition` accepts either a direct
`grounds-in` or fully-grounded arguments. All walkers carry a `visiting` set to
guard against cycles. `isNodeGrounded(graph, nodeId)` exposes per-node status
(question/position/argument by their rules; terminals and non-participating
types are `true`) — the tree uses it to flag argument/position nodes that don't
yet reach a foundation ("NEEDS GROUNDING").

`TreeView` adds reading aids that don't touch the model: depth **guide rails**
(nested bordered containers tinted by parent type), **expand/collapse-all**,
**focus mode** (zoom into one subtree with a breadcrumb back to roots), and the
ungrounded cue above. Keep these presentational — graph state stays in the model.
Focus state is **lifted to `Home`** (`focusId`/`setFocusId`) so the `DepthPanel`
can jump straight to a node; `TreeView` takes it as a controlled prop.

### Depth metrics (insights + weakest link)

The product is about depth, so `graph.ts` surfaces it with read-only queries:
`getGraphStats` (counts, grounded/open questions, convergent values, clashes,
deepest chain via a memoized `longestPath`), `getDepth` (steps from a node to
its root), and `getGroundingGaps` (arguments that don't reach a foundation,
**shallowest first** — the shallowest is the "weakest link", closest to a root
and blocking the most). `DepthPanel` (Tree view) renders these; clicking a gap
focuses that node in the tree.

### Acceptability (defeat analysis)

Grounding asks "does this reach bedrock?"; **acceptability** asks "does this
survive its attacks?" — an orthogonal lens. Without it, objections/rebuttals/
attacks are cosmetic. `getAcceptability(graph)` runs **Dung-style grounded
semantics** over the attack relation and labels every node `defended`,
`defeated`, or `contested`. The attack relation is structural: a node is
attacked by its **attacking-type children** (`argument-attack`, `objection`,
`rebuttal`, `counter-argument`, `logical-fallacy`) via `getAttackers`. Because
attacks run child→parent over the tree the attack graph is **acyclic**, so the
labelling is total (every node is defended or defeated; `contested` is reserved
for the degenerate cyclic case and shouldn't arise from normal authoring). A
node is `defended` iff every attacker is `defeated`; `defeated` iff some
attacker is `defended` — so a rebuttal that defeats an objection *revives* the
argument the objection had defeated. `TreeView` computes the map once and
`NodeCard` shows a DEFENDED/DEFEATED badge (only when a node actually has
attackers) and strikes through defeated content. This is **separate from
grounding** on purpose — combining them (count only undefeated chains toward
grounding) is a deliberate future step, not the current behaviour.

### Reuse of values (convergence)

When grounding an argument, the user can **create a new value** or **link to an
existing one** (`AddNodeForm` shows this choice whenever a terminal type is
selected and a same-type terminal already exists). Linking (`linkToExistingValue`)
adds a `grounds-in` edge to the existing value node instead of creating a
duplicate. This is the heart of the product — make sure linking works and never
silently creates duplicate value nodes. To protect convergence, `AddNodeForm`
also runs a **dedup nudge**: as you type a new terminal, `findSimilarTerminals`
(text `similarity`, both pure in `graph.ts`) surfaces near-identical existing
terminals of the same type with a one-click "link instead". `AddNodeForm` takes
`existingTerminals` (all terminals) and filters to the selected type, so you can
link to existing principles/epistemic-limits too, not just values.

Because a value can be shared by multiple arguments, `deleteNode` **spares any
terminal node that still has a grounding argument outside the deletion set** —
deleting one argument must not remove a value another argument depends on. See
`doomedSet` in `graph.ts`. A value renders once under each argument that grounds
in it (that repetition *is* the convergence visualization in the tree view).

The **Values view** (`ValuesIndex.tsx`, toggled from the Tree/Values tabs in
`Home`) surfaces convergence explicitly. It is powered by read-only queries in
`graph.ts`: `getValueUsage` (each terminal with the distinct roots — questions
or premises — that reach it; `convergent` when >1) and `getValueClashes` (a
single question whose chains bottom out at multiple distinct values — the real
disagreement). `getRootFor` walks a node's parent chain up to its root
(question or premise).

The **Map view** (`GraphMap.tsx`, Map tab) renders the whole graph as a
top-down DAG with React Flow; `flowLayout.ts` positions nodes with dagre using
`edgeEndpoints` (the same parent→child normalization the tree uses), so shared
values render once with multiple incoming edges — convergence made literal.
Clicking a node highlights its full lineage via `getAncestors` (everything that
flows into it) ∪ `getDescendantIds` (everything below it). `getParents` returns
all parents of a shared value. React Flow is **lazy-loaded** from `Home` so the
Tree/Values tabs don't pay for it.

### Context-sensitive "add child" options

The allowed child types depend on the parent's type (e.g. under a Question you
may add Position/Argument/Evidence/etc.; under Evidence only
Objection/Counter-argument/Related-concept; terminal nodes allow nothing). The
full matrix is in the spec's "Context-Sensitive Dropdowns" section — keep
`AddNodeForm` and the spec in sync.

### Editing & deleting

- **Edit** changes a node's `content` only. Type is immutable (delete + recreate
  to change type).
- **Delete** removes the node **and all descendants**; warn the user with the
  descendant count. Not undoable.

## Node type colors & icons

Each type has a fixed icon and hex color used in `NodeCard` and `Legend`. The
canonical table is in the spec ("Colors & Icons"). When you implement styling,
copy those exact hex values — they are part of the product's visual language.
Examples: Question `?` #0066cc, Argument(Support) `+` #00aa00,
Argument(Attack) `−` #cc0000, Value `⚓` #FFD700, Principle `⚖` #C0C0C0,
Epistemic-limit `∞` #9900cc.

## Seed data

On first load (empty `localStorage`), load the two seed graphs so the system is
demonstrated immediately:
- **Trolley Problem** — status `OPEN` (two distinct values at the bottom).
- **Why is the sky blue?** — status `FULLY GROUNDED` (chain reaches an
  epistemic limit).

Exact node/edge definitions are in the spec's "Seed Data" section; `seed.ts`
should reproduce them verbatim so IDs in tests stay stable.

## Development workflow

```bash
npm install        # install deps
npm run dev        # Vite dev server at http://localhost:5173 (authoring mode)
npm run build      # tsc -b (typecheck) + vite build → dist/
npm run build:viewer # build the PUBLIC READ-ONLY viewer (VITE_PUBLIC_READONLY=1)
npm run preview    # serve the production build
npm run typecheck  # tsc -b --noEmit
npm test           # vitest run (unit tests for lib/graph.ts, lib/io.ts)
npm run test:watch # vitest in watch mode
```

### Read-mostly setup (canonical graph + public viewer)

Per `docs/ARCHITECTURE.md` / `docs/adr/0001`, the app runs in two modes from one
codebase, switched by **`VITE_PUBLIC_READONLY`**:
- **Authoring** (dev, flag unset): editable, persisted in `localStorage`.
- **Public viewer** (`build:viewer`, flag=1): read-only; loads the canonical
  **`client/public/graph.json`** (served at `/graph.json`), hides all editing,
  and leads with the Map.

`lib/io.ts` is the pure, strict **export/import** layer (`exportGraph`,
`parseGraph`/`validateGraph` — validates node/edge types and referential
integrity; tested in `io.test.ts`). The header **Export** button writes
`graph.json` for a contributor's pull request. `lib/dataSource.ts`
(`isReadOnly`, `loadCanonicalGraph`) picks the source. `useGraph` returns
`{readOnly, loading}` and turns mutations into no-ops in read-only mode;
`TreeView`/`NodeCard` take a `readOnly` prop that hides edit affordances.
`types.ts` exports runtime `NODE_TYPES` / `EDGE_TYPES` lists used for validation.
`.github/workflows/deploy.yml` builds the viewer and publishes on merge to `main`
(`.env.example` documents `VITE_PUBLIC_READONLY` and `VITE_DONATE_URL`).

Vite's root is `client/`, so `index.html` lives at `client/index.html` and the
`@` alias points at `client/src`. The build output goes to `dist/` at the repo
root (gitignored).

Tests use **Vitest** (`vitest.config.ts` is separate from `vite.config.ts` so
the `root: "client"` setting doesn't interfere). `lib/graph.test.ts` covers the
graph utilities — edge-direction traversal, grounding (including the cyclic
guard), value reuse, shared-value deletion, and the convergence queries. Keep
these green; `graph.ts` is pure with no React/DOM deps, so add cases freely.
**CI** (`.github/workflows/ci.yml`) runs typecheck + test + build on every PR.

## Resolved spec inconsistencies

The master spec is mostly authoritative, but a few parts contradict themselves.
What V1 actually does:

1. **`raises` / `grounds-in` edge direction.** The spec's example `getChildren`
   (`edges where to === node`) would never surface value nodes and would render
   child questions as duplicate roots, because these two edge types run
   parent→child. Implemented via the `DOWNWARD`/`endpoints` model (see above).
2. **Sky Blue grounding.** The spec calls Sky Blue "FULLY GROUNDED" but its seed
   grounds a *position* directly into the epistemic limit, which the spec's own
   `isPositionFullyGrounded` (arguments-only) would score as OPEN. V1 lets a
   position ground directly, so Sky Blue computes as FULLY GROUNDED.
3. **Trolley "OPEN".** The spec narrates Trolley as OPEN, but structurally every
   chain reaches a value, so by the badge's own definition it is FULLY GROUNDED
   (the narrative "open" means an unresolved *value clash*, not a missing
   ground). V1 computes it as FULLY GROUNDED. To see an OPEN badge, add a new
   question or an ungrounded argument.
4. **Positions can't author terminal children.** Per the dropdown matrix,
   `ALLOWED_CHILDREN["position"]` excludes value/principle/epistemic-limit — only
   arguments may add them through the UI. The grounding logic still *reads*
   direct position groundings (for seed compatibility), but the UI won't create
   them.

## Git & branching conventions

- The default branch is `main`. Do **not** push directly to `main`.
- Active development for this workstream happens on
  `claude/claude-md-docs-5fx2hh`. Create feature branches off `main` for new
  work and open **draft** pull requests against `main`.
- Commit only when changes form a coherent unit; write clear, imperative commit
  messages.
- The GitHub repository is `disguide/axiomer`. Use the GitHub MCP tools for PR
  and issue operations in this environment (no `gh` CLI available).

## Implementation order (from the spec)

If asked to build V1, proceed in phases — each builds on the last:

1. **Data model & types** — `types.ts`, `seed.ts`.
2. **Graph utilities** — `graph.ts`: `getChildren`, `getParent`,
   `isFullyGrounded`, `getGroundingChain`, `addNode`, `deleteNode`, `editNode`,
   `linkToExistingValue`.
3. **UI components** — `TreeView`, `NodeCard`, `AddNodeForm`, `Legend`, `Home`.
4. **State management** — `useGraph` hook + `localStorage` auto-save.
5. **Styling & polish** — colors, icons, responsiveness, transitions.

## V1 acceptance checklist (definition of done)

- All node types render with correct icons/colors.
- Create root questions; add nodes under valid parents via a context-sensitive
  type selector.
- Grounding badges (`FULLY GROUNDED` / `OPEN`) compute correctly.
- Edit content (not type); delete with descendant warning.
- Link arguments to **existing** values (no duplicates).
- Graph persists in `localStorage`; seed data loads on first visit.
- Legend lists all node types with descriptions/examples.
- Tree view is mobile-responsive.

## Things to get right

1. Edge direction is semantic — re-read that section before writing traversal.
2. Terminal nodes never get children.
3. Value reuse / convergence is the core feature; don't break it.
4. Keep `graph.ts` pure and well-tested.
5. Keep the node-type list, colors, dropdown matrix, and Legend consistent with
   each other and with the spec — they are one source of truth split across
   files.
