import { describe, expect, it } from "vitest";
import type { Graph } from "./types";
import { seedGraph } from "./seed";
import * as G from "./graph";
import * as C from "./commitment";

const lastId = (g: Graph) => g.nodes[g.nodes.length - 1].id;

// The worked example from docs/STATUS_AND_COMMITMENT.md §5.5, in miniature:
// two positions grounding in incompatible bedrock.
function trolleyStanceWorld() {
  let g = seedGraph;
  // Second question grounding in a "persons as ends" principle.
  g = G.addRootQuestion(g, "May the state execute?");
  const q2 = lastId(g);
  g = G.addNode(g, "position", "Never", q2);
  const p2 = lastId(g);
  g = G.addNode(g, "argument-support", "Persons may not be used", p2);
  const a2 = lastId(g);
  g = G.addNode(g, "principle", "Never use persons as mere means", a2);
  const ends = lastId(g);
  // The trolley "pull" position grounds (via a2) in minimize-suffering
  // (seed: trolley-p1 → trolley-a1 → trolley-q2 → trolley-p2 → trolley-a2
  //  → trolley-v1). We'll accept the deeper position trolley-p2 directly.
  g = G.addContradiction(g, "trolley-v1", ends);
  return { g, p2, ends };
}

describe("closure propagation", () => {
  it("P2: accepting an argument commits you to its bedrock", () => {
    const { committed } = C.getClosure(seedGraph, {
      accepted: ["trolley-a2"],
      rejected: [],
    });
    expect(committed.has("trolley-v1")).toBe(true);
    expect(committed.get("trolley-v1")?.rule).toBe("grounding");
  });

  it("P1: entailment propagates forward, transitively", () => {
    let g = G.addRootPremise(seedGraph, "Equal worth");
    const premise = lastId(g);
    g = G.addNode(g, "implication", "Borders can't track worth", premise);
    const imp1 = lastId(g);
    g = G.addNode(g, "implication", "So exclusion needs another basis", imp1);
    const imp2 = lastId(g);
    const { committed } = C.getClosure(g, {
      accepted: [premise],
      rejected: [],
    });
    expect(committed.get(imp1)?.rule).toBe("entailment");
    expect(committed.get(imp2)?.rule).toBe("entailment");
    expect(
      C.traceToExplicit(g, committed, imp2).map((n) => n.id),
    ).toEqual([premise, imp1, imp2]);
  });

  it("P3 + P4: presuppositions, warrants, and assumptions come along", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "presupposition", "P assumes X", pid, {
      edgeType: "presupposes",
    });
    const presup = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "warrant", "W", aid);
    const wid = lastId(g);
    g = G.addNode(g, "assumption", "Hidden premise", aid);
    const assumptionId = lastId(g);
    const { committed } = C.getClosure(g, {
      accepted: [pid, aid],
      rejected: [],
    });
    expect(committed.get(presup)?.rule).toBe("presupposition");
    expect(committed.get(wid)?.rule).toBe("dependency");
    expect(committed.get(assumptionId)?.rule).toBe("dependency");
  });

  it("P5: rejecting a consequence commits you against its strict sources", () => {
    let g = G.addRootPremise(seedGraph, "Base");
    const premise = lastId(g);
    g = G.addNode(g, "implication", "Consequence", premise);
    const imp = lastId(g);
    const { committedAgainst } = C.getClosure(g, {
      accepted: [],
      rejected: [imp],
    });
    expect(committedAgainst.get(premise)?.rule).toBe("denial");
  });

  it("does NOT propagate along defeasible support", () => {
    // Accepting a position must not force accepting its arguments.
    const { committed } = C.getClosure(seedGraph, {
      accepted: ["trolley-p2"],
      rejected: [],
    });
    expect(committed.has("trolley-a2")).toBe(false);
  });

  it("dead nodes commit nobody (inert excluded)", () => {
    let g = seedGraph;
    g = G.setNodeStatus(g, "trolley-a2", "retracted");
    const { committed } = C.getClosure(g, {
      accepted: ["trolley-a2"],
      rejected: [],
    });
    expect(committed.size).toBe(0);
  });
});

describe("the audit", () => {
  it("C1/C4: accepted chains colliding at bedrock → value clash", () => {
    const { g, ends } = trolleyStanceWorld();
    const otherArg = g.nodes.find(
      (n) => n.content === "Persons may not be used",
    )!;
    // Accept both grounding arguments: their bedrock (v1 vs `ends`) is
    // declared incompatible — the disagreement is located at the value layer.
    const findings = C.auditStance(g, {
      accepted: ["trolley-a2", otherArg.id],
      rejected: [],
    });
    const clash = findings.find((f) => f.kind === "value-clash");
    expect(clash).toBeDefined();
    if (clash?.kind === "value-clash") {
      expect([clash.a.id, clash.b.id].sort()).toEqual(
        ["trolley-v1", ends].sort(),
      );
      // Provenance traces back to the explicit acceptances.
      expect(clash.aTrace[0]?.id).toBe("trolley-a2");
      expect(clash.bTrace[0]?.id).toBe(otherArg.id);
    }
  });

  it("C2: rejecting what your acceptances entail is a forced choice", () => {
    let g = G.addRootPremise(seedGraph, "Base");
    const premise = lastId(g);
    g = G.addNode(g, "implication", "Bitter consequence", premise);
    const imp = lastId(g);
    const findings = C.auditStance(g, {
      accepted: [premise],
      rejected: [imp],
    });
    const fork = findings.find((f) => f.kind === "forced-choice");
    expect(fork).toBeDefined();
    if (fork?.kind === "forced-choice") {
      expect(fork.node.id).toBe(imp);
      expect(fork.trace.map((n) => n.id)).toEqual([premise, imp]);
    }
  });

  it("C3: committing to a defeated node is an undischarged commitment", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "value", "V", aid); // grounded…
    g = G.addNode(g, "objection", "Devastating", aid); // …but defeated
    const findings = C.auditStance(g, { accepted: [aid], rejected: [] });
    const debt = findings.find(
      (f) => f.kind === "undischarged" && f.node.id === aid,
    );
    expect(debt).toBeDefined();
    if (debt?.kind === "undischarged") expect(debt.problem).toBe("defeated");
  });

  it("C3: committing to an ungrounded position is flagged too", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "Floating claim", qid);
    const pid = lastId(g);
    const findings = C.auditStance(g, { accepted: [pid], rejected: [] });
    const debt = findings.find(
      (f) => f.kind === "undischarged" && f.node.id === pid,
    );
    expect(debt).toBeDefined();
    if (debt?.kind === "undischarged") expect(debt.problem).toBe("ungrounded");
  });

  it("a coherent grounded stance audits clean", () => {
    const findings = C.auditStance(seedGraph, {
      accepted: ["trolley-a2"],
      rejected: [],
    });
    expect(findings).toHaveLength(0);
  });
});

describe("revealed values", () => {
  it("shows which bedrock a stance actually stands on, with the path", () => {
    const revealed = C.getRevealedValues(seedGraph, {
      accepted: ["trolley-a2", "sky-p2"],
      rejected: [],
    });
    const ids = revealed.map((r) => r.value.id).sort();
    expect(ids).toEqual(["sky-el1", "trolley-v1"]);
    const v1 = revealed.find((r) => r.value.id === "trolley-v1");
    expect(v1?.trace.map((n) => n.id)).toEqual(["trolley-a2", "trolley-v1"]);
  });
});

describe("stance helpers", () => {
  it("accept and reject are mutually exclusive and toggle off", () => {
    let s = C.toggleAccept(C.EMPTY_STANCE, "x");
    expect(s.accepted).toEqual(["x"]);
    s = C.toggleReject(s, "x");
    expect(s.accepted).toEqual([]);
    expect(s.rejected).toEqual(["x"]);
    s = C.toggleReject(s, "x");
    expect(s.rejected).toEqual([]);
  });
});
