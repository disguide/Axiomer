# Axiomer — Design Brief (for a repo-aware design agent)

You are a **product + visual designer who codes**, with full access to the
`disguide/axiomer` repo. Your job: make Axiomer **clear and beautiful**, with the
**Map** as the primary surface. Implement in code (React + Tailwind), verify with
screenshots, ship small PRs. This is a **visual/UX** task — do not change the
graph data model or semantics.

## Read first (in the repo)

- **`CLAUDE.md`** — architecture, conventions, data model, gotchas. Authoritative.
- `docs/ROADMAP.md`, `docs/AGENT_TODO.md` — where the product is heading.
- Code you'll touch:
  - `client/src/components/GraphMap.tsx` — the Map (your main canvas; a working baseline exists).
  - `client/src/components/NodeCard.tsx`, `TreeView.tsx`, `DepthPanel.tsx`, `Legend.tsx`, `ValuesIndex.tsx`, `pages/Home.tsx`.
  - `client/src/lib/meta.ts` — `NODE_META` (per-type icon/color/label/prompt), `ALLOWED_CHILDREN`.
  - `client/src/lib/types.ts` — 21 node types, 11 edge types.
  - `client/src/lib/flowLayout.ts` — dagre top-down layout.
  - `client/src/lib/graph.ts` — **pure** graph logic (read from it; never move logic in).

## Product in one line

Axiomer is a wiki-style **argument-tree** tool: explore a question by tracing
arguments down to **bedrock values**; reuse values so different questions
**converge**. Nodes: question, position, argument (support/attack), evidence,
assumption, objection, rebuttal, value/principle/epistemic-limit (terminals),
premise, etc. Edges are **labelled relationships** (`answers`, `argues-for`,
`grounds-in`, `raises`, `entails`, `objects-to`, …).

## The vision (from the product owner — hold to this)

- **The Map (node-link graph) is the primary surface**, not the indented tree.
- **Obsidian-style**: compact, **well-labelled nodes** (NOT big content boxes)
  and **labelled connections**. It must **scale to high volume** — hundreds+ of
  nodes and many edges — and stay legible.
- Laid out as a **top-down tree (DAG)** — NOT Obsidian's radial "circle brain."
- **Mapbox-smooth** pan/zoom navigation.
- **Kialo-level polish** — calm, clean, legible; support vs. attack obvious at a
  glance.
- Full node content appears **on demand** (hover / click → detail panel) so the
  nodes themselves stay small.

## Current baseline (refine it — don't start from zero)

`GraphMap.tsx` already does: compact pill nodes (icon + one-line label, colored
by type), top-down dagre layout, smoothstep edges colored by role (support
green / attack red / grounds-in gold / rebut teal), **edge labels shown on the
focused lineage**, click-to-highlight lineage with dimming, a right-side detail
panel, minimap, dotted background. The Map is the default tab and renders
full-width. Make this genuinely good.

## Problems to fix (evidence-based)

1. **Visual noise / color overload** — 21 type colors (several near-duplicate
   reds/purples) and tiny uppercase labels everywhere. Build a **calm system**:
   collapse the 21 types into **~6 color families** (claim · support · attack ·
   evidence · foundation · meta), a consistent icon set, restrained typography.
2. **The 21-type legend ate ~30% of the screen** (now hidden on the Map) — make
   it a compact, dismissible reference, never a permanent sidebar.
3. **Mobile is broken** — in the tree view, node content wraps one letter per
   line (action buttons consume the row width). The whole app needs a real
   mobile pass; the Map should be usable on phones.
4. **No synthesis / verdict** — a question never states its conclusion in plain
   language. Design a per-question **verdict** (resolved/open, which positions
   survive, where the value clash is).
5. **Badge soup** — grounding, acceptability, "needs grounding" can show at once
   and even contradict. Establish a **hierarchy**: one primary status, details on
   hover/expand.

## Design tasks

A. **Visual system / tokens** — color families, type iconography, type scale,
   spacing, calm surfaces. Document the tokens.
B. **Node design** — compact, legible, scalable. States: default / selected /
   dimmed / **defeated** (struck through) / **ungrounded** (needs grounding).
   Support vs. attack instantly readable.
C. **Edge design** — labelled, role-colored, readable at volume. Consider
   showing labels only on focus or above a zoom threshold (partially done).
D. **Canvas UX** — fitView, smooth zoom, minimap, **search/jump to node**, focus
   mode, and **performance at volume** (limit/transition labels and detail when
   zoomed out; virtualize if needed).
E. **Node inspector / detail panel** — full content, type, **grounding &
   acceptability status**, and actions (add child, edit, ground/link to existing
   value). This makes the Map a *working* surface, not just a viewer.
F. **Per-question verdict** — a plain-language synthesis combining grounding +
   acceptability + convergence/clash. Pull the insight currently only in the
   Values tab onto the question itself.
G. **Mobile** — make the Map usable on phones; fix the tree's one-char wrapping.

## Constraints (do not break)

- Stack: **React 19 + TypeScript + Vite + Tailwind CSS 4 + React Flow
  (`@xyflow/react`) + dagre**. React Flow is **lazy-loaded** — keep it out of the
  main bundle. No new heavy deps without a clear reason.
- **Keep `client/src/lib/graph.ts` pure** (no React/DOM/network). It is the
  source of truth — read from it; don't move logic into components.
- **Don't change the data model** (node/edge types) or graph semantics. If you
  believe the model needs to change, *propose it in the PR*, don't do it.
- Keep **CI green**: `npm run typecheck && npm test && npm run build`. Update
  `CLAUDE.md` for any new component/convention.

## Workflow & deliverables

- **One branch + one draft PR per change**, against `main`. Small and reviewable.
  Never push to `main` directly.
- **Verify visually** — attach before/after screenshots to every PR.
- Use the existing color hexes only as a starting point; you own the visual
  language now (keep it consistent with `NODE_META`, updating it as the single
  source of truth).

## How to run & screenshot (works in this environment)

```bash
npm install
npm run build && npm run preview -- --port 4173 &   # serves dist on :4173
```

Playwright CLI is installed; Chromium lives at `/opt/pw-browsers`. In an ESM
script, import it by absolute path (the package is CommonJS):

```js
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
const { chromium } = pw;
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })).newPage();
await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);            // let React Flow fitView settle
await page.screenshot({ path: "shot.png" });
```

Seed data (Trolley Problem + "Why is the sky blue?") loads automatically on a
fresh `localStorage`, so there's always content to screenshot.

## Definition of done

The Map is a **legible, polished, primary** Obsidian-style **top-down tree** with
**labelled connections** that **scales to volume**; the 21-type palette reads as a
calm ~6-family system; a question shows its **verdict**; node detail/editing works
from the Map; and **mobile is usable**.
