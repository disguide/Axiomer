import { it, expect } from "vitest";
import { exportGraphToMarkdown } from "./markdown";
import type { Graph } from "./types";
it("exports shared reasoning once and references it from another parent", () => {
  const graph: Graph = { nodes: [{ id: "a", type: "claim", content: "First" }, { id: "b", type: "claim", content: "Second" }, { id: "s", type: "support", content: "Shared reason" }], edges: [{ id: "e1", from: "s", to: "a", edgeType: "supports" }, { id: "e2", from: "s", to: "b", edgeType: "supports" }] };
  const markdown = exportGraphToMarkdown(graph);
  expect(markdown).toContain("**support**: Shared reason");
  expect(markdown).toContain("Linked thought: Shared reason");
});
it("exports a deep map without recursive stack exhaustion or unbounded indentation", () => {
  const graph: Graph = { nodes: Array.from({ length: 10000 }, (_, i) => ({ id: `n${i}`, type: "claim", content: `Thought ${i}` })), edges: Array.from({ length: 9999 }, (_, i) => ({ id: `e${i}`, from: `n${i + 1}`, to: `n${i}`, edgeType: "supports" })) };
  const markdown = exportGraphToMarkdown(graph);
  expect(markdown).toContain("Thought 9999");
  expect(markdown.length).toBeLessThan(1000000);
});
