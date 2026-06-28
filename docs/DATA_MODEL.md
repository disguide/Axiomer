# Data model

The complete specification of how data is represented in the Axiomer vault. If you are about to read or write a node, read this first.

## A node is a note

Every node in the argument graph is a single Markdown file in `obsidian-vault/Nodes/`. There is no database, no index file, no central registry — the set of `.md` files **is** the graph. A node has three parts:

1. **File name** — carries the node's content/title. `Should you pull the lever.md` is the node whose text is "Should you pull the lever". The `.md` filename (minus extension) is the node's identity; it is what every `[[wikilink]]` points at.
2. **Frontmatter** — a YAML block at the very top, between `---` fences. Carries the node's `type` and its typed links to other nodes.
3. **Body** — free Markdown below the frontmatter. Human-readable elaboration of the claim.

### Canonical example

`Saving more lives is better.md`:

```markdown
---
type: argument-support
argues-for: "[[Yes, pull the lever]]"
raises: "[[Why does saving lives matter]]"
---

**ARGUMENT (SUPPORT)** — backs the position, and raises a deeper question.
```

This single file declares: a node of type `argument-support`, whose content is "Saving more lives is better", which `argues-for` the position "Yes, pull the lever" and `raises` the deeper question "Why does saving lives matter".

## Frontmatter schema

```yaml
type: <one of the 21 node types>          # REQUIRED, exactly one
<edge-field>: "[[Target Node Name]]"      # zero or more, see edge types
```

### Rules

- `type` is **required** and must be exactly one of the node types below.
- Edge fields are **optional** and there may be several on one node. A node with no edge fields is a leaf or an orphan (valid but disconnected).
- Every edge-field value is a **quoted wikilink**: `"[[Exact File Name Without Extension]]"`. The quotes matter — Obsidian's YAML parser needs them around `[[…]]`.
- The link target must match an existing file name in `Nodes/` exactly (case-sensitive, including punctuation). A link to a non-existent note renders as a "broken" node in Juggl.
- A single edge field holds **one** link. To express several relationships of the same type, use a YAML list:
  ```yaml
  grounds-in:
    - "[[Minimize total suffering]]"
    - "[[Never use a person merely as a means]]"
  ```
  (The seed currently uses one link per field; lists are the supported way to fan out.)

## Node types (21)

The type determines a node's role, its icon/colour in views, and what it is allowed to connect to.

| Type | Role in an argument | Terminal? |
|------|---------------------|-----------|
| `question` | A question being explored. Tree **root**, or a deeper question raised mid-argument. | no |
| `position` | A direct answer to a question. | no |
| `argument-support` | An argument backing a position. | no |
| `argument-attack` | An argument undermining a position. | no |
| `evidence-empirical` | Empirical evidence for a claim. | no |
| `evidence-anecdotal` | Anecdotal evidence for a claim. | no |
| `assumption` | A background assumption a claim relies on. | no |
| `definition` | A definitional claim that fixes a term's meaning. | no |
| `caveat` | A qualification or limit on a claim. | no |
| `clarification` | Clarifies an ambiguous claim. | no |
| `counter-argument` | A counter to an argument. | no |
| `objection` | An objection challenging an argument. | no |
| `rebuttal` | A rebuttal answering an objection. | no |
| `analogy` | An illustrative analogy. | no |
| `thought-experiment` | An illustrative thought experiment. | no |
| `related-concept` | A related idea, loosely connected. | no |
| `logical-fallacy` | Flags a fallacy in an argument. | no |
| `value` | A bedrock value. **Bottom of a chain.** | **yes** |
| `principle` | A bedrock principle. **Bottom of a chain.** | **yes** |
| `epistemic-limit` | "We cannot currently know further." **Bottom of a chain.** | **yes** |
| `premise` | A foundational base you build *forward/down* from (reverse authoring). Tree **root**. | no |

### Terminal nodes

`value`, `principle`, and `epistemic-limit` are **terminal**: they are the foundation an argument chain bottoms out at, and they **never have children**. Nothing should point *down* from a terminal. A terminal node's file typically has only `type` in its frontmatter and no edge fields. They are the only nodes shared across many chains — that sharing is the whole point (see [SEMANTICS.md](SEMANTICS.md)).

`premise` is **not** terminal — it is a root you build downward from, the mirror image of a `question`.

## Edge types (11)

An "edge" is a typed link field in a node's frontmatter. The field name **is** the edge type. The critical, non-obvious rule:

> **Edge direction encodes the *relationship*, not the visual top-to-bottom flow of the tree.**

Most relationships are written on the **child**, pointing **up** at the parent. But three relationships (`raises`, `grounds-in`, `entails`) are written on the **parent**, pointing **down** at the child. This split exists so the link always lives on the node that "owns" the relationship semantically.

| Field | Lives on | Points at | Tree direction | Meaning |
|-------|----------|-----------|----------------|---------|
| `answers` | position | question | **Up** | this position answers that question |
| `argues-for` | argument-support | position | **Up** | this argument backs that position |
| `argues-against` | argument-attack | position | **Up** | this argument undermines that position |
| `supports` | evidence | position/argument | **Up** | this evidence supports that claim |
| `objects-to` | objection | argument | **Up** | this objection challenges that argument |
| `rebuts` | rebuttal | objection | **Up** | this rebuttal answers that objection |
| `illustrates` | analogy/thought-experiment | position/argument | **Up** | this illustrates that claim |
| `connects-to` | any | any | **Up** (bidirectional in meaning) | related concept |
| `raises` | argument | question | **Down** | this argument raises that deeper question |
| `grounds-in` | argument *(or position)* | value/principle/epistemic-limit | **Down** | this chain bottoms out at that terminal |
| `entails` | premise | any derived node | **Down** | this premise leads to / entails that node |

### Up vs Down at a glance

- **Up fields** (`answers`, `argues-for`, `argues-against`, `supports`, `objects-to`, `rebuts`, `illustrates`, `connects-to`) — written on the child, point to the parent.
- **Down fields** (`raises`, `grounds-in`, `entails`) — written on the parent, point to the child.

These two sets are exactly the Breadcrumbs **Up** and **Down** hierarchy groups configured in `obsidian-vault/.obsidian/plugins/breadcrumbs/data.json`. That config is what makes Juggl lay the graph out top-down. If you add a new edge field, you must register it in that file under the correct group or the hierarchy breaks.

### The one subtlety that bites everyone

If you naively treat every link as "source is the child," value nodes and child questions render wrong: terminals never appear (nothing points "up" to them) and raised questions appear as duplicate disconnected roots. The fix is built into the direction table above — `raises`, `grounds-in`, and `entails` are written on the parent and point down. Respect that and the tree is correct.

## What's in the seed vs. the full model

The 21 types and 11 edges above are the **full model**. The current seed vault in `Nodes/` exercises a representative subset:

- **Types used:** `question`, `position`, `argument-support`, `evidence-empirical`, `value`, `principle`-adjacent (`epistemic-limit`), `premise`.
- **Edges used:** `answers`, `argues-for`, `supports`, `raises`, `grounds-in`, `entails`.
- **Not yet exercised in the seed:** `argument-attack`, `objection`, `rebuttal`, `counter-argument`, `logical-fallacy`, `analogy`, `thought-experiment`, `assumption`, `definition`, `caveat`, `clarification`, `related-concept`, and the edges `argues-against`, `objects-to`, `rebuts`, `illustrates`, `connects-to`.

All of these are valid to use — they're just not demonstrated by the two seed graphs. See [EXAMPLES.md](EXAMPLES.md) for the seed walkthrough and [SEMANTICS.md](SEMANTICS.md) for how attack/objection/rebuttal interact under acceptability.
