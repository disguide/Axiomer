import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import {
  addNode,
  addRootQuestion,
  getAcceptability,
  getConflicts,
  getValueClashes,
} from "@/lib/graph";

describe("Tier 1 - Feature 3: Dung Acceptability & Conflict Evaluation", () => {
  it("evaluates a conflict-free argument graph as coherent", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Is peer review effective?");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Filters obvious methodological flaws", qId);
    const sId = g.nodes[g.nodes.length - 1].id;

    const acc = getAcceptability(g);
    expect(acc.get(qId)).toBe("coherent");
    expect(acc.get(sId)).toBe("coherent");
    expect(getConflicts(g, qId)).toEqual([]);
    expect(getConflicts(g, sId)).toEqual([]);
  });

  it("evaluates a direct undefeated conflict defeating its parent (conflicted state)", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Universal Basic Income should be established");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Eliminates extreme poverty", qId);
    const sId = g.nodes[g.nodes.length - 1].id;

    // Add conflict attacking the support
    g = addNode(g, "conflict", "Creates fiscal insolvency without extreme tax hikes", sId);
    const cId = g.nodes[g.nodes.length - 1].id;

    const acc = getAcceptability(g);
    expect(acc.get(cId)).toBe("coherent"); // attacker is undefeated -> coherent (IN)
    expect(acc.get(sId)).toBe("conflicted"); // target is defeated -> conflicted (OUT)
    expect(getConflicts(g, sId).map((c) => c.id)).toContain(cId);
  });

  it("evaluates reinstatement when a counter-conflict defeats the attacker", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Invest in renewable energy");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Zero greenhouse emissions during operation", qId);
    const sId = g.nodes[g.nodes.length - 1].id;

    // Attacker 1 (conflicts with support)
    g = addNode(g, "conflict", "Intermittent supply threatens grid stability", sId);
    const c1Id = g.nodes[g.nodes.length - 1].id;

    // Defender (counter-conflicts with Attacker 1)
    g = addNode(g, "conflict", "Battery storage and grid interconnections resolve intermittency", c1Id);
    const defId = g.nodes[g.nodes.length - 1].id;

    const acc = getAcceptability(g);
    expect(acc.get(defId)).toBe("coherent"); // undefeated defender is IN
    expect(acc.get(c1Id)).toBe("conflicted"); // attacker is defeated by defender (OUT)
    expect(acc.get(sId)).toBe("coherent"); // original support is reinstated (IN)
  });

  it("evaluates persistent defeat when at least one attacking conflict remains undefeated", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Hypothesis H");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Initial argument", qId);
    const sId = g.nodes[g.nodes.length - 1].id;

    // Conflict 1 (rebutted)
    g = addNode(g, "conflict", "Objection 1", sId);
    const c1Id = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "conflict", "Rebuttal to Objection 1", c1Id);

    // Conflict 2 (undefeated)
    g = addNode(g, "conflict", "Independent Fatal Objection 2", sId);
    const c2Id = g.nodes[g.nodes.length - 1].id;

    const acc = getAcceptability(g);
    expect(acc.get(c2Id)).toBe("coherent");
    expect(acc.get(c1Id)).toBe("conflicted");
    expect(acc.get(sId)).toBe("conflicted"); // still defeated because c2 is undefeated
  });

  it("detects value clashes where a single root claim reaches competing terminal values", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Should autonomous vehicles sacrifice passenger to save 5 pedestrians?");
    const qId = g.nodes[0].id;

    // Branch A: Utilitarian
    g = addNode(g, "support", "Minimize total casualties", qId);
    const sA = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Utilitarian Value: Aggregate life preservation", sA);
    const vA = g.nodes[g.nodes.length - 1].id;

    // Branch B: Deontological
    g = addNode(g, "conflict", "Vehicle manufacturer has fiduciary duty not to harm passenger", qId);
    const sB = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Deontological Value: Non-maleficence & contractual duty", sB);
    const vB = g.nodes[g.nodes.length - 1].id;

    const clashes = getValueClashes(g);
    expect(clashes).toHaveLength(1);
    expect(clashes[0].question.id).toBe(qId);
    const clashValueIds = clashes[0].values.map((v) => v.id).sort();
    expect(clashValueIds).toEqual([vA, vB].sort());
  });

  it("evaluates a multi-tier attack chain across 4 levels of dialectic", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Thesis");
    const qId = g.nodes[0].id;

    // Level 1
    g = addNode(g, "support", "Arg 1", qId);
    const a1 = g.nodes[g.nodes.length - 1].id;

    // Level 2 (Attack on Arg 1)
    g = addNode(g, "conflict", "Attack 1", a1);
    const atk1 = g.nodes[g.nodes.length - 1].id;

    // Level 3 (Attack on Attack 1)
    g = addNode(g, "conflict", "Attack 2", atk1);
    const atk2 = g.nodes[g.nodes.length - 1].id;

    // Level 4 (Attack on Attack 2)
    g = addNode(g, "conflict", "Attack 3", atk2);
    const atk3 = g.nodes[g.nodes.length - 1].id;

    const acc = getAcceptability(g);
    expect(acc.get(atk3)).toBe("coherent"); // undefeated -> IN
    expect(acc.get(atk2)).toBe("conflicted"); // defeated by atk3 -> OUT
    expect(acc.get(atk1)).toBe("coherent"); // reinstated because atk2 is OUT -> IN
    expect(acc.get(a1)).toBe("conflicted"); // defeated because atk1 is IN -> OUT
  });
});
