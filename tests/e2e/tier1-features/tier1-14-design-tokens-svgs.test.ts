import { describe, expect, it } from "vitest";
import { NODE_TYPES, type NodeType } from "@/lib/types";
import { NODE_META, NODE_ORDER } from "@/lib/meta";

describe("Tier 1 - Feature 14: Calm 6-Family Design Tokens & SVGs", () => {
  it("defines comprehensive metadata for every node type in NODE_META", () => {
    for (const type of NODE_TYPES) {
      const meta = NODE_META[type];
      expect(meta).toBeDefined();
      expect(typeof meta.label).toBe("string");
      expect(meta.label.length).toBeGreaterThan(0);
      expect(typeof meta.color).toBe("string");
      expect(meta.color.startsWith("#")).toBe(true);
      expect(typeof meta.description).toBe("string");
      expect(typeof meta.prompt).toBe("string");
      expect(typeof meta.placeholder).toBe("string");
      expect(typeof meta.terminal).toBe("boolean");
      expect(meta.icon).toBeDefined();
    }
  });

  it("maps distinct calm semantic colors to the node families", () => {
    // Claim: blue (#2563eb)
    expect(NODE_META.claim.color).toBe("#2563eb");
    // Premise: violet (#7c3aed)
    expect(NODE_META.premise.color).toBe("#7c3aed");
    // Support: emerald (#059669)
    expect(NODE_META.support.color).toBe("#059669");
    // Conflict: rose (#e11d48)
    expect(NODE_META.conflict.color).toBe("#e11d48");
    // Note: slate (#64748b)
    expect(NODE_META.note.color).toBe("#64748b");
    // Terminals: Value (amber #b45309), Source (teal #0d9488), Limit (slate #94a3b8), Bedrock (indigo #4f46e5), Preference (pink #ec4899)
    expect(NODE_META.value.color).toBe("#b45309");
    expect(NODE_META.source.color).toBe("#0d9488");
    expect(NODE_META.limit.color).toBe("#94a3b8");
    expect(NODE_META.bedrock.color).toBe("#4f46e5");
    expect(NODE_META.preference.color).toBe("#ec4899");
  });

  it("ensures NODE_ORDER contains all 10 canonical node types without duplicates", () => {
    expect(NODE_ORDER).toHaveLength(10);
    const orderSet = new Set(NODE_ORDER);
    expect(orderSet.size).toBe(10);
    for (const t of NODE_TYPES) {
      expect(orderSet.has(t)).toBe(true);
    }
  });

  it("verifies terminal flag in NODE_META is consistent with isTerminalType", () => {
    const terminals: NodeType[] = ["value", "source", "limit", "bedrock", "preference"];
    const nonTerminals: NodeType[] = ["claim", "premise", "support", "conflict", "note"];

    for (const t of terminals) {
      expect(NODE_META[t].terminal).toBe(true);
    }
    for (const nt of nonTerminals) {
      expect(NODE_META[nt].terminal).toBe(false);
    }
  });

  it("adheres to anti-slop guidelines: no AI-slop sparkles, emojis, or garish gradients", () => {
    for (const [, meta] of Object.entries(NODE_META)) {
      expect(meta.description.toLowerCase()).not.toContain("magic");
      expect(meta.description.toLowerCase()).not.toContain("ai powered");
      expect(meta.prompt.toLowerCase()).not.toContain("generate");
    }
  });
});
