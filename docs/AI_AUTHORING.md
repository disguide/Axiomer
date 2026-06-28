# AI authoring layer

Manual node-building in Obsidian is thorough but slow. Because every node is plain text with a documented schema ([DATA_MODEL.md](DATA_MODEL.md)), an AI agent can read a conversation, essay, or debate and **write the nodes for you** — decomposing the argument, labeling the edge types, reusing existing values, and validating links. This document describes that layer.

There are two delivery forms. Start with the conversational one; reach for the script only when you need scale.

---

## Form 1 — Conversational (no code, works today)

Point an AI agent at the vault and describe what you want built. The agent reads [CLAUDE.md](../CLAUDE.md) + [docs/](.), decomposes the argument, and writes the `.md` files directly.

**Who can run it:** anyone with Claude Code (or any agent with file access to the repo). No API key, no install, no infrastructure.

**The interaction:**

> *"Here's a debate about whether nuclear power is worth it: [paste]. Build the argument graph — question at the top, ground every chain in a value, and reuse `Minimize total suffering` if a chain bottoms out there."*

The agent then:
1. Reads the docs to load the schema and conventions.
2. Identifies the root question (or premise).
3. Extracts positions, arguments, evidence, objections, rebuttals.
4. Decides each one's `type` and the correct edge (Up on the child, Down — `raises`/`grounds-in`/`entails` — on the parent).
5. **Greps existing terminals** and links to them instead of duplicating (preserving convergence).
6. Writes each node as a `Nodes/<claim>.md` file with valid frontmatter.
7. Runs the integrity audit from [AGENT_PLAYBOOK.md](AGENT_PLAYBOOK.md) (no broken links, no terminal with children, edge directions correct).

**Why this is the recommended default:** it requires nothing beyond the agent you're already using, it produces a reviewable git diff, and a human can eyeball the result in Juggl before committing. The doc suite *is* the system prompt — the agent already knows the rules.

### A good extraction prompt

Paste this to the agent along with your source material:

> Build Axiomer nodes from the argument below. Follow `docs/DATA_MODEL.md` and `docs/AUTHORING.md` exactly. Rules: one `.md` file per node in `obsidian-vault/Nodes/`; `type` + typed-link frontmatter; Up edges on the child, Down edges (`raises`/`grounds-in`/`entails`) on the parent; every chain must reach a `value`/`principle`/`epistemic-limit`; before creating any terminal, grep `Nodes/` for an existing one and link to it instead. After writing, run the broken-link audit and report convergence (any value reached by >1 chain) and clashes (one question reaching different values).
>
> Source: [paste conversation / essay / debate]

---

## Form 2 — Programmatic (a script, for scale)

A CLI that ingests a transcript and emits validated node files via the Claude API. Use it when you have many documents to convert or want it in the publish pipeline.

**Shape:**

```
input (transcript / essay / URL text)
        │
        ▼
  Claude API call  ──  model: claude-opus-4-8
        │              output_config.format = JSON schema for {nodes, edges}
        │              system prompt = the docs/ rules
        ▼
  { nodes: [{id, type, content, body}],
    edges: [{from, to, edgeType}] }
        │
        ▼
  validate (reuse the rules in io-style checks):
    - every type in the 21; every edgeType in the 11
    - terminals have no outgoing edges
    - edge directions correct
    - dedupe terminals against existing Nodes/*.md
        │
        ▼
  write obsidian-vault/Nodes/<content>.md per node
```

**Why structured outputs:** constraining the response to a JSON schema (`output_config.format` with `type: "json_schema"`) guarantees the model returns exactly `{nodes, edges}` in a parseable shape — no prose to scrape, no malformed frontmatter. Validate the parsed object against the same rules a human follows, then render each node to Markdown.

**Model:** default to `claude-opus-4-8` — argument decomposition and correct edge-labeling is reasoning-heavy, and accuracy matters more than cost here. For long transcripts, stream the request.

**Sketch (Python, illustrative):**

```python
import anthropic, json
client = anthropic.Anthropic()

SYSTEM = open("docs/DATA_MODEL.md").read() + "\n\n" + open("docs/AUTHORING.md").read()

SCHEMA = {
  "type": "object",
  "properties": {
    "nodes": {"type": "array", "items": {
      "type": "object",
      "properties": {
        "content": {"type": "string"},
        "type": {"type": "string"},
        "body": {"type": "string"},
      },
      "required": ["content", "type"],
      "additionalProperties": False,
    }},
    "edges": {"type": "array", "items": {
      "type": "object",
      "properties": {
        "from": {"type": "string"},      # node content
        "to": {"type": "string"},        # node content
        "edgeType": {"type": "string"},
      },
      "required": ["from", "to", "edgeType"],
      "additionalProperties": False,
    }},
  },
  "required": ["nodes", "edges"],
  "additionalProperties": False,
}

resp = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=16000,
    system=SYSTEM + "\nExtract the argument as nodes and edges. "
                    "Reuse existing terminals named in the user message instead of creating duplicates.",
    output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
    messages=[{"role": "user", "content": transcript_plus_existing_terminal_list}],
)

graph = json.loads(next(b.text for b in resp.content if b.type == "text"))
# validate graph against the 21 types / 11 edges / terminal rules, dedupe
# terminals against existing Nodes/, then write each node to a .md file.
```

Feed the model the list of existing terminals (from `grep -rl '^type: value' Nodes/` etc.) in the user message so it can reuse them — that's what protects convergence in the automated path.

> This sketch references Claude API specifics (model ID, `output_config.format`). Before building it for real, read the `claude-api` skill / `docs.claude.com` so the exact parameter shapes are current.

---

## What the AI layer must get right

Whichever form, the non-negotiables are the same ones a human follows — they're just enforced by the agent or the validator:

1. **Edge direction** — Up edges on the child, Down edges (`raises`/`grounds-in`/`entails`) on the parent. The single biggest source of broken graphs.
2. **Terminal reuse** — never create a near-duplicate value; link to the existing one. This is what makes convergence appear; an AI that duplicates silently destroys the core feature.
3. **Grounding** — push every chain down to a `value`/`principle`/`epistemic-limit`; flag any chain that dead-ends as open rather than inventing a foundation.
4. **No terminal children** — terminals are leaves.
5. **Exact wikilinks** — `"[[Exact File Name]]"`, quoted, matching a real file.

See [AGENT_PLAYBOOK.md](AGENT_PLAYBOOK.md) for the full gotcha list and the integrity-audit commands the agent should run after writing.

---

## Recommended path

1. **Now:** use Form 1 — hand an agent a debate and have it build the nodes. Review the diff in git and the graph in Juggl. Zero setup.
2. **Later, if volume grows:** build Form 2 as `scripts/build-graph.py`, wire it into the contribution flow, and have it open a PR per ingested document (same review gate as manual edits).

Both paths produce the same artifact — `.md` files in `Nodes/` — so you can mix them freely.
