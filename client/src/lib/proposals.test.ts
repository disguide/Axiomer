import { describe, expect, it } from "vitest";
import { seedGraph } from "./seed";
import * as G from "./graph";
import { applyOp, parseProposal, validateOp } from "./proposals";

describe("proposal validation (the AI safety boundary)", () => {
  it("accepts a well-formed add-node on an allowed parent", () => {
    const check = validateOp(seedGraph, {
      op: "add-node",
      parentId: "trolley-a2",
      type: "objection",
      content: "But numbers aren't everything",
    });
    expect(check.ok).toBe(true);
  });

  it("rejects children the attachment matrix forbids", () => {
    // A value under a question is not a legal move.
    const check = validateOp(seedGraph, {
      op: "add-node",
      parentId: "trolley-q1",
      type: "value",
      content: "Sneaky bedrock",
    });
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/not an allowed child/);
  });

  it("rejects unknown types, empty content, missing parents, inert parents", () => {
    expect(
      validateOp(seedGraph, {
        op: "add-node",
        parentId: "trolley-a2",
        type: "vibe" as never,
        content: "x",
      }).ok,
    ).toBe(false);
    expect(
      validateOp(seedGraph, {
        op: "add-node",
        parentId: "trolley-a2",
        type: "objection",
        content: "   ",
      }).ok,
    ).toBe(false);
    expect(
      validateOp(seedGraph, {
        op: "add-node",
        parentId: "ghost-123",
        type: "objection",
        content: "x",
      }).ok,
    ).toBe(false);
    const retracted = G.setNodeStatus(seedGraph, "trolley-a3", "retracted");
    expect(
      validateOp(retracted, {
        op: "add-node",
        parentId: "trolley-a3",
        type: "objection",
        content: "x",
      }).ok,
    ).toBe(false);
  });

  it("validates link-value endpoints (groundable source, terminal target)", () => {
    expect(
      validateOp(seedGraph, {
        op: "link-value",
        argumentId: "trolley-a3",
        valueId: "trolley-v1",
      }).ok,
    ).toBe(true);
    expect(
      validateOp(seedGraph, {
        op: "link-value",
        argumentId: "trolley-e1", // evidence cannot ground
        valueId: "trolley-v1",
      }).ok,
    ).toBe(false);
    expect(
      validateOp(seedGraph, {
        op: "link-value",
        argumentId: "trolley-a3",
        valueId: "trolley-p1", // not a terminal
      }).ok,
    ).toBe(false);
  });

  it("guards set-status with the same canSetStatus rule as the UI", () => {
    // Shared terminal with active dependents: retraction refused.
    expect(
      validateOp(seedGraph, {
        op: "set-status",
        nodeId: "trolley-v1",
        status: "retracted",
      }).ok,
    ).toBe(false);
    expect(
      validateOp(seedGraph, {
        op: "set-status",
        nodeId: "trolley-a3",
        status: "retracted",
      }).ok,
    ).toBe(true);
  });
});

describe("parseProposal (untrusted model output)", () => {
  it("parses fenced JSON, keeps valid ops, quarantines invalid ones", () => {
    const text = [
      "Here is my proposal:",
      "```json",
      JSON.stringify({
        summary: "Attack the numbers argument and reuse bedrock",
        ops: [
          {
            op: "add-node",
            parentId: "trolley-a2",
            type: "objection",
            content: "Aggregating lives ignores separateness of persons",
            edgeType: "undercuts",
          },
          {
            op: "link-value",
            argumentId: "trolley-a3",
            valueId: "trolley-v1",
          },
          // Invalid: value under question
          {
            op: "add-node",
            parentId: "trolley-q1",
            type: "value",
            content: "Sneaky",
          },
          // Invalid: garbage op
          { op: "rm -rf", nodeId: "trolley-q1" },
        ],
      }),
      "```",
      "Hope this helps!",
    ].join("\n");

    const { proposal, invalid } = parseProposal(seedGraph, text);
    expect(proposal.summary).toMatch(/bedrock/);
    expect(proposal.ops).toHaveLength(2);
    expect(invalid).toHaveLength(2);
    expect(invalid.map((i) => i.reason).join(" ")).toMatch(/not an allowed child/);
    expect(invalid.map((i) => i.reason).join(" ")).toMatch(/unknown op/);
  });

  it("throws on output with no JSON object", () => {
    expect(() => parseProposal(seedGraph, "I cannot help with that.")).toThrow(
      /no JSON object/,
    );
  });
});

describe("applyOp", () => {
  it("applies an accepted undercutting objection with the right edge", () => {
    const g = applyOp(seedGraph, {
      op: "add-node",
      parentId: "trolley-a2",
      type: "objection",
      content: "The inference from fewer deaths to permissibility fails here",
      edgeType: "undercuts",
      contentKind: "normative",
    });
    const added = g.nodes[g.nodes.length - 1];
    expect(added.type).toBe("objection");
    expect(added.contentKind).toBe("normative");
    const edge = g.edges.find((e) => e.from === added.id);
    expect(edge?.edgeType).toBe("undercuts");
    expect(edge?.to).toBe("trolley-a2");
    // And it has force: the argument is now defeated.
    expect(G.getAcceptability(g).get("trolley-a2")).toBe("defeated");
  });

  it("is a no-op for ops that fail validation at apply time", () => {
    const g = applyOp(seedGraph, {
      op: "add-node",
      parentId: "trolley-q1",
      type: "value",
      content: "Sneaky",
    });
    expect(g).toBe(seedGraph);
  });

  it("applies merge-terminals end to end", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = g.nodes[g.nodes.length - 1].id;
    g = G.addNode(g, "position", "P", qid);
    const pid = g.nodes[g.nodes.length - 1].id;
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = g.nodes[g.nodes.length - 1].id;
    g = G.addNode(g, "value", "Reduce suffering overall", aid);
    const dupId = g.nodes[g.nodes.length - 1].id;
    const merged = applyOp(g, {
      op: "merge-terminals",
      keepId: "trolley-v1",
      dropId: dupId,
    });
    expect(G.getNode(merged, dupId)?.status).toBe("merged");
    expect(
      merged.edges.some(
        (e) =>
          e.edgeType === "grounds-in" &&
          e.from === aid &&
          e.to === "trolley-v1",
      ),
    ).toBe(true);
  });
});
