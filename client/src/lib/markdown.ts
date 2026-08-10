import type { Graph, GraphNode } from "./types";
import { getRoots, getChildren } from "./graph";
import { NODE_META } from "./meta";

/**
 * Serializes the graph into a readable Markdown nested list format.
 */
export function exportGraphToMarkdown(graph: Graph): string {
  const roots = getRoots(graph);
  if (roots.length === 0) return "*Empty graph*";

  const lines: string[] = [];
  const visited = new Set<string>();

  function traverse(node: GraphNode, depth: number) {
    if (visited.has(node.id)) {
      const indent = "  ".repeat(depth);
      lines.push(`${indent}- *(Cyclic reference to: ${node.content.substring(0, 20)}...)*`);
      return;
    }
    visited.add(node.id);

    const meta = NODE_META[node.type];
    const typeLabel = meta ? `[${meta.label}]` : `[${node.type.toUpperCase()}]`;
    
    if (depth === 0) {
      lines.push(`### ${typeLabel} ${node.content}`);
    } else {
      const indent = "  ".repeat(depth - 1);
      lines.push(`${indent}- **${typeLabel}** ${node.content}`);
    }

    const children = getChildren(graph, node.id);
    for (const child of children) {
      traverse(child, depth + 1);
    }
    
    // We do NOT remove from visited, because a node like a shared Value
    // might be reached from multiple paths, and we don't want to expand it 
    // fully every single time if it's already been fully expanded once?
    // Actually, in Markdown, it might be better to expand it every time if it's not a cycle,
    // so it reads correctly. But to prevent infinite loops, we need a cycle check.
    // Standard DFS cycle check removes from 'visited' after visiting children,
    // and we can keep a separate 'seen' set if we want to truncate shared nodes.
    // For now, let's keep it simple: strict cycle check (remove after traversal).
    visited.delete(node.id);
  }

  roots.forEach((root, index) => {
    traverse(root, 0);
    if (index < roots.length - 1) {
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  });

  return lines.join("\n");
}
