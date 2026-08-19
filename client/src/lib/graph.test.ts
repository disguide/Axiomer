import { describe, expect, it } from "vitest";
import type { Graph } from "./types";
import { seedGraph } from "./seed";
import * as G from "./graph";

// A tiny helper to find the id of the node added last.
const lastId = (g: Graph) => g.nodes[g.nodes.length - 1].id;

describe("traversal respects semantic edge direction", () => {
  it("returns exactly the four seeded root claims", () => {
    const roots = G.getRootQuestions(seedGraph).map((n) => n.id).sort();
    expect(roots).toEqual(["sky-q1", "sky-q2", "trolley-q1", "trolley-q2"]);
  });

  it("nests a value (grounds, parent→child) under its argument", () => {
    const children = G.getChildren(seedGraph, "trolley-a2").map((n) => n.id);
    expect(children).toEqual(["trolley-v1"]);
    expect(G.getParent(seedGraph, "trolley-v1")?.id).toBe("trolley-a2");
  });

  it("nests an annotated claim under trolley-q2", () => {
    const children = G.getChildren(seedGraph, "trolley-q2").map((n) => n.id);
    expect(children).toContain("trolley-a1");
    expect(G.getParents(seedGraph, "trolley-a1").map((n) => n.id)).toContain("trolley-q2");
  });

  it("nests child→parent edges (supports) correctly", () => {
    const children = G.getChildren(seedGraph, "trolley-q1").map((n) => n.id);
    expect(children.sort()).toEqual(["trolley-p1", "trolley-p3"]);
  });
});

describe("grounding", () => {
  it("computes grounding status for seed claims", () => {
    expect(G.isFullyGrounded(seedGraph, "sky-p2")).toBe(true);
    expect(G.isFullyGrounded(seedGraph, "trolley-q1")).toBe(false);
  });

  it("treats a claim grounding directly in a terminal as grounded", () => {
    // sky-p2 grounds sky-el1 with no intermediate argument.
    expect(G.isFullyGrounded(seedGraph, "sky-p2")).toBe(true);
  });

  it("marks a fresh claim OPEN until grounded", () => {
    let g = G.addRootQuestion(seedGraph, "New Q");
    const qid = lastId(g);
    expect(G.isFullyGrounded(g, qid)).toBe(false); // no claims
    g = G.addNode(g, "claim", "An answer", qid);
    expect(G.isFullyGrounded(g, qid)).toBe(false); // claim w/o argument
  });

  it("becomes grounded once an argument grounds in a value", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "support", "A", qid);
    const aid = lastId(g);
    expect(G.isFullyGrounded(g, qid)).toBe(false);
    g = G.addNode(g, "value", "Some value", aid);
    expect(G.isFullyGrounded(g, qid)).toBe(true);
  });

  it("does not loop forever on a cyclic annotates chain", () => {
    // Hand-build a cycle: argument annotates a claim that (transitively) annotates
    // back. The visiting guard must terminate with `false`, not hang.
    const g: Graph = {
      nodes: [
        { id: "q", type: "claim", content: "q" },
        { id: "p", type: "claim", content: "p" },
        { id: "a", type: "support", content: "a" },
      ],
      edges: [
        { id: "e1", from: "p", to: "q", edgeType: "supports" },
        { id: "e2", from: "a", to: "p", edgeType: "supports" },
        { id: "e3", from: "a", to: "q", edgeType: "annotates" }, // a annotates its own q
      ],
    };
    expect(G.isFullyGrounded(g, "q")).toBe(false);
  });
});

describe("edge construction", () => {
  it("orients grounds as argument→value (parent→child)", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "claim", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "value", "V", aid);
    const vid = lastId(g);
    const edge = g.edges.find((e) => e.edgeType === "grounds" && e.to === vid);
    expect(edge?.from).toBe(aid);
    expect(edge?.to).toBe(vid);
  });

  it("orients annotates as child→parent (from: child, to: parent)", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "claim", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "note", "Deeper note", aid);
    const childNote = lastId(g);
    const edge = g.edges.find(
      (e) => e.edgeType === "annotates" && e.from === childNote,
    );
    expect(edge?.from).toBe(childNote);
    expect(edge?.to).toBe(aid);
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

  it("replaces a prior grounds edge rather than stacking them", () => {
    // a3 already grounds in v2; re-link to v1 should leave exactly one.
    const g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    const groundsIn = g.edges.filter(
      (e) => e.from === "trolley-a3" && e.edgeType === "grounds",
    );
    expect(groundsIn).toHaveLength(1);
    expect(groundsIn[0].to).toBe("trolley-v1");
  });
});

describe("deletion", () => {
  it("removes a node and all descendants", () => {
    const g = G.deleteNode(seedGraph, "trolley-p1");
    for (const id of ["trolley-p1", "trolley-a1", "trolley-e1", "trolley-c1"]) {
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
    expect(G.getRootFor(seedGraph, "trolley-v1")?.id).toBe("trolley-q2");
    expect(G.getRootFor(seedGraph, "trolley-a2")?.id).toBe("trolley-q2");
    expect(G.getRootFor(seedGraph, "sky-p2")?.id).toBe("sky-q2");
  });

  it("reports a value as convergent once two roots share it", () => {
    // Build a second claim whose argument links to trolley's v1.
    let g = G.addRootQuestion(seedGraph, "Help refugees?");
    const qid = lastId(g);
    g = G.addNode(g, "claim", "Yes", qid);
    const pid = lastId(g);
    g = G.addNode(g, "support", "Reduces suffering", pid);
    const aid = lastId(g);
    g = G.linkToExistingValue(g, aid, "trolley-v1");

    const usage = G.getValueUsage(g).find((u) => u.value.id === "trolley-v1");
    expect(usage?.convergent).toBe(true);
    expect(usage?.roots.map((r) => r.id).sort()).toEqual([qid, "trolley-q2"]);
  });

  it("detects a value clash within a single claim", () => {
    let g = G.addNode(seedGraph, "support", "Arg", "trolley-p3");
    const aid = lastId(g);
    g = G.linkToExistingValue(g, aid, "trolley-v1");
    const clash = G.getValueClashes(g).find(
      (c) => c.question.id === "trolley-q1",
    );
    expect(clash).toBeDefined();
    expect(clash?.values.map((v) => v.id).sort()).toEqual([
      "trolley-v1",
      "trolley-v2",
    ]);
  });

  it("reports no clash for a single-value claim", () => {
    const clash = G.getValueClashes(seedGraph).find(
      (c) => c.question.id === "sky-q2",
    );
    expect(clash).toBeUndefined();
  });
});

describe("per-node grounding (isNodeGrounded)", () => {
  it("flags an argument with no foundation as ungrounded", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "claim", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "support", "A", pid);
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
    expect(G.isNodeGrounded(seedGraph, "trolley-c1")).toBe(true);
  });
});

describe("lineage helpers (map highlight)", () => {
  it("collects all ancestors that flow into a value", () => {
    // Share trolley-v1 across a2 and a3, then check who reaches it.
    const g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    const anc = G.getAncestors(g, "trolley-v1");
    // Both grounding arguments and their upward chains to the root claim.
    for (const id of ["trolley-a2", "trolley-a3", "trolley-p2", "trolley-p3", "trolley-q2", "trolley-q1"]) {
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
  // Build: Q ← P ← A(support). Then conflict A with a conflict, etc.
  const baseChain = () => {
    let g = G.addRootQuestion(seedGraph, "Q?");
    const qid = lastId(g);
    g = G.addNode(g, "claim", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "support", "A", pid);
    const aid = lastId(g);
    return { g, qid, pid, aid };
  };

  it("treats a node with no conflicts as coherent", () => {
    const { g, aid } = baseChain();
    expect(G.getAcceptability(g).get(aid)).toBe("coherent");
    expect(G.getConflicts(g, aid)).toHaveLength(0);
  });

  it("lets a conflict defeat its parent argument", () => {
    let { g, aid } = baseChain();
    g = G.addNode(g, "conflict", "But that's flawed", aid);
    const oid = lastId(g);
    const acc = G.getAcceptability(g);
    expect(acc.get(aid)).toBe("conflicted");
    expect(acc.get(oid)).toBe("coherent");
    expect(G.getConflicts(g, aid).map((n: import("./types").GraphNode) => n.id)).toEqual([oid]);
  });

  it("lets a conflict to the conflict revive the argument", () => {
    let { g, aid } = baseChain();
    g = G.addNode(g, "conflict", "Flawed", aid);
    const oid = lastId(g);
    g = G.addNode(g, "conflict", "Not so", oid);
    const acc = G.getAcceptability(g);
    expect(acc.get(oid)).toBe("conflicted"); // rebutted
    expect(acc.get(aid)).toBe("coherent"); // therefore restored
  });

  it("stays conflicted while any conflict survives", () => {
    let { g, aid } = baseChain();
    g = G.addNode(g, "conflict", "Flawed", aid);
    const oid = lastId(g);
    g = G.addNode(g, "conflict", "Not so", oid); // defeats first conflict
    g = G.addNode(g, "conflict", "Also wrong", aid); // fresh, undefeated
    const acc = G.getAcceptability(g);
    expect(acc.get(aid)).toBe("conflicted");
  });

  it("lets a conflict defeat a claim", () => {
    // Q ← P ← A(support). Now conflict P directly.
    let { g, pid } = baseChain();
    g = G.addNode(g, "conflict", "P is harmful", pid);
    const attackId = lastId(g);

    const acc = G.getAcceptability(g);
    expect(acc.get(attackId)).toBe("coherent");
    expect(acc.get(pid)).toBe("conflicted");
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
    // Type filter: searching for a limit shouldn't match the value.
    expect(
      G.findSimilarTerminals(seedGraph, "minimize suffering", "limit"),
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
    expect(G.getDepth(seedGraph, "trolley-q2")).toBe(0);
  });

  it("summarizes the graph", () => {
    const s = G.getGraphStats(seedGraph);
    expect(s.claims).toBe(9); // 9 claim nodes in seedGraph
    expect(s.premises).toBe(0);
    expect(s.terminals).toBe(3); // v1, v2, el1
    expect(s.groundedClaims).toBe(0); // 0 fully grounded root claims
    expect(s.openClaims).toBe(4); // 4 root claims
    expect(s.clashes).toBe(0);
    expect(s.maxDepth).toBeGreaterThan(0);
  });

  it("lists grounding gaps shallowest-first", () => {
    // Add an ungrounded argument near the top and a deeper one.
    let g = G.addRootQuestion(seedGraph, "Q?");
    const qid = lastId(g);
    g = G.addNode(g, "claim", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "support", "shallow arg", pid);

    const gaps = G.getGroundingGaps(g);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.some((x) => x.node.id === "trolley-a1")).toBe(true);
  });

  it("returns gaps when ungrounded supports exist", () => {
    expect(G.getGroundingGaps(seedGraph).length).toBe(4);
  });
});

describe("premises (reverse / forward-from-a-base authoring)", () => {
  it("treats a premise as a tree root, like a claim", () => {
    const g = G.addRootPremise(seedGraph, "All humans have equal worth");
    const pid = lastId(g);
    const rootIds = G.getRoots(g).map((n) => n.id);
    expect(rootIds).toContain(pid);
    // getRootQuestions stays claim-only.
    expect(G.getRootQuestions(g).map((n) => n.id)).not.toContain(pid);
  });

  it("is not a terminal — it can take children", () => {
    const g = G.addRootPremise(seedGraph, "P");
    expect(G.getNode(g, lastId(g))?.type).toBe("premise");
  });

  it("connects children with a `supports` edge (premise→child)", () => {
    let g = G.addRootPremise(seedGraph, "Equal worth");
    const pid = lastId(g);
    g = G.addNode(g, "claim", "So we must help refugees", pid);
    const conclusionId = lastId(g);
    const edge = g.edges.find((e) => G.edgeEndpoints(e).parent === pid && G.edgeEndpoints(e).child === conclusionId);
    expect(edge?.edgeType).toBe("supports");
    // And the conclusion nests under the premise in the tree.
    expect(G.getChildren(g, pid).map((n) => n.id)).toContain(conclusionId);
    expect(G.getParent(g, conclusionId)?.id).toBe(pid);
  });

  it("lets a premise tree bottom out at a shared value (convergence)", () => {
    // premise → claim → argument → grounds → existing trolley value.
    let g = G.addRootPremise(seedGraph, "Suffering matters");
    const pid = lastId(g);
    g = G.addNode(g, "claim", "Help refugees", pid);
    const posId = lastId(g);
    g = G.addNode(g, "support", "It reduces suffering", posId);
    const argId = lastId(g);
    g = G.linkToExistingValue(g, argId, "trolley-v1");

    const usage = G.getValueUsage(g).find((u) => u.value.id === "trolley-v1");
    expect(usage?.convergent).toBe(true);
    expect(usage?.roots.map((r) => r.id)).toContain(pid);
    // getRootFor resolves a node in the premise tree back to the premise.
    expect(G.getRootFor(g, argId)?.id).toBe(pid);
  });
});

describe("Status Profiles", () => {
  it("getStatusProfile computes correct ranks, stats and archetype", () => {
    const profile = G.getStatusProfile(seedGraph);
    expect(profile.stats.totalTerminals).toBeGreaterThan(0);
    // Values should be sorted by convergenceCount descending
    expect(profile.rankedValues[0].convergenceCount).toBeGreaterThanOrEqual(
      profile.rankedValues[profile.rankedValues.length - 1].convergenceCount
    );
    expect(typeof profile.archetype).toBe("string");
    expect(profile.topValues.length).toBeLessThanOrEqual(5);
  });

  it("getValueChainDetail extracts the correct arguments for a terminal", () => {
    // Find a terminal in the seedGraph (e.g., trolley-v1)
    const detail = G.getValueChainDetail(seedGraph, "trolley-v1");
    expect(detail.terminal.id).toBe("trolley-v1");
    expect(detail.groundingArgs.length).toBeGreaterThan(0);
    expect(detail.groundingArgs[0].depth).toBeGreaterThanOrEqual(0);
    expect(detail.groundingArgs[0].root).toBeDefined();
  });
  
  it("computeArchetype assigns labels based on counts", () => {
    const mockRank = (type: any): G.ValueRank => ({
      terminal: { id: "1", type, content: "", createdAt: "" },
      convergenceCount: 1,
      roots: [],
      groundingArgs: [],
      chainDepths: [1]
    });
    
    expect(G.computeArchetype([mockRank("value")])).toContain("Value-grounded");
    expect(G.computeArchetype([mockRank("limit")])).toContain("Epistemically cautious");
  });
});
