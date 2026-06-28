# CLAUDE.md

Guidance for AI assistants working in this repository.

## What Axiomer is

A wiki-style argument-mapping tool. Users trace any question down through positions and arguments to **bedrock values, principles, or epistemic limits**. Chains that converge on the same terminal reveal shared ground; chains reaching different terminals reveal the real value clash.

The editing frontend is **Obsidian**. The public viewer is **Quartz** (or Cloudflare Pages). There is no React app, no backend, no database.

## Detailed documentation

This file is the orientation. For depth, read `docs/`:

| Document | Covers |
|----------|--------|
| [docs/README.md](docs/README.md) | Index + one-paragraph orientation |
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Complete beginner-proof setup walkthrough (shareable) |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Node/edge types, frontmatter schema, edge direction in full |
| [docs/AUTHORING.md](docs/AUTHORING.md) | Create/edit/link/delete rules, validation checklist, grep recipes |
| [docs/SEMANTICS.md](docs/SEMANTICS.md) | Grounding, convergence, value clash, premises, acceptability |
| [docs/EXAMPLES.md](docs/EXAMPLES.md) | The two seed graphs worked out node by node |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Obsidian setup, plugins, Quartz/Cloudflare/Caddy publishing |
| [docs/AGENT_PLAYBOOK.md](docs/AGENT_PLAYBOOK.md) | Task-oriented guide for AI agents: tasks, gotchas, verification |

**If you are an AI agent, read [docs/AGENT_PLAYBOOK.md](docs/AGENT_PLAYBOOK.md) before editing.**

## Vault structure

```
obsidian-vault/
├── Nodes/          ← all argument nodes, one .md file each
└── .obsidian/      ← plugin configs (committed; workspace.json excluded)
```

Each note is a node. Frontmatter carries:
- `type:` — the node type (see below)
- One or more **typed link properties** pointing at connected notes

Example:
```yaml
---
type: position
answers: "[[Should you pull the lever]]"
argues-for: "[[Pulling saves 5 lives vs 1]]"
---
Yes, pull the lever.
```

## Node types

| Type | Role | Terminal? |
|------|------|-----------|
| `question` | Root — the question being explored | no |
| `position` | A direct answer to a question | no |
| `argument-support` | Supports a position | no |
| `argument-attack` | Attacks a position | no |
| `evidence-empirical` | Empirical evidence | no |
| `evidence-anecdotal` | Anecdotal evidence | no |
| `assumption` | Background assumption | no |
| `definition` | Definitional claim | no |
| `caveat` | Qualification | no |
| `clarification` | Clarifies a node | no |
| `counter-argument` | Counter to an argument | no |
| `objection` | Objection to an argument | no |
| `rebuttal` | Rebuttal of an objection | no |
| `analogy` | Illustrative analogy | no |
| `thought-experiment` | Illustrative thought experiment | no |
| `related-concept` | Related idea | no |
| `logical-fallacy` | Flags a fallacy | no |
| `value` | Bedrock value | **yes** |
| `principle` | Bedrock principle | **yes** |
| `epistemic-limit` | "We can't know further" | **yes** |
| `premise` | Forward-from-base root (alternative to question) | no |

**Terminal nodes** (`value`, `principle`, `epistemic-limit`) are the bottom of every chain — chains must reach one to be fully grounded.

## Edge types and directions

Edge direction matches semantics, not just visual flow. Most edges run child→parent (Up); `raises`, `grounds-in`, and `entails` run parent→child (Down).

| Field | Direction | Meaning |
|-------|-----------|---------|
| `answers` | Up | position answers a question |
| `argues-for` | Up | argument supports a position |
| `argues-against` | Up | argument attacks a position |
| `supports` | Up | evidence supports a node |
| `objects-to` | Up | objection challenges an argument |
| `rebuts` | Up | rebuttal answers an objection |
| `illustrates` | Up | analogy/thought-experiment illustrates a node |
| `connects-to` | Up | related concept (bidirectional in meaning) |
| `raises` | Down | argument raises a sub-question |
| `grounds-in` | Down | argument bottoms out at a terminal |
| `entails` | Down | premise entails a derived node |

## Obsidian plugins

| Plugin | Role |
|--------|------|
| **Juggl** | Interactive graph view — use Hierarchy (Dagre) layout with edge labels |
| **Breadcrumbs** | Enforces Up/Down hierarchy; pre-configured in `data.json` |
| **Dataview** | Query nodes by type, grounding status, etc. |

Breadcrumbs Up fields: `answers`, `argues-for`, `argues-against`, `supports`, `objects-to`, `rebuts`, `illustrates`, `connects-to`
Breadcrumbs Down fields: `raises`, `grounds-in`, `entails`

## Public viewer

**Quartz** compiles the vault into a static site with graph view. Deploy to Cloudflare Pages (easiest) or self-host behind Caddy (best fidelity, custom domain, reverse proxy).

Restricted editing: Quartz output is read-only by nature. Contributors edit in Obsidian locally and open PRs — the `Nodes/` diff is the review surface.

## Git conventions

- Default branch: `main`. Never push directly.
- Each PR adds, edits, or removes argument nodes. The diff is human-readable.
- `obsidian-vault/.obsidian/workspace.json` is gitignored (local state). Plugin configs are tracked so collaborators get the right setup on clone.
