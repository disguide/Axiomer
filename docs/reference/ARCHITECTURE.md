# Axiomer — Architecture & Setup (read-mostly: Git canonical + public viewer)

How the whole thing fits together and how to stand it up end-to-end, given the
operating reality: **a few expert editors, many viewers.** Argument-mapping to
bedrock values is high-effort, so contribution is rare; reading is the common
case. That shape lets us skip heavy infrastructure.

> Companion docs: `ROADMAP.md` (phases), `DESIGN_BRIEF.md` (the viewer's look &
> feel), `AGENT_TODO.md` (AI layer), `adr/0001-read-mostly-git-plus-public-viewer.md`
> (the decision). `CLAUDE.md` is the source of truth for the data model.

## The model in one diagram

```
 EDITORS (few, motivated)                         VIEWERS (many, public)
 ───────────────────────                          ──────────────────────
 edit in the Axiomer app (local)                  open the public URL
        │  Export graph.json                       (no account, read-only)
        ▼                                                   ▲
   data/graph.json  ──Pull Request──► review ──merge──► main │ served from CDN
        │                                                   │
        └────────► CI: build viewer (read-only) + deploy ───┘
```

- **Write side (rare):** an editor runs the real Axiomer editor locally, edits
  the graph, **exports** `data/graph.json`, and opens a **PR**. A maintainer
  reviews the diff and merges. Git gives history, attribution, revert, and
  propose-and-review **for free** — no database, no auth server.
- **Read side (common):** on merge, **CI builds the same app in read-only mode**
  (bundling the canonical `data/graph.json`) and deploys a **static site** to a
  CDN. Viewers just open the URL. Scales to unlimited readers for ~$0.

## One app, two modes

The same `client/` app runs in two modes, chosen by an env flag:

| Mode | When | Data source | Editing UI |
|------|------|-------------|-----------|
| **Authoring** | local dev (`npm run dev`) | `localStorage` (current behaviour) | full (add/edit/delete/ground) |
| **Public** | deployed site | bundled `data/graph.json` | hidden (read-only) |

Controlled by `VITE_PUBLIC_READONLY`. In public mode the app loads the canonical
graph instead of `localStorage`, and hides all mutation affordances (New
Question/Premise, Add, Edit, Delete, Reset). The **Map** is the default surface.

## Canonical store

`data/graph.json` — exactly the `Graph { nodes, edges }` shape from
`client/src/lib/types.ts`. **Single source of truth.** Changed only by an
editor's Export → PR → merge. (It's the same structure as the seed in
`client/src/lib/seed.ts`, so the current seed can bootstrap it.)

Why JSON-in-Git instead of a DB: with rare, review-gated writes you don't need
concurrency control or a query layer; you need history and review, which Git
already is. If contribution volume ever outgrows this, swap the store for a
backend (see `ROADMAP.md` Phase 1) without touching `graph.ts`.

## File list (totality)

`[have]` exists today · `[add]` to build for this architecture · `[mod]` modify.

```
/
├── client/                              [have]  the app (editor + viewer)
│   ├── index.html                       [have]
│   └── src/
│       ├── pages/Home.tsx               [mod]   honor read-only mode; Map default in public
│       ├── components/                  [have]  TreeView, NodeCard, AddNodeForm,
│       │                                        ValuesIndex, GraphMap, DepthPanel, Legend
│       ├── hooks/useGraph.ts            [mod]   load from data source, not always localStorage
│       ├── lib/
│       │   ├── types.ts meta.ts graph.ts seed.ts flowLayout.ts graph.test.ts   [have]
│       │   ├── dataSource.ts            [add]   pick localStorage vs data/graph.json by mode
│       │   └── io.ts                    [add]   import/export graph JSON (validated)
│       └── ...
├── data/
│   └── graph.json                       [add]   CANONICAL graph (seeded from seed.ts)
├── docs/
│   ├── ARCHITECTURE.md                  [add]   this file
│   ├── ROADMAP.md AGENT_TODO.md DESIGN_BRIEF.md SPECIFICATION.md   [have]
│   └── adr/0001-read-mostly-git-plus-public-viewer.md             [add]
├── obsidian-vault/                      [have]  prototype only (alt editing front-end)
├── .github/workflows/
│   ├── ci.yml                           [have]  typecheck + test + build on PRs
│   └── deploy.yml                       [add]   build read-only viewer + deploy on merge to main
├── .env.example                         [add]   VITE_PUBLIC_READONLY, VITE_DONATE_URL
├── package.json vite.config.ts tsconfig*.json vitest.config.ts   [have]
└── CLAUDE.md README.md                  [have]
```

New npm scripts (in `package.json`): `build:viewer` (= `vite build` with
`VITE_PUBLIC_READONLY=1`), and optionally `export:graph` (dump current graph to
`data/graph.json` from the CLI or via an in-app Export button).

## Setup — end to end

### 0. Prerequisites
Node 20+, a GitHub account, and a free static host account (Cloudflare Pages,
Vercel, or Netlify).

### 1. Local dev (authoring)
```bash
npm install
npm run dev            # http://localhost:5173  — full editor, localStorage
npm test               # graph logic
npm run build          # typecheck + production build
```

### 2. Propose a change (an editor)
1. Edit the graph in the local app.
2. **Export** the graph to `data/graph.json` (in-app Export button → save into
   the repo, or a `npm run export:graph` CLI).
3. Branch, commit, push, open a **Pull Request** to `main`.
   - CI (`ci.yml`) runs typecheck + tests + build on the PR.

### 3. Review & merge (a maintainer)
- Read the `data/graph.json` diff (added/changed nodes & edges) and the rendered
  preview (the host's PR preview deployment, if enabled).
- Merge. This is the propose-and-review gate; it's the only way `main` changes.

### 4. Publish the public viewer (automatic)
On merge to `main`, `deploy.yml`:
```yaml
# .github/workflows/deploy.yml  (sketch)
on: { push: { branches: [main] } }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build:viewer        # VITE_PUBLIC_READONLY=1, bundles data/graph.json
      - # deploy ./dist to Cloudflare Pages / Vercel / Netlify (action or CLI)
```

### 5. Hosting (one-time)
Connect the repo to **Cloudflare Pages / Vercel / Netlify**:
- Build command: `npm run build:viewer`
- Output dir: `dist`
- Env: `VITE_PUBLIC_READONLY=1`, `VITE_DONATE_URL=<link>`
- Enable **PR preview deployments** so reviewers see changes before merge.
(You can deploy via the host's Git integration instead of `deploy.yml` — pick one.)

### 6. Domain & donations
- Point a domain at the host (optional).
- Add a **donation link** in the viewer footer (`VITE_DONATE_URL` → e.g. GitHub
  Sponsors / Ko-fi / Open Collective). Reads are cheap, so donations comfortably
  cover hosting; **no membership or paywall on access.**

## What to build to reach this (small, ordered)

1. `[add]` **`io.ts`** — export/import graph JSON with validation (also
   `AGENT_TODO.md` T6.3).
2. `[add]` **`data/graph.json`** — seed it from `seed.ts`.
3. `[add]` **`dataSource.ts` + read-only mode** — `useGraph`/`Home` load
   `data/graph.json` and hide editing when `VITE_PUBLIC_READONLY=1`; Map is the
   default view.
4. `[add]` **`deploy.yml` + host setup** — publish on merge.
5. `[add]` **donation footer** + `.env.example`.
6. In parallel: the **viewer polish** from `DESIGN_BRIEF.md` (this is what the
   public sees, so it's the priority).

## Optional add-ons (later, only if needed)

- **Browser editing for non-Git editors:** add **Decap CMS** "open authoring" so
  contributors edit and open PRs in the browser (no Git knowledge). Same Git
  canonical, same review flow.
- **Obsidian editing front-end:** `obsidian-vault/` + a `scripts/build-graph.ts`
  compiler (vault notes → `data/graph.json`) for editors who prefer notes.
- **AI assist** (`AGENT_TODO.md`): helps the few editors (judge, hints,
  dedup/merge). Optional, on top, never required.
- **Real backend** (`ROADMAP.md` Phase 1+): only when contribution outgrows
  Git-as-store. The viewer and `graph.ts` are unaffected by that swap.

## Costs

Static CDN + GitHub = effectively **$0** at viewer scale. The only variable cost
would be AI assist (pay-per-use, for the few editors) if/when added — fundable by
donations or an optional "supporter" tier for AI credits.
