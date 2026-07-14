// Agent roles: the AI does three jobs — LABEL, RESEARCH, PARTNER.
//
// Each role's method/voice lives in a hand-written markdown+XML prompt
// (./prompts/*.md), edited like prose. The TAXONOMY and ATTACHMENT MATRIX are
// injected into every prompt from NODE_META / ALLOWED_CHILDREN at runtime, so
// the rules the AI follows can never drift from the code. Agents return a
// Proposal (JSON); lib/proposals.ts validates every op against the real graph
// before a human may accept it. Agents never mutate anything.

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
import labelerPrompt from "./prompts/labeler.md?raw";
import researcherPrompt from "./prompts/researcher.md?raw";
import partnerPrompt from "./prompts/partner.md?raw";

export type AgentRoleId = "label" | "research" | "partner";

export interface AgentRole {
  id: AgentRoleId;
  label: string;
  blurb: string;
  targetRequired: boolean; // research/partner act on a node; labeler is graph-wide
  proseKey?: "brief" | "critique"; // the text field this role returns to read
}

export const AGENT_ROLES: AgentRole[] = [
  {
    id: "label",
    label: "🏷 Labeler",
    blurb:
      "Types your raw notes and their connections — turns write-first sketches into a properly typed graph. Runs over the whole graph, or one subtree.",
    targetRequired: false,
  },
  {
    id: "research",
    label: "🔍 Researcher",
    blurb:
      "Gathers evidence for a claim, weighs both sides honestly, and hands back a cited brief plus evidence nodes to attach. Never fabricates a source.",
    targetRequired: true,
    proseKey: "brief",
  },
  {
    id: "partner",
    label: "🤝 Partner",
    blurb:
      "A thinking partner, not a yes-man: names your weakest point, asks the sharp question, and drafts the next move. Co-writes and critiques.",
    targetRequired: true,
    proseKey: "critique",
  },
];

const PROMPTS: Record<AgentRoleId, string> = {
  label: labelerPrompt,
  research: researcherPrompt,
  partner: partnerPrompt,
};

// --- Injected blocks (generated, never hand-duplicated) ----------------------

function taxonomyBlock(): string {
  return NODE_FAMILIES.map(
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
}

function matrixBlock(): string {
  return Object.entries(ALLOWED_CHILDREN)
    .filter(([parent, children]) => children.length > 0 && parent !== "unlabeled")
    .map(([parent, children]) =>
      `- under ${parent}: ${children.filter((c) => c !== "unlabeled").join(", ")}`,
    )
    .join("\n");
}

// Fill a role prompt's {{TAXONOMY}} / {{ATTACHMENT_MATRIX}} placeholders.
export function buildSystemPrompt(role: AgentRoleId): string {
  return PROMPTS[role]
    .replace("{{TAXONOMY}}", taxonomyBlock())
    .replace("{{ATTACHMENT_MATRIX}}", matrixBlock());
}

// --- Graph context serialization ---------------------------------------------

const MAX_NODES = 250;
const MAX_CONTENT = 200;

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
  const flag = node.type === "unlabeled" ? " «UNLABELED — needs a type»" : "";
  lines.push(
    `${"  ".repeat(depth)}- [${node.id}] ${node.type}${status}: ${clip(node.content)}${flag}`,
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

  const work = getWorkItems(graph).slice(0, 14);
  if (work.length > 0) {
    lines.push("", "WORKLIST (known structural problems):");
    for (const item of work) lines.push(`- ${describeWorkItem(item)}`);
  }

  return lines.join("\n");
}

// --- Task line per role -------------------------------------------------------

function taskLine(role: AgentRoleId, target: GraphNode | undefined): string {
  switch (role) {
    case "label":
      return target
        ? `Label every «UNLABELED» note in the TARGET subtree [${target.id}]: assign each its node type and its connection to its parent, following the method. Split any genuine two-claim note. Emit relabel-node ops (and add-node only for splits).`
        : "Label every «UNLABELED» note in the graph: assign each its node type and its connection to its parent. Work through them systematically; emit relabel-node ops (and add-node only to split a genuine two-claim note). If a note is too ambiguous to label confidently, leave it and say so.";
    case "research":
      return `Research the TARGET claim [${target?.id}]. Run the loop: plan the sub-questions, gather evidence on both sides, evaluate source quality, synthesize a confidence level, and cite. Return the brief and propose evidence/counter-example nodes to attach. Never fabricate a source.`;
    case "partner":
      return `Be the thinking partner for the TARGET [${target?.id}] and its subtree. Assess it honestly, name its 1–3 real weak points, ask the sharpest question, and draft the next moves as ops. Lead with the strongest objection, not praise. No flattery.`;
  }
}

export interface AgentRun {
  parsed: ParsedProposal;
  raw: string; // full model output, shown on demand
  prose: string; // the role's brief/critique text (empty for labeler)
}

// Lenient extraction of a text field (brief/critique) from model output.
function extractProse(raw: string, key: "brief" | "critique" | undefined): string {
  if (!key) return "";
  try {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1] : raw;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) return "";
    const obj = JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
    const val = obj[key] ?? obj.summary;
    return typeof val === "string" ? val : "";
  } catch {
    return "";
  }
}

export async function runAgent(
  config: AIConfig,
  graph: Graph,
  roleId: AgentRoleId,
  targetId?: string,
): Promise<AgentRun> {
  const role = AGENT_ROLES.find((r) => r.id === roleId);
  if (!role) throw new Error(`unknown role ${roleId}`);
  const target = targetId ? getNode(graph, targetId) : undefined;
  if (role.targetRequired && !target) throw new Error("choose a target node for this role");

  const user = [
    buildGraphContext(graph, targetId),
    "",
    "TASK:",
    taskLine(roleId, target),
  ].join("\n");

  const raw = await chatComplete(config, buildSystemPrompt(roleId), user);
  const parsed = parseProposal(graph, raw);
  return { parsed, raw, prose: extractProse(raw, role.proseKey) };
}
