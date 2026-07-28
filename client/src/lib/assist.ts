import type { GraphNode, GraphEdge, NodeType } from "./types";

export type AssistRequest = {
  action: "judge" | "hint";
  subgraph: { nodes: GraphNode[]; edges: GraphEdge[] };
  focusNodeId: string;
  hintKind?: "next-why" | "weakest-assumption" | "likely-value" | "strongest-objection";
  escalate?: boolean;
};

export type JudgeResult = {
  nodeId: string;
  strength: number;
  evidenceQuality: number;
  rationale: string;
  flags: ("unsupported" | "likely-fallacy" | "ambiguous-term" | "circular")[];
};

export type HintResult = {
  nodeId: string;
  hint: string;
  suggestion?: { type: NodeType; content: string };
};

export type AssistResponse =
  | { action: "judge"; result: JudgeResult }
  | { action: "hint"; result: HintResult };

// Always enable the local mock
export const isAssistEnabled = true;

export async function assist(req: AssistRequest): Promise<AssistResponse> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 1500));

  if (req.action === "judge") {
    // Generate a mock judgment based on the node's content (very basic mock)
    const node = req.subgraph.nodes.find(n => n.id === req.focusNodeId);
    const content = node?.content.toLowerCase() || "";
    
    let strength = 0.6;
    let evidenceQuality = 0.4;
    const flags: JudgeResult["flags"] = [];
    let rationale = "This argument is structurally valid but could use stronger empirical grounding.";

    if (node?.type === "claim") {
      rationale = "Questions cannot be judged for factuality directly. Judge the positions answering this question instead.";
      strength = 0;
      evidenceQuality = 0;
    } else if (content.includes("all ") || content.includes("every ") || content.includes("always ")) {
      flags.push("likely-fallacy");
      rationale = "The use of absolute qualifiers ('all', 'every') makes this claim highly vulnerable to a single counter-example. Consider scoping the claim.";
      strength = 0.2;
    } else if (req.subgraph.edges.filter(e => e.to === req.focusNodeId && e.edgeType === "cites").length > 0) {
      strength = 0.9;
      evidenceQuality = 0.95;
      rationale = "Strongly supported by cited external evidence in the subgraph.";
    } else if (content.length > 50) {
      strength = 0.75;
      evidenceQuality = 0.6;
      rationale = "The argument provides detailed context and appears well-reasoned, though formal citations are absent.";
    } else {
      flags.push("unsupported");
      rationale = "This claim currently lacks concrete supporting evidence or structural defenses.";
      strength = 0.3;
      evidenceQuality = 0.1;
    }

    return {
      action: "judge",
      result: {
        nodeId: req.focusNodeId,
        strength,
        evidenceQuality,
        rationale,
        flags,
      }
    };
  }

  throw new Error("Hint action not implemented in this mock");
}
