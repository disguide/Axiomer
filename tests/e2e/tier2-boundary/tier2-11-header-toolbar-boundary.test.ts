import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import {
  addNode,
  addRootPremise,
  addRootQuestion,
  getGraphStats,
  getStatusProfile,
} from "@/lib/graph";

describe("Tier 2 - Boundary 11: Header & Toolbar Layout Boundary Cases", () => {
  it("calculates stats correctly when graph has only premises and no claims", () => {
    let g: Graph = { nodes: [], edges: [] };
    for (let i = 0; i < 10; i++) {
      g = addRootPremise(g, `Premise ${i}`);
    }
    const stats = getGraphStats(g);
    expect(stats.premises).toBe(10);
    expect(stats.claims).toBe(0);
    expect(stats.groundedClaims).toBe(0);
    expect(stats.openClaims).toBe(0);
  });

  it("calculates stats accurately for 100 completely ungrounded claims", () => {
    let g: Graph = { nodes: [], edges: [] };
    for (let i = 0; i < 100; i++) {
      g = addRootQuestion(g, `Question ${i}`);
    }
    const stats = getGraphStats(g);
    expect(stats.claims).toBe(100);
    expect(stats.groundedClaims).toBe(0);
    expect(stats.openClaims).toBe(100);
  });

  it("computes maxDepth metric accurately across extreme deep chain vs wide flat forest", () => {
    // Deep single chain (depth 20)
    let deepG: Graph = { nodes: [], edges: [] };
    deepG = addRootQuestion(deepG, "Root Deep");
    let curr = deepG.nodes[0].id;
    for (let i = 0; i < 20; i++) {
      deepG = addNode(deepG, "support", `Level ${i}`, curr);
      curr = deepG.nodes[deepG.nodes.length - 1].id;
    }
    const deepStats = getGraphStats(deepG);
    expect(deepStats.maxDepth).toBe(20);

    // Wide flat forest (depth 0)
    let wideG: Graph = { nodes: [], edges: [] };
    for (let i = 0; i < 20; i++) {
      wideG = addRootQuestion(wideG, `Flat Question ${i}`);
    }
    const wideStats = getGraphStats(wideG);
    expect(wideStats.maxDepth).toBe(0);
  });

  it("calculates clashes metric with multiple disjoint questions clashing independently", () => {
    let g: Graph = { nodes: [], edges: [] };

    // Question 1 clashes between v1 and v2
    g = addRootQuestion(g, "Q1");
    const q1 = g.nodes[0].id;
    g = addNode(g, "support", "S1", q1);
    const s1 = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "V1", s1);
    g = addNode(g, "support", "S2", q1);
    const s2 = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "V2", s2);

    // Question 2 clashes between v3 and v4
    g = addRootQuestion(g, "Q2");
    const q2 = g.nodes.find((n) => n.content === "Q2")!.id;
    g = addNode(g, "support", "S3", q2);
    const s3 = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "V3", s3);
    g = addNode(g, "support", "S4", q2);
    const s4 = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "V4", s4);

    const stats = getGraphStats(g);
    expect(stats.clashes).toBe(2);
  });

  it("computes status profile on empty graph returning default Seeker archetype", () => {
    const emptyGraph: Graph = { nodes: [], edges: [] };
    const profile = getStatusProfile(emptyGraph);
    expect(profile.archetype).toBe("Seeker");
    expect(profile.topValues).toHaveLength(0);
    expect(profile.stats.totalTerminals).toBe(0);
  });
});
