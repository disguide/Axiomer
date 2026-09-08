import { describe, expect, it } from "vitest";
import type { Graph } from "./types";
import {
  ALLOWED_CHILDREN,
  EDGE_TYPES,
  NODE_TYPES,
  NODE_TYPE_LABELS,
  TERMINAL_TYPES,
  canAddChild,
  getAllowedChildren,
  isTerminalType,
} from "./types";
import { seedGraph } from "./seed";
import * as G from "./graph";

// Helper to find the id of the node added last.
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

describe("ontology decoupling and child rules", () => {
  it("exports pure ALLOWED_CHILDREN and validation helpers without UI dependencies", () => {
    expect(NODE_TYPES).toHaveLength(10);
    expect(EDGE_TYPES).toHaveLength(5);
    expect(TERMINAL_TYPES).toHaveLength(5);
    expect(ALLOWED_CHILDREN.claim).toBeDefined();
    expect(NODE_TYPE_LABELS.claim).toBe("Claim");

    // Terminal types allow 0 children
    for (const term of TERMINAL_TYPES) {
      expect(isTerminalType(term)).toBe(true);
      expect(getAllowedChildren(term)).toEqual([]);
      expect(canAddChild(term, "claim")).toBe(false);
      expect(canAddChild(term, "support")).toBe(false);
      expect(canAddChild(term, "value")).toBe(false);
    }

    // Structural types allow children
    expect(canAddChild("claim", "support")).toBe(true);
    expect(canAddChild("claim", "conflict")).toBe(true);
    expect(canAddChild("claim", "claim")).toBe(true);
    expect(canAddChild("claim", "value")).toBe(true);
    expect(canAddChild("claim", "source")).toBe(true);
    expect(canAddChild("premise", "support")).toBe(true);
    expect(canAddChild("support", "value")).toBe(true);
    expect(canAddChild("conflict", "support")).toBe(true);
    expect(canAddChild("note", "source")).toBe(true);
    expect(canAddChild("note", "claim")).toBe(false);
  });

  it("prevents adding nodes under terminal parents in addNode", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = G.addRootQuestion(g, "Root Q");
    const qId = lastId(g);
    g = G.addNode(g, "value", "Bedrock Value", qId);
    const vId = lastId(g);

    const beforeCount = g.nodes.length;
    g = G.addNode(g, "support", "Illegal child under value", vId);
    expect(g.nodes.length).toBe(beforeCount);
  });

  it("prevents invalid edge additions in addEdge", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = G.addRootQuestion(g, "Q1");
    const qId = lastId(g);
    g = G.addNode(g, "value", "V1", qId);
    const vId = lastId(g);

    // Self-loop prevention
    const g1 = G.addEdge(g, qId, qId);
    expect(g1.edges.length).toBe(g.edges.length);

    // Terminal parent prevention (in addEdge, targetId is parent)
    const g2 = G.addEdge(g, qId, vId);
    expect(g2.edges.length).toBe(g.edges.length);

    // Duplicate edge prevention
    const g3 = G.addEdge(g, vId, qId);
    expect(g3.edges.length).toBe(g.edges.length);
  });
});

describe("edgeTypeFor inference ordering", () => {
  it("resolves specific child types even when parent is a premise", () => {
    expect(G.edgeTypeFor("conflict", "premise")).toBe("conflicts");
    expect(G.edgeTypeFor("source", "premise")).toBe("cites");
    expect(G.edgeTypeFor("value", "premise")).toBe("grounds");
    expect(G.edgeTypeFor("limit", "premise")).toBe("grounds");
    expect(G.edgeTypeFor("bedrock", "premise")).toBe("grounds");
    expect(G.edgeTypeFor("preference", "premise")).toBe("grounds");
    expect(G.edgeTypeFor("note", "premise")).toBe("annotates");
    expect(G.edgeTypeFor("claim", "premise")).toBe("supports");
    expect(G.edgeTypeFor("support", "premise")).toBe("supports");
  });

  it("resolves standard child types across structural parents", () => {
    expect(G.edgeTypeFor("support", "claim")).toBe("supports");
    expect(G.edgeTypeFor("claim", "claim")).toBe("supports");
    expect(G.edgeTypeFor("conflict", "claim")).toBe("conflicts");
    expect(G.edgeTypeFor("source", "claim")).toBe("cites");
    expect(G.edgeTypeFor("value", "claim")).toBe("grounds");
    expect(G.edgeTypeFor("note", "claim")).toBe("annotates");

    expect(G.edgeTypeFor("support", "support")).toBe("supports");
    expect(G.edgeTypeFor("conflict", "support")).toBe("conflicts");
    expect(G.edgeTypeFor("source", "support")).toBe("cites");
    expect(G.edgeTypeFor("bedrock", "support")).toBe("grounds");

    expect(G.edgeTypeFor("source", "note")).toBe("cites");
    expect(G.edgeTypeFor("conflict", "note")).toBe("conflicts");
  });
});

describe("grounding", () => {
  it("computes grounding status for seed claims", () => {
    expect(G.isFullyGrounded(seedGraph, "sky-p2")).toBe(true);
    expect(G.isFullyGrounded(seedGraph, "sky-q2")).toBe(true);
    expect(G.isFullyGrounded(seedGraph, "trolley-q2")).toBe(true);
    expect(G.isFullyGrounded(seedGraph, "sky-q1")).toBe(false);
    expect(G.isFullyGrounded(seedGraph, "trolley-q1")).toBe(false);
  });

  it("treats a claim grounding directly in a terminal as grounded", () => {
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

  it("recursively evaluates multi-hop support chains (Claim → S1 → S2 → S3 → Bedrock)", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = G.addRootQuestion(g, "Should we terraform Mars?");
    const qId = lastId(g);

    g = G.addNode(g, "support", "Hop 1: Long term species survival", qId);
    const s1 = lastId(g);
    expect(G.isFullyGrounded(g, qId)).toBe(false);
    expect(G.isNodeGrounded(g, s1)).toBe(false);

    g = G.addNode(g, "support", "Hop 2: Planetary risk redundancy", s1);
    const s2 = lastId(g);
    expect(G.isFullyGrounded(g, qId)).toBe(false);
    expect(G.isNodeGrounded(g, s2)).toBe(false);

    g = G.addNode(g, "support", "Hop 3: Extinction level asteroid probabilities", s2);
    const s3 = lastId(g);
    expect(G.isFullyGrounded(g, qId)).toBe(false);
    expect(G.isNodeGrounded(g, s3)).toBe(false);

    g = G.addNode(g, "bedrock", "Axiom of conscious preservation", s3);
    const bId = lastId(g);

    expect(G.isNodeGrounded(g, bId)).toBe(true);
    expect(G.isNodeGrounded(g, s3)).toBe(true);
    expect(G.isNodeGrounded(g, s2)).toBe(true);
    expect(G.isNodeGrounded(g, s1)).toBe(true);
    expect(G.isFullyGrounded(g, qId)).toBe(true);
  });

  it("evaluates root questions with multiple candidate position claims", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = G.addRootQuestion(g, "Which transport policy?");
    const qId = lastId(g);

    // Position 1: High speed rail (grounded)
    g = G.addNode(g, "claim", "Invest in high-speed rail", qId);
    const p1 = lastId(g);
    g = G.addNode(g, "support", "Reduces carbon emissions", p1);
    const a1 = lastId(g);
    g = G.addNode(g, "value", "Planetary climate stability", a1);

    // Only P1 exists and is grounded -> Question is fully grounded
    expect(G.isNodeGrounded(g, p1)).toBe(true);
    expect(G.isFullyGrounded(g, qId)).toBe(true);

    // Position 2: Highway expansion (ungrounded)
    g = G.addNode(g, "claim", "Expand highway lanes", qId);
    const p2 = lastId(g);
    g = G.addNode(g, "support", "Relieves congestion temporarily", p2);
    const a2 = lastId(g);

    // Now P2 is ungrounded -> Question is ungrounded (conjunctive over positions)
    expect(G.isNodeGrounded(g, p1)).toBe(true);
    expect(G.isNodeGrounded(g, p2)).toBe(false);
    expect(G.isFullyGrounded(g, qId)).toBe(false);

    // Ground P2 via preference
    g = G.addNode(g, "preference", "Personal driver autonomy preference", a2);
    expect(G.isNodeGrounded(g, p2)).toBe(true);
    expect(G.isFullyGrounded(g, qId)).toBe(true);
  });

  it("supports citations to terminal source nodes via cites edges", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = G.addRootQuestion(g, "Does vaccine reduce hospitalization?");
    const qId = lastId(g);

    g = G.addNode(g, "support", "Clinical trial data shows 90% reduction", qId);
    const sId = lastId(g);

    g = G.addNode(g, "source", "https://nejm.org/doi/10.1056/evidence", sId);
    const srcId = lastId(g);

    const edge = g.edges.find((e) => e.to === srcId)!;
    expect(edge.edgeType).toBe("cites");
    expect(edge.from).toBe(sId);
    expect(edge.to).toBe(srcId);

    expect(G.isNodeGrounded(g, srcId)).toBe(true);
    expect(G.isNodeGrounded(g, sId)).toBe(true);
    expect(G.isFullyGrounded(g, qId)).toBe(true);

    const terminal = G.getGroundingTerminal(g, sId);
    expect(terminal?.id).toBe(srcId);
    expect(terminal?.type).toBe("source");
  });

  it("does not loop forever on cyclic argument or claim chains", () => {
    // Cyclic argument graph: S1 -> S2 -> S1
    const g: Graph = {
      nodes: [
        { id: "q", type: "claim", content: "Root" },
        { id: "s1", type: "support", content: "S1" },
        { id: "s2", type: "support", content: "S2" },
      ],
      edges: [
        { id: "e1", from: "s1", to: "q", edgeType: "supports" },
        { id: "e2", from: "s2", to: "s1", edgeType: "supports" },
        { id: "e3", from: "s1", to: "s2", edgeType: "supports" }, // cycle
      ],
    };
    expect(G.isFullyGrounded(g, "q")).toBe(false);
    expect(G.isNodeGrounded(g, "s1")).toBe(false);
    expect(G.isNodeGrounded(g, "s2")).toBe(false);
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

describe("value reuse and citation convergence", () => {
  it("links to an existing value without creating a duplicate node", () => {
    const before = G.getValues(seedGraph).length;
    const g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    expect(G.getValues(g).length).toBe(before); // no new value node
    expect(G.getChildren(g, "trolley-a3").map((n) => n.id)).toContain(
      "trolley-v1",
    );
  });

  it("replaces a prior grounds edge rather than stacking them", () => {
    const g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    const groundsIn = g.edges.filter(
      (e) => e.from === "trolley-a3" && (e.edgeType === "grounds" || e.edgeType === "cites"),
    );
    expect(groundsIn).toHaveLength(1);
    expect(groundsIn[0].to).toBe("trolley-v1");
  });

  it("links to an existing source citation using cites edgeType", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = G.addRootQuestion(g, "Q1");
    const q1 = lastId(g);
    g = G.addNode(g, "support", "A1", q1);
    const a1 = lastId(g);
    g = G.addNode(g, "source", "https://doi.org/10.1234/test", a1);
    const sId = lastId(g);

    g = G.addRootQuestion(g, "Q2");
    const q2 = lastId(g);
    g = G.addNode(g, "support", "A2", q2);
    const a2 = lastId(g);

    g = G.linkToExistingValue(g, a2, sId);

    const edge = g.edges.find((e) => e.from === a2 && e.to === sId);
    expect(edge?.edgeType).toBe("cites");

    const usage = G.getValueUsage(g).find((u) => u.value.id === sId);
    expect(usage?.convergent).toBe(true);
    expect(usage?.roots.map((r) => r.id).sort()).toEqual([q1, q2].sort());
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
    let g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    g = G.deleteNode(g, "trolley-p2");
    expect(G.getNode(g, "trolley-v1")).toBeDefined();
    expect(G.getNode(g, "trolley-a2")).toBeUndefined();
  });

  it("spares a shared source cited by surviving arguments", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = G.addRootQuestion(g, "Q1");
    const q1 = lastId(g);
    g = G.addNode(g, "support", "A1", q1);
    const a1 = lastId(g);
    g = G.addNode(g, "source", "https://evidence.org", a1);
    const sId = lastId(g);

    g = G.addRootQuestion(g, "Q2");
    const q2 = lastId(g);
    g = G.addNode(g, "support", "A2", q2);
    const a2 = lastId(g);
    g = G.linkToExistingValue(g, a2, sId);

    // Delete Q1 subtree
    g = G.deleteNode(g, q1);
    expect(G.getNode(g, q1)).toBeUndefined();
    expect(G.getNode(g, a1)).toBeUndefined();
    // sId spared because Q2/A2 still cites it
    expect(G.getNode(g, sId)).toBeDefined();
    expect(G.getNode(g, q2)).toBeDefined();
    expect(G.getNode(g, a2)).toBeDefined();
  });

  it("counts only nodes that will actually be removed", () => {
    let g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    expect(G.countDescendants(g, "trolley-p2")).toBe(1); // just a2
  });
});

describe("convergence queries", () => {
  it("resolves the root a deep node belongs to", () => {
    expect(G.getRootFor(seedGraph, "trolley-v1")?.id).toBe("trolley-q2");
    expect(G.getRootFor(seedGraph, "trolley-a2")?.id).toBe("trolley-q2");
    expect(G.getRootFor(seedGraph, "sky-p2")?.id).toBe("sky-q2");
  });

  it("reports a value as convergent once two roots share it", () => {
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
    expect(G.isNodeGrounded(seedGraph, "trolley-c1")).toBe(true);
  });
});

describe("lineage helpers (map highlight)", () => {
  it("collects all ancestors that flow into a value", () => {
    const g = G.linkToExistingValue(seedGraph, "trolley-a3", "trolley-v1");
    const anc = G.getAncestors(g, "trolley-v1");
    for (const id of ["trolley-a2", "trolley-a3", "trolley-p2", "trolley-p3", "trolley-q2", "trolley-q1"]) {
      expect(anc.has(id)).toBe(true);
    }
    expect(anc.has("trolley-v1")).toBe(false);
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
    expect(acc.get(oid)).toBe("conflicted");
    expect(acc.get(aid)).toBe("coherent");
  });

  it("stays conflicted while any conflict survives", () => {
    let { g, aid } = baseChain();
    g = G.addNode(g, "conflict", "Flawed", aid);
    const oid = lastId(g);
    g = G.addNode(g, "conflict", "Not so", oid);
    g = G.addNode(g, "conflict", "Also wrong", aid);
    const acc = G.getAcceptability(g);
    expect(acc.get(aid)).toBe("conflicted");
  });

  it("lets a conflict defeat a claim", () => {
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
    const matches = G.findSimilarTerminals(
      seedGraph,
      "minimize suffering",
      "value",
    );
    expect(matches[0]?.node.id).toBe("trolley-v1");
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
    expect(s.groundedClaims).toBe(2); // trolley-q2 and sky-q2 are fully grounded
    expect(s.openClaims).toBe(2); // trolley-q1 and sky-q1 are open
    expect(s.clashes).toBe(0);
    expect(s.maxDepth).toBeGreaterThan(0);
  });

  it("lists grounding gaps shallowest-first", () => {
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
    expect(G.getChildren(g, pid).map((n) => n.id)).toContain(conclusionId);
    expect(G.getParent(g, conclusionId)?.id).toBe(pid);
  });

  it("lets a premise tree bottom out at a shared value (convergence)", () => {
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
    expect(G.getRootFor(g, argId)?.id).toBe(pid);
  });
});

describe("Status Profiles", () => {
  it("getStatusProfile computes correct ranks, stats and archetype", () => {
    const profile = G.getStatusProfile(seedGraph);
    expect(profile.stats.totalTerminals).toBeGreaterThan(0);
    expect(profile.rankedValues[0].convergenceCount).toBeGreaterThanOrEqual(
      profile.rankedValues[profile.rankedValues.length - 1].convergenceCount
    );
    expect(typeof profile.archetype).toBe("string");
    expect(profile.topValues.length).toBeLessThanOrEqual(5);
  });

  it("getValueChainDetail extracts the correct arguments for a terminal", () => {
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

describe("verifySource helper", () => {
  it("updates the verified flag on source nodes immutably", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = G.addRootQuestion(g, "Q");
    const q = lastId(g);
    g = G.addNode(g, "source", "https://evidence.org", q);
    const sId = lastId(g);

    expect(G.getNode(g, sId)?.verified).toBeUndefined();

    const g2 = G.verifySource(g, sId, true);
    expect(G.getNode(g2, sId)?.verified).toBe(true);
    expect(G.getNode(g, sId)?.verified).toBeUndefined(); // original untouched

    const g3 = G.verifySource(g2, sId, false);
    expect(G.getNode(g3, sId)?.verified).toBe(false);
  });
});
