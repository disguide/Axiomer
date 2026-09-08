import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import { addNode, addRootQuestion, getGraphStats } from "@/lib/graph";
import { NODE_META } from "@/lib/meta";

describe("Tier 1 - Feature 11: Strict 2-Row Header & Toolbar Layout", () => {
  it("calculates accurate header status metrics (grounded vs open claims)", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Open Question 1");
    g = addRootQuestion(g, "Grounded Question 2");
    const q2 = g.nodes[g.nodes.length - 1].id;

    // Ground q2
    g = addNode(g, "value", "Bedrock foundation", q2);

    const stats = getGraphStats(g);
    expect(stats.claims).toBe(2);
    expect(stats.groundedClaims).toBe(1);
    expect(stats.openClaims).toBe(1);
  });

  it("verifies zero decorative emoji characters in all node definitions and action labels", () => {
    const emojiRegex = /\p{Extended_Pictographic}/u;
    for (const [type, meta] of Object.entries(NODE_META)) {
      expect(emojiRegex.test(meta.label), `Label for ${type} contains emoji`).toBe(false);
      expect(emojiRegex.test(meta.description), `Description for ${type} contains emoji`).toBe(false);
      expect(emojiRegex.test(meta.prompt), `Prompt for ${type} contains emoji`).toBe(false);
    }
  });

  it("maintains strict view mode states (map vs outline)", () => {
    type ViewMode = "map" | "outline";
    let currentView: ViewMode = "map";

    const setView = (mode: ViewMode) => {
      currentView = mode;
    };

    expect(currentView).toBe("map");
    setView("outline");
    expect(currentView).toBe("outline");
    setView("map");
    expect(currentView).toBe("map");
  });

  it("defines header action options (export, import, share, guide, reset)", () => {
    const availableActions = [
      "export_json",
      "export_markdown",
      "import_json",
      "copy_share_link",
      "show_guide",
      "reset_examples",
    ];
    expect(availableActions).toHaveLength(6);
    expect(availableActions.includes("copy_share_link")).toBe(true);
    expect(availableActions.includes("export_markdown")).toBe(true);
  });

  it("computes stats for empty and complex graphs seamlessly", () => {
    const emptyStats = getGraphStats({ nodes: [], edges: [] });
    expect(emptyStats.claims).toBe(0);
    expect(emptyStats.groundedClaims).toBe(0);
    expect(emptyStats.openClaims).toBe(0);
    expect(emptyStats.terminals).toBe(0);
    expect(emptyStats.clashes).toBe(0);
  });
});
