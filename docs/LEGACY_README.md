# Axiomer

See what your beliefs are built on.

Axiomer is a local-first reasoning map. Start with a question, decision, or
belief; add support, conflict, and context; then keep asking why until every
path reaches a value, source, preference, bedrock fact, or honest limit.

## Why it exists

Most disagreement stays at the level of conclusions. Axiomer makes the chain
beneath a conclusion visible, so shared foundations and real points of
divergence are easier to see.

The product is intentionally small:

1. State a thought.
2. Trace what supports or challenges it.
3. Ground each path in a foundation.

The same graph can be read as a visual **Map** or a linear **Outline**. Work is
saved to the browser in authoring mode. A static, read-only build can load a
canonical graph for public viewing.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Flow · dagre

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

## Model

Axiomer uses 10 node types:

- Structural: `claim`, `premise`, `support`, `conflict`, `note`
- Foundations: `value`, `source`, `limit`, `bedrock`, `preference`

Five labelled edge types connect them: `supports`, `conflicts`, `annotates`,
`grounds`, and `cites`.

See [VISION.md](VISION.md) for the product philosophy and [CLAUDE.md](CLAUDE.md)
for implementation conventions.
