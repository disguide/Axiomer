import { describe, expect, it } from "vitest";
import { parseLlmsTxt } from "../tier1-features/tier1-10-agent-discovery.test";

describe("Tier 2 - Boundary 10: Agent Discovery Boundary Cases", () => {
  it("handles completely empty llms.txt content string safely", () => {
    const parsed = parseLlmsTxt("");
    expect(parsed.hasTitle).toBe(false);
    expect(parsed.sections).toHaveLength(0);
    expect(parsed.mentionedNodeTypes).toHaveLength(0);
    expect(parsed.mentionedEdgeTypes).toHaveLength(0);
  });

  it("handles noisy or unstructured text without throwing errors", () => {
    const noisyText = `# Title Only\nSome unformatted notes\nrandom words: claim, premise, something else`;
    const parsed = parseLlmsTxt(noisyText);
    expect(parsed.hasTitle).toBe(true);
    expect(parsed.mentionedNodeTypes).toContain("claim");
    expect(parsed.mentionedNodeTypes).toContain("premise");
  });

  it("identifies missing required sections in partial llms.txt documents", () => {
    const partialText = `# Partial Axiomer\n\n## 10-Node Ontology\n- claim\n- premise`;
    const parsed = parseLlmsTxt(partialText);
    expect(parsed.sections).toContain("10-Node Ontology");
    expect(parsed.sections).not.toContain("MCP Server Tools");
  });

  it("performs case-insensitive matching for ontology and edge keywords", () => {
    const mixedCaseText = "We use CLAIM, Premise, SuppOrt, ConFLICT, and Terminals.";
    const parsed = parseLlmsTxt(mixedCaseText);
    expect(parsed.mentionedNodeTypes).toContain("claim");
    expect(parsed.mentionedNodeTypes).toContain("premise");
    expect(parsed.mentionedNodeTypes).toContain("support");
    expect(parsed.mentionedNodeTypes).toContain("conflict");
  });

  it("handles deeply nested markdown headers and code blocks gracefully", () => {
    const markdownWithCode = `
# Axiomer

\`\`\`json
{
  "tools": ["get_graph", "propose_node"]
}
\`\`\`

## 10-Node Ontology
### Structural Nodes
#### Claims
- claim
    `;
    const parsed = parseLlmsTxt(markdownWithCode);
    expect(parsed.hasTitle).toBe(true);
    expect(parsed.sections).toContain("10-Node Ontology");
  });
});
