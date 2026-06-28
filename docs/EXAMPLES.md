# Worked examples — the seed graphs

The vault ships with two complete argument graphs. They are the canonical reference for how nodes wire together. Every file referenced here lives in `obsidian-vault/Nodes/`.

## Graph 1 — The Trolley Problem (a value clash + convergence)

A classic dilemma that resolves to a clash between two values, while also demonstrating convergence with a separate premise-built chain.

### Node-by-node

| File | type | frontmatter edges | role |
|------|------|-------------------|------|
| `Should you pull the lever` | question | — | root question |
| `Yes, pull the lever` | position | `answers` → Should you pull the lever | one answer |
| `No, dont pull the lever` | position | `answers` → Should you pull the lever | opposing answer |
| `Saving more lives is better` | argument-support | `argues-for` → Yes, pull the lever; `raises` → Why does saving lives matter | backs "yes", opens a deeper question |
| `Pulling saves 5 lives vs 1` | evidence-empirical | `supports` → Saving more lives is better | evidence for the argument |
| `Why does saving lives matter` | question | — | deeper question raised mid-argument |
| `Because minimizing suffering is the goal` | position | `answers` → Why does saving lives matter | answers the deeper question |
| `Suffering is bad` | argument-support | `argues-for` → Because minimizing suffering is the goal; `grounds-in` → Minimize total suffering | grounds the "yes" chain in a value |
| `Using people as means is wrong` | argument-support | `argues-for` → No, dont pull the lever; `grounds-in` → Never use a person merely as a means | grounds the "no" chain in a *different* value |
| `Minimize total suffering` | value | — | terminal (shared — see convergence) |
| `Never use a person merely as a means` | value | — | terminal (the clash partner) |

### Reading the structure

Top-down, the "yes" branch is:

```
Should you pull the lever            (question)
└─ answers ── Yes, pull the lever    (position)
   └─ argues-for ── Saving more lives is better   (argument-support)
      ├─ supports ── Pulling saves 5 lives vs 1    (evidence)
      └─ raises ── Why does saving lives matter    (question)
         └─ answers ── Because minimizing suffering is the goal  (position)
            └─ argues-for ── Suffering is bad        (argument-support)
               └─ grounds-in ── Minimize total suffering   (VALUE)
```

The "no" branch is shorter:

```
Should you pull the lever
└─ answers ── No, dont pull the lever
   └─ argues-for ── Using people as means is wrong
      └─ grounds-in ── Never use a person merely as a means   (VALUE)
```

### What it demonstrates

- **Value clash:** the one question `Should you pull the lever` reaches **two different terminals** (`Minimize total suffering` vs `Never use a person merely as a means`). That divergence is the actual disagreement.
- **A raised sub-question:** "Saving more lives is better" doesn't ground directly — it `raises` "Why does saving lives matter", and grounding only completes once that sub-question's chain reaches a value. This is how depth accumulates.
- **Evidence attaches to arguments** via `supports`, without being part of the grounding chain itself.

## Graph 2 — Why is the sky blue? (fully grounded to an epistemic limit)

A factual question that grounds cleanly — every chain reaches the same epistemic limit, no clash.

### Node-by-node

| File | type | frontmatter edges | role |
|------|------|-------------------|------|
| `Why is the sky blue` | question | — | root question |
| `Because of Rayleigh scattering` | position | `answers` → Why is the sky blue; `grounds-in` → Best current scientific theory | answer that grounds *directly* |
| `Shorter wavelengths scatter more` | evidence-empirical | `supports` → Because of Rayleigh scattering | evidence |
| `Scattering scales with wavelength to the minus four` | argument-support | `argues-for` → Because of Rayleigh scattering; `raises` → Why does scattering scale that way | argument that opens a deeper question |
| `Why does scattering scale that way` | question | — | deeper physics question |
| `Derived from Maxwells equations` | position | `answers` → Why does scattering scale that way; `grounds-in` → Best current scientific theory | grounds in the same epistemic limit |
| `Best current scientific theory` | epistemic-limit | — | terminal (the edge of current knowledge) |

### Reading the structure

```
Why is the sky blue                          (question)
└─ answers ── Because of Rayleigh scattering (position)
   ├─ grounds-in ── Best current scientific theory   (EPISTEMIC LIMIT)
   ├─ supports ── Shorter wavelengths scatter more   (evidence)
   └─ argues-for ── Scattering scales with wavelength to the minus four  (argument)
      └─ raises ── Why does scattering scale that way  (question)
         └─ answers ── Derived from Maxwells equations (position)
            └─ grounds-in ── Best current scientific theory  (EPISTEMIC LIMIT)
```

### What it demonstrates

- **Direct position grounding:** "Because of Rayleigh scattering" carries `grounds-in` itself rather than routing through an argument. Both forms are valid (see [SEMANTICS.md](SEMANTICS.md)).
- **Fully grounded:** every path bottoms out at a terminal, so the question is fully grounded — no open chains, no clash (both chains reach the *same* terminal).
- **Epistemic limit as foundation:** not every chain ends at a moral value; "this is the current scientific consensus and we can't go deeper here" is a legitimate bedrock.

## The premise chain — convergence across graphs

Separate from either root question, a premise demonstrates reverse authoring and cross-topic convergence.

| File | type | frontmatter edges | role |
|------|------|-------------------|------|
| `Suffering matters` | premise | `entails` → Helping refugees is right | reverse-authoring root |
| `Helping refugees is right` | position | — | derived (entailed) position |
| `Helping refugees reduces suffering` | argument-support | `argues-for` → Helping refugees is right; `grounds-in` → Minimize total suffering | grounds in the **same** value as the Trolley "yes" chain |

```
Suffering matters                       (premise)
└─ entails ── Helping refugees is right (position)
   └─ argues-for ── Helping refugees reduces suffering  (argument)
      └─ grounds-in ── Minimize total suffering   (VALUE, shared with Trolley)
```

### What it demonstrates

- **Premise / reverse authoring:** you start from "Suffering matters" as a base and build *down* with `entails`, instead of starting from an open question.
- **Convergence:** `Minimize total suffering` now has **two** inbound `grounds-in` edges — one from the Trolley "yes" chain, one from this refugees chain. A question about trolleys and a stance on refugees rest on the same foundation. That shared node is convergence; it only appears because both chains *reused the same value node* instead of duplicating it.

## Full node inventory

The seed is exactly these 20 nodes:

**Trolley (10):** Should you pull the lever · Yes, pull the lever · No, dont pull the lever · Saving more lives is better · Pulling saves 5 lives vs 1 · Why does saving lives matter · Because minimizing suffering is the goal · Suffering is bad · Using people as means is wrong · Never use a person merely as a means

**Sky blue (7):** Why is the sky blue · Because of Rayleigh scattering · Shorter wavelengths scatter more · Scattering scales with wavelength to the minus four · Why does scattering scale that way · Derived from Maxwells equations · Best current scientific theory

**Premise chain (3):** Suffering matters · Helping refugees is right · Helping refugees reduces suffering

Shared terminal `Minimize total suffering` is counted once (in the Trolley set) but reached by both the Trolley and premise chains — that double-counting in your head is the convergence.
