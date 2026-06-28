# Deployment & setup

How to run Axiomer for editing (Obsidian) and how to publish it for reading (a static viewer).

## Editing environment — Obsidian

### Open the vault

1. Install [Obsidian](https://obsidian.md).
2. **Open folder as vault** → select `obsidian-vault/` in this repo.

### Required plugins

Settings → Community plugins → disable Restricted Mode → Browse → install and enable:

| Plugin | Why |
|--------|-----|
| **Juggl** | Interactive graph view. Use **Hierarchy (Dagre)** layout and enable **edge labels** to see typed relationships top-down. |
| **Breadcrumbs** | Reads the typed link fields and imposes the Up/Down hierarchy. **Pre-configured** — see below. |
| **Dataview** | Query nodes by `type`, count inbound `grounds-in` links, find convergent values / clashes / open chains. |

### Breadcrumbs configuration (already done)

The hierarchy is committed in `obsidian-vault/.obsidian/plugins/breadcrumbs/data.json`. It registers every edge field under the correct direction group:

- **Up** (child → parent): `answers`, `argues-for`, `argues-against`, `supports`, `objects-to`, `rebuts`, `illustrates`, `connects-to`
- **Down** (parent → child): `raises`, `grounds-in`, `entails`

You do **not** need to set this up by hand on a fresh clone. After enabling Breadcrumbs, run **Breadcrumbs: Rebuild graph** from the command palette to index the vault.

**If you add a new edge field type,** you must add it to the correct group in that JSON file (or via Breadcrumbs settings → Edge fields), then rebuild — otherwise the new relationship won't participate in the hierarchy or layout.

### Viewing the graph

Command palette (`Ctrl+P`) → **Juggl: Open Juggl** → set layout to **Hierarchy (Dagre)**, turn on edge labels. Start from a root question and follow it down to its terminals.

### What's tracked in git

- **Tracked:** `Nodes/`, plugin configs under `.obsidian/` (so collaborators get the right setup on clone), `.obsidian/community-plugins.json`, the Breadcrumbs/Juggl data.
- **Ignored:** `.obsidian/workspace.json` and `workspace-mobile.json` (per-machine window layout — noise in diffs). See `.gitignore`.

## Public viewer — read-only site

The goal is a public, read-only rendering of the vault. Editing stays gated (contributors edit locally in Obsidian and open PRs); the published site never accepts edits.

### Recommended: Quartz

[Quartz](https://quartz.jzhao.xyz/) compiles an Obsidian vault into a static site with backlinks, a graph view, and full-text search — the **best-fidelity** option because it understands wikilinks and frontmatter natively.

Pipeline:
1. Point Quartz at `obsidian-vault/` as its content source.
2. Build the static site (`npx quartz build`).
3. Serve the output (`public/`) as static files.

### Hosting options, easiest → most control

| Option | Effort | Notes |
|--------|--------|-------|
| **Cloudflare Pages** | Easiest | Connect the repo, set the Quartz build command, deploy on push. No server to run. Free tier is ample for read traffic. |
| **Self-host behind Caddy** | Medium | Run Quartz's static output behind a [Caddy](https://caddyserver.com/) reverse proxy. Caddy handles TLS automatically and reverse-proxies the public path from the repo root. Best for a custom domain and full control; no gating needed since the output is inherently read-only. |

Both serve the same static Quartz build. Cloudflare Pages trades control for zero ops; Caddy trades ops for control. Pick based on whether you want to run a server.

### Restricted editing

There is nothing to "lock down" on the published site — a static Quartz build has no write path. Editing happens only in Obsidian against the git repo, and changes reach `main` only through pull requests. The PR diff over `Nodes/` is the review surface: each changed `.md` file is a readable added/edited/removed argument node.

## Contribution flow end to end

```
edit in Obsidian (local)
   │  create/edit/delete notes in Nodes/
   ▼
git commit + push to a branch
   │
   ▼
open Pull Request ── reviewer reads the Nodes/ diff ── merge to main
   │
   ▼
CI/host rebuilds Quartz ── static site redeploys (Cloudflare Pages or Caddy)
```

Git provides history, attribution, revert, and propose-and-review for free. No database, no auth server, no backend.
