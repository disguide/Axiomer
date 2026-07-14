# Axiomer

Kialo but deeper — trace questions down to their **bedrock values**.

Axiomer is a wiki-style argument-tree platform. You explore a question by adding
positions, arguments, evidence and more, and every chain must eventually bottom
out at a fundamental **value**, **principle**, or **epistemic limit**. As you
answer many questions you reuse the same bedrock values, revealing where
different questions converge — and where they clash.

## The graph lives here

The shared argument graph is a file in this repository:
[`client/public/graph.json`](client/public/graph.json). It changes only
through pull requests — build your changes in the app, export, paste over the
file on GitHub (it auto-forks for you), and open a draft PR. CI validates
every proposal; merges redeploy the public viewer. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the two-minute walkthrough.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4. No backend in V1 — state lives in
`localStorage`.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run typecheck`.

## Docs

- `docs/SPECIFICATION.md` — the full V1 master specification.
- `CLAUDE.md` — architecture, conventions, and guidance for AI assistants
  (including resolved spec inconsistencies). A good orientation for humans too.
- **Taxonomy v2 specs (implemented):**
  - `docs/PHILOSOPHY.md` — theoretical foundations (Toulmin, Pollock, Walton,
    Dung, Carneades, Brandom) and the three-axis design model.
  - `docs/TAXONOMY.md` — the complete v2 taxonomy: 30 node types, 18 edge
    types, facets, and the AI labeling procedure.
  - `docs/STATUS_AND_COMMITMENT.md` — node lifecycle (retracted / refuted /
    invalid / superseded) and the commitment system ("hold this → you must
    hold that").

## How it works (in brief)

- **30 node types** (question, position, argument, warrant, presupposition,
  counter-example, value, premise, …) and **18 edge types**, defined in
  `client/src/lib/types.ts` / `meta.ts` (Taxonomy v2 — `docs/TAXONOMY.md`).
- **Reverse authoring:** start from a **premise** (a base assumption) and build
  conclusions forward from it — premise trees bottom out at the same shared
  values, feeding the convergence view.
- **Resolution badge:** each question shows `OPEN`, `FULLY GROUNDED`,
  `RESOLVED` (a position survives at the question's declared proof standard),
  or `DISSOLVED` (a presupposition of the question fell).
- **Status lifecycle:** nodes can be retracted/refuted/invalidated — they stay
  visible as ghosts but lose all force (no grounding, no attacking).
- **Stance:** accept/reject claims and see what they commit you to — revealed
  bedrock values, contradictions, forced choices (the Stance tab).
- **Organize:** a deterministic worklist of structural problems — duplicate
  bedrock to merge, unanswered attacks, ungrounded chains (the Organize tab).
- **Map, two scales:** a **Detail** view (collapse/expand, search-and-jump,
  level-of-detail) that renders only what you've opened, and a Canvas
  **Overview "brain"** that shows the whole territory as a field of
  argument-trees converging on shared bedrock — clean at thousands of nodes.
- **Write-first authoring:** you don't have to type a node to create it — jot
  the thought as an *unlabeled note* and label it later (or let the AI do it).
- **Your own AI, three jobs:** plug in any provider with your own API key
  (Anthropic, OpenAI, OpenRouter, Groq, local Ollama, any OpenAI-compatible
  endpoint). The AI **labels** your notes and connections, **researches**
  claims (cited briefs + evidence), and is a **partner** that critiques and
  co-writes — suggestion-only, nothing lands without your accept (Agents tab).
- **Share, versions & GitHub:** export/import graph.json, send the whole
  graph as a link, keep local drafts and diff them PR-style before restoring,
  and propose changes to the canonical graph through a guided GitHub
  pull-request flow (the Share tab).
- **Convergence:** arguments link to *existing* values instead of duplicating
  them.
- Two seed examples (Trolley Problem, Why is the sky blue?) load on first visit.
