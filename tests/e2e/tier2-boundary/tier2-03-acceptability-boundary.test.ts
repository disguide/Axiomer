import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import { getAcceptability } from "@/lib/graph";

describe("Tier 2 - Boundary 3: Dung Acceptability Boundary Cases", () => {
  it("evaluates a self-attacking node into conflicted/contested state", () => {
    const selfAttackGraph: Graph = {
      nodes: [{ id: "n1", type: "conflict", content: "This statement is false" }],
      edges: [{ id: "e1", from: "n1", to: "n1", edgeType: "conflicts" }],
    };

    const acc = getAcceptability(selfAttackGraph);
    // In Dung grounded semantics, a self-attacking node cannot be IN ("coherent"). It falls to "contested"
    expect(acc.get("n1")).toBe("contested");
  });

  it("evaluates a 2-node mutual attack cycle (A attacks B, B attacks A) as contested", () => {
    const mutualAttackGraph: Graph = {
      nodes: [
        { id: "a", type: "conflict", content: "Attack A" },
        { id: "b", type: "conflict", content: "Attack B" },
      ],
      edges: [
        { id: "e1", from: "b", to: "a", edgeType: "conflicts" },
        { id: "e2", from: "a", to: "b", edgeType: "conflicts" },
      ],
    };

    const acc = getAcceptability(mutualAttackGraph);
    expect(acc.get("a")).toBe("contested");
    expect(acc.get("b")).toBe("contested");
  });

  it("evaluates a 3-node odd attack cycle (A -> B -> C -> A) as contested", () => {
    const oddCycleGraph: Graph = {
      nodes: [
        { id: "a", type: "conflict", content: "A" },
        { id: "b", type: "conflict", content: "B" },
        { id: "c", type: "conflict", content: "C" },
      ],
      edges: [
        { id: "e1", from: "b", to: "a", edgeType: "conflicts" }, // b attacks a
        { id: "e2", from: "c", to: "b", edgeType: "conflicts" }, // c attacks b
        { id: "e3", from: "a", to: "c", edgeType: "conflicts" }, // a attacks c
      ],
    };

    const acc = getAcceptability(oddCycleGraph);
    expect(acc.get("a")).toBe("contested");
    expect(acc.get("b")).toBe("contested");
    expect(acc.get("c")).toBe("contested");
  });

  it("evaluates a 4-node even attack cycle with an external unattacked defender", () => {
    const evenCycleWithDefender: Graph = {
      nodes: [
        { id: "a", type: "conflict", content: "A" },
        { id: "b", type: "conflict", content: "B" },
        { id: "c", type: "conflict", content: "C" },
        { id: "d", type: "conflict", content: "D" },
        { id: "ext", type: "conflict", content: "Undefeated Defender" },
      ],
      edges: [
        { id: "e1", from: "b", to: "a", edgeType: "conflicts" }, // b attacks a
        { id: "e2", from: "c", to: "b", edgeType: "conflicts" }, // c attacks b
        { id: "e3", from: "d", to: "c", edgeType: "conflicts" }, // d attacks c
        { id: "e4", from: "a", to: "d", edgeType: "conflicts" }, // a attacks d
        { id: "e5", from: "ext", to: "b", edgeType: "conflicts" }, // ext attacks b
      ],
    };

    const acc = getAcceptability(evenCycleWithDefender);
    // ext has no attackers -> coherent (IN)
    expect(acc.get("ext")).toBe("coherent");
    // ext defeats b -> b is conflicted (OUT)
    expect(acc.get("b")).toBe("conflicted");
    // b was the only attacker of a -> a is coherent (IN)
    expect(acc.get("a")).toBe("coherent");
    // a defeats d -> d is conflicted (OUT)
    expect(acc.get("d")).toBe("conflicted");
    // d was the only attacker of c -> c is coherent (IN)
    expect(acc.get("c")).toBe("coherent");
  });

  it("evaluates a large disconnected graph with multiple separate dialectical components", () => {
    const disconnectedGraph: Graph = {
      nodes: [
        { id: "x1", type: "claim", content: "Claim X" },
        { id: "x2", type: "conflict", content: "Attack X" },
        { id: "y1", type: "claim", content: "Claim Y" },
        { id: "z1", type: "claim", content: "Claim Z" },
      ],
      edges: [
        { id: "e_x", from: "x2", to: "x1", edgeType: "conflicts" },
      ],
    };

    const acc = getAcceptability(disconnectedGraph);
    expect(acc.get("x1")).toBe("conflicted");
    expect(acc.get("x2")).toBe("coherent");
    expect(acc.get("y1")).toBe("coherent");
    expect(acc.get("z1")).toBe("coherent");
  });
});
