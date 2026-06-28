# Axiomer

Argument mapping to bedrock values. Explore any question by tracing arguments down to the fundamental values, principles, or epistemic limits they rest on. Different chains converging on the same value reveal agreement beneath disagreement; chains reaching different values reveal the real clash.

## How it works

Each node is an Obsidian note. Relationships are typed frontmatter links — `answers`, `argues-for`, `grounds-in`, etc. Juggl renders them as a directed graph; Breadcrumbs enforces the top-down hierarchy. Dataview lets you query across the graph.

## Setup (5 minutes)

1. Install [Obsidian](https://obsidian.md)
2. Open the `obsidian-vault/` folder as a vault
3. Settings → Community plugins → disable Restricted Mode → install and enable:
   - **Juggl** — interactive graph view
   - **Breadcrumbs** — hierarchy / direction (pre-configured)
   - **Dataview** — query nodes by type, status, etc.
4. Command palette (`Ctrl+P`) → **Juggl: Open Juggl** → set layout to **Hierarchy (Dagre)**, enable edge labels

Breadcrumbs Up/Down fields are already configured in `.obsidian/plugins/breadcrumbs/data.json` — no manual setup needed.

## Vault structure

```
obsidian-vault/
└── Nodes/   ← all argument nodes as .md files
```

Each note's frontmatter carries its `type:` and one or more typed link properties pointing at connected notes.

## Node types

`question` · `position` · `argument-support` · `argument-attack` · `evidence-empirical` · `evidence-anecdotal` · `assumption` · `definition` · `caveat` · `clarification` · `counter-argument` · `objection` · `rebuttal` · `analogy` · `thought-experiment` · `related-concept` · `logical-fallacy` · `value` · `principle` · `epistemic-limit` · `premise`

Terminal (no children): `value`, `principle`, `epistemic-limit`

## Edge types

| Direction | Fields |
|-----------|--------|
| **Up** (child → parent) | `answers`, `argues-for`, `argues-against`, `supports`, `objects-to`, `rebuts`, `illustrates`, `connects-to` |
| **Down** (parent → child) | `raises`, `grounds-in`, `entails` |

## Public viewer

| Option | Fidelity | Effort |
|--------|----------|--------|
| **Quartz** + Caddy reverse proxy | Best — renders the vault as a real site with graph view | Medium |
| **Cloudflare Pages** (Quartz output) | Good | Easiest |

## Documentation

Full reference lives in [docs/](docs/):

- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — node/edge types and frontmatter schema
- [docs/AUTHORING.md](docs/AUTHORING.md) — how to create and wire nodes correctly
- [docs/SEMANTICS.md](docs/SEMANTICS.md) — grounding, convergence, value clash, premises
- [docs/EXAMPLES.md](docs/EXAMPLES.md) — the seed graphs explained in detail
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — setup and publishing
- [docs/AGENT_PLAYBOOK.md](docs/AGENT_PLAYBOOK.md) — guide for AI agents
- [CLAUDE.md](CLAUDE.md) — orientation for AI assistants (good for humans too)

## Contributing

Edit notes in Obsidian, open a pull request. The `Nodes/` diff is the review surface — added/changed/removed argument nodes are readable as plain text.
