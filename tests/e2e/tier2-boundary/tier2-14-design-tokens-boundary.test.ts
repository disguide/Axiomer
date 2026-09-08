import { describe, expect, it } from "vitest";
import { NODE_TYPES, type NodeType } from "@/lib/types";
import { NODE_META } from "@/lib/meta";

describe("Tier 2 - Boundary 14: Design Tokens Boundary Cases", () => {
  it("verifies all color tokens are valid 7-character hex color codes (#rrggbb)", () => {
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
    for (const type of NODE_TYPES) {
      const color = NODE_META[type].color;
      expect(hexColorRegex.test(color), `Color for ${type} (${color}) is not valid 7-char hex`).toBe(true);
    }
  });

  it("verifies all prompts and placeholders have non-empty meaningful defaults", () => {
    for (const type of NODE_TYPES) {
      const meta = NODE_META[type];
      expect(meta.prompt.trim().length).toBeGreaterThan(5);
      expect(meta.placeholder.trim().length).toBeGreaterThan(5);
    }
  });

  it("ensures every node type has an instantiated SVG icon element", () => {
    for (const type of NODE_TYPES) {
      const meta = NODE_META[type];
      expect(meta.icon).toBeDefined();
      expect(typeof meta.icon).toBe("object"); // ReactElement
    }
  });

  it("verifies calm palette contrast: no duplicate colors across major functional families", () => {
    const coreFamilies = ["claim", "premise", "support", "conflict", "note"] as NodeType[];
    const coreColors = coreFamilies.map((t) => NODE_META[t].color);
    const uniqueColors = new Set(coreColors);
    expect(uniqueColors.size).toBe(5); // Each structural family has a unique distinct color
  });

  it("verifies fallback handling when inspecting unknown node types", () => {
    const unknownType = "custom_unknown" as unknown as NodeType;
    const fallbackMeta = NODE_META[unknownType];
    expect(fallbackMeta).toBeUndefined();
  });
});
