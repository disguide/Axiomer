import { describe, expect, it } from "vitest";
import type { Graph } from "./types";
import { seedGraph } from "./seed";
import * as G from "./graph";

// A tiny helper to find the id of the node added last.
const lastId = (g: Graph) => g.nodes[g.nodes.length - 1].id;

describe("traversal respects semantic edge direction", () => {
  it("returns exactly the two seeded root questions", () => {
    const roots = G.getRootQuestions(seedGraph).map((n) => n.id).sort();
    expect(roots).toEqual(["sky-q1", "trolley-q1"]);
  });

  it("nests a value (grounds-in, parent→child) under its argument", () => {
    const children = G.getChildren(seedGraph, "trolley-a2").map((n) => n.id);
    expect(children).toEqual(["trolley-v1"]);
    expect(G.getParent(seedGraph, "trolley-v1")?.id).toBe("trolley-a2");
  });

  it("nests a raised question (raises, parent→child) under its argument", () => {
    const children = G.getChildren(seedGraph, "trolley-a1").map((n) => n.id);
    expect(children).toContain("trolley-q2");
    expect(G.getParent(seedGraph, "trolley-q2")?.id).toBe("trolley-a1");
  });

  it("nests child→parent edges (answers/supports) correctly", () => {
    const children = G.getChildren(seedGraph, "trolley-q1").map((n) => n.id);
    expect(children.sort()).toEqual(["trolley-p1", "trolley-p3"]);
  });
});

describe("grounding", () => {
  it("computes both seed questions as fully grounded", () => {
    expect(G.isFullyGrounded(seedGraph, "trolley-q1")).toBe(true);
    expect(G.isFullyGrounded(seedGraph, "sky-q1")).toBe(true);
  });

  it("treats a position grounding directly in a terminal as grounded", () => {
    // sky-p2 grounds-in sky-el1 with no intermediate argument.
    expect(G.isFullyGrounded(seedGraph, "sky-q2")).toBe(true);
  });

  it("marks a fresh question OPEN until grounded", () => {
    let g = G.addRootQuestion(seedGraph, "New Q");
    const qid = lastId(g);
    expect(G.isFullyGrounded(g, qid)).toBe(false); // no positions
    g = G.addNode(g, "position", "An answer", qid);
    expect(G.isFullyGrounded(g, qid)).toBe(false); // position w/o argument
  });

  it("becomes grounded once an argument grounds in a value", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    expect(G.isFullyGrounded(g, qid)).toBe(false);
    g = G.addNode(g, "value", "Some value", aid);
    expect(G.isFullyGrounded(g, qid)).toBe(true);
  });

  it("does not loop forever on a cyclic raises chain", () => {
    // Hand-build a cycle: argument raises a question that (transitively) raises
    // back. The visiting guard must terminate with `false`, not hang.
    const g: Graph = {
      nodes: [
        { id: "q", type: "question", content: "q" },
        { id: "p", type: "position", content: "p" },
        { id: "a", type: "argument-support", content: "a" },
      ],
      edges: [
        { id: "e1", from: "p", to: "q", edgeType: "answers" },
        { id: "e2", from: "a", to: "p", edgeType: "argues-for" },
        { id: "e3", from: "a", to: "q", edgeType: "raises" }, // a raises its own q
      ],
    };
    expect(G.isFullyGrounded(g, "q")).toBe(false);
  });
});

describe("edge construction", () => {
  it("orients grounds-in as argument→value (parent→child)", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "value", "V", aid);
    const vid = lastId(g);
    const edge = g.edges.find((e) => e.edgeType === "grounds-in" && e.to === vid);
    expect(edge?.from).toBe(aid);
    expect(edge?.to).toBe(vid);
  });

  it("orients raises as argument→question (parent→child)", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "question", "Deeper?", aid);
    const childQ = lastId(g);
    const edge = g.edges.find(
      (e) => e.edgeType === "raises" && e.to === childQ,
    );
    expect(edge?.from).toBe(aid);
    expect(edge?.to).toBe(childQ);
  });
});

describe("value reuse (convergence)", () => {
  it("links to an existing value without creating a duplicate node", () => {
    const before = G.getValues(seedGraph).length;
    const g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    expect(G.getValues(g).length).toBe(before); // no new value node
    expect(G.getChildren(g, "trolley-a3").map((n) => n.id)).toContain(
      "trolley-v1",
    );
  });

  it("replaces a prior grounds-in edge rather than stacking them", () => {
    // a3 already grounds in v2; re-link to v1 should leave exactly one.
    const g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    const groundsIn = g.edges.filter(
      (e) => e.from === "trolley-a3" && e.edgeType === "grounds-in",
    );
    expect(groundsIn).toHaveLength(1);
    expect(groundsIn[0].to).toBe("trolley-v1");
  });
});

describe("deletion", () => {
  it("removes a node and all descendants", () => {
    const g = G.deleteNode(seedGraph, "trolley-p1");
    for (const id of ["trolley-p1", "trolley-a1", "trolley-e1", "trolley-q2"]) {
      expect(G.getNode(g, id)).toBeUndefined();
    }
  });

  it("deletes a non-shared value along with its subtree", () => {
    const g = G.deleteNode(seedGraph, "trolley-p2");
    expect(G.getNode(g, "trolley-v1")).toBeUndefined();
  });

  it("spares a value still grounded by a surviving argument", () => {
    // Make v1 shared by a3, then delete p2 (which owns a2→v1).
    let g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    g = G.deleteNode(g, "trolley-p2");
    expect(G.getNode(g, "trolley-v1")).toBeDefined();
    expect(G.getNode(g, "trolley-a2")).toBeUndefined();
  });

  it("counts only nodes that will actually be removed", () => {
    let g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    // p2 subtree is p2, a2, (v1 spared) → 2 removed besides... count excludes self.
    expect(G.countDescendants(g, "trolley-p2")).toBe(1); // just a2
  });
});

describe("convergence queries", () => {
  it("resolves the root a deep node belongs to", () => {
    // A node with a single parent chain resolves to its top-level root,
    // even a (non-shared) terminal value.
    expect(G.getRootFor(seedGraph, "trolley-v1")?.id).toBe("trolley-q1");
    expect(G.getRootFor(seedGraph, "trolley-a2")?.id).toBe("trolley-q1");
    expect(G.getRootFor(seedGraph, "sky-p2")?.id).toBe("sky-q1");
  });

  it("reports a value as convergent once two roots share it", () => {
    // Build a second question whose argument links to trolley's v1.
    let g = G.addRootQuestion(seedGraph, "Help refugees?");
    const qid = lastId(g);
    g = G.addNode(g, "position", "Yes", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "Reduces suffering", pid);
    const aid = lastId(g);
    g = G.linkToExistingValue(g, aid, "trolley-v1");

    const usage = G.getValueUsage(g).find((u) => u.value.id === "trolley-v1");
    expect(usage?.convergent).toBe(true);
    expect(usage?.roots.map((r) => r.id).sort()).toEqual([qid, "trolley-q1"]);
  });

  it("detects a value clash within a single question", () => {
    // trolley-q1 grounds in two different values (v1 via p1 chain, v2 via p3).
    const clash = G.getValueClashes(seedGraph).find(
      (c) => c.question.id === "trolley-q1",
    );
    expect(clash).toBeDefined();
    expect(clash?.values.map((v) => v.id).sort()).toEqual([
      "trolley-v1",
      "trolley-v2",
    ]);
  });

  it("reports no clash for a single-value question", () => {
    const clash = G.getValueClashes(seedGraph).find(
      (c) => c.question.id === "sky-q1",
    );
    expect(clash).toBeUndefined();
  });
});

describe("per-node grounding (isNodeGrounded)", () => {
  it("flags an argument with no foundation as ungrounded", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    expect(G.isNodeGrounded(g, aid)).toBe(false);
    expect(G.isNodeGrounded(g, pid)).toBe(false);
    g = G.addNode(g, "value", "V", aid);
    expect(G.isNodeGrounded(g, aid)).toBe(true);
    expect(G.isNodeGrounded(g, pid)).toBe(true);
  });

  it("treats seeded grounded arguments and terminals as grounded", () => {
    expect(G.isNodeGrounded(seedGraph, "trolley-a3")).toBe(true);
    expect(G.isNodeGrounded(seedGraph, "trolley-v2")).toBe(true);
    // Non-participating types are inherently "grounded".
    expect(G.isNodeGrounded(seedGraph, "trolley-e1")).toBe(true);
  });
});

describe("lineage helpers (map highlight)", () => {
  it("collects all ancestors that flow into a value", () => {
    // Share trolley-v1 across a2 and a3, then check who reaches it.
    const g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    const anc = G.getAncestors(g, "trolley-v1");
    // Both grounding arguments and their upward chains to the root question.
    for (const id of ["trolley-a2", "trolley-a3", "trolley-p2", "trolley-p3", "trolley-q1"]) {
      expect(anc.has(id)).toBe(true);
    }
    expect(anc.has("trolley-v1")).toBe(false); // excludes the node itself
  });

  it("collects descendants including the node itself", () => {
    const desc = G.getDescendantIds(seedGraph, "trolley-q2");
    expect(desc.has("trolley-q2")).toBe(true);
    expect(desc.has("trolley-p2")).toBe(true);
    expect(desc.has("trolley-v1")).toBe(true);
  });

  it("getParents returns every grounding parent of a shared value", () => {
    const g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    const parents = G.getParents(g, "trolley-v1").map((n) => n.id).sort();
    expect(parents).toEqual(["trolley-a2", "trolley-a3"]);
  });
});

describe("acceptability (Dung-style defeat analysis)", () => {
  // Build: Q ← P ← A(support). Then attack A with an objection, etc.
  const baseChain = () => {
    let g = G.addRootQuestion(seedGraph, "Q?");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    return { g, qid, pid, aid };
  };

  it("treats a node with no attackers as defended", () => {
    const { g, aid } = baseChain();
    expect(G.getAcceptability(g).get(aid)).toBe("defended");
    expect(G.getAttackers(g, aid)).toHaveLength(0);
  });

  it("lets an objection defeat its parent argument", () => {
    let { g, aid } = baseChain();
    g = G.addNode(g, "objection", "But that's flawed", aid);
    const oid = lastId(g);
    const acc = G.getAcceptability(g);
    expect(acc.get(aid)).toBe("defeated");
    expect(acc.get(oid)).toBe("defended");
    expect(G.getAttackers(g, aid).map((n) => n.id)).toEqual([oid]);
  });

  it("lets a rebuttal to the objection revive the argument", () => {
    let { g, aid } = baseChain();
    g = G.addNode(g, "objection", "Flawed", aid);
    const oid = lastId(g);
    g = G.addNode(g, "rebuttal", "Not so", oid);
    const acc = G.getAcceptability(g);
    expect(acc.get(oid)).toBe("defeated"); // rebutted
    expect(acc.get(aid)).toBe("defended"); // therefore restored
  });

  it("stays defeated while any attacker survives", () => {
    let { g, aid } = baseChain();
    g = G.addNode(g, "objection", "Flawed", aid);
    const oid = lastId(g);
    g = G.addNode(g, "rebuttal", "Not so", oid); // defeats first objection
    g = G.addNode(g, "objection", "Also wrong", aid); // fresh, undefeated
    expect(G.getAcceptability(g).get(aid)).toBe("defeated");
  });

  it("lets an argument-attack defeat a position", () => {
    let { g, pid } = baseChain();
    g = G.addNode(g, "argument-attack", "P is harmful", pid);
    const attackId = lastId(g);
    const acc = G.getAcceptability(g);
    expect(acc.get(pid)).toBe("defeated");
    expect(acc.get(attackId)).toBe("defended");
  });
});

describe("value de-duplication (similarity)", () => {
  it("scores identical (normalized) text as 1", () => {
    expect(G.similarity("Minimize suffering", "minimize  suffering!")).toBe(1);
  });

  it("scores unrelated text low and overlapping text higher", () => {
    expect(G.similarity("Maximize freedom", "Minimize suffering")).toBeLessThan(
      0.3,
    );
    expect(
      G.similarity("Minimize total suffering", "Minimize suffering"),
    ).toBeGreaterThanOrEqual(0.5);
  });

  it("finds similar existing terminals of the same type, best first", () => {
    // Seed has value 'Minimize total suffering'.
    const matches = G.findSimilarTerminals(
      seedGraph,
      "minimize suffering",
      "value",
    );
    expect(matches[0]?.node.id).toBe("trolley-v1");
    // Type filter: searching for a principle shouldn't match the value.
    expect(
      G.findSimilarTerminals(seedGraph, "minimize suffering", "principle"),
    ).toHaveLength(0);
  });

  it("returns nothing for empty or dissimilar input", () => {
    expect(G.findSimilarTerminals(seedGraph, "", "value")).toHaveLength(0);
    expect(
      G.findSimilarTerminals(seedGraph, "quantum chromodynamics", "value"),
    ).toHaveLength(0);
  });
});

describe("depth metrics", () => {
  it("reports depth from root", () => {
    expect(G.getDepth(seedGraph, "trolley-q1")).toBe(0);
    expect(G.getDepth(seedGraph, "trolley-p1")).toBe(1);
    expect(G.getDepth(seedGraph, "trolley-a1")).toBe(2);
    expect(G.getDepth(seedGraph, "trolley-q2")).toBe(3);
  });

  it("summarizes the graph", () => {
    const s = G.getGraphStats(seedGraph);
    expect(s.questions).toBe(4); // 2 roots + 2 child questions
    expect(s.premises).toBe(0);
    expect(s.terminals).toBe(3); // v1, v2, el1
    expect(s.groundedQuestions).toBe(2); // both roots
    expect(s.openQuestions).toBe(0);
    expect(s.clashes).toBe(1); // trolley
    expect(s.maxDepth).toBeGreaterThan(0);
  });

  it("lists grounding gaps shallowest-first", () => {
    // Add an ungrounded argument near the top and a deeper one.
    let g = G.addRootQuestion(seedGraph, "Q?");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "shallow arg", pid);
    const shallow = lastId(g);

    const gaps = G.getGroundingGaps(g);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0].node.id).toBe(shallow); // depth 2, the weakest link
    expect(gaps[0].root?.id).toBe(qid);
    // Seed arguments are all grounded, so they don't appear.
    expect(gaps.some((x) => x.node.id === "trolley-a2")).toBe(false);
  });

  it("returns no gaps when everything is grounded", () => {
    expect(G.getGroundingGaps(seedGraph)).toHaveLength(0);
  });
});

describe("premises (reverse / forward-from-a-base authoring)", () => {
  it("treats a premise as a tree root, like a question", () => {
    const g = G.addRootPremise(seedGraph, "All humans have equal worth");
    const pid = lastId(g);
    const rootIds = G.getRoots(g).map((n) => n.id);
    expect(rootIds).toContain(pid);
    // getRootQuestions stays question-only.
    expect(G.getRootQuestions(g).map((n) => n.id)).not.toContain(pid);
  });

  it("is not a terminal — it can take children", () => {
    const g = G.addRootPremise(seedGraph, "P");
    expect(G.getNode(g, lastId(g))?.type).toBe("premise");
  });

  it("connects children with an `entails` edge (premise→child)", () => {
    let g = G.addRootPremise(seedGraph, "Equal worth");
    const pid = lastId(g);
    g = G.addNode(g, "position", "So we must help refugees", pid);
    const conclusionId = lastId(g);
    const edge = g.edges.find((e) => e.edgeType === "entails");
    expect(edge?.from).toBe(pid); // premise is the parent (DOWNWARD)
    expect(edge?.to).toBe(conclusionId);
    // And the conclusion nests under the premise in the tree.
    expect(G.getChildren(g, pid).map((n) => n.id)).toContain(conclusionId);
    expect(G.getParent(g, conclusionId)?.id).toBe(pid);
  });

  it("lets a premise tree bottom out at a shared value (convergence)", () => {
    // premise → position → argument → grounds-in → existing trolley value.
    let g = G.addRootPremise(seedGraph, "Suffering matters");
    const pid = lastId(g);
    g = G.addNode(g, "position", "Help refugees", pid);
    const posId = lastId(g);
    g = G.addNode(g, "argument-support", "It reduces suffering", posId);
    const argId = lastId(g);
    g = G.linkToExistingValue(g, argId, "trolley-v1");

    const usage = G.getValueUsage(g).find((u) => u.value.id === "trolley-v1");
    expect(usage?.convergent).toBe(true);
    expect(usage?.roots.map((r) => r.id)).toContain(pid);
    // getRootFor resolves a node in the premise tree back to the premise.
    expect(G.getRootFor(g, argId)?.id).toBe(pid);
  });
});

// ============================ v2 (Taxonomy v2) ==============================

describe("v2 edges & new node types", () => {
  it("attaches a presupposition below its question (presupposes, DOWNWARD)", () => {
    let g = G.addRootQuestion(seedGraph, "Have you stopped beating your wife?");
    const qid = lastId(g);
    g = G.addNode(g, "presupposition", "You beat your wife", qid);
    const presupId = lastId(g);
    const edge = g.edges.find((e) => e.edgeType === "presupposes");
    expect(edge?.from).toBe(qid); // question is the parent
    expect(edge?.to).toBe(presupId);
    expect(G.getParent(g, presupId)?.id).toBe(qid);
    expect(G.getPresuppositions(g, qid).map((n) => n.id)).toEqual([presupId]);
  });

  it("generalizes entails beyond premises: position → implication", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "Numbers alone justify killing", qid);
    const pid = lastId(g);
    g = G.addNode(g, "implication", "Then organ harvesting follows", pid);
    const impId = lastId(g);
    const edge = g.edges.find(
      (e) => e.edgeType === "entails" && e.to === impId,
    );
    expect(edge?.from).toBe(pid); // claim is the parent (DOWNWARD)
    expect(G.getParent(g, impId)?.id).toBe(pid);
  });

  it("keeps lateral edges (contradicts) OUT of the tree structure", () => {
    const g = G.addContradiction(seedGraph, "trolley-v1", "trolley-v2");
    // Neither value becomes the other's child, and deletion doesn't cascade.
    expect(G.getParent(g, "trolley-v2")?.id).not.toBe("trolley-v1");
    expect(
      G.getChildren(g, "trolley-v1").map((n) => n.id),
    ).not.toContain("trolley-v2");
    expect(G.getContradictions(g, "trolley-v1").map((n) => n.id)).toEqual([
      "trolley-v2",
    ]);
    // Idempotent, either direction.
    const g2 = G.addContradiction(g, "trolley-v2", "trolley-v1");
    expect(
      g2.edges.filter((e) => e.edgeType === "contradicts"),
    ).toHaveLength(1);
  });

  it("counter-examples attack; concessions and examples do not", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "All lying is wrong", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "Lying erodes trust", pid);
    const aid = lastId(g);
    g = G.addNode(g, "counter-example", "Lying to the murderer at the door", aid);
    const ceId = lastId(g);
    g = G.addNode(g, "concession", "Granted, trust matters", aid);
    g = G.addNode(g, "example", "Perjury", aid);
    const attackers = G.getAttackers(g, aid).map((n) => n.id);
    expect(attackers).toEqual([ceId]);
    expect(G.getAcceptability(g).get(aid)).toBe("defeated");
  });
});

describe("undercutting (Pollock via warrants)", () => {
  it("an objection undercutting the warrant defeats the licensed argument", () => {
    let g = G.addRootQuestion(seedGraph, "Is the object red?");
    const qid = lastId(g);
    g = G.addNode(g, "position", "It is red", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "It looks red", pid);
    const aid = lastId(g);
    g = G.addNode(g, "warrant", "Looking red generally means being red", aid);
    const wid = lastId(g);
    // Undercut: the light is red — severs the inference, says nothing about
    // the conclusion.
    g = G.addNode(g, "objection", "The illumination is red", wid, {
      edgeType: "undercuts",
    });
    const oid = lastId(g);
    const acc = G.getAcceptability(g);
    expect(acc.get(wid)).toBe("defeated"); // warrant loses
    expect(acc.get(aid)).toBe("defeated"); // and takes the argument with it
    // A rebuttal to the undercutter restores both.
    g = G.addNode(g, "rebuttal", "We checked: the light is white", oid);
    const acc2 = G.getAcceptability(g);
    expect(acc2.get(wid)).toBe("defended");
    expect(acc2.get(aid)).toBe("defended");
  });

  it("supports a direct undercut on the argument itself", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "E, therefore P", pid);
    const aid = lastId(g);
    g = G.addNode(g, "objection", "E does not establish P here", aid, {
      edgeType: "undercuts",
    });
    expect(G.getAcceptability(g).get(aid)).toBe("defeated");
  });
});

describe("status lifecycle (inertness has consequences)", () => {
  it("retracting an objection revives its target", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "objection", "Flawed", aid);
    const oid = lastId(g);
    expect(G.getAcceptability(g).get(aid)).toBe("defeated");
    g = G.setNodeStatus(g, oid, "retracted", { reason: "author withdrew" });
    expect(G.getAcceptability(g).get(aid)).toBe("defended");
    expect(G.getAttackers(g, aid)).toHaveLength(0);
    // The ghost still renders in the tree…
    expect(G.getChildren(g, aid).map((n) => n.id)).toContain(oid);
    // …but gets no computed label.
    expect(G.getAcceptability(g).get(oid)).toBeUndefined();
  });

  it("retracting the grounding argument honestly reopens the question", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "value", "V", aid);
    expect(G.isFullyGrounded(g, qid)).toBe(true);
    g = G.setNodeStatus(g, aid, "retracted");
    expect(G.isFullyGrounded(g, qid)).toBe(false);
  });

  it("protects a shared terminal from retraction but allows superseding", () => {
    // trolley-v1 is actively grounding trolley-a2.
    expect(G.canSetStatus(seedGraph, "trolley-v1", "retracted").ok).toBe(false);
    expect(
      G.setNodeStatus(seedGraph, "trolley-v1", "retracted"),
    ).toBe(seedGraph); // refused: unchanged graph
    let g = G.addRootQuestion(seedGraph, "tmp");
    g = G.addNode(g, "value", "Minimize net suffering", "trolley-a2");
    const successor = lastId(g);
    g = G.supersedeNode(g, "trolley-v1", successor, { reason: "clearer" });
    expect(G.getNode(g, "trolley-v1")?.status).toBe("superseded");
    expect(
      g.edges.some(
        (e) =>
          e.edgeType === "supersedes" &&
          e.from === successor &&
          e.to === "trolley-v1",
      ),
    ).toBe(true);
  });

  it("reactivation clears status and restores force", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.setNodeStatus(g, pid, "invalid", { reason: "word salad" });
    expect(G.getNode(g, pid)?.statusMeta?.reason).toBe("word salad");
    g = G.setNodeStatus(g, pid, "active");
    expect(G.getNode(g, pid)?.status).toBeUndefined();
    expect(G.getNode(g, pid)?.statusMeta).toBeUndefined();
  });

  it("flags active children of an inert parent for review", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.setNodeStatus(g, pid, "retracted");
    expect(G.getInertOrphans(g).has(aid)).toBe(true);
    expect(G.getInertOrphans(g).has(pid)).toBe(false); // inert itself ≠ orphan
  });

  it("excludes inert terminals from linking targets and dedup", () => {
    let g = G.addRootQuestion(seedGraph, "Q2");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "value", "Radical honesty", aid);
    const vid = lastId(g);
    expect(G.getTerminals(g).map((n) => n.id)).toContain(vid);
    g = G.setNodeStatus(g, aid, "retracted"); // frees the value of dependents
    g = G.setNodeStatus(g, vid, "retracted");
    expect(G.getTerminals(g).map((n) => n.id)).not.toContain(vid);
    expect(
      G.findSimilarTerminals(g, "radical honesty", "value"),
    ).toHaveLength(0);
  });
});

describe("freeform Canvas authoring", () => {
  it("adds a floating unlabeled box with a position and no edge", () => {
    const { graph: g, node } = G.addFloatingNode(seedGraph, "raw idea", 120, 45);
    expect(node.type).toBe("unlabeled");
    expect(node.x).toBe(120);
    expect(node.y).toBe(45);
    expect(g.nodes).toHaveLength(seedGraph.nodes.length + 1);
    expect(g.edges).toHaveLength(seedGraph.edges.length); // no connection yet
    // Floating boxes aren't roots (only questions/premises are) and don't
    // pollute the Trees gallery.
    expect(G.getRoots(g).map((n) => n.id)).not.toContain(node.id);
  });

  it("moves a box and connects two boxes with a loose link", () => {
    let { graph: g, node: a } = G.addFloatingNode(seedGraph, "A", 0, 0);
    const b = G.addFloatingNode(g, "B", 200, 0);
    g = b.graph;
    g = G.setNodePosition(g, a.id, 50, 60);
    expect(G.getNode(g, a.id)?.x).toBe(50);
    g = G.connectNodes(g, a.id, b.node.id);
    const edge = g.edges.find((e) => e.from === a.id && e.to === b.node.id);
    expect(edge?.edgeType).toBe("connects-to");
    // Idempotent; no self-loops.
    expect(G.connectNodes(g, a.id, b.node.id).edges).toHaveLength(g.edges.length);
    expect(G.connectNodes(g, a.id, a.id)).toBe(g);
  });

  it("deletes a single edge without touching nodes", () => {
    let { graph: g, node: a } = G.addFloatingNode(seedGraph, "A", 0, 0);
    const b = G.addFloatingNode(g, "B", 1, 1);
    g = b.graph;
    g = G.connectNodes(g, a.id, b.node.id);
    const edgeId = g.edges[g.edges.length - 1].id;
    g = G.deleteEdge(g, edgeId);
    expect(g.edges.find((e) => e.id === edgeId)).toBeUndefined();
    expect(G.getNode(g, a.id)).toBeDefined();
    expect(G.getNode(g, b.node.id)).toBeDefined();
  });
});

describe("getSubtreeSizes (scale helper)", () => {
  it("counts descendants for every node in one pass", () => {
    const sizes = G.getSubtreeSizes(seedGraph);
    // Leaves have zero descendants.
    expect(sizes.get("trolley-v1")).toBe(0);
    expect(sizes.get("trolley-e1")).toBe(0);
    // A root counts its whole subtree.
    expect(sizes.get("trolley-q1")).toBe(
      G.getDescendantIds(seedGraph, "trolley-q1").size - 1,
    );
    // Every node is present.
    expect(sizes.size).toBe(seedGraph.nodes.length);
  });

  it("agrees with getDescendantIds for a mid-tree node", () => {
    const sizes = G.getSubtreeSizes(seedGraph);
    for (const id of ["trolley-p1", "trolley-a1", "trolley-q2"]) {
      expect(sizes.get(id)).toBe(G.getDescendantIds(seedGraph, id).size - 1);
    }
  });
});

describe("write-first: unlabeled notes and relabeling", () => {
  it("attaches an unlabeled note with a loose connects-to edge", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "unlabeled", "some raw thought", qid);
    const noteId = lastId(g);
    const edge = g.edges.find((e) => e.from === noteId || e.to === noteId);
    expect(edge?.edgeType).toBe("connects-to");
    // It nests under the question in the tree…
    expect(G.getChildren(g, qid).map((n) => n.id)).toContain(noteId);
    // …but participates in nothing: the question stays OPEN, note is "grounded"
    // only in the vacuous non-participating sense.
    expect(G.isFullyGrounded(g, qid)).toBe(false);
    expect(G.isNodeGrounded(g, noteId)).toBe(true);
  });

  it("relabels a note to a position and rewires the edge to `answers`", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "unlabeled", "Yes, we should", qid);
    const noteId = lastId(g);
    g = G.relabelNode(g, noteId, "position");
    expect(G.getNode(g, noteId)?.type).toBe("position");
    const edge = g.edges.find((e) => e.from === noteId && e.to === qid);
    expect(edge?.edgeType).toBe("answers");
    // Still a child of the question, now as a real position.
    expect(G.getChildren(g, qid).map((n) => n.id)).toContain(noteId);
  });

  it("relabels to a terminal and flips the edge to grounds-in (parent→child)", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "unlabeled", "minimize suffering", aid);
    const noteId = lastId(g);
    expect(G.isFullyGrounded(g, qid)).toBe(false);
    g = G.relabelNode(g, noteId, "value");
    const edge = g.edges.find(
      (e) => e.edgeType === "grounds-in" && e.to === noteId,
    );
    expect(edge?.from).toBe(aid); // grounds-in runs argument→value
    // Labeling the note as the bedrock now grounds the whole question.
    expect(G.isFullyGrounded(g, qid)).toBe(true);
  });

  it("refuses to relabel into a terminal that already has children", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "unlabeled", "note with a child", qid);
    const noteId = lastId(g);
    g = G.addNode(g, "unlabeled", "child note", noteId);
    const before = g;
    g = G.relabelNode(g, noteId, "value");
    expect(g).toBe(before); // unchanged
  });

  it("relabels a root note by just changing its type (no parent edge)", () => {
    let g: Graph = {
      nodes: [{ id: "n", type: "unlabeled", content: "a floating idea" }],
      edges: [],
    };
    g = G.relabelNode(g, "n", "premise");
    expect(G.getNode(g, "n")?.type).toBe("premise");
    expect(g.edges).toHaveLength(0);
  });
});

describe("resolution (dissolved / resolved / grounded / open)", () => {
  const chain = () => {
    let g = G.addRootQuestion(seedGraph, "Q?");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "value", "V", aid);
    return { g, qid, pid, aid };
  };

  it("reports OPEN before grounding and RESOLVED after (preponderance)", () => {
    let g = G.addRootQuestion(seedGraph, "Q?");
    const qid = lastId(g);
    expect(G.getResolution(g, qid).state).toBe("open");
    const done = chain();
    const r = G.getResolution(done.g, done.qid);
    expect(r.state).toBe("resolved");
    expect(r.standard).toBe("preponderance");
    expect(r.survivors.map((n) => n.id)).toEqual([done.pid]);
  });

  it("a defeated presupposition DISSOLVES the question", () => {
    let { g, qid } = chain();
    g = G.addNode(g, "presupposition", "There is a fact of the matter", qid);
    const presupId = lastId(g);
    expect(G.getResolution(g, qid).state).toBe("resolved"); // presup unchallenged
    g = G.addNode(g, "objection", "There is no such fact", presupId);
    const r = G.getResolution(g, qid);
    expect(r.state).toBe("dissolved");
    expect(r.dissolvedBy.map((n) => n.id)).toEqual([presupId]);
  });

  it("an editorially refuted presupposition also dissolves it", () => {
    let { g, qid } = chain();
    g = G.addNode(g, "presupposition", "Assumes X", qid);
    const presupId = lastId(g);
    g = G.setNodeStatus(g, presupId, "refuted", { reason: "review verdict" });
    expect(G.getResolution(g, qid).state).toBe("dissolved");
  });

  it("grounded-but-defeated positions leave the question GROUNDED, not resolved", () => {
    let { g, qid, pid } = chain();
    g = G.addNode(g, "argument-attack", "P is harmful", pid);
    const attackId = lastId(g);
    g = G.addNode(g, "value", "V2", attackId); // keep everything grounded
    const r = G.getResolution(g, qid);
    expect(r.state).toBe("grounded"); // grounded, but no position survives
    expect(r.survivors).toHaveLength(0);
  });

  it("climbs the proof-standard ladder", () => {
    let { g, qid, aid } = chain();
    // An objection ANSWERED by a rebuttal: the critical question is closed,
    // so even dialectical validity passes.
    g = G.addNode(g, "objection", "Hmm", aid);
    const oid = lastId(g);
    g = G.addNode(g, "rebuttal", "Answered", oid);
    for (const std of [
      "preponderance",
      "clear-and-convincing",
      "beyond-reasonable-doubt",
      "dialectical-validity",
    ] as const) {
      const r = G.getResolution(G.setProofStandard(g, qid, std), qid);
      expect(r.state).toBe("resolved");
      expect(r.standard).toBe(std);
    }

    // Now wound the constructive skeleton: evidence under the argument takes
    // an unanswered objection. The argument itself still stands (the attack
    // targets the evidence), so BRD passes — but dialectical validity fails.
    g = G.addNode(g, "evidence-empirical", "A study", aid);
    const evId = lastId(g);
    g = G.addNode(g, "objection", "The study is flawed", evId);
    const brd = G.getResolution(
      G.setProofStandard(g, qid, "beyond-reasonable-doubt"),
      qid,
    );
    expect(brd.state).toBe("resolved");
    const dv = G.getResolution(
      G.setProofStandard(g, qid, "dialectical-validity"),
      qid,
    );
    expect(dv.state).toBe("grounded");
  });
});
