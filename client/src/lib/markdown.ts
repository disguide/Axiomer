import type { Graph, GraphEdge, GraphNode, NodeType } from "./types";
import { NODE_TYPE_LABELS } from "./types";
import { getRoots, getChildren, edgeTypeFor } from "./graph";

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

    const label = NODE_TYPE_LABELS[node.type];
    const typeLabel = label ? `[${label}]` : `[${node.type.toUpperCase()}]`;
    
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

const TYPE_LOOKUP: Record<string, NodeType> = {
  claim: "claim",
  premise: "premise",
  support: "support",
  conflict: "conflict",
  note: "note",
  value: "value",
  source: "source",
  limit: "limit",
  bedrock: "bedrock",
  preference: "preference",

  // Legacy type mappings
  question: "claim",
  position: "claim",
  "argument-support": "support",
  "evidence-empirical": "support",
  "evidence-anecdotal": "support",
  rebuttal: "support",
  "argument-attack": "conflict",
  "counter-argument": "conflict",
  objection: "conflict",
  "logical-fallacy": "conflict",
  attack: "conflict",
  assumption: "note",
  definition: "note",
  caveat: "note",
  clarification: "note",
  analogy: "note",
  "thought-experiment": "note",
  "related-concept": "note",
  principle: "value",
  "epistemic-limit": "limit",
};

for (const [key, label] of Object.entries(NODE_TYPE_LABELS)) {
  TYPE_LOOKUP[label.toLowerCase()] = key as NodeType;
}

function resolveNodeType(raw: string): NodeType | undefined {
  const normalized = raw.toLowerCase().trim().replace(/[\s_]+/g, "-");
  return TYPE_LOOKUP[normalized];
}

interface StackEntry {
  depth: number;
  node: GraphNode;
}

/**
 * Parses exported Markdown trees (hierarchical bullet points, headers,
 * terminal grounding connections, notes, and sources) into a valid Graph.
 */
export function parseMarkdownGraph(markdown: string): Graph {
  if (!markdown || typeof markdown !== "string" || !markdown.trim() || markdown.trim() === "*Empty graph*") {
    return { nodes: [], edges: [] };
  }

  const lines = markdown.split(/\r?\n/);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const stack: StackEntry[] = [];
  let hasSeenHeader = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    const trimmed = rawLine.trim();

    // Skip empty lines, markdown dividers (---, ***, ___), and cycle comments
    if (!trimmed || /^(?:---|[*]{3}|___)\s*$/.test(trimmed)) {
      continue;
    }
    if (/\*\([Cc]yclic reference to.*\)\*/.test(trimmed)) {
      continue;
    }

    let depth = 0;
    let remainder = "";

    const headerMatch = rawLine.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      depth = 0;
      remainder = headerMatch[2].trim();
      hasSeenHeader = true;
    } else {
      const bulletMatch = rawLine.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.*)$/);
      if (bulletMatch) {
        const indentStr = bulletMatch[1].replace(/\t/g, "  ");
        const indentLevel = Math.floor(indentStr.length / 2);
        depth = hasSeenHeader ? indentLevel + 1 : indentLevel;
        remainder = bulletMatch[2].trim();
      } else {
        // Plain line without bullet or header
        if (depth === 0 && !hasSeenHeader && nodes.length === 0) {
          depth = 0;
          remainder = trimmed;
        } else {
          continue;
        }
      }
    }

    // Extract node type and content from remainder
    // Matches: **[Type]** Content, [Type] Content, **Type**: Content, Type: Content
    let nodeType: NodeType | undefined;
    let content = remainder;

    const bracketMatch = remainder.match(/^(?:\*\*)?\[([a-zA-Z0-9_\- ]+)\](?:\*\*)?\s*:?\s*(.*)$/);
    if (bracketMatch) {
      const rawType = bracketMatch[1];
      nodeType = resolveNodeType(rawType);
      if (!nodeType) {
        throw new Error(`nodes[${nodes.length}].type "${rawType}" is not a valid NodeType`);
      }
      content = bracketMatch[2].trim();
    } else {
      const prefixMatch = remainder.match(/^(?:\*\*)?([a-zA-Z0-9_\-]+)(?:\*\*)?:\s+(.*)$/);
      if (prefixMatch) {
        const candidateType = resolveNodeType(prefixMatch[1]);
        if (candidateType) {
          nodeType = candidateType;
          content = prefixMatch[2].trim();
        }
      }
    }

    if (!nodeType) {
      nodeType = depth === 0 ? "claim" : "support";
    }

    const nodeId = `node_${nodes.length + 1}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const node: GraphNode = {
      id: nodeId,
      type: nodeType,
      content,
      createdAt: new Date().toISOString(),
    };
    nodes.push(node);

    // Pop stack entries with depth >= current depth
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parent = stack[stack.length - 1].node;
      const inferredEdgeType = edgeTypeFor(node.type, parent.type);
      const isDownward = inferredEdgeType === "grounds" || inferredEdgeType === "cites";

      const edge: GraphEdge = {
        id: `edge_${edges.length + 1}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        from: isDownward ? parent.id : node.id,
        to: isDownward ? node.id : parent.id,
        edgeType: inferredEdgeType,
      };
      edges.push(edge);
    }

    stack.push({ depth, node });
  }

  return { nodes, edges };
}

// Aliases for compatibility
export const parseMarkdownToGraph = parseMarkdownGraph;
export const importGraphFromMarkdown = parseMarkdownGraph;
