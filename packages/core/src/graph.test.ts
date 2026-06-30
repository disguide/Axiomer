import { describe, expect, it } from "vitest";
import {
  addEdge,
  addNode,
  ancestors,
  descendants,
  edgeId,
  emptyGraph,
  getNode,
  hasCycle,
  hasPath,
  incomingEdges,
  leaves,
  mergeNodes,
  nodesOfType,
  outgoingEdges,
  predecessors,
  removeEdge,
  removeNode,
  roots,
  subgraph,
  successors,
  updateNode,
} from "./index";
import type { Graph, GraphNode } from "./index";

/** Build a small graph: a -> b -> c, a -> c (rel "to"). */
function diamond(): Graph {
  let g = emptyGraph();
  for (const id of ["a", "b", "c", "d"]) {
    g = addNode(g, { id, type: "x", label: id.toUpperCase() });
  }
  g = addEdge(g, "a", "b", "to");
  g = addEdge(g, "b", "c", "to");
  g = addEdge(g, "a", "c", "to");
  // d is isolated
  return g;
}

describe("nodes & edges", () => {
  it("adds and looks up nodes", () => {
    let g = emptyGraph();
    g = addNode(g, { id: "n1", type: "skill", label: "Cooking" });
    expect(getNode(g, "n1")?.label).toBe("Cooking");
    expect(getNode(g, "missing")).toBeUndefined();
  });

  it("rejects duplicate node ids", () => {
    let g = addNode(emptyGraph(), { id: "n1", type: "x", label: "A" });
    expect(() => addNode(g, { id: "n1", type: "x", label: "B" })).toThrow();
  });

  it("addEdge requires both endpoints to exist", () => {
    const g = addNode(emptyGraph(), { id: "a", type: "x", label: "A" });
    expect(() => addEdge(g, "a", "ghost", "to")).toThrow();
    expect(() => addEdge(g, "ghost", "a", "to")).toThrow();
  });

  it("addEdge is idempotent for the same (from, rel, to)", () => {
    let g = diamond();
    const before = g.edges.length;
    g = addEdge(g, "a", "b", "to");
    expect(g.edges.length).toBe(before);
  });

  it("distinguishes edges by relationship", () => {
    let g = diamond();
    g = addEdge(g, "a", "b", "alt");
    expect(outgoingEdges(g, "a").filter((e) => e.to === "b")).toHaveLength(2);
    expect(edgeId("a", "alt", "b")).toBe("a--alt-->b");
  });

  it("updateNode shallow-merges fields", () => {
    let g = addNode(emptyGraph(), { id: "n1", type: "skill", label: "Run" });
    g = updateNode(g, "n1", { data: { xp: 10 } });
    g = updateNode(g, "n1", { label: "Running" });
    expect(getNode(g, "n1")).toMatchObject({ label: "Running", data: { xp: 10 } });
  });
});

describe("neighbours", () => {
  it("outgoing/incoming, successors/predecessors", () => {
    const g = diamond();
    expect(outgoingEdges(g, "a").map((e) => e.to).sort()).toEqual(["b", "c"]);
    expect(incomingEdges(g, "c").map((e) => e.from).sort()).toEqual(["a", "b"]);
    expect(successors(g, "a").map((n) => n.id).sort()).toEqual(["b", "c"]);
    expect(predecessors(g, "c").map((n) => n.id).sort()).toEqual(["a", "b"]);
  });

  it("roots and leaves", () => {
    const g = diamond();
    expect(roots(g).map((n) => n.id).sort()).toEqual(["a", "d"]);
    expect(leaves(g).map((n) => n.id).sort()).toEqual(["c", "d"]);
  });

  it("nodesOfType filters by type", () => {
    let g = diamond();
    g = addNode(g, { id: "v", type: "value", label: "V" });
    expect(nodesOfType(g, "value").map((n) => n.id)).toEqual(["v"]);
    expect(nodesOfType(g, "x")).toHaveLength(4);
  });
});

describe("traversal", () => {
  it("descendants and ancestors are transitive and exclude self", () => {
    const g = diamond();
    expect(descendants(g, "a").map((n) => n.id).sort()).toEqual(["b", "c"]);
    expect(ancestors(g, "c").map((n) => n.id).sort()).toEqual(["a", "b"]);
    expect(descendants(g, "c")).toEqual([]);
    expect(descendants(g, "d")).toEqual([]);
  });

  it("traversal is cycle-safe", () => {
    let g = emptyGraph();
    for (const id of ["a", "b", "c"]) {
      g = addNode(g, { id, type: "x", label: id });
    }
    g = addEdge(g, "a", "b", "to");
    g = addEdge(g, "b", "c", "to");
    g = addEdge(g, "c", "a", "to"); // cycle
    expect(descendants(g, "a").map((n) => n.id).sort()).toEqual(["b", "c"]);
    expect(hasCycle(g)).toBe(true);
  });

  it("hasCycle is false for a DAG", () => {
    expect(hasCycle(diamond())).toBe(false);
  });

  it("hasPath follows direction", () => {
    const g = diamond();
    expect(hasPath(g, "a", "c")).toBe(true);
    expect(hasPath(g, "c", "a")).toBe(false);
    expect(hasPath(g, "a", "a")).toBe(true);
    expect(hasPath(g, "a", "d")).toBe(false);
  });

  it("subgraph keeps only internal edges", () => {
    const g = diamond();
    const sub = subgraph(g, ["a", "b"]);
    expect(sub.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
    expect(sub.edges.map((e) => e.id)).toEqual([edgeId("a", "to", "b")]);
  });
});

describe("removal", () => {
  it("removeNode cascades its edges", () => {
    const g = removeNode(diamond(), "b");
    expect(getNode(g, "b")).toBeUndefined();
    expect(g.edges.some((e) => e.from === "b" || e.to === "b")).toBe(false);
    // a -> c survives
    expect(hasPath(g, "a", "c")).toBe(true);
  });

  it("removeEdge drops just the edge", () => {
    const g = removeEdge(diamond(), edgeId("a", "to", "c"));
    expect(hasPath(g, "a", "c")).toBe(true); // still reachable via b
    const g2 = removeEdge(g, edgeId("b", "to", "c"));
    expect(hasPath(g2, "a", "c")).toBe(false);
  });
});

describe("mergeNodes (convergence / dedup primitive)", () => {
  it("re-points edges onto the canonical node and drops merged nodes", () => {
    // two 'value' duplicates v1, v2; arguments x1 -> v1, x2 -> v2
    let g = emptyGraph();
    const add = (n: GraphNode) => (g = addNode(g, n));
    add({ id: "v1", type: "value", label: "Minimize suffering" });
    add({ id: "v2", type: "value", label: "Minimise suffering" });
    add({ id: "x1", type: "arg", label: "X1" });
    add({ id: "x2", type: "arg", label: "X2" });
    g = addEdge(g, "x1", "v1", "grounds-in");
    g = addEdge(g, "x2", "v2", "grounds-in");

    g = mergeNodes(g, ["v2"], "v1");

    expect(getNode(g, "v2")).toBeUndefined();
    // both arguments now ground in the canonical value (convergence)
    expect(predecessors(g, "v1").map((n) => n.id).sort()).toEqual(["x1", "x2"]);
  });

  it("de-duplicates edges and drops self-loops created by the merge", () => {
    let g = emptyGraph();
    for (const id of ["a", "v1", "v2"]) {
      g = addNode(g, { id, type: "x", label: id });
    }
    g = addEdge(g, "a", "v1", "grounds-in");
    g = addEdge(g, "a", "v2", "grounds-in"); // becomes duplicate after merge
    g = addEdge(g, "v1", "v2", "rel"); // becomes a self-loop after merge

    g = mergeNodes(g, ["v2"], "v1");

    expect(outgoingEdges(g, "a")).toHaveLength(1); // de-duped
    expect(g.edges.some((e) => e.from === e.to)).toBe(false); // no self-loop
  });

  it("is a no-op when nothing real is merged", () => {
    const g = diamond();
    expect(mergeNodes(g, ["a"], "a")).toBe(g);
  });
});
