// Agent tasks: prompt construction + orchestration for BYOK agents.
//
// Everything an agent knows about the taxonomy is GENERATED from the same
// NODE_META / ALLOWED_CHILDREN the app runs on, so the labeling rules the AI
// follows can never drift from the code. Agents return a Proposal (JSON);
// lib/proposals.ts validates every op against the real graph before a human
// may accept it. Agents never mutate anything.

import type { Graph, GraphNode } from "../types";
import { isInert, isTerminalType } from "../types";
import {
  activeGraph,
  getChildren,
  getNode,
  getParents,
  getRoots,
} from "../graph";
import { ALLOWED_CHILDREN, NODE_FAMILIES, NODE_META } from "../meta";
import { describeWorkItem, getWorkItems } from "../organize";
import { parseProposal, type ParsedProposal } from "../proposals";
import { chatComplete, type AIConfig } from "./provider";

export type AgentTaskId = "deepen" | "stress-test" | "ground" | "dedup" | "label";

export interface AgentTask {
  id: AgentTaskId;
  label: string;
  description: string;
  needsTarget: boolean; // operates on a chosen node vs the whole graph
  needsText: boolean; // takes free-form input (the label task)
}

export const AGENT_TASKS: AgentTask[] = [
  {
    id: "deepen",
    label: "🕳 Deepen toward bedrock",
    description:
      "Propose the next few nodes under the target — the missing why, warrant, or grounding — preferring links to existing terminals.",
    needsTarget: true,
    needsText: false,
  },
  {
    id: "stress-test",
    label: "⚔ Stress-test",
    description:
      "Attack the target like an honest opponent: strongest objections, counter-examples, undercuts of the weakest inference.",
    needsTarget: true,
    needsText: false,
  },
  {
    id: "ground",
    label: "⚓ Ground the open chains",
    description:
      "Find arguments that never reach bedrock and propose the value/principle/epistemic-limit each honestly bottoms out at.",
    needsTarget: false,
    needsText: false,
  },
  {
    id: "dedup",
    label: "⧉ Find duplicate bedrock",
    description:
      "Scan terminals for near-duplicates the text-similarity nudge missed (same idea, different words) and propose merges.",
    needsTarget: false,
    needsText: false,
  },
  {
    id: "label",
    label: "🏷 Label my text",
    description:
      "Take a raw thought and classify it: the right node type, under the target parent, per the labeling procedure.",
    needsTarget: true,
    needsText: true,
  },
];

// --- System prompt (generated, never hand-duplicated) ------------------------

export function buildSystemPrompt(): string {
  const catalog = NODE_FAMILIES.map(
    (f) =>
      `${f.label.toUpperCase()} (${f.hint}):\n` +
      f.types
        .map((t) => {
          const m = NODE_META[t];
          const terminal = m.terminal ? " [TERMINAL — may never have children]" : "";
          return `- ${t}${terminal}: ${m.description}`;
        })
        .join("\n"),
  ).join("\n\n");

  const matrix = Object.entries(ALLOWED_CHILDREN)
    .filter(([, children]) => children.length > 0)
    .map(([parent, children]) => `- under ${parent}: ${children.join(", ")}`)
    .join("\n");

  return `You are a philosophy assistant working inside Axiomer, a wiki-style argument-tree tool. Users trace questions down to bedrock (values, principles, epistemic limits) and build forward from premises. Different questions REUSE the same bedrock nodes — that convergence is the whole point.

NODE TYPES (30, in 8 families):
${catalog}

ALLOWED CHILDREN (hard constraint — proposals violating this are rejected):
${matrix}

LABELING RULES:
1. One claim per node. Split compound thoughts; the "because" half is a child.
2. Label the ROLE in the dialectic, not the topic. Parent context decides.
3. Prefer the most specific type (counter-example beats objection; criterion beats assumption).
4. NEVER invent bedrock. value/principle/epistemic-limit only when a sincere "why?" can no longer be asked and answered. A tired chain is OPEN, not grounded.
5. PREFER LINKING to an existing terminal over creating a near-duplicate (use the link-value op, or merge-terminals for existing duplicates).
6. Objections have two modes: attack the CLAIM (default) or attack the INFERENCE — for inference attacks add "edgeType": "undercuts" on the add-node op.
7. Content is plain natural language, ≤ 2 sentences per node. No markdown.

OUTPUT CONTRACT — respond with ONLY a JSON object, no prose before or after:
{
  "summary": "one sentence on what you propose and why",
  "ops": [
    {"op": "add-node", "parentId": "<existing node id>", "type": "<node type>", "content": "…", "edgeType": "undercuts (only for inference attacks — otherwise omit)", "contentKind": "empirical|normative|conceptual|metaphysical|logical-mathematical|practical (optional)"},
    {"op": "link-value", "argumentId": "<existing argument/position id>", "valueId": "<existing terminal id>"},
    {"op": "merge-terminals", "keepId": "<terminal id>", "dropId": "<terminal id>"},
    {"op": "set-status", "nodeId": "<id>", "status": "retracted|refuted|invalid", "reason": "…"},
    {"op": "add-contradiction", "aId": "<claim id>", "bId": "<claim id>"}
  ]
}
Use ONLY node ids that appear in the graph context. Propose 1–5 ops. Quality over quantity.`;
}

// --- Graph context serialization ---------------------------------------------

const MAX_NODES = 250;
const MAX_CONTENT = 160;

function clip(s: string): string {
  return s.length > MAX_CONTENT ? `${s.slice(0, MAX_CONTENT)}…` : s;
}

function outline(
  graph: Graph,
  node: GraphNode,
  depth: number,
  lines: string[],
  seen: Set<string>,
): void {
  if (lines.length >= MAX_NODES || seen.has(node.id)) return;
  seen.add(node.id);
  const status = node.status ? ` [${node.status}]` : "";
  lines.push(
    `${"  ".repeat(depth)}- [${node.id}] ${node.type}${status}: ${clip(node.content)}`,
  );
  for (const child of getChildren(graph, node.id)) {
    outline(graph, child, depth + 1, lines, seen);
  }
}

// Serialize the working context: the target subtree (or all roots), the
// linkable terminals with usage counts, and the organize worklist.
export function buildGraphContext(graph: Graph, targetId?: string): string {
  const lines: string[] = [];
  const seen = new Set<string>();
  const target = targetId ? getNode(graph, targetId) : undefined;
  if (target) {
    // Locate the target: its parent chain gives the agent the dialectical role.
    const chain: GraphNode[] = [];
    let cur: GraphNode | undefined = target;
    const guard = new Set<string>();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      chain.unshift(cur);
      cur = getParents(graph, cur.id)[0];
    }
    lines.push("PATH FROM ROOT TO TARGET:");
    chain.forEach((n, i) =>
      lines.push(`${"  ".repeat(i)}- [${n.id}] ${n.type}: ${clip(n.content)}`),
    );
    lines.push("", `TARGET SUBTREE (target id: ${target.id}):`);
    outline(graph, target, 0, lines, seen);
  } else {
    lines.push("GRAPH (all roots):");
    for (const root of getRoots(graph)) outline(graph, root, 0, lines, seen);
  }

  const ag = activeGraph(graph);
  const terminals = ag.nodes.filter((n) => isTerminalType(n.type) && !isInert(n));
  if (terminals.length > 0) {
    lines.push("", "EXISTING TERMINALS (link/merge targets — reuse before creating):");
    for (const t of terminals) {
      const uses = getParents(ag, t.id).length;
      lines.push(`- [${t.id}] ${t.type} (${uses} chain${uses === 1 ? "" : "s"}): ${clip(t.content)}`);
    }
  }

  const work = getWorkItems(graph).slice(0, 12);
  if (work.length > 0) {
    lines.push("", "ORGANIZE WORKLIST (known structural problems):");
    for (const item of work) lines.push(`- ${describeWorkItem(item)}`);
  }

  return lines.join("\n");
}

// --- Task prompts -------------------------------------------------------------

function taskInstruction(
  task: AgentTaskId,
  target: GraphNode | undefined,
  text: string | undefined,
): string {
  switch (task) {
    case "deepen":
      return `Deepen the tree under the TARGET node [${target?.id}]. Propose 2–4 children that push its chain toward bedrock: the missing argument, the unstated warrant or assumption, the presupposition worth surfacing, or the grounding itself. If an existing terminal fits, use link-value instead of creating a new one. Every proposed node must be an allowed child of what it attaches to.`;
    case "stress-test":
      return `Attack the TARGET node's subtree [${target?.id}] like an honest, rigorous opponent. Propose the 2–4 strongest challenges: objections (use edgeType "undercuts" when attacking the inference rather than the claim), counter-examples against universal claims, or a counter-argument. Attach each to the exact node it challenges. No straw men — attack the strongest reading.`;
    case "ground":
      return `The worklist shows arguments that never reach bedrock. For the most important 1–3, propose what each honestly bottoms out at: link-value to an existing terminal when one fits (preferred), otherwise add-node with a new value/principle/epistemic-limit as the child of that argument. Respect rule 4 — if a chain isn't actually near bedrock yet, propose the intermediate argument or raised question instead.`;
    case "dedup":
      return `Scan EXISTING TERMINALS for pairs that express the same idea in different words (the text-similarity nudge only catches token overlap — you catch meaning). Propose merge-terminals ops, keeping the terminal with more chains. Only merge genuine duplicates: "minimize suffering" and "reduce net suffering" yes; "minimize suffering" and "respect autonomy" never.`;
    case "label":
      return `Classify this raw text as a node under the TARGET parent [${target?.id}]:\n\n"${text ?? ""}"\n\nApply the labeling rules: find its ROLE relative to the parent, pick the most specific allowed type, split it if it is two claims (multiple add-node ops on the right parents), set contentKind, and use edgeType "undercuts" if it attacks an inference. If it duplicates an existing terminal, propose link-value on the parent instead of a new node.`;
  }
}

export interface AgentRun {
  parsed: ParsedProposal;
  raw: string; // full model output, shown on demand
}

export async function runAgent(
  config: AIConfig,
  graph: Graph,
  taskId: AgentTaskId,
  targetId?: string,
  text?: string,
): Promise<AgentRun> {
  const target = targetId ? getNode(graph, targetId) : undefined;
  const task = AGENT_TASKS.find((t) => t.id === taskId);
  if (!task) throw new Error(`unknown task ${taskId}`);
  if (task.needsTarget && !target) throw new Error("this task needs a target node");
  if (task.needsText && !text?.trim()) throw new Error("this task needs input text");

  const user = [
    buildGraphContext(graph, targetId),
    "",
    "TASK:",
    taskInstruction(taskId, target, text),
  ].join("\n");

  const raw = await chatComplete(config, buildSystemPrompt(), user);
  const parsed = parseProposal(graph, raw);
  return { parsed, raw };
}
