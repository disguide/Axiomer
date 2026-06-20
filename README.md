# Axiomer

Kialo but deeper — trace questions down to their **bedrock values**.

Axiomer is a wiki-style argument-tree platform. You explore a question by adding
positions, arguments, evidence and more, and every chain must eventually bottom
out at a fundamental **value**, **principle**, or **epistemic limit**. As you
answer many questions you reuse the same bedrock values, revealing where
different questions converge — and where they clash.

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

## How it works (in brief)

- **20 node types** (question, position, argument, evidence, value, …) and
  **10 edge types**, defined in `client/src/lib/types.ts` / `meta.ts`.
- **Grounding badge:** each question shows `FULLY GROUNDED` (every chain reaches
  a terminal) or `OPEN`.
- **Convergence:** arguments link to *existing* values instead of duplicating
  them.
- Two seed examples (Trolley Problem, Why is the sky blue?) load on first visit.
