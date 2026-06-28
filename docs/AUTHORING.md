# Authoring guide

How to create, wire, edit, and delete nodes without corrupting the graph. Read [DATA_MODEL.md](DATA_MODEL.md) first.

## Creating a node

1. **Choose the content.** The claim, stated plainly. This becomes the file name.
2. **Pick the type.** Exactly one of the 21 types. Be precise: an empirical study is `evidence-empirical`, not `argument-support`; a foundational value is `value`, not `position`.
3. **Create the file** `Nodes/<content>.md` (in Obsidian: just create a note with that title in the `Nodes` folder).
4. **Write the frontmatter** — `type`, then the edge fields that wire it into the graph.
5. **Write a body** — one or two sentences elaborating the claim. Optional but recommended; it's what a reader sees on the note.

### Naming files

- The file name is the node's identity and the target of every `[[wikilink]]`. Choose it carefully; renaming later means updating every link that points at it (Obsidian's rename does this automatically *within* the vault, but a git diff will show all the touched files).
- Keep names a readable statement of the claim: `Saving more lives is better`, not `arg-001`.
- Avoid characters illegal in file names (`/ \ : * ? " < > |`). Apostrophes are fine but note the seed drops them (`No, dont pull the lever`) to keep names clean — match that style.

## Wiring it in: which field on which node

Decide the relationship, then put the field on the **correct end** per the direction table in [DATA_MODEL.md](DATA_MODEL.md). The rule restated as a decision:

- **Adding a position under a question?** Put `answers: "[[The question]]"` on the **position**.
- **Adding an argument under a position?** Put `argues-for` (support) or `argues-against` (attack) on the **argument**, pointing at the position.
- **Adding evidence under an argument/position?** Put `supports` on the **evidence**.
- **Adding an objection to an argument?** Put `objects-to` on the **objection**. A rebuttal of that objection gets `rebuts` on the **rebuttal**.
- **An argument opens a deeper question?** Put `raises: "[[The deeper question]]"` on the **argument** (this is a Down edge — it lives on the parent).
- **An argument/position bottoms out at a foundation?** Put `grounds-in: "[[The value]]"` on the **argument or position** (Down edge, lives on the parent).
- **Building forward from a base assumption?** Make a `premise` node and put `entails: "[[The derived node]]"` on the **premise** (Down edge).

### Worked example: extend the Trolley graph

To add an objection to the "Saving more lives is better" argument:

`Sacrificing one violates their rights.md`:
```markdown
---
type: objection
objects-to: "[[Saving more lives is better]]"
---

**OBJECTION** — challenges the consequentialist argument on rights grounds.
```

To rebut that objection:

`Rights can be outweighed by lives saved.md`:
```markdown
---
type: rebuttal
rebuts: "[[Sacrificing one violates their rights]]"
grounds-in: "[[Minimize total suffering]]"
---

**REBUTTAL** — answers the objection and grounds in the shared value.
```

Note how the rebuttal reuses the existing `Minimize total suffering` value rather than creating a new one — that is convergence, and it is the behaviour you should always prefer (see below).

## Reusing terminals — the most important habit

When an argument grounds out, **link to an existing terminal if one already says the same thing.** Do not create a near-duplicate value.

- Before creating a `value`/`principle`/`epistemic-limit`, search `Nodes/` for an existing terminal expressing the same idea.
- If one exists, point `grounds-in` at it. Multiple `grounds-in` edges converging on one terminal is the signal the whole system is built to surface.
- Only create a new terminal when the foundation is genuinely distinct.

Duplicated values silently destroy convergence — two chains that *should* meet at one node instead end at two look-alike nodes, and the agreement beneath a disagreement never shows up. Treat "is there already a value for this?" as a required check.

## Validation checklist

Run through this before considering a node done:

- [ ] `type` is present and is one of the 21 valid types.
- [ ] Every edge field uses a valid edge type for this node's role (e.g. only objections carry `objects-to`).
- [ ] Every wikilink target is the **exact** name of an existing file in `Nodes/` (no broken links).
- [ ] Edge direction is correct: Up fields on the child, Down fields (`raises`/`grounds-in`/`entails`) on the parent.
- [ ] If this is a terminal (`value`/`principle`/`epistemic-limit`), it has **no** outgoing edge fields and nothing points down from it.
- [ ] If grounding out, you checked for and reused an existing terminal where appropriate.
- [ ] Wikilinks are quoted: `"[[Name]]"`.
- [ ] The new edge field, if it's a type not already in use, is registered in the Breadcrumbs config under the right Up/Down group.

## Editing a node

- **Editing content/claim:** rename the file (Obsidian updates inbound links automatically). The body and frontmatter follow.
- **Editing relationships:** add/remove/repoint edge fields in the frontmatter.
- **Changing a node's type:** allowed, but check that its existing edges are still valid for the new type (e.g. turning an `argument-support` into a `value` requires removing all its edges, since terminals have none).

## Deleting a node

- Removing a file deletes the node. **Any wikilink pointing at it becomes broken** — search the vault for `[[<name>]]` and fix or remove those references first.
- **Never delete a terminal that other chains still ground in.** Before deleting a `value`/`principle`/`epistemic-limit`, grep for `grounds-in` references to it. If more than one chain depends on it, deleting it breaks them all.
- Deleting a non-terminal node does **not** automatically delete its children; orphaned children remain as disconnected nodes. Decide deliberately whether to delete the subtree too.

## Quick grep recipes

```bash
# All nodes of a given type
grep -rl '^type: value' Nodes/

# Everything that grounds in a particular value (find convergence / dependents)
grep -rl 'grounds-in:.*Minimize total suffering' Nodes/

# Find broken links: list every wikilink target, then check each file exists
grep -rho '\[\[[^]]*\]\]' Nodes/ | sort -u

# All root questions (have type question, no answers/grounds-in pointing up out of them)
grep -rl '^type: question' Nodes/

# All premises (reverse-authoring roots)
grep -rl '^type: premise' Nodes/
```
