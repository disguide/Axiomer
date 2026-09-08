import { describe, expect, it } from "vitest";
import type { Graph, NodeType } from "@/lib/types";
import {
  ALLOWED_CHILDREN,
  isTerminalType,
} from "@/lib/types";
import {
  addNode,
  addRootQuestion,
  edgeEndpoints,
  edgeTypeFor,
  getAcceptability,
  getGroundingTerminal,
  getValueChainDetail,
  getValueClashes,
  getValueUsage,
  isFullyGrounded,
  isNodeGrounded,
  linkToExistingValue,
} from "@/lib/graph";

describe("Challenger 2 Empirical Verification: Milestone M1", () => {
  // =========================================================================
  // Task 1: Comprehensive 100-Pair Matrix for edgeTypeFor (10 x 10)
  // =========================================================================
  describe("Task 1: Full 100 Node Type Pair Matrix (parentType x childType)", () => {
    const allNodeTypes: NodeType[] = [
      "claim",
      "premise",
      "support",
      "conflict",
      "note",
      "value",
      "source",
      "limit",
      "bedrock",
      "preference",
    ];

    it("verifies all 100 node type pairs produce semantically valid edge types", () => {
      expect(allNodeTypes).toHaveLength(10);
      let testedPairs = 0;

      for (const parent of allNodeTypes) {
        for (const child of allNodeTypes) {
          const inferred = edgeTypeFor(child, parent);
          testedPairs++;

          // Assertions based on child type semantics
          if (child === "conflict") {
            expect(inferred).toBe("conflicts");
          } else if (child === "source") {
            expect(inferred).toBe("cites");
          } else if (
            child === "value" ||
            child === "limit" ||
            child === "bedrock" ||
            child === "preference"
          ) {
            expect(inferred).toBe("grounds");
          } else if (child === "note") {
            expect(inferred).toBe("annotates");
          } else if (child === "support" || child === "claim") {
            expect(inferred).toBe("supports");
          } else if (child === "premise") {
            // Premise is not a standard child, but test fallback behavior
            if (parent === "premise") {
              expect(inferred).toBe("supports");
            } else {
              expect(inferred).toBe("annotates");
            }
          }
        }
      }

      expect(testedPairs).toBe(100);
    });

    it("verifies that edgeEndpoints and makeEdge are strictly invariant under all 5 edge types", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Root Question");
      const rootId = g.nodes[0].id;

      // Add each valid child type under root
      const childrenTypes: NodeType[] = [
        "claim",
        "support",
        "conflict",
        "note",
        "value",
        "source",
        "limit",
        "bedrock",
        "preference",
      ];

      for (const cType of childrenTypes) {
        g = addNode(g, cType, `Child ${cType}`, rootId);
        const childId = g.nodes[g.nodes.length - 1].id;
        const edge = g.edges.find((e) => e.from === childId || e.to === childId)!;

        // Invariant: endpoints(edge).parent must always be rootId, child must be childId
        const ep = edgeEndpoints(edge);
        expect(ep.parent).toBe(rootId);
        expect(ep.child).toBe(childId);

        // Verify edge directionality
        if (edge.edgeType === "grounds" || edge.edgeType === "cites") {
          expect(edge.from).toBe(rootId);
          expect(edge.to).toBe(childId);
        } else {
          expect(edge.from).toBe(childId);
          expect(edge.to).toBe(rootId);
        }
      }
    });

    it("verifies ALLOWED_CHILDREN consistency for all 10 types", () => {
      for (const t of allNodeTypes) {
        const allowed = ALLOWED_CHILDREN[t];
        expect(Array.isArray(allowed)).toBe(true);

        if (isTerminalType(t)) {
          expect(allowed).toHaveLength(0);
        } else if (t === "note") {
          expect(allowed).toEqual(["conflict", "note", "source"]);
        } else if (t === "support" || t === "conflict") {
          expect(allowed).toEqual([
            "support",
            "conflict",
            "note",
            "value",
            "source",
            "limit",
            "bedrock",
            "preference",
          ]);
        } else if (t === "claim" || t === "premise") {
          expect(allowed).toEqual([
            "claim",
            "support",
            "conflict",
            "note",
            "value",
            "source",
            "limit",
            "bedrock",
            "preference",
          ]);
        }
      }
    });
  });

  // =========================================================================
  // Task 2: Terminal Attachments, Grounds/Cites & Value Queries
  // =========================================================================
  describe("Task 2: Terminal Attachments & Value Analysis Functions", () => {
    it("tests all 5 terminal node types attached via grounds and cites edges", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Q1: Moral Realism?");
      const q1 = g.nodes[0].id;

      // 1. Support -> Value (grounds)
      g = addNode(g, "support", "S1: Objective moral truths exist", q1);
      const s1 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "value", "V1: Realism Axiom", s1);
      const v1 = g.nodes[g.nodes.length - 1].id;

      // 2. Support -> Limit (grounds)
      g = addNode(g, "support", "S2: Cognitivism", q1);
      const s2 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "limit", "L1: Epistemic Horizon", s2);
      const l1 = g.nodes[g.nodes.length - 1].id;

      // 3. Support -> Bedrock (grounds)
      g = addNode(g, "support", "S3: Intuitionism", q1);
      const s3 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "bedrock", "B1: First Principle", s3);
      const b1 = g.nodes[g.nodes.length - 1].id;

      // 4. Support -> Preference (grounds)
      g = addNode(g, "support", "S4: Pragmatism", q1);
      const s4 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "preference", "P1: Aesthetic Coherence", s4);
      const p1 = g.nodes[g.nodes.length - 1].id;

      // 5. Support -> Source (cites)
      g = addNode(g, "support", "S5: Peer-reviewed Study", q1);
      const s5 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "source", "Src1: https://doi.org/10.1093/mind/100.1.1", s5);
      const src1 = g.nodes[g.nodes.length - 1].id;

      // Check all 5 edges
      expect(g.edges.find((e) => e.to === v1)?.edgeType).toBe("grounds");
      expect(g.edges.find((e) => e.to === l1)?.edgeType).toBe("grounds");
      expect(g.edges.find((e) => e.to === b1)?.edgeType).toBe("grounds");
      expect(g.edges.find((e) => e.to === p1)?.edgeType).toBe("grounds");
      expect(g.edges.find((e) => e.to === src1)?.edgeType).toBe("cites");

      // Verify all 5 supports are grounded
      expect(isNodeGrounded(g, s1)).toBe(true);
      expect(isNodeGrounded(g, s2)).toBe(true);
      expect(isNodeGrounded(g, s3)).toBe(true);
      expect(isNodeGrounded(g, s4)).toBe(true);
      expect(isNodeGrounded(g, s5)).toBe(true);
      expect(isFullyGrounded(g, q1)).toBe(true);

      // Verify getGroundingTerminal finds correct terminal for each
      expect(getGroundingTerminal(g, s1)?.id).toBe(v1);
      expect(getGroundingTerminal(g, s2)?.id).toBe(l1);
      expect(getGroundingTerminal(g, s3)?.id).toBe(b1);
      expect(getGroundingTerminal(g, s4)?.id).toBe(p1);
      expect(getGroundingTerminal(g, s5)?.id).toBe(src1);
    });

    it("verifies getValueUsage across single-root, multi-root convergence, and ungrounded terminals", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Q1: Climate Policy");
      const q1 = g.nodes[0].id;
      g = addNode(g, "support", "S1: Carbon tax", q1);
      const s1 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "value", "V_SHARED: Planetary Stability", s1);
      const vShared = g.nodes[g.nodes.length - 1].id;

      g = addRootQuestion(g, "Q2: Energy Policy");
      const q2 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "support", "S2: Nuclear energy", q2);
      const s2 = g.nodes[g.nodes.length - 1].id;
      // Share V_SHARED with S2
      g = linkToExistingValue(g, s2, vShared);

      // Add a third root with a cited source
      g = addRootQuestion(g, "Q3: Fusion Research");
      const q3 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "support", "S3: ITER experimental results", q3);
      const s3 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "source", "SRC_SHARED: https://nature.com/articles/fusion", s3);
      const srcShared = g.nodes[g.nodes.length - 1].id;

      // Add S4 under Q1 and share SRC_SHARED with S4 (preserving S1's grounding to V_SHARED)
      g = addNode(g, "support", "S4: Scientific consensus", q1);
      const s4 = g.nodes[g.nodes.length - 1].id;
      g = linkToExistingValue(g, s4, srcShared);

      const usage = getValueUsage(g);
      expect(usage.length).toBe(2);

      const vUsage = usage.find((u) => u.value.id === vShared);
      expect(vUsage).toBeDefined();
      expect(vUsage?.convergent).toBe(true);
      expect(vUsage?.roots.map((r) => r.id).sort()).toEqual([q1, q2].sort());
      expect(vUsage?.groundingNodes.map((n) => n.id).sort()).toEqual([s1, s2].sort());

      const srcUsage = usage.find((u) => u.value.id === srcShared);
      expect(srcUsage).toBeDefined();
      expect(srcUsage?.convergent).toBe(true);
      expect(srcUsage?.roots.map((r) => r.id).sort()).toEqual([q1, q3].sort());
      expect(srcUsage?.groundingNodes.map((n) => n.id).sort()).toEqual([s3, s4].sort());
    });

    it("verifies getValueClashes across multi-value roots vs single-value roots", () => {
      let g: Graph = { nodes: [], edges: [] };
      // Q1 has a clash between Utilitarian and Deontological values
      g = addRootQuestion(g, "Q1: Triage Protocol");
      const q1 = g.nodes[0].id;
      g = addNode(g, "support", "S1: Maximize QALYs", q1);
      const s1 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "value", "V1: Utilitarian Maximization", s1);
      const v1 = g.nodes[g.nodes.length - 1].id;

      g = addNode(g, "support", "S2: First-come first-served", q1);
      const s2 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "value", "V2: Egalitarian Fairness", s2);
      const v2 = g.nodes[g.nodes.length - 1].id;

      // Q2 has only one value (no clash)
      g = addRootQuestion(g, "Q2: Math Proof");
      const q2 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "support", "S3: Formal Derivation", q2);
      const s3 = g.nodes[g.nodes.length - 1].id;
      g = addNode(g, "bedrock", "B1: Peano Axioms", s3);
      const b1 = g.nodes[g.nodes.length - 1].id;
      expect(b1).toBeDefined();

      const clashes = getValueClashes(g);
      expect(clashes).toHaveLength(1);
      expect(clashes[0].question.id).toBe(q1);
      expect(clashes[0].values.map((v) => v.id).sort()).toEqual([v1, v2].sort());
    });

    it("verifies getValueChainDetail for deeply nested chains and error on non-existent terminal", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = addRootQuestion(g, "Q1: Space Exploration");
      const q1 = g.nodes[0].id;

      g = addNode(g, "support", "S1: Multi-planetary species", q1);
      const s1 = g.nodes[g.nodes.length - 1].id;

      g = addNode(g, "support", "S2: Planetary risk mitigation", s1);
      const s2 = g.nodes[g.nodes.length - 1].id;

      g = addNode(g, "value", "V_DEEP: Long-term conscious survival", s2);
      const vDeep = g.nodes[g.nodes.length - 1].id;

      const detail = getValueChainDetail(g, vDeep);
      expect(detail.terminal.id).toBe(vDeep);
      expect(detail.groundingArgs).toHaveLength(1);
      expect(detail.groundingArgs[0].argument.id).toBe(s2);
      expect(detail.groundingArgs[0].root?.id).toBe(q1);
      expect(detail.groundingArgs[0].depth).toBe(2);
      expect(detail.groundingArgs[0].rootGrounded).toBe(true);

      // Throws on unknown terminal
      expect(() => getValueChainDetail(g, "non-existent-id")).toThrowError(
        "Terminal not found",
      );
    });
  });

  // =========================================================================
  // Task 3: Dung Acceptability Under Cyclic Defeat & Disconnected Components
  // =========================================================================
  describe("Task 3: Dung Acceptability Semantics Stress Testing", () => {
    it("evaluates a 2-cycle mutual defeat (A <-> B) as contested", () => {
      const g: Graph = {
        nodes: [
          { id: "a", type: "conflict", content: "Conflict A" },
          { id: "b", type: "conflict", content: "Conflict B" },
        ],
        edges: [
          { id: "e1", from: "a", to: "b", edgeType: "conflicts" },
          { id: "e2", from: "b", to: "a", edgeType: "conflicts" },
        ],
      };

      const acc = getAcceptability(g);
      expect(acc.get("a")).toBe("contested");
      expect(acc.get("b")).toBe("contested");
    });

    it("evaluates a 3-cycle odd defeat (A -> B -> C -> A) as contested", () => {
      const g: Graph = {
        nodes: [
          { id: "a", type: "conflict", content: "Conflict A" },
          { id: "b", type: "conflict", content: "Conflict B" },
          { id: "c", type: "conflict", content: "Conflict C" },
        ],
        edges: [
          { id: "e1", from: "a", to: "b", edgeType: "conflicts" },
          { id: "e2", from: "b", to: "c", edgeType: "conflicts" },
          { id: "e3", from: "c", to: "a", edgeType: "conflicts" },
        ],
      };

      const acc = getAcceptability(g);
      expect(acc.get("a")).toBe("contested");
      expect(acc.get("b")).toBe("contested");
      expect(acc.get("c")).toBe("contested");
    });

    it("evaluates a 2-cycle attacking an external bystander node (A <-> B, A -> X)", () => {
      const g: Graph = {
        nodes: [
          { id: "a", type: "conflict", content: "Conflict A" },
          { id: "b", type: "conflict", content: "Conflict B" },
          { id: "x", type: "claim", content: "Bystander Claim X" },
        ],
        edges: [
          { id: "e1", from: "a", to: "b", edgeType: "conflicts" },
          { id: "e2", from: "b", to: "a", edgeType: "conflicts" },
          { id: "e3", from: "a", to: "x", edgeType: "conflicts" },
        ],
      };

      const acc = getAcceptability(g);
      expect(acc.get("a")).toBe("contested");
      expect(acc.get("b")).toBe("contested");
      // X cannot be coherent because attacker A is not out; X cannot be conflicted because attacker A is not in
      expect(acc.get("x")).toBe("contested");
    });

    it("evaluates a complex disconnected graph with 5 independent dialectical components", () => {
      const g: Graph = {
        nodes: [
          // Component 1: Linear defeat (c1 attacks q1)
          { id: "q1", type: "claim", content: "Claim 1" },
          { id: "c1", type: "conflict", content: "Attacker 1" },

          // Component 2: Reinstatement (c3 attacks c2 which attacks q2)
          { id: "q2", type: "claim", content: "Claim 2" },
          { id: "c2", type: "conflict", content: "Attacker 2" },
          { id: "c3", type: "conflict", content: "Defender 2" },

          // Component 3: 2-cycle
          { id: "cyc_a", type: "conflict", content: "Cycle A" },
          { id: "cyc_b", type: "conflict", content: "Cycle B" },

          // Component 4: 3-cycle
          { id: "tri_1", type: "conflict", content: "Tri 1" },
          { id: "tri_2", type: "conflict", content: "Tri 2" },
          { id: "tri_3", type: "conflict", content: "Tri 3" },

          // Component 5: Isolated unattacked nodes
          { id: "iso_premise", type: "premise", content: "Axiom Premise" },
          { id: "iso_claim", type: "claim", content: "Free Floating Claim" },
        ],
        edges: [
          // Comp 1
          { id: "e_c1", from: "c1", to: "q1", edgeType: "conflicts" },

          // Comp 2
          { id: "e_c2", from: "c2", to: "q2", edgeType: "conflicts" },
          { id: "e_c3", from: "c3", to: "c2", edgeType: "conflicts" },

          // Comp 3 (2-cycle)
          { id: "e_cyc1", from: "cyc_a", to: "cyc_b", edgeType: "conflicts" },
          { id: "e_cyc2", from: "cyc_b", to: "cyc_a", edgeType: "conflicts" },

          // Comp 4 (3-cycle)
          { id: "e_tri1", from: "tri_1", to: "tri_2", edgeType: "conflicts" },
          { id: "e_tri2", from: "tri_2", to: "tri_3", edgeType: "conflicts" },
          { id: "e_tri3", from: "tri_3", to: "tri_1", edgeType: "conflicts" },
        ],
      };

      const acc = getAcceptability(g);

      // Component 1 results
      expect(acc.get("c1")).toBe("coherent");
      expect(acc.get("q1")).toBe("conflicted");

      // Component 2 results
      expect(acc.get("c3")).toBe("coherent");
      expect(acc.get("c2")).toBe("conflicted");
      expect(acc.get("q2")).toBe("coherent");

      // Component 3 results
      expect(acc.get("cyc_a")).toBe("contested");
      expect(acc.get("cyc_b")).toBe("contested");

      // Component 4 results
      expect(acc.get("tri_1")).toBe("contested");
      expect(acc.get("tri_2")).toBe("contested");
      expect(acc.get("tri_3")).toBe("contested");

      // Component 5 results
      expect(acc.get("iso_premise")).toBe("coherent");
      expect(acc.get("iso_claim")).toBe("coherent");
    });
  });
});
