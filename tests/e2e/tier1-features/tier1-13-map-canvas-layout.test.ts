import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import {
  addEdge,
  addFloatingNode,
  addNode,
  addRootQuestion,
  getAncestors,
  getDescendantIds,
  moveNode,
} from "@/lib/graph";
import { layoutGraph } from "@/lib/flowLayout";

describe("Tier 1 - Feature 13: Smooth Map Canvas & Layout Sync", () => {
  it("computes 2D positions for all nodes via layoutGraph using dagre top-down layout", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Root Question");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Support Node", qId);
    const sId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Terminal Value", sId);
    const vId = g.nodes[g.nodes.length - 1].id;

    const positions = layoutGraph(g);
    expect(positions[qId]).toBeDefined();
    expect(positions[sId]).toBeDefined();
    expect(positions[vId]).toBeDefined();

    // Top-down ranking: Y coordinate of parent < child
    expect(positions[qId].y).toBeLessThan(positions[sId].y);
    expect(positions[sId].y).toBeLessThan(positions[vId].y);
  });

  it("calculates ancestor set for lineage highlighting on canvas node selection", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Root");
    const rId = g.nodes[0].id;
    g = addNode(g, "support", "Mid", rId);
    const mId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Leaf", mId);
    const lId = g.nodes[g.nodes.length - 1].id;

    const ancestors = getAncestors(g, lId);
    expect(ancestors.has(mId)).toBe(true);
    expect(ancestors.has(rId)).toBe(true);
    expect(ancestors.has(lId)).toBe(false); // Ancestors excludes self
  });

  it("calculates descendant set for subtree highlighting on canvas", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Root");
    const rId = g.nodes[0].id;
    g = addNode(g, "support", "Mid", rId);
    const mId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Leaf", mId);
    const lId = g.nodes[g.nodes.length - 1].id;

    const descendants = getDescendantIds(g, rId);
    expect(descendants.has(rId)).toBe(true); // Includes self
    expect(descendants.has(mId)).toBe(true);
    expect(descendants.has(lId)).toBe(true);
  });

  it("supports floating nodes and manual positioning on canvas", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addFloatingNode(g, "claim", "Floating Thought", { x: 500, y: 300 });
    const nId = g.nodes[0].id;

    expect(g.nodes[0].position).toEqual({ x: 500, y: 300 });

    // Move node
    const moved = moveNode(g, nId, { x: 750, y: 400 });
    expect(moved.nodes[0].position).toEqual({ x: 750, y: 400 });
  });

  it("connects floating nodes with edges and updates dagre layout dynamically", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addFloatingNode(g, "claim", "Claim A", { x: 100, y: 100 });
    const idA = g.nodes[0].id;
    g = addFloatingNode(g, "support", "Support B", { x: 200, y: 200 });
    const idB = g.nodes[1].id;

    // Connect them
    const connected = addEdge(g, idB, idA);
    expect(connected.edges).toHaveLength(1);
    expect(connected.edges[0].edgeType).toBe("supports");

    // Recalculate layout
    const positions = layoutGraph(connected);
    expect(positions[idA].y).toBeLessThan(positions[idB].y);
  });
});
