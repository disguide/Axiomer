# Axiomer — Node Status & the Commitment System

> **Status: design-stage.** Specifies (A) the node **lifecycle/validity
> system** — how a node is marked dead, denied, invalid, superseded — and
> (B) the **commitment system** — "if you hold this position, you must also
> hold this branch." Neither is implemented; `client/src/lib/graph.ts`
> remains authoritative for v1. Foundations: `docs/PHILOSOPHY.md`; type
> definitions: `docs/TAXONOMY.md`.

---

## 1. The golden rule: two layers that never blur

A node's standing has two independent sources, and confusing them corrupts
both:

| Layer | Set by | Examples | Nature |
|---|---|---|---|
| **Computed standing** | the algorithm, always derived, never stored | grounded / ungrounded; defended / defeated / contested (Dung) | *Mathematics.* Recomputed from structure; no one can decree it. |
| **Asserted status** | a person (author or review process), stored on the node | active / retracted / refuted / invalid / superseded / merged | *Speech acts.* Recorded editorial history; the algorithm never sets them. |

`defeated` (computed: your attackers currently win) is **not** `refuted`
(asserted: the community closed the book on you). A node can be defeated
today and defended tomorrow when a rebuttal lands — that's computation. A
refuted node stays refuted until a human reopens it — that's history.

The two meet in exactly one place: **non-active nodes are invisible to the
computation** (§3).

---

## 2. The lifecycle: asserted statuses

### 2.1 The statuses

| Status | Meaning | Typical setter |
|---|---|---|
| `active` | Live. The default; participates in everything. | — |
| `retracted` | The **author withdrew it** ("I no longer stand by this"). No verdict on truth — an act of the asserter, honoring Hamblin's rule that commitments can be withdrawn as well as incurred. | author |
| `refuted` | **Judged decisively defeated** and accepted as such — the strongest "denied." Normally follows a stable computed `defeated` (e.g. an unanswered counter-example): review looks at the math and closes the book. | review / maintainer |
| `invalid` | **Malformed as a move**, regardless of truth: mislabeled type, incoherent content, duplicate-in-place, not-an-argument. Sorts the "this is nonsense" case from the "this is wrong" case (`refuted`) — a category error is not a falsehood. | review / maintainer |
| `superseded` | **Replaced by a better formulation.** Points to its successor via a `supersedes` edge (successor → old). The old node remains as history; readers are redirected. | author or review |
| `merged` | **Folded into a canonical duplicate** (the Phase-4 dedup queue's output). Like `superseded`, but the successor is an existing node — this is how convergence is *enforced* over time. | review / dedup queue |

Everything except `active` is collectively **inert** ("dead" in the informal
sense).

### 2.2 Transition rules

```
                      ┌────────────┐
        author ──────►│ retracted  │─────► (author may reactivate own retraction)
                      └────────────┘
active ──── review ──►┌────────────┐
   ▲                  │  refuted   │─────► reopened only by review, with reason
   │                  └────────────┘
   │        review ──►┌────────────┐
   │                  │  invalid   │─────► fix = author a NEW node (old stays)
   │                  └────────────┘
   └──── any inert state is reversible by an authorized actor, with a
         recorded reason. Nothing is ever hard-deleted in wiki mode.
```

- **No hard deletion in wiki/canonical mode.** History is the product's spine
  (`ROADMAP.md` Phase 3). Hard delete exists only in local authoring mode
  (current v1 behavior), and even there v2 should prefer retraction.
- **Statuses carry provenance:** who, when, why (a short reason string), and
  for `refuted`, ideally *which attacker(s)* carried the day.
- **Terminals are special:** a `value` may be retracted by its author only if
  nothing else grounds in it; a shared value with other dependents can only be
  `superseded`/`merged` (mirrors v1's `doomedSet` sparing logic).

### 2.3 What inertness means (the force of being dead)

An inert node:

1. **Cannot ground anything.** Chains through it do not count toward
   `FULLY GROUNDED`.
2. **Cannot attack anything.** A retracted objection stops defeating its
   target the moment it is retracted — computed standing is recomputed over
   active nodes only.
3. **Cannot support anything, and is excluded from commitment closure** (§5).
4. **Stays visible** as a ghost (struck-through / dimmed, per
   `DESIGN_BRIEF.md`'s defeated styling — extended to a status-badge
   hierarchy: asserted status first, computed standing second).
5. **Orphans its children into review**: children of an inert node are
   flagged "parent inert — re-attach, retract, or leave as record." They are
   *not* auto-killed; a good rebuttal to a retracted objection may deserve
   re-homing.

---

## 3. Effect on the computed layers (precise semantics)

Let `G` be the graph and `A(G)` the subgraph of active nodes and the edges
among them. Then, definitionally:

- `isFullyGrounded`, `isNodeGrounded` — computed on `A(G)`.
- `getAcceptability` (Dung labelling) — computed on `A(G)`.
- `getValueUsage`, `getValueClashes`, convergence queries — computed on
  `A(G)`.
- Depth metrics and grounding gaps — computed on `A(G)`, so retracting a
  node can *reopen* a question (its badge honestly flips back to OPEN).

This is the entire coupling between the layers: **status filters the graph
the algorithms see; it never edits their logic.** (`graph.ts` stays pure —
one added filter, no new branches inside the walkers.)

---

## 4. Resolution: what a question can be

With presuppositions and proof standards (TAXONOMY §2, §4.4), a question has
one of four resolution states, shown by the badge and narrated by the
`synthesis` node:

| State | Condition |
|---|---|
| `FULLY GROUNDED` | v1 rule, over `A(G)`: every chain reaches bedrock. |
| `OPEN` | Some chain dead-ends (v1 rule, over `A(G)`). |
| `DISSOLVED` **[NEW]** | A presupposition of the question is `defeated`/`refuted`. The question doesn't get an answer; it *loses its footing*. Rendered distinctly — dissolution is an achievement, not a failure. |
| `RESOLVED(standard)` **[NEW]** | Grounded **and** some position(s) survive acceptability at the question's declared proof standard: `preponderance` (a position's defended support outweighs defended attacks) < `clear-and-convincing` (decisively outweighs) < `beyond-reasonable-doubt` (no defended attack remains) < `dialectical-validity` (every critical question of every supporting scheme answered). |

Grounding answers *"did we dig to bedrock?"*; resolution answers *"did
anything win, by the bar this question declares?"*. A question can be fully
grounded yet unresolved — that is precisely a **value clash** (Trolley), and
saying so plainly is the synthesis node's job.

---

## 5. The commitment system ("hold this → hold that")

### 5.1 The idea (Hamblin / Brandom)

Asserting is not decoration; it is **undertaking commitments** — to the
claim, to what follows from it, and to defending it when challenged. A
**stance** is a user's commitment store: the set of nodes they explicitly
accept or reject. The system's job is *scorekeeping*: compute what else the
stance commits them to, whether the whole is coherent, and what it costs to
escape a conflict.

Stances are **per-user overlays**. They never touch the shared graph — the
graph is the map of the debate; a stance is one person's position on the map.

```
stance:  accept(n₁), accept(n₂), reject(n₃), …        (explicit, user-set)
closure: everything the stance commits the user to     (computed)
audit:   incoherences + undischarged commitments       (computed)
```

### 5.2 Propagation rules (the closure)

Starting from explicit acceptances, commitment propagates along **strict**
relations only — never along defeasible support (accepting a claim does not
force accepting every argument for it):

| # | Rule | Formal | Ancestry |
|---|---|---|---|
| P1 | **Entailment (forward / modus ponens).** Accepting a claim commits you to everything it `entails`, transitively. | accept(A), A entails B ⇒ committed(B) | logical consequence; Hamblin's "commitment to consequences" |
| P2 | **Grounding (downward).** Accepting an argument or position commits you to the terminal(s) it `grounds-in`. You cannot stand on a chain and disown its bedrock. | accept(A), A grounds-in V ⇒ committed(V) | foundationalism made honest |
| P3 | **Presupposition.** Accepting a claim — or *asking* a question in earnest — commits you to its presuppositions. | accept(A), A presupposes P ⇒ committed(P) | pragmatics of presupposition |
| P4 | **Warrant & assumption (upstream needs).** Accepting an argument commits you to its authored warrants and assumptions — they are what the argument *runs on*. | accept(Arg) ⇒ committed(warrants, assumptions of Arg) | Toulmin |
| P5 | **Denial closure (backward / modus tollens).** Rejecting a claim commits you against everything that strictly entails it. | reject(B), A entails B ⇒ committed-against(A) | contraposition |

Deliberately **not** propagated: `supports`, `argues-for`, `illustrates`,
`exemplifies` (defeasible — many roads lead to a claim; accepting the claim
picks no road), and anything through **inert** nodes (§2.3).

### 5.3 Coherence rules (the audit)

| # | Rule | Response |
|---|---|---|
| C1 | **Incompatibility.** Closure contains A and B with `contradicts(A, B)` — or contains both committed(X) and committed-against(X). | Stance is **incoherent**. Show the *minimal conflicting set* and the explicit acceptances it descends from — the smallest thing the user must give up. |
| C2 | **Forced choice (the tollens fork).** User rejects B while accepting A, where A ⇒…⇒ B strictly. | Present the fork, never auto-resolve: **"Keep A (then B comes with it) — or reject B (then A goes with it)."** The user revises; the system only prices the options. |
| C3 | **Undischarged commitment** (Brandom: commitment without *entitlement*). A committed node is currently `defeated`, ungrounded, or `refuted`. | Not incoherence — an honest debt. Flag: "you are committed to X, and X currently doesn't survive scrutiny; defend it or restructure." |
| C4 | **Clash localization.** Two accepted positions ground in values linked by `contradicts` (or flagged by `getValueClashes`). | Surface it as the *real* disagreement: "your positions on Q1 and Q2 collide at the value layer, not the argument layer." |

### 5.4 What the user gets out of it

- **Revealed value profile.** Run P1–P4 over a user's accepted positions:
  the set of bedrock values they are *actually* standing on — often a
  surprise, and the product's most personal payoff. Convergence, turned
  inward.
- **Stance audit.** One screen: your acceptances, their closure, C1–C4
  findings, and the cheapest revisions that restore coherence.
- **The honest opponent.** Because stances are overlays on a shared map, two
  users' stances can be *diffed*: same graph, different bedrock — the
  disagreement located precisely, usually at 2–3 value nodes rather than 200
  argument nodes.

### 5.5 Worked example (Trolley, abbreviated)

```
accept( position: "Pull the lever" )
 P4 ⇒ committed( assumption: "outcomes are what matter morally" )
 P2 ⇒ committed( value: "minimize suffering" )

accept( position: "Never use a person as a mere means" )   ← from another question
 P2 ⇒ committed( principle: "persons as ends" )

graph fact: contradicts( "outcomes are what matter morally",
                         "persons as ends" )     ← authored incompatibility
 C1 ⇒ INCOHERENT. Minimal conflicting set: those two nodes.
 Fork: abandon "pull the lever" (give up pure outcome-weighing)
       or qualify "persons as ends" (author the caveat/distinction that
       reconciles them — which is itself a new node the graph gains).
```

The end state is the product thesis in miniature: the machine did not decide
the ethics; it **forced the disagreement down to bedrock and made the price
of each exit explicit.**

---

## 6. Implementation sketch (when we build — not now)

Deltas only; everything stays behind the existing pure-function discipline:

- `GraphNode` gains `status?: NodeStatus` (default `active`) and
  `statusMeta?: { by, at, reason, supersededBy? }`.
- `Graph` walkers take the active-subgraph filter (§3) — one shared helper,
  e.g. `activeGraph(g)`, applied at entry to `isFullyGrounded`,
  `getAcceptability`, and the convergence queries.
- New pure module `commitment.ts`: `Stance = { accepted: Set<Id>, rejected:
  Set<Id> }`; `getClosure(g, stance)`, `auditStance(g, stance)` returning
  C1–C4 findings with minimal conflict sets. No React/DOM/network, tested
  like `graph.ts`.
- New edges/types per `TAXONOMY.md §3`; `NODE_TYPES`/`EDGE_TYPES` runtime
  lists and `io.ts` validation extended in the same change (one source of
  truth, per `CLAUDE.md`).
- Stances persist per-user (localStorage now; server-side at `ROADMAP.md`
  Phase 1), **never** inside `graph.json`.

Sequencing recommendation: **status system → `contradicts` + generalized
`entails` → commitment closure → audit UI → proof standards/resolution.**
Each step is independently shippable and testable.
