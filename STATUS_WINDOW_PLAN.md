# Status Window — Implementation Plan

> **Archived concept.** The standalone status/profile surface is no longer part
> of core navigation. Grounding and conflict status now appear in context in
> the Map inspector and Outline.

A **Status** tab (alongside Tree / Values / Map) that shows the user's
**philosophical profile**: their bedrock values ranked by convergence, overall
exploration statistics, a visual identity card, and per-value provenance detail.

> **Design intent:** the Values tab already surfaces *what* the bedrock nodes
> are; the Status window answers *"what does the totality of my explorations
> say about me?"* — a reflective, aggregate lens rather than a per-value
> convergence list.

---

## 1. Feature breakdown

### 1A. Bedrock value leaderboard
All terminal nodes (value / principle / epistemic-limit) the user has grounded
arguments in, **ranked by convergence count** (number of distinct root
questions/premises that reach each terminal). Non-convergent values (used by a
single root) appear at the bottom. Each entry shows the terminal's icon, label,
content, convergence count, and a sparkline-style bar proportional to the count.

### 1B. Exploration statistics
A concise stats bar:
| Stat | Source |
|------|--------|
| Total questions explored | `getRootQuestions(graph).length` |
| Grounded vs open | `getGraphStats(graph).groundedQuestions` / `.openQuestions` |
| Total bedrock values | `getTerminals(graph).length` |
| Convergence ratio | convergent terminals / total terminals |
| Max depth | `getGraphStats(graph).maxDepth` |
| Value clashes | `getValueClashes(graph).length` |

### 1C. Philosophical identity card
A "card" featuring the **top 5 values** (by convergence count). Visual summary:
the 5 terminal icons+contents rendered in a compact, stylized layout with their
type colors. Below: a one-line generated "archetype label" that names the
dominant terminal types (e.g. "Value-grounded empiricist" if mostly values +
epistemic-limits; "Principle-driven reasoner" if mostly principles). The label
is computed purely from terminal-type distribution — no AI.

### 1D. Per-value detail (expandable)
Each entry in the leaderboard expands to show:
- **Linked roots:** which questions/premises connect to this value (with their
  content and grounding status).
- **Chain depth:** for each grounding argument, how many steps from the root
  to this terminal (`getDepth`).
- **Grounding arguments:** the argument nodes that directly `grounds-in` this
  terminal (with truncated content).

---

## 2. New functions in `graph.ts`

All pure, no mutation. They compose existing primitives.

### `getStatusProfile(graph: Graph): StatusProfile`

```typescript
export interface ValueRank {
  terminal: GraphNode;          // the value/principle/epistemic-limit
  convergenceCount: number;     // distinct roots reaching it
  roots: GraphNode[];           // those roots
  groundingArgs: GraphNode[];   // arguments with grounds-in edges to it
  chainDepths: number[];        // getDepth(graph, argId) for each grounding arg
}

export interface StatusProfile {
  /** All terminals ranked by convergence count, descending. */
  rankedValues: ValueRank[];
  /** Exploration stats (superset of GraphStats, adds convergence ratio). */
  stats: StatusStats;
  /** Top 5 terminals by convergence count (identity card). */
  topValues: ValueRank[];
  /** Deterministic archetype label derived from terminal-type distribution. */
  archetype: string;
}

export interface StatusStats {
  totalQuestions: number;       // root questions only
  groundedQuestions: number;
  openQuestions: number;
  totalTerminals: number;
  convergentTerminals: number;
  convergenceRatio: number;    // convergentTerminals / totalTerminals (0 if 0)
  valueClashes: number;
  maxDepth: number;
}
```

**Logic:**
1. Call `getValueUsage(graph)` → iterate each `ValueUsage`, enriching with
   `chainDepths` (map each `groundingNode` through `getDepth`).
2. Sort by `roots.length` descending → `rankedValues`.
3. Slice top 5 → `topValues`.
4. Build `StatusStats` from `getGraphStats` + derived convergence ratio.
5. Compute `archetype` from the type distribution of the top 5 terminals (see
   `computeArchetype` below).

### `computeArchetype(topValues: ValueRank[]): string`

```typescript
export function computeArchetype(topValues: ValueRank[]): string
```

**Logic:**
Tally terminal types among `topValues`. Map to labels:
- Majority `value` → "Value-grounded"
- Majority `principle` → "Principle-driven"
- Majority `epistemic-limit` → "Epistemically cautious"
- Mixed → "Pluralist"

Append a secondary descriptor based on overall count:
- ≥4 convergent → "synthesizer" (many ideas converge)
- Mostly shallow chains → "intuitive"
- Mostly deep chains → "deep reasoner"

Returns a string like `"Value-grounded synthesizer"` or
`"Principle-driven deep reasoner"`. Purely deterministic, no AI.

### `getValueChainDetail(graph: Graph, terminalId: string): ValueChainDetail`

```typescript
export interface ValueChainDetail {
  terminal: GraphNode;
  groundingArgs: Array<{
    argument: GraphNode;
    root: GraphNode | undefined;
    depth: number;
    rootGrounded: boolean;  // is the root question fully grounded?
  }>;
}
```

**Logic:**
1. Find all edges where `edgeType === "grounds-in" && to === terminalId`.
2. For each `from` (the grounding argument): get its `getRootFor`, `getDepth`,
   and `isFullyGrounded` on the root (if it's a question).

This powers the per-value expandable detail panel.

---

## 3. Files to create

| File | Purpose |
|------|---------|
| `client/src/components/StatusWindow.tsx` | Top-level Status tab component. Owns layout: stats bar, identity card, leaderboard. |
| `client/src/components/StatusCard.tsx` | The philosophical identity card (top 5 values, archetype label). |
| `client/src/components/StatusStats.tsx` | The stats bar (counts, ratios, visual indicators). |
| `client/src/components/ValueLeaderboard.tsx` | The ranked list of all terminals with expand/collapse per-value detail. |
| `client/src/components/ValueDetail.tsx` | Expandable panel for a single value: linked roots, chain depths, grounding args. |

---

## 4. Files to modify

### `client/src/lib/graph.ts`
- **Add** the three new functions + interfaces described in §2:
  `getStatusProfile`, `computeArchetype`, `getValueChainDetail`,
  `ValueRank`, `StatusProfile`, `StatusStats`, `ValueChainDetail`.
- These compose existing exports (`getValueUsage`, `getGraphStats`,
  `getTerminals`, `getDepth`, `getRootFor`, `isFullyGrounded`,
  `getRootQuestions`, `getValueClashes`). No new traversal primitives needed.

### `client/src/lib/graph.test.ts`
- **Add** test cases for:
  - `getStatusProfile` returns correct ranking order + convergence counts.
  - `computeArchetype` returns expected labels for known distributions.
  - `getValueChainDetail` returns correct depths and root linkage.
  - Edge cases: empty graph (no terminals), single value, all convergent.

### `client/src/pages/Home.tsx`
- **Add** `"status"` to the `view` state union:
  `useState<"tree" | "values" | "map" | "status">("map")`.
- **Add** a `Status` button to the tab bar (after Values, before Map).
- **Add** the conditional render: `view === "status" ? <StatusWindow graph={graph} /> : ...`
- **Import** `StatusWindow` (static import; it's lightweight, no lazy-load
  needed — unlike the Map, it has no heavy deps like React Flow).
- The Legend sidebar should show alongside Status (same as Tree/Values), so
  the `view !== "map"` guard in the sidebar already covers it.

### `client/src/lib/types.ts`
- No changes needed. The new interfaces live in `graph.ts` alongside the
  existing `ValueUsage`, `GraphStats`, etc.

### `client/src/lib/meta.ts`
- No changes needed. StatusWindow reads `NODE_META` for icons/colors but
  doesn't add to it.

### `client/src/hooks/useGraph.ts`
- No changes needed. StatusWindow receives `graph` as a prop (same as
  ValuesIndex). It calls `getStatusProfile(graph)` directly — the profile
  is a derived, read-only computation, not state.

### `CLAUDE.md`
- **Add** a brief section documenting the Status tab: what it shows, which
  `graph.ts` functions power it, and that it follows the same read-only
  pattern as ValuesIndex (derived view, not state).
- Update the project-structure tree to include `StatusWindow.tsx` and its
  sub-components.

---

## 5. Component hierarchy and props

```
Home
└── StatusWindow          props: { graph: Graph }
    ├── StatusStats       props: { stats: StatusStats }
    ├── StatusCard        props: { topValues: ValueRank[]; archetype: string }
    └── ValueLeaderboard  props: { rankedValues: ValueRank[]; graph: Graph }
        └── ValueDetail   props: { detail: ValueChainDetail }  (one per expanded value)
```

### Data flow

```
Home
  │  passes graph
  ▼
StatusWindow
  │  calls getStatusProfile(graph) → { rankedValues, stats, topValues, archetype }
  │  passes derived data down to children
  ├── StatusStats        receives stats
  ├── StatusCard         receives topValues, archetype
  └── ValueLeaderboard   receives rankedValues, graph
        │  on expand: calls getValueChainDetail(graph, terminalId)
        └── ValueDetail  receives the detail for one terminal
```

`StatusWindow` computes the profile once per render (it's a pure function of
`graph`, which is already memoization-friendly via React's referential equality
on the `graph` object from `useGraph`). If performance becomes a concern, wrap
in `useMemo`.

---

## 6. UI layout description

### Tab bar
```
[ Tree ] [ Values ] [ Status ] [ Map ]
```
Status sits between Values and Map. It uses the same tab-button styling as the
existing tabs (rounded pill, `bg-slate-800 text-white` when active).

### StatusWindow layout (single-column, scrollable)

```
┌─────────────────────────────────────────────────┐
│  STATS BAR                                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │ 12   │ │ 8/4  │ │ 7    │ │ 57%  │ │  3   │  │
│  │ques- │ │grnd/ │ │term- │ │conv. │ │clash │  │
│  │tions │ │open  │ │inals │ │ratio │ │  es  │  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │
├─────────────────────────────────────────────────┤
│  PHILOSOPHICAL IDENTITY CARD                     │
│  ┌─────────────────────────────────────────────┐ │
│  │  ⚓ Minimize total suffering                │ │
│  │  ⚖ Proportionality                         │ │
│  │  ⚓ Individual autonomy                     │ │
│  │  ∞ Consciousness is unknowable              │ │
│  │  ⚓ Collective welfare                      │ │
│  │                                             │ │
│  │  "Value-grounded synthesizer"               │ │
│  └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│  VALUE LEADERBOARD                               │
│                                                  │
│  #1  ⚓ Minimize total suffering      4 roots ▍▍▍▍│
│  #2  ⚖ Proportionality               3 roots ▍▍▍ │
│  #3  ⚓ Individual autonomy           2 roots ▍▍  │
│      ▼ [expanded]                                │
│      ├ ? Should you pull the lever (GROUNDED, d5)│
│      ├ ? Is capital punishment just? (OPEN, d3)  │
│      └ args: "Saving more lives…" (d4),          │
│             "Personal rights matter…" (d3)       │
│  #4  ∞ Consciousness is unknowable   1 root  ▍  │
│  …                                               │
└─────────────────────────────────────────────────┘
```

### Styling details
- **Stats bar:** grid of small metric cards, each with a large number and a
  muted label below. Uses `bg-white border border-slate-200 rounded-lg`.
  Grounded/open shown as a fraction with a tiny green/amber dot.
- **Identity card:** a centered, slightly elevated card (`shadow-md`) with a
  subtle gradient border (gold `#FFD700` → silver `#9ca3af` → purple
  `#9900cc`, reflecting the three terminal-type colors). Top 5 values listed
  vertically with their type icon + color. Archetype label in italic at the
  bottom.
- **Leaderboard:** ordered list. Each row shows rank number, terminal icon
  (colored), content, convergence count, and a proportional bar
  (`bg-indigo-500` for convergent, `bg-slate-300` for non-convergent). Click
  to expand → slides open `ValueDetail`.
- **ValueDetail:** indented sub-list showing each linked root (icon +
  content + grounding badge + chain depth), and each grounding argument
  (truncated content + depth).
- **Empty state:** if no terminals exist, show a message like the ValuesIndex
  empty state: *"No bedrock values yet. Ground your arguments to build a
  philosophical profile."*

---

## 7. Implementation order

Build bottom-up: data layer → leaf components → container → integration.

### Step 1: `graph.ts` — new functions
Add `ValueRank`, `StatusProfile`, `StatusStats`, `ValueChainDetail` interfaces
and `getStatusProfile`, `computeArchetype`, `getValueChainDetail` functions.
These are pure and testable in isolation.

**Depends on:** nothing new (uses existing exports).

### Step 2: `graph.test.ts` — test the new functions
Write tests using the existing seed graph and a hand-crafted graph with known
convergence patterns. Validate:
- Ranking order matches expected convergence counts.
- Archetype labels for different terminal distributions.
- Chain depth numbers are correct.
- Edge cases (no terminals, single terminal, all convergent).

**Depends on:** Step 1.

### Step 3: `StatusStats.tsx` — stats bar component
Receives `StatusStats`, renders the metric card grid. Pure presentational.

**Depends on:** Step 1 (for the `StatusStats` type).

### Step 4: `StatusCard.tsx` — identity card component
Receives `topValues` and `archetype`. Renders the styled card with terminal
icons, content, and archetype label. Pure presentational.

**Depends on:** Step 1 (for the `ValueRank` type).

### Step 5: `ValueDetail.tsx` — per-value detail panel
Receives `ValueChainDetail`. Renders the linked roots list and grounding args.
Pure presentational.

**Depends on:** Step 1.

### Step 6: `ValueLeaderboard.tsx` — ranked value list
Receives `rankedValues` and `graph`. Manages expand/collapse state (local
`useState`). On expand, calls `getValueChainDetail(graph, terminalId)` and
renders a `ValueDetail`. Shows rank, icon, content, convergence bar.

**Depends on:** Steps 1, 5.

### Step 7: `StatusWindow.tsx` — top-level container
Receives `graph`. Calls `getStatusProfile(graph)` and distributes data to
`StatusStats`, `StatusCard`, `ValueLeaderboard`. Handles the empty state.

**Depends on:** Steps 3, 4, 6.

### Step 8: `Home.tsx` — integrate the tab
Add `"status"` to the view union, add the tab button, render `StatusWindow`
when active. Import `StatusWindow`.

**Depends on:** Step 7.

### Step 9: `CLAUDE.md` — documentation
Document the new tab, its components, and its `graph.ts` functions.

**Depends on:** Step 8.

---

## 8. How it connects to existing `useGraph` / `graph.ts`

### Data source
`StatusWindow` takes `graph: Graph` as a prop from `Home`, exactly like
`ValuesIndex` and `GraphMap`. It does **not** add any state to `useGraph` — the
profile is a **derived view**, computed on each render from the immutable
`graph` object.

### Function composition
The new `getStatusProfile` composes existing pure functions:

```
getStatusProfile
├── getValueUsage          (existing — terminals + roots + convergence flag)
├── getGraphStats          (existing — questions/grounded/open/maxDepth/clashes)
├── getTerminals           (existing — all terminal nodes)
├── getDepth               (existing — steps from node to root)
├── getRootQuestions       (existing — root question count)
├── getValueClashes        (existing — clash count)
└── computeArchetype       (NEW — terminal-type distribution → label string)

getValueChainDetail
├── getNode                (existing)
├── getRootFor             (existing — walk parent chain to root)
├── getDepth               (existing)
└── isFullyGrounded        (existing — root question grounding status)
```

### No new traversal primitives
Everything is expressed in terms of the existing `endpoints`/`getChildren`/
`getParent`/`getParents` machinery. No new edge-direction logic needed.

### Read-only mode
Like ValuesIndex, StatusWindow is purely read-only — it never calls mutation
functions from `useGraph`. It works identically in authoring mode and public
viewer mode. No special `readOnly` prop needed (unlike TreeView/NodeCard which
need it to hide edit affordances).

### Performance
`getStatusProfile` is O(V·E) where V = terminals, E = edges (same complexity
as `getValueUsage` which the Values tab already runs). The seed graph has ~20
nodes and ~20 edges; even at 1000 nodes the computation is instant. If needed
later, wrap in `useMemo(… , [graph])` inside `StatusWindow` — but don't
prematurely optimize.

---

## 9. Summary: what to touch

| Action | File | What |
|--------|------|------|
| **Add functions** | `client/src/lib/graph.ts` | `getStatusProfile`, `computeArchetype`, `getValueChainDetail` + interfaces |
| **Add tests** | `client/src/lib/graph.test.ts` | Test cases for the three new functions |
| **Create** | `client/src/components/StatusWindow.tsx` | Container component |
| **Create** | `client/src/components/StatusCard.tsx` | Identity card |
| **Create** | `client/src/components/StatusStats.tsx` | Stats bar |
| **Create** | `client/src/components/ValueLeaderboard.tsx` | Ranked list + expand/collapse |
| **Create** | `client/src/components/ValueDetail.tsx` | Per-value detail panel |
| **Modify** | `client/src/pages/Home.tsx` | Add `"status"` view + tab button + render |
| **Modify** | `CLAUDE.md` | Document the new tab and functions |
