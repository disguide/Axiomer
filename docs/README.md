# Axiomer documentation

Detailed reference for anyone — human or AI agent — working on this repository. Start here, then read the document that matches your task.

| Document | Read it when you need to… |
|----------|---------------------------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Set it up from scratch — a complete beginner-proof walkthrough to share with anyone |
| [DATA_MODEL.md](DATA_MODEL.md) | Understand what a node is, the full type system, and the exact frontmatter schema |
| [AUTHORING.md](AUTHORING.md) | Create, edit, link, or delete nodes correctly — the rules and validation checklist |
| [SEMANTICS.md](SEMANTICS.md) | Understand grounding, convergence, value clash, premises, and acceptability |
| [EXAMPLES.md](EXAMPLES.md) | See the two seed graphs fully worked out, node by node and edge by edge |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Set up Obsidian, configure plugins, or publish the public viewer |
| [AGENT_PLAYBOOK.md](AGENT_PLAYBOOK.md) | Perform common tasks as an AI agent, avoid known gotchas, and verify your work |

## The one-paragraph orientation

Axiomer is an argument-mapping knowledge base. Every claim is an Obsidian note ("node"). Notes are wired together with **typed links in YAML frontmatter** (`answers`, `argues-for`, `grounds-in`, …). Reading a question's subtree top-to-bottom traces an argument from a question down to the **bedrock value, principle, or epistemic limit** it rests on. When two different argument chains reach the *same* terminal node, that is **convergence** (shared ground). When one question's chains reach *different* terminals, that is a **value clash** (the real disagreement). There is no application code — the "engine" is the graph structure plus the Obsidian plugins (Juggl, Breadcrumbs, Dataview) that render and query it.

## History

This repo previously contained a React/TypeScript/Vite implementation of the same concept. It was removed in favour of an Obsidian-native vault. If you find references to `client/`, `graph.ts`, `useGraph`, React Flow, or `localStorage` anywhere, they are stale — the vault is now the single source of truth.
