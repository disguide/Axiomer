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
