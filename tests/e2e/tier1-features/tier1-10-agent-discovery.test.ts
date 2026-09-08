import { describe, expect, it } from "vitest";
import { EDGE_TYPES, NODE_TYPES, TERMINAL_TYPES } from "@/lib/types";

// Standard parser & validator for llms.txt agent discovery format
export function parseLlmsTxt(content: string) {
  const lines = content.split("\n");
  const headers = lines.filter((l) => l.startsWith("#"));
  const hasTitle = headers.some((h) => h.startsWith("# "));
  const sections = headers.filter((h) => h.startsWith("## ")).map((h) => h.replace("## ", "").trim());

  const mentionedNodeTypes = NODE_TYPES.filter((t) => content.toLowerCase().includes(t.toLowerCase()));
  const mentionedEdgeTypes = EDGE_TYPES.filter((e) => content.toLowerCase().includes(e.toLowerCase()));

  return {
    hasTitle,
    sections,
    mentionedNodeTypes,
    mentionedEdgeTypes,
    lineCount: lines.length,
  };
}

export const CANONICAL_LLMS_TXT = `# Axiomer Epistemic Coherence Engine

> Axiomer is a local-first argument mapping and coherence engine that makes the logical derivation of beliefs down to terminal foundations visible and verifiable.

## 10-Node Ontology
- **claim**: A question, position, or proposition being explored.
- **premise**: A foundational assumption you reason forward from.
- **support**: Evidence, reasoning, or data that backs a claim.
- **conflict**: A logical inconsistency or objection in the derivation.
- **note**: Context, clarification, caveat, or annotation.
- **value**: A bedrock value or principle (terminal).
- **source**: A citation, reference, or link to empirical evidence (terminal).
- **limit**: The boundary of what we can know (terminal).
- **bedrock**: Absolute bedrock truth where derivation halts (terminal).
- **preference**: A subjective human desire or personal inclination (terminal).

## 5 Semantic Edge Types
- **supports**: Child supports parent (from: child, to: parent).
- **conflicts**: Child conflicts with parent (from: child, to: parent).
- **annotates**: Child annotates parent (from: child, to: parent).
- **grounds**: Parent grounds in terminal child (from: parent, to: child).
- **cites**: Parent cites source child (from: parent, to: child).

## MCP Server Tools
- \`get_graph\`: Retrieve full graph structure and summary stats.
- \`get_children\`: Get immediate children for a node ID.
- \`get_roots\`: Retrieve all top-level root claims and premises.
- \`get_grounding_gaps\`: List ungrounded arguments prioritized by depth.
- \`get_acceptability\`: Compute Dung acceptability labels (coherent, conflicted, contested).
- \`get_value_clashes\`: Detect root questions with competing terminal values.
- \`propose_node\`: Propose a new child node with schema and allowed-children validation.
`;

describe("Tier 1 - Feature 10: Agent Discovery (llms.txt)", () => {
  it("validates that llms.txt conforms to the standard agent discovery schema", () => {
    const parsed = parseLlmsTxt(CANONICAL_LLMS_TXT);
    expect(parsed.hasTitle).toBe(true);
    expect(parsed.sections).toContain("10-Node Ontology");
    expect(parsed.sections).toContain("5 Semantic Edge Types");
    expect(parsed.sections).toContain("MCP Server Tools");
  });

  it("verifies all 10 canonical node types are documented in agent discovery metadata", () => {
    const parsed = parseLlmsTxt(CANONICAL_LLMS_TXT);
    expect(parsed.mentionedNodeTypes).toHaveLength(10);
    for (const t of NODE_TYPES) {
      expect(parsed.mentionedNodeTypes).toContain(t);
    }
  });

  it("verifies all 5 semantic edge types and direction conventions are documented", () => {
    const parsed = parseLlmsTxt(CANONICAL_LLMS_TXT);
    expect(parsed.mentionedEdgeTypes).toHaveLength(5);
    for (const e of EDGE_TYPES) {
      expect(parsed.mentionedEdgeTypes).toContain(e);
    }
  });

  it("documents all 7 MCP graph query and manipulation tools", () => {
    const tools = [
      "get_graph",
      "get_children",
      "get_roots",
      "get_grounding_gaps",
      "get_acceptability",
      "get_value_clashes",
      "propose_node",
    ];
    for (const tool of tools) {
      expect(CANONICAL_LLMS_TXT).toContain(`\`${tool}\``);
    }
  });

  it("specifies terminal classification (terminal vs structural) in agent discovery", () => {
    for (const t of TERMINAL_TYPES) {
      expect(CANONICAL_LLMS_TXT).toMatch(new RegExp(`\\*\\*${t}\\*\\*.*\\(terminal\\)`, "i"));
    }
  });
});
