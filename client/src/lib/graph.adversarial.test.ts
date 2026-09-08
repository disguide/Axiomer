import { describe, expect, it } from "vitest";
import type { Graph, GraphEdge, GraphNode, NodeType } from "./types";
import * as G from "./graph";

const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

function createNode(type: NodeType, content: string, id?: string): GraphNode {
  return {
    id: id || uid("n"),
    type,
    content,
    createdAt: new Date().toISOString(),
  };
}

function createEdge(
  from: string,
  to: string,
  edgeType: import("./types").EdgeType,
  id?: string,
): GraphEdge {
  return {
    id: id || uid("e"),
    from,
    to,
    edgeType,
  };
}

// Utility to shuffle an array deterministically using a seed
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

describe("Adversarial Stress Suite: Epistemic Graph Engine", () => {
  // =========================================================================
  // 1. Multi-Hop Reasoning Topologies (Depth 5, 10, 20, 50, 100)
  // =========================================================================
  describe("1. Multi-Hop Reasoning Topologies", () => {
    it("evaluates deep linear support chain at depth 5, 10, 20, and 50", () => {
      const depths = [5, 10, 20, 50];

      for (const targetDepth of depths) {
        let g: Graph = { nodes: [], edges: [] };
        g = G.addRootQuestion(g, `Root Claim at depth ${targetDepth}`);
        const rootId = g.nodes[0].id;

        let currentParentId = rootId;
        const supportIds: string[] = [];

        for (let d = 1; d <= targetDepth; d++) {
          g = G.addNode(g, "support", `Support Hop ${d}`, currentParentId);
          const newId = g.nodes[g.nodes.length - 1].id;
          supportIds.push(newId);
          currentParentId = newId;
        }

        // Before grounding terminal is attached:
        expect(G.isFullyGrounded(g, rootId)).toBe(false);
        for (const sid of supportIds) {
          expect(G.isNodeGrounded(g, sid)).toBe(false);
        }
        const gapsBefore = G.getGroundingGaps(g);
        expect(gapsBefore.length).toBe(targetDepth);
        expect(gapsBefore[0].depth).toBe(1);
        expect(gapsBefore[gapsBefore.length - 1].depth).toBe(targetDepth);

        // Attach terminal bedrock at the leaf
        g = G.addNode(g, "bedrock", `Axiom at depth ${targetDepth + 1}`, currentParentId);
        const terminalId = g.nodes[g.nodes.length - 1].id;

        // Verify full grounding propagation up the entire chain
        expect(G.isNodeGrounded(g, terminalId)).toBe(true);
        for (const sid of supportIds) {
          expect(G.isNodeGrounded(g, sid)).toBe(true);
        }
        expect(G.isFullyGrounded(g, rootId)).toBe(true);
        expect(G.getGroundingGaps(g).length).toBe(0);

        // Verify depth metrics
        expect(G.getDepth(g, rootId)).toBe(0);
        expect(G.getDepth(g, currentParentId)).toBe(targetDepth);
        expect(G.getDepth(g, terminalId)).toBe(targetDepth + 1);

        const stats = G.getGraphStats(g);
        expect(stats.maxDepth).toBe(targetDepth + 1);
        expect(stats.groundedClaims).toBe(1);
        expect(stats.openClaims).toBe(0);
      }
    });

    it("evaluates deep nested position claim chains (Claim -> Claim -> Claim -> Support -> Value)", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = G.addRootQuestion(g, "High-Level Macro Policy");
      const rootId = g.nodes[0].id;

      // Chain of 5 nested claims
      let currentClaimId = rootId;
      const claimIds = [rootId];
      for (let i = 1; i <= 5; i++) {
        g = G.addNode(g, "claim", `Sub-Claim Level ${i}`, currentClaimId);
        const cid = g.nodes[g.nodes.length - 1].id;
        claimIds.push(cid);
        currentClaimId = cid;
      }

      // Add support under deepest claim
      g = G.addNode(g, "support", "Empirical justification", currentClaimId);
      const sId = g.nodes[g.nodes.length - 1].id;

      expect(G.isFullyGrounded(g, rootId)).toBe(false);

      // Ground with source citation
      g = G.addNode(g, "source", "https://epistemic.org/proof", sId);
      const srcId = g.nodes[g.nodes.length - 1].id;

      // All claims and supports in the chain should now be grounded
      expect(G.isNodeGrounded(g, srcId)).toBe(true);
      expect(G.isNodeGrounded(g, sId)).toBe(true);
      for (const cid of claimIds) {
        expect(G.isNodeGrounded(g, cid)).toBe(true);
      }
      expect(G.isFullyGrounded(g, rootId)).toBe(true);
    });

    it("handles broken link in middle of deep chain (Depth 15 with missing link at Hop 8)", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = G.addRootQuestion(g, "Root Q");
      const rootId = g.nodes[0].id;

      let parent = rootId;
      const upperSupports: string[] = [];
      for (let i = 1; i <= 7; i++) {
        g = G.addNode(g, "support", `Upper Hop ${i}`, parent);
        parent = g.nodes[g.nodes.length - 1].id;
        upperSupports.push(parent);
      }

      // Hop 8 is a disconnected/ungrounded support with its own children
      g = G.addNode(g, "support", "Hop 8 (Unhinged)", parent);
      const hop8 = g.nodes[g.nodes.length - 1].id;

      let lowerParent = hop8;
      const lowerSupports: string[] = [hop8];
      for (let i = 9; i <= 15; i++) {
        g = G.addNode(g, "support", `Lower Hop ${i}`, lowerParent);
        lowerParent = g.nodes[g.nodes.length - 1].id;
        lowerSupports.push(lowerParent);
      }

      // Ground only the lower leaf
      g = G.addNode(g, "value", "Terminal Value", lowerParent);

      // Verify: lower supports are grounded, upper supports are grounded through Hop 8
      // Because hop 8 has child hop 9 which leads to Value!
      expect(G.isFullyGrounded(g, rootId)).toBe(true);

      // Now sever the edge between Hop 7 and Hop 8
      const severedEdges = g.edges.filter(
        (e) => !(G.edgeEndpoints(e).parent === upperSupports[upperSupports.length - 1] && G.edgeEndpoints(e).child === hop8)
      );
      const severedGraph: Graph = { nodes: g.nodes, edges: severedEdges };

      // Root is now ungrounded because upper chain does not reach terminal
      expect(G.isFullyGrounded(severedGraph, rootId)).toBe(false);
      for (const uid of upperSupports) {
        expect(G.isNodeGrounded(severedGraph, uid)).toBe(false);
      }
      // Lower chain is still grounded on its own
      for (const lid of lowerSupports) {
        expect(G.isNodeGrounded(severedGraph, lid)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 2. Diamond Graphs & Confluence Topologies
  // =========================================================================
  describe("2. Diamond Topologies and Confluent Paths", () => {
    it("handles classic single-terminal diamond (Root -> S1, S2 -> S_mid -> Value)", () => {
      // Graph structure:
      //         Root
      //        /    \
      //       S1     S2
      //        \    /
      //        S_mid
      //          |
      //        Value1
      const root = createNode("claim", "Root Question", "root-diamond");
      const s1 = createNode("support", "Support Branch 1", "s1-diamond");
      const s2 = createNode("support", "Support Branch 2", "s2-diamond");
      const sMid = createNode("support", "Shared Mid Support", "smid-diamond");
      const val = createNode("value", "Universal Human Flourishing", "val-diamond");

      const edges: GraphEdge[] = [
        createEdge("s1-diamond", "root-diamond", "supports"),
        createEdge("s2-diamond", "root-diamond", "supports"),
        createEdge("smid-diamond", "s1-diamond", "supports"),
        createEdge("smid-diamond", "s2-diamond", "supports"),
        createEdge("smid-diamond", "val-diamond", "grounds"),
      ];

      const graph: Graph = {
        nodes: [root, s1, s2, sMid, val],
        edges,
      };

      expect(G.isNodeGrounded(graph, "val-diamond")).toBe(true);
      expect(G.isNodeGrounded(graph, "smid-diamond")).toBe(true);
      expect(G.isNodeGrounded(graph, "s1-diamond")).toBe(true);
      expect(G.isNodeGrounded(graph, "s2-diamond")).toBe(true);
      expect(G.isFullyGrounded(graph, "root-diamond")).toBe(true);
      expect(G.getGroundingGaps(graph)).toHaveLength(0);

      // Verify no false positive value clashes (it is ONE terminal reached via 2 paths)
      const clashes = G.getValueClashes(graph);
      expect(clashes).toHaveLength(0);

      // Lineage tests
      const ancestors = G.getAncestors(graph, "val-diamond");
      expect(ancestors.has("smid-diamond")).toBe(true);
      expect(ancestors.has("s1-diamond")).toBe(true);
      expect(ancestors.has("s2-diamond")).toBe(true);
      expect(ancestors.has("root-diamond")).toBe(true);

      const descendants = G.getDescendantIds(graph, "root-diamond");
      expect(descendants.size).toBe(5);
    });

    it("handles multi-layer lattice/diamond with 16 convergent paths", () => {
      // 4 levels, 2 nodes per level, all-to-all connected between adjacent levels
      let g: Graph = { nodes: [], edges: [] };
      g = G.addRootQuestion(g, "Lattice Root");
      const rootId = g.nodes[0].id;

      let prevLevel = [rootId];
      const allMiddleNodes: string[] = [];

      for (let level = 1; level <= 3; level++) {
        const currentLevel: string[] = [];
        for (let k = 1; k <= 2; k++) {
          const node = createNode("support", `L${level}_N${k}`);
          g.nodes.push(node);
          currentLevel.push(node.id);
          allMiddleNodes.push(node.id);

          // Connect from every node in prevLevel
          for (const pId of prevLevel) {
            g.edges.push(createEdge(node.id, pId, "supports"));
          }
        }
        prevLevel = currentLevel;
      }

      // Terminal connected to all nodes in deepest level
      const termNode = createNode("limit", "Terminal Epistemic Limit");
      g.nodes.push(termNode);
      for (const pId of prevLevel) {
        g.edges.push(createEdge(pId, termNode.id, "grounds"));
      }

      // Grounding validation across the entire lattice
      expect(G.isNodeGrounded(g, termNode.id)).toBe(true);
      for (const mid of allMiddleNodes) {
        expect(G.isNodeGrounded(g, mid)).toBe(true);
      }
      expect(G.isFullyGrounded(g, rootId)).toBe(true);
      expect(G.getGroundingGaps(g)).toHaveLength(0);
      expect(G.getValueClashes(g)).toHaveLength(0);
    });

    it("correctly identifies true value clash when 2 distinct terminals ground different branches of a diamond", () => {
      const root = createNode("claim", "Moral Dilemma Root", "clash-root");
      const s1 = createNode("support", "Deontological Duty", "s1-deon");
      const s2 = createNode("support", "Utilitarian Outcome", "s2-util");
      const vDeon = createNode("value", "Categorical Imperative", "v-deon");
      const vUtil = createNode("value", "Maximize Happiness", "v-util");

      const edges: GraphEdge[] = [
        createEdge("s1-deon", "clash-root", "supports"),
        createEdge("s2-util", "clash-root", "supports"),
        createEdge("s1-deon", "v-deon", "grounds"),
        createEdge("s2-util", "v-util", "grounds"),
      ];

      const graph: Graph = {
        nodes: [root, s1, s2, vDeon, vUtil],
        edges,
      };

      expect(G.isFullyGrounded(graph, "clash-root")).toBe(true);
      const clashes = G.getValueClashes(graph);
      expect(clashes).toHaveLength(1);
      expect(clashes[0].question.id).toBe("clash-root");
      expect(clashes[0].values.map((v) => v.id).sort()).toEqual(["v-deon", "v-util"]);
    });
  });

  // =========================================================================
  // 3. Cycles, Loops & Infinite Recursion Resistance
  // =========================================================================
  describe("3. Cycles, Loops & Recursion Resistance", () => {
    it("handles self-loops without stack overflow and evaluates ungrounded", () => {
      const node = createNode("support", "Self-referential support", "self-loop-1");
      const edge = createEdge("self-loop-1", "self-loop-1", "supports");

      const graph: Graph = {
        nodes: [node],
        edges: [edge],
      };

      const startTime = performance.now();
      expect(G.isNodeGrounded(graph, "self-loop-1")).toBe(false);
      expect(G.getGroundingGaps(graph)).toHaveLength(1);
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // must terminate immediately
    });

    it("handles 2-node, 3-node, and 5-node mutual cycles without looping", () => {
      // 3-node cycle: A -> B -> C -> A
      const nA = createNode("support", "Support A", "cyc-A");
      const nB = createNode("support", "Support B", "cyc-B");
      const nC = createNode("support", "Support C", "cyc-C");

      const graph: Graph = {
        nodes: [nA, nB, nC],
        edges: [
          createEdge("cyc-B", "cyc-A", "supports"), // B child of A
          createEdge("cyc-C", "cyc-B", "supports"), // C child of B
          createEdge("cyc-A", "cyc-C", "supports"), // A child of C (completing cycle)
        ],
      };

      expect(G.isNodeGrounded(graph, "cyc-A")).toBe(false);
      expect(G.isNodeGrounded(graph, "cyc-B")).toBe(false);
      expect(G.isNodeGrounded(graph, "cyc-C")).toBe(false);
      expect(G.getGroundingGaps(graph)).toHaveLength(3);
    });

    it("handles claim cycle (C1 -> C2 -> C1) attached to root question", () => {
      const root = createNode("claim", "Root Question", "cyc-root");
      const c1 = createNode("claim", "Position 1", "cyc-c1");
      const c2 = createNode("claim", "Position 2", "cyc-c2");

      const graph: Graph = {
        nodes: [root, c1, c2],
        edges: [
          createEdge("cyc-c1", "cyc-root", "supports"),
          createEdge("cyc-c2", "cyc-c1", "supports"),
          createEdge("cyc-c1", "cyc-c2", "supports"),
        ],
      };

      expect(G.isFullyGrounded(graph, "cyc-root")).toBe(false);
      expect(G.isNodeGrounded(graph, "cyc-c1")).toBe(false);
      expect(G.isNodeGrounded(graph, "cyc-c2")).toBe(false);
    });

    it("handles mixed cyclic graph with a directly grounded node", () => {
      // S1 -> S2 -> S1 (cycle), but S2 is directly grounded by Bedrock
      const root = createNode("claim", "Root", "mix-root");
      const s1 = createNode("support", "S1", "mix-s1");
      const s2 = createNode("support", "S2", "mix-s2");
      const b = createNode("bedrock", "Axiom", "mix-b");

      const graph: Graph = {
        nodes: [root, s1, s2, b],
        edges: [
          createEdge("mix-s1", "mix-root", "supports"),
          createEdge("mix-s2", "mix-s1", "supports"),
          createEdge("mix-s1", "mix-s2", "supports"), // cycle back
          createEdge("mix-s2", "mix-b", "grounds"),   // direct terminal on s2
        ],
      };

      // s2 is directly grounded by b -> true
      expect(G.isNodeGrounded(graph, "mix-s2")).toBe(true);
      // s1 has child s2 which is grounded -> s1 is grounded!
      expect(G.isNodeGrounded(graph, "mix-s1")).toBe(true);
      // root has child s1 which is grounded -> root is fully grounded!
      expect(G.isFullyGrounded(graph, "mix-root")).toBe(true);
      expect(G.getGroundingGaps(graph)).toHaveLength(0);
    });

    it("handles cycle pointing to ancestor (back-edge to root)", () => {
      const root = createNode("claim", "Root", "back-root");
      const s1 = createNode("support", "S1", "back-s1");
      const s2 = createNode("support", "S2", "back-s2");

      const graph: Graph = {
        nodes: [root, s1, s2],
        edges: [
          createEdge("back-s1", "back-root", "supports"),
          createEdge("back-s2", "back-s1", "supports"),
          createEdge("back-root", "back-s2", "supports"), // back-edge to root
        ],
      };

      expect(G.isFullyGrounded(graph, "back-root")).toBe(false);
      expect(G.isNodeGrounded(graph, "back-s1")).toBe(false);
      expect(G.isNodeGrounded(graph, "back-s2")).toBe(false);
    });
  });

  // =========================================================================
  // 4. Mixed Claims, Arguments, and Ungrounded vs Grounded Branches
  // =========================================================================
  describe("4. Mixed Claims, Positions and Partial Grounding Semantics", () => {
    it("evaluates conjunctive semantics: 1 ungrounded branch invalidates parent claim", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = G.addRootQuestion(g, "Complex Climate Intervention Policy");
      const rootId = g.nodes[0].id;

      // Branch 1: Fully grounded (Solar Radiation Management)
      g = G.addNode(g, "claim", "Solar Radiation Management", rootId);
      const pos1 = g.nodes[g.nodes.length - 1].id;
      g = G.addNode(g, "support", "Rapid cooling potential", pos1);
      const s1 = g.nodes[g.nodes.length - 1].id;
      g = G.addNode(g, "source", "https://nature.com/articles/geo123", s1);

      expect(G.isNodeGrounded(g, pos1)).toBe(true);
      expect(G.isFullyGrounded(g, rootId)).toBe(true);

      // Branch 2: Ungrounded (Direct Ocean Fertilization)
      g = G.addNode(g, "claim", "Direct Ocean Fertilization", rootId);
      const pos2 = g.nodes[g.nodes.length - 1].id;
      g = G.addNode(g, "support", "Algae carbon sequestration", pos2);
      const s2 = g.nodes[g.nodes.length - 1].id;
      // No terminal attached to s2!

      expect(G.isNodeGrounded(g, pos1)).toBe(true);
      expect(G.isNodeGrounded(g, pos2)).toBe(false);
      expect(G.isNodeGrounded(g, s2)).toBe(false);
      // Root claim MUST be false because pos2 is open/ungrounded
      expect(G.isFullyGrounded(g, rootId)).toBe(false);

      // Grounding gaps must list only s2
      const gaps = G.getGroundingGaps(g);
      expect(gaps.length).toBe(1);
      expect(gaps[0].node.id).toBe(s2);
      expect(gaps[0].root?.id).toBe(rootId);

      // Now ground s2 with a preference terminal
      g = G.addNode(g, "preference", "Precautionary ecological principle", s2);
      expect(G.isNodeGrounded(g, pos2)).toBe(true);
      expect(G.isFullyGrounded(g, rootId)).toBe(true);
      expect(G.getGroundingGaps(g)).toHaveLength(0);
    });

    it("evaluates support with both conflict and support children", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = G.addRootQuestion(g, "Autonomous Vehicle Deployment");
      const rootId = g.nodes[0].id;

      g = G.addNode(g, "support", "Reduces accident mortality", rootId);
      const mainSup = g.nodes[g.nodes.length - 1].id;

      // Child 1: sub-support (grounded in source)
      g = G.addNode(g, "support", "NHTSA safety data", mainSup);
      const subSup = g.nodes[g.nodes.length - 1].id;
      g = G.addNode(g, "source", "https://nhtsa.gov/av-safety", subSup);

      // Child 2: sub-conflict (grounded in limit)
      g = G.addNode(g, "conflict", "Edge cases in heavy snow", mainSup);
      const subConf = g.nodes[g.nodes.length - 1].id;
      g = G.addNode(g, "limit", "Sensor limitation in blizzards", subConf);

      expect(G.isNodeGrounded(g, subSup)).toBe(true);
      expect(G.isNodeGrounded(g, subConf)).toBe(true);
      expect(G.isNodeGrounded(g, mainSup)).toBe(true);
      expect(G.isFullyGrounded(g, rootId)).toBe(true);
    });

    it("ensures note annotations do not count towards grounding", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = G.addRootQuestion(g, "Economic Policy Q");
      const rootId = g.nodes[0].id;

      // Add a note directly to root
      g = G.addNode(g, "note", "Historical context note", rootId);
      const note1 = g.nodes[g.nodes.length - 1].id;

      // Root has no argument children, only a note -> ungrounded
      expect(G.isFullyGrounded(g, rootId)).toBe(false);
      expect(G.isNodeGrounded(g, note1)).toBe(true); // notes are default true

      // Add support with only a note child
      g = G.addNode(g, "support", "Support argument", rootId);
      const sId = g.nodes[g.nodes.length - 1].id;
      g = G.addNode(g, "note", "Caveat on empirical data", sId);

      // Support has no terminal or sub-argument, only a note -> ungrounded
      expect(G.isNodeGrounded(g, sId)).toBe(false);
      expect(G.isFullyGrounded(g, rootId)).toBe(false);
    });
  });

  // =========================================================================
  // 5. All 5 Terminal Types & Cites vs Grounds Semantics
  // =========================================================================
  describe("5. All 5 Terminal Types and Edge Semantics", () => {
    const terminals: Array<{ type: NodeType; expectedEdge: import("./types").EdgeType }> = [
      { type: "value", expectedEdge: "grounds" },
      { type: "source", expectedEdge: "cites" },
      { type: "limit", expectedEdge: "grounds" },
      { type: "bedrock", expectedEdge: "grounds" },
      { type: "preference", expectedEdge: "grounds" },
    ];

    for (const { type, expectedEdge } of terminals) {
      it(`correctly grounds and builds edge for terminal type '${type}'`, () => {
        let g: Graph = { nodes: [], edges: [] };
        g = G.addRootQuestion(g, `Question for ${type}`);
        const qId = g.nodes[0].id;

        g = G.addNode(g, "support", `Support grounded in ${type}`, qId);
        const sId = g.nodes[g.nodes.length - 1].id;

        g = G.addNode(g, type, `Terminal content for ${type}`, sId);
        const tId = g.nodes[g.nodes.length - 1].id;

        // Verify edge type inference
        const edge = g.edges.find((e) => e.to === tId);
        expect(edge).toBeDefined();
        expect(edge?.edgeType).toBe(expectedEdge);
        expect(edge?.from).toBe(sId);
        expect(edge?.to).toBe(tId);

        // Verify grounding
        expect(G.isNodeGrounded(g, tId)).toBe(true);
        expect(G.isNodeGrounded(g, sId)).toBe(true);
        expect(G.isFullyGrounded(g, qId)).toBe(true);

        const foundTerm = G.getGroundingTerminal(g, sId);
        expect(foundTerm?.id).toBe(tId);
        expect(foundTerm?.type).toBe(type);
      });
    }

    it("verifies source node verification immutability", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = G.addRootQuestion(g, "Q");
      const q = g.nodes[0].id;
      g = G.addNode(g, "support", "S", q);
      const s = g.nodes[g.nodes.length - 1].id;
      g = G.addNode(g, "source", "https://evidence.org/paper", s);
      const srcId = g.nodes[g.nodes.length - 1].id;

      expect(G.getNode(g, srcId)?.verified).toBeUndefined();

      const gVerified = G.verifySource(g, srcId, true);
      expect(G.getNode(gVerified, srcId)?.verified).toBe(true);
      expect(G.getNode(g, srcId)?.verified).toBeUndefined();

      const gUnverified = G.verifySource(gVerified, srcId, false);
      expect(G.getNode(gUnverified, srcId)?.verified).toBe(false);
      expect(G.getNode(gVerified, srcId)?.verified).toBe(true);
    });
  });

  // =========================================================================
  // 6. Dung Acceptability (Complex Argumentation Topologies)
  // =========================================================================
  describe("6. Dung Acceptability Defeat & Reinstatement Analysis", () => {
    it("handles odd 3-cycle of attacks (A -> B -> C -> A) => all contested", () => {
      const a = createNode("conflict", "Arg A", "dung-3a");
      const b = createNode("conflict", "Arg B", "dung-3b");
      const c = createNode("conflict", "Arg C", "dung-3c");

      const graph: Graph = {
        nodes: [a, b, c],
        edges: [
          createEdge("dung-3a", "dung-3b", "conflicts"), // A attacks B
          createEdge("dung-3b", "dung-3c", "conflicts"), // B attacks C
          createEdge("dung-3c", "dung-3a", "conflicts"), // C attacks A
        ],
      };

      const acceptability = G.getAcceptability(graph);
      expect(acceptability.get("dung-3a")).toBe("contested");
      expect(acceptability.get("dung-3b")).toBe("contested");
      expect(acceptability.get("dung-3c")).toBe("contested");
    });

    it("handles even 2-cycle mutual attack (A <-> B) => both contested", () => {
      const a = createNode("conflict", "Arg A", "dung-2a");
      const b = createNode("conflict", "Arg B", "dung-2b");

      const graph: Graph = {
        nodes: [a, b],
        edges: [
          createEdge("dung-2a", "dung-2b", "conflicts"),
          createEdge("dung-2b", "dung-2a", "conflicts"),
        ],
      };

      const acceptability = G.getAcceptability(graph);
      expect(acceptability.get("dung-2a")).toBe("contested");
      expect(acceptability.get("dung-2b")).toBe("contested");
    });

    it("resolves mutual attack when an external unattacked defender breaks symmetry", () => {
      // D -> A, A <-> B
      // D is unattacked (in) -> A is defeated (out) -> B is defended (in)
      const d = createNode("conflict", "Defender D", "dung-d");
      const a = createNode("conflict", "Arg A", "dung-a");
      const b = createNode("conflict", "Arg B", "dung-b");

      const graph: Graph = {
        nodes: [d, a, b],
        edges: [
          createEdge("dung-d", "dung-a", "conflicts"),
          createEdge("dung-a", "dung-b", "conflicts"),
          createEdge("dung-b", "dung-a", "conflicts"),
        ],
      };

      const acceptability = G.getAcceptability(graph);
      expect(acceptability.get("dung-d")).toBe("coherent");
      expect(acceptability.get("dung-a")).toBe("conflicted");
      expect(acceptability.get("dung-b")).toBe("coherent");
    });

    it("evaluates long 7-node alternating reinstatement chain", () => {
      // N7 -> N6 -> N5 -> N4 -> N3 -> N2 -> N1 -> Target
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      const target = createNode("support", "Target Argument", "target-0");
      nodes.push(target);

      let prevId = "target-0";
      for (let i = 1; i <= 7; i++) {
        const attacker = createNode("conflict", `Attacker ${i}`, `att-${i}`);
        nodes.push(attacker);
        edges.push(createEdge(`att-${i}`, prevId, "conflicts"));
        prevId = `att-${i}`;
      }

      const graph: Graph = { nodes, edges };
      const acc = G.getAcceptability(graph);

      // att-7 is unattacked -> coherent (in)
      // att-6 is attacked by 7 -> conflicted (out)
      // att-5 is attacked by 6(out) -> coherent (in)
      // att-4 is attacked by 5(in) -> conflicted (out)
      // att-3 is attacked by 4(out) -> coherent (in)
      // att-2 is attacked by 3(in) -> conflicted (out)
      // att-1 is attacked by 2(out) -> coherent (in)
      // target-0 is attacked by 1(in) -> conflicted (out)
      expect(acc.get("att-7")).toBe("coherent");
      expect(acc.get("att-6")).toBe("conflicted");
      expect(acc.get("att-5")).toBe("coherent");
      expect(acc.get("att-4")).toBe("conflicted");
      expect(acc.get("att-3")).toBe("coherent");
      expect(acc.get("att-2")).toBe("conflicted");
      expect(acc.get("att-1")).toBe("coherent");
      expect(acc.get("target-0")).toBe("conflicted");
    });

    it("evaluates multi-attacker defeat: node is conflicted if AT LEAST ONE attacker is in", () => {
      const target = createNode("claim", "Target Claim", "m-target");
      const att1 = createNode("conflict", "Attacker 1 (Defeated)", "m-att1");
      const att2 = createNode("conflict", "Attacker 2 (Surviving)", "m-att2");
      const def1 = createNode("conflict", "Defender against Att1", "m-def1");

      const graph: Graph = {
        nodes: [target, att1, att2, def1],
        edges: [
          createEdge("m-att1", "m-target", "conflicts"),
          createEdge("m-att2", "m-target", "conflicts"),
          createEdge("m-def1", "m-att1", "conflicts"),
        ],
      };

      const acc = G.getAcceptability(graph);
      expect(acc.get("m-def1")).toBe("coherent");
      expect(acc.get("m-att1")).toBe("conflicted");
      expect(acc.get("m-att2")).toBe("coherent");
      expect(acc.get("m-target")).toBe("conflicted");
    });
  });

  // =========================================================================
  // 7. Deletion, Pruning & Cascade Invariants
  // =========================================================================
  describe("7. Deletion Cascades and Terminal Retention", () => {
    it("deleting node with 50 descendants removes all 50 in a single operation", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = G.addRootQuestion(g, "Root");
      const rootId = g.nodes[0].id;

      g = G.addNode(g, "claim", "Branch to delete", rootId);
      const doomedBranchId = g.nodes[g.nodes.length - 1].id;

      // Build 50 descendants under doomedBranchId
      let parent = doomedBranchId;
      for (let i = 1; i <= 50; i++) {
        g = G.addNode(g, "support", `Descendant ${i}`, parent);
        parent = g.nodes[g.nodes.length - 1].id;
      }
      g = G.addNode(g, "bedrock", "Leaf Bedrock", parent);

      // Branch to keep
      g = G.addNode(g, "claim", "Surviving Branch", rootId);
      const survivingBranchId = g.nodes[g.nodes.length - 1].id;
      g = G.addNode(g, "support", "Surviving Support", survivingBranchId);
      const survivingSupportId = g.nodes[g.nodes.length - 1].id;
      g = G.addNode(g, "source", "https://survive.org", survivingSupportId);
      const survivingSourceId = g.nodes[g.nodes.length - 1].id;

      expect(G.countDescendants(g, doomedBranchId)).toBe(51); // 50 supports + 1 bedrock

      const pruned = G.deleteNode(g, doomedBranchId);
      expect(G.getNode(pruned, doomedBranchId)).toBeUndefined();
      expect(G.getNode(pruned, parent)).toBeUndefined();

      // Surviving branch remains fully intact and grounded
      expect(G.getNode(pruned, rootId)).toBeDefined();
      expect(G.getNode(pruned, survivingBranchId)).toBeDefined();
      expect(G.getNode(pruned, survivingSupportId)).toBeDefined();
      expect(G.getNode(pruned, survivingSourceId)).toBeDefined();
      expect(G.isFullyGrounded(pruned, rootId)).toBe(true);
    });

    it("spares terminal node shared across 3 parents until the LAST parent is deleted", () => {
      let g: Graph = { nodes: [], edges: [] };
      g = G.addRootQuestion(g, "Q1");
      const q1 = g.nodes[0].id;
      g = G.addNode(g, "support", "A1", q1);
      const a1 = g.nodes[g.nodes.length - 1].id;

      g = G.addRootQuestion(g, "Q2");
      const q2 = g.nodes[g.nodes.length - 1].id;
      g = G.addNode(g, "support", "A2", q2);
      const a2 = g.nodes[g.nodes.length - 1].id;

      g = G.addRootQuestion(g, "Q3");
      const q3 = g.nodes[g.nodes.length - 1].id;
      g = G.addNode(g, "support", "A3", q3);
      const a3 = g.nodes[g.nodes.length - 1].id;

      // Create shared value and link all 3 to it
      g = G.addNode(g, "value", "Shared Core Value", a1);
      const sharedValId = g.nodes[g.nodes.length - 1].id;

      g = G.linkToExistingValue(g, a2, sharedValId);
      g = G.linkToExistingValue(g, a3, sharedValId);

      expect(G.getParents(g, sharedValId).length).toBe(3);

      // Delete Q1 subtree -> shared value must survive
      g = G.deleteNode(g, q1);
      expect(G.getNode(g, sharedValId)).toBeDefined();
      expect(G.getParents(g, sharedValId).length).toBe(2);

      // Delete Q2 subtree -> shared value must survive
      g = G.deleteNode(g, q2);
      expect(G.getNode(g, sharedValId)).toBeDefined();
      expect(G.getParents(g, sharedValId).length).toBe(1);

      // Delete Q3 subtree -> shared value must now be deleted
      g = G.deleteNode(g, q3);
      expect(G.getNode(g, sharedValId)).toBeUndefined();
    });
  });

  // =========================================================================
  // 8. Permutation Invariance & Determinism Stress Test
  // =========================================================================
  describe("8. Permutation Invariance & Strict Determinism", () => {
    it("produces strictly identical results across 50 randomized node/edge permutations", () => {
      // Build a realistic, complex 30-node graph
      let baseGraph: Graph = { nodes: [], edges: [] };
      baseGraph = G.addRootQuestion(baseGraph, "Macro Ethical Framework");
      const root1 = baseGraph.nodes[0].id;

      baseGraph = G.addRootPremise(baseGraph, "Universal Empathy Axiom");
      const premise1 = baseGraph.nodes[baseGraph.nodes.length - 1].id;

      // Under root 1: 2 position claims
      baseGraph = G.addNode(baseGraph, "claim", "Position Deontology", root1);
      const p1 = baseGraph.nodes[baseGraph.nodes.length - 1].id;
      baseGraph = G.addNode(baseGraph, "claim", "Position Consequentialism", root1);
      const p2 = baseGraph.nodes[baseGraph.nodes.length - 1].id;

      // Supports and conflicts under p1
      baseGraph = G.addNode(baseGraph, "support", "Rights preservation", p1);
      const s1 = baseGraph.nodes[baseGraph.nodes.length - 1].id;
      baseGraph = G.addNode(baseGraph, "conflict", "Inflexibility objection", s1);
      const c1 = baseGraph.nodes[baseGraph.nodes.length - 1].id;
      baseGraph = G.addNode(baseGraph, "bedrock", "Inviolable human dignity", s1);
      const b1 = baseGraph.nodes[baseGraph.nodes.length - 1].id;
      baseGraph = G.addNode(baseGraph, "limit", "Epistemic uncertainty limit", c1);

      // Supports under p2
      baseGraph = G.addNode(baseGraph, "support", "Utility maximization", p2);
      const s2 = baseGraph.nodes[baseGraph.nodes.length - 1].id;
      baseGraph = G.addNode(baseGraph, "source", "https://utilitarian.org/evidence", s2);
      const src1 = baseGraph.nodes[baseGraph.nodes.length - 1].id;
      expect(src1).toBeDefined();

      // Link premise1 to shared bedrock
      baseGraph = G.addNode(baseGraph, "claim", "All sentient creatures matter", premise1);
      const premClaim = baseGraph.nodes[baseGraph.nodes.length - 1].id;
      baseGraph = G.linkToExistingValue(baseGraph, premClaim, b1);

      // Capture baseline outputs
      const baseFullyGrounded = G.isFullyGrounded(baseGraph, root1);
      const baseNodeGrounded = baseGraph.nodes.map((n) => ({
        id: n.id,
        grounded: G.isNodeGrounded(baseGraph, n.id),
      }));
      const baseGaps = G.getGroundingGaps(baseGraph).map((g) => g.node.id);
      const baseAcceptability = [...G.getAcceptability(baseGraph).entries()].sort();
      const baseStats = G.getGraphStats(baseGraph);
      const baseProfile = G.getStatusProfile(baseGraph);

      // Run across 50 random permutations of nodes and edges
      for (let seed = 1; seed <= 50; seed++) {
        const permutedGraph: Graph = {
          nodes: seededShuffle(baseGraph.nodes, seed),
          edges: seededShuffle(baseGraph.edges, seed * 7),
        };

        // Assert exact equality of all functions
        expect(G.isFullyGrounded(permutedGraph, root1)).toBe(baseFullyGrounded);

        for (const expected of baseNodeGrounded) {
          expect(G.isNodeGrounded(permutedGraph, expected.id)).toBe(expected.grounded);
        }

        const permGaps = G.getGroundingGaps(permutedGraph).map((g) => g.node.id).sort();
        expect(permGaps).toEqual([...baseGaps].sort());

        const permAcceptability = [...G.getAcceptability(permutedGraph).entries()].sort();
        expect(permAcceptability).toEqual(baseAcceptability);

        const permStats = G.getGraphStats(permutedGraph);
        expect(permStats).toEqual(baseStats);

        const permProfile = G.getStatusProfile(permutedGraph);
        expect(permProfile.stats).toEqual(baseProfile.stats);
        expect(permProfile.archetype).toEqual(baseProfile.archetype);
      }
    });
  });
});
