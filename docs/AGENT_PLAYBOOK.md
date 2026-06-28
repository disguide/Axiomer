# Agent playbook

Task-oriented guidance for an AI agent operating on this repository. Assumes you've read [DATA_MODEL.md](DATA_MODEL.md), [AUTHORING.md](AUTHORING.md), and [SEMANTICS.md](SEMANTICS.md).

## Orient yourself first

This is a **data repository, not a code repository.** There is no app to run, no build to pass, no tests to satisfy. The "program" is a set of Markdown files whose YAML frontmatter forms a typed graph. Your edits succeed or fail by whether the graph stays well-formed and meaningful, not by a compiler.

Before doing anything, get the lay of the land:

```bash
ls obsidian-vault/Nodes/                      # every node
grep -rh '^type:' obsidian-vault/Nodes/ | sort | uniq -c   # type distribution
```

## Mental model in five sentences

1. Each file in `Nodes/` is one node; its name is its identity and the target of `[[wikilinks]]`.
2. Frontmatter `type:` sets the node's role; frontmatter link fields are typed edges.
3. Up edges (`answers`, `argues-for`, …) live on the child; Down edges (`raises`, `grounds-in`, `entails`) live on the parent.
4. Chains flow from a `question` (or `premise`) down to a terminal (`value`/`principle`/`epistemic-limit`).
5. Shared terminals = convergence; one question reaching different terminals = a value clash; these are the whole point.

## Common tasks

### Add an argument node to an existing question

1. Read the target node and its neighbours to understand context and avoid duplication.
2. Create `Nodes/<claim>.md` with the right `type`.
3. Add the edge field on the **correct end** (re-read the direction table if unsure).
4. If it grounds out, **search for an existing terminal first** and reuse it.
5. Run the validation checklist in [AUTHORING.md](AUTHORING.md).

### Ground an open chain

1. Find the ungrounded leaf — an argument/position with no `grounds-in` and no grounded `raises`.
2. Decide its true foundation: a moral `value`, a `principle`, or an `epistemic-limit`.
3. `grep` for an existing matching terminal. Reuse it if found; that may create convergence.
4. Add `grounds-in` on the argument/position pointing at that terminal.

### Find convergence and clashes

```bash
# Convergent terminals: which values have >1 inbound grounds-in
grep -rho 'grounds-in:.*' obsidian-vault/Nodes/ | sort | uniq -c | sort -rn

# Then for a suspected convergent value, list its dependents:
grep -rl 'grounds-in:.*Minimize total suffering' obsidian-vault/Nodes/
```
A clash is a single question whose subtrees end at different terminals — trace each position down (follow `answers` inbound, then `argues-for`/`grounds-in`) and compare the terminals.

### Audit graph integrity

```bash
# List every wikilink target referenced anywhere
grep -rho '\[\[[^]]*\]\]' obsidian-vault/Nodes/ | sed 's/\[\[//;s/\]\]//' | sort -u > /tmp/targets.txt
# List every actual node name
for f in obsidian-vault/Nodes/*.md; do basename "$f" .md; done | sort -u > /tmp/nodes.txt
# Targets with no matching file = broken links
comm -23 /tmp/targets.txt /tmp/nodes.txt
```

Also check: terminals with outgoing edges (invalid), nodes whose `type` isn't one of the 21, Up fields on the wrong end.

## Gotchas — read before editing

1. **Edge direction is the #1 trap.** `raises`, `grounds-in`, and `entails` live on the *parent* and point *down*. Everything else lives on the *child* and points *up*. Putting an Up field on the wrong end, or treating a Down field like an Up field, silently breaks the hierarchy and the layout.
2. **Never duplicate a terminal.** Always grep for an existing `value`/`principle`/`epistemic-limit` before creating one. A duplicate destroys convergence invisibly — nothing errors, the insight just never appears.
3. **Terminals have no children.** A `value`/`principle`/`epistemic-limit` should have only `type:` in its frontmatter and nothing pointing down from it.
4. **Wikilinks must be exact and quoted.** `"[[Exact File Name]]"` — case-sensitive, punctuation-sensitive, no `.md`. A typo is a broken edge, not an error.
5. **Renames ripple.** Renaming a node means every `[[link]]` to it must update. In Obsidian this is automatic; if you edit files directly, you must update inbound links yourself.
6. **Deleting a shared terminal breaks many chains.** Grep `grounds-in` references before deleting any terminal.
7. **New edge types need Breadcrumbs registration.** If you introduce an edge field not already in use, add it to the correct Up/Down group in `.obsidian/plugins/breadcrumbs/data.json` or the hierarchy ignores it.
8. **The repo has no app.** Don't try to `npm install`, run a dev server, or "build the project." Any such instruction in old memory or stale references is wrong — the React app was deleted. The vault is the system.

## Verifying your work

There's no test suite, so verify structurally:

- [ ] No broken wikilinks (run the integrity audit above).
- [ ] Every node's `type` is valid; every edge field is valid for that node's role.
- [ ] Edge directions correct (Up on child, Down on parent).
- [ ] No terminal has outgoing edges or inbound down-edges.
- [ ] You reused existing terminals rather than duplicating.
- [ ] `git diff` shows only the nodes you intended to touch, and the diff reads as a coherent change to the argument graph.

## When you're unsure about a relationship

Open the seed examples in [EXAMPLES.md](EXAMPLES.md) and find the analogous case. The Trolley and Sky Blue graphs between them demonstrate questions, positions, supporting arguments, evidence, raised sub-questions, direct position grounding, premises/entailment, convergence, and value clash. Almost any new edit has a precedent there — match the precedent.
