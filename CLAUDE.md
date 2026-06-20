# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## Current state of the repo

**This is a greenfield project. No application code exists yet.** As of this
writing the repository contains only `README.md` and this file. Everything in
the "Architecture" and "Project structure" sections below describes the
**target** design from the master specification, not code that is already
present. When you start implementing, create the structure described here.

The authoritative design document is the **Axiomer V1 Master Specification &
Implementation Guide** (provided to the team; not yet committed to the repo).
If you are asked to implement features, follow that spec. Consider committing a
copy of it under `docs/` so future sessions have it on hand.

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
- **No backend in V1.** All state lives in `localStorage`. No API, no DB.

## Project structure (target)

```
/                       (repo root)
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx          ← Main app page (TreeView + Legend)
│   │   ├── components/
│   │   │   ├── TreeView.tsx      ← Recursive tree display, expand/collapse
│   │   │   ├── NodeCard.tsx      ← Single node: icon, label, content, badge, actions
│   │   │   ├── AddNodeForm.tsx   ← Create nodes; context-sensitive type dropdown
│   │   │   ├── Legend.tsx        ← Panel listing all 20 node types
│   │   │   └── ui/               ← shadcn/ui components
│   │   ├── lib/
│   │   │   ├── types.ts          ← NodeType, EdgeType, GraphNode, GraphEdge, Graph
│   │   │   ├── graph.ts          ← Pure graph utilities (see below)
│   │   │   └── seed.ts           ← Seed graphs (Trolley Problem, Sky Blue)
│   │   ├── hooks/
│   │   │   └── useGraph.ts       ← Graph state + localStorage persistence
│   │   ├── App.tsx               ← Routes & layout
│   │   ├── main.tsx              ← React entry point
│   │   └── index.css             ← Global styles + node colors
│   ├── public/
│   └── index.html
├── package.json
└── vite.config.ts
```

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

There are exactly **20 node types** and **10 edge types**. Don't add or rename
them without updating the spec, the Legend, the colors table, and the
context-sensitive dropdown rules together.

### Terminal nodes

`value`, `principle`, and `epistemic-limit` are **terminal** — they cannot have
children. The UI must not offer an "add child" affordance on them, and grounding
logic treats them as the bottom of a chain.

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

Note the consequence for tree traversal: a node's **children** (things that hang
off it in the tree) are the edges whose **`to`** points at it — i.e.
`getChildren(graph, id)` collects nodes where `edge.to === id`. A node has a
parent when some edge has `edge.from === id`. Root questions are questions with
no outgoing edge.

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

Keep these functions **pure** (no mutation; return new graphs). The reference
implementations live in the spec's "Code Examples" section.

### Reuse of values (convergence)

When grounding an argument, the user can **create a new value** or **link to an
existing one**. Linking adds a `grounds-in` edge to the existing value node
instead of creating a duplicate. This is the heart of the product — make sure
linking works and never silently creates duplicate value nodes.

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

Once the project is scaffolded, expect standard Vite scripts (confirm against
the actual `package.json` once it exists):

```bash
npm install        # install deps
npm run dev        # Vite dev server
npm run build      # production build (tsc + vite build)
npm run preview    # preview the build
npm run lint       # if configured
```

If you scaffold the project, wire up these scripts and update this file with the
real commands. There is no test runner specified for V1; add one (e.g. Vitest)
if you introduce tests for the graph utilities — they are pure functions and are
the best candidates for unit tests.

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

- All 20 node types render with correct icons/colors.
- Create root questions; add nodes under valid parents via a context-sensitive
  type selector.
- Grounding badges (`FULLY GROUNDED` / `OPEN`) compute correctly.
- Edit content (not type); delete with descendant warning.
- Link arguments to **existing** values (no duplicates).
- Graph persists in `localStorage`; seed data loads on first visit.
- Legend lists all 20 types with descriptions/examples.
- Tree view is mobile-responsive.

## Things to get right

1. Edge direction is semantic — re-read that section before writing traversal.
2. Terminal nodes never get children.
3. Value reuse / convergence is the core feature; don't break it.
4. Keep `graph.ts` pure and well-tested.
5. Keep the node-type list, colors, dropdown matrix, and Legend consistent with
   each other and with the spec — they are one source of truth split across
   files.
