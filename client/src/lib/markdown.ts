import type { Graph } from "./types";
import { indexGraph } from "./navigation";
/** A bounded, iterative outline also handles deep maps and shared subtrees. */
export function exportGraphToMarkdown(graph: Graph): string {
  if (!graph.nodes.length) return "*Empty map*\n";
  const index = indexGraph(graph);
  const seen = new Set<string>();
  const stack = index.roots.slice().reverse().map((node) => ({ id: node.id, depth: 0 }));
  const lines = ["# Reasoning map", "", "Grounded describes structure, not proof of truth.", ""];
  while (stack.length) {
    const { id, depth } = stack.pop()!;
    const node = index.nodes.get(id);
    if (!node) continue;
    const content = node.content.replace(/\r?\n/g, " ").replace(/[\\`*_[\]<>]/g, "\\$&");
    const indent = "  ".repeat(Math.min(depth, 12));
    if (seen.has(id)) { lines.push(`${indent}- Linked thought: ${content}`); continue; }
    seen.add(id);
    lines.push(`${indent}- **${node.type}**: ${depth > 12 ? `[depth ${depth}] ` : ""}${content}`);
    const children = index.children.get(id) || [];
    for (let i = children.length - 1; i >= 0; i--) stack.push({ id: children[i], depth: depth + 1 });
  }
  return lines.join("\n") + "\n";
}
