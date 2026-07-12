// The Agents tab: plug in ANY AI provider with your own API key and run
// suggestion-only agents against the tree. Agents produce validated
// proposals; nothing touches the graph until a human accepts each op
// (propose-and-review, docs/ROADMAP.md — remove the AI and the app still
// works).

import { useMemo, useState } from "react";
import type { Graph, GraphNode } from "@/lib/types";
import * as G from "@/lib/graph";
import {
  AGENT_TASKS,
  runAgent,
  type AgentRun,
  type AgentTaskId,
} from "@/lib/ai/agents";
import {
  PROVIDER_PRESETS,
  clearAIConfig,
  loadAIConfig,
  saveAIConfig,
  type AIConfig,
} from "@/lib/ai/provider";
import { applyOp, validateOp, type ProposalOp } from "@/lib/proposals";
import { NODE_META } from "@/lib/meta";

interface AgentsPanelProps {
  graph: Graph;
  readOnly?: boolean;
  onApplyOp: (op: ProposalOp) => void;
  onFocus: (nodeId: string) => void;
}

function describeOp(graph: Graph, op: ProposalOp): string {
  const name = (id: string) => {
    const n = G.getNode(graph, id);
    return n ? `“${n.content.slice(0, 70)}”` : `[${id}]`;
  };
  switch (op.op) {
    case "add-node":
      return `Add ${NODE_META[op.type]?.label ?? op.type} under ${name(op.parentId)}${
        op.edgeType === "undercuts" ? " (undercutting the inference)" : ""
      }: “${op.content}”`;
    case "link-value":
      return `Ground ${name(op.argumentId)} in existing terminal ${name(op.valueId)} (convergence, no duplicate)`;
    case "merge-terminals":
      return `Merge duplicate ${name(op.dropId)} into ${name(op.keepId)}`;
    case "set-status":
      return `Mark ${name(op.nodeId)} as ${op.status}${op.reason ? ` — ${op.reason}` : ""}`;
    case "add-contradiction":
      return `Declare ${name(op.aId)} incompatible with ${name(op.bId)}`;
  }
}

export default function AgentsPanel({
  graph,
  readOnly = false,
  onApplyOp,
  onFocus,
}: AgentsPanelProps) {
  const [config, setConfig] = useState<AIConfig | null>(() => loadAIConfig());
  const [editing, setEditing] = useState<AIConfig>(
    () =>
      config ?? {
        kind: PROVIDER_PRESETS[0].kind,
        baseUrl: PROVIDER_PRESETS[0].baseUrl,
        model: PROVIDER_PRESETS[0].model,
        apiKey: "",
      },
  );
  const [showConfig, setShowConfig] = useState(!config);
  const [taskId, setTaskId] = useState<AgentTaskId>("deepen");
  const [targetId, setTargetId] = useState<string>("");
  const [labelText, setLabelText] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [showRaw, setShowRaw] = useState(false);

  const task = AGENT_TASKS.find((t) => t.id === taskId)!;

  // Target picker: active nodes grouped by root.
  const targetGroups = useMemo(() => {
    const roots = G.getRoots(graph);
    return roots.map((root) => ({
      root,
      nodes: [...G.getDescendantIds(graph, root.id)]
        .map((id) => G.getNode(graph, id))
        .filter((n): n is GraphNode => Boolean(n))
        .filter((n) => n.status === undefined || n.status === "active"),
    }));
  }, [graph]);

  const saveConfig = () => {
    saveAIConfig(editing);
    setConfig(editing);
    setShowConfig(false);
    setError(null);
  };

  const forget = () => {
    clearAIConfig();
    setConfig(null);
    setEditing({ ...editing, apiKey: "" });
    setShowConfig(true);
  };

  const applyPreset = (label: string) => {
    const p = PROVIDER_PRESETS.find((x) => x.label === label);
    if (!p) return;
    setEditing((e) => ({ ...e, kind: p.kind, baseUrl: p.baseUrl, model: p.model }));
  };

  const execute = async () => {
    if (!config) {
      setShowConfig(true);
      return;
    }
    setRunning(true);
    setError(null);
    setRun(null);
    setApplied(new Set());
    try {
      const result = await runAgent(
        config,
        graph,
        taskId,
        task.needsTarget ? targetId || undefined : undefined,
        task.needsText ? labelText : undefined,
      );
      setRun(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const accept = (op: ProposalOp, index: number) => {
    onApplyOp(op);
    setApplied((prev) => new Set(prev).add(index));
  };

  const acceptAll = () => {
    if (!run) return;
    // Re-validate sequentially against the evolving graph.
    let g = graph;
    const done = new Set(applied);
    run.parsed.proposal.ops.forEach((op, i) => {
      if (done.has(i)) return;
      if (!validateOp(g, op).ok) return;
      onApplyOp(op);
      g = applyOp(g, op);
      done.add(i);
    });
    setApplied(done);
  };

  return (
    <div className="space-y-4">
      {/* Provider config */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              ✨ Your AI agents
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Bring your own key — Anthropic, OpenAI, OpenRouter, Groq, local
              Ollama, or any OpenAI-compatible endpoint. Agents only{" "}
              <em>propose</em>; every change needs your accept. Remove the AI
              and Axiomer still works.
            </p>
          </div>
          {config && !showConfig && (
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="shrink-0 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
            >
              ⚙ {config.model || "configure"}
            </button>
          )}
        </div>

        {showConfig && (
          <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap gap-1.5">
              {PROVIDER_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.label)}
                  className={`rounded border px-2 py-1 text-[11px] ${
                    editing.baseUrl === p.baseUrl && editing.kind === p.kind
                      ? "border-slate-700 bg-slate-700 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-500"
                  }`}
                  title={p.note}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-[11px] text-slate-600">
                Protocol
                <select
                  className="mt-0.5 w-full rounded border border-slate-300 bg-white p-1.5 text-xs"
                  value={editing.kind}
                  onChange={(e) =>
                    setEditing({ ...editing, kind: e.target.value as AIConfig["kind"] })
                  }
                >
                  <option value="anthropic">Anthropic Messages API</option>
                  <option value="openai-compatible">OpenAI-compatible</option>
                </select>
              </label>
              <label className="block text-[11px] text-slate-600">
                Model
                <input
                  className="mt-0.5 w-full rounded border border-slate-300 p-1.5 text-xs"
                  value={editing.model}
                  onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                  placeholder="model id"
                />
              </label>
            </div>
            <label className="block text-[11px] text-slate-600">
              Base URL
              <input
                className="mt-0.5 w-full rounded border border-slate-300 p-1.5 text-xs"
                value={editing.baseUrl}
                onChange={(e) => setEditing({ ...editing, baseUrl: e.target.value })}
                placeholder="https://api.anthropic.com · https://openrouter.ai/api/v1 · http://localhost:11434/v1"
              />
            </label>
            <label className="block text-[11px] text-slate-600">
              API key
              <input
                type="password"
                className="mt-0.5 w-full rounded border border-slate-300 p-1.5 text-xs"
                value={editing.apiKey}
                onChange={(e) => setEditing({ ...editing, apiKey: e.target.value })}
                placeholder="sk-… (empty is fine for local Ollama)"
              />
            </label>
            <p className="text-[10px] text-slate-400">
              Stored only in this browser's localStorage; sent only to the base
              URL above, directly from your browser. If a provider blocks
              browser requests (CORS), use OpenRouter or a local model.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveConfig}
                disabled={!editing.model || (!editing.baseUrl && editing.kind !== "anthropic")}
                className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
              >
                Save
              </button>
              {config && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="rounded px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={forget}
                    className="ml-auto rounded px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50"
                  >
                    Forget key
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task runner */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold text-slate-700">Run an agent</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {AGENT_TASKS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTaskId(t.id)}
              className={`rounded-md border px-2.5 py-1.5 text-xs ${
                t.id === taskId
                  ? "border-slate-700 bg-slate-700 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
              title={t.description}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">{task.description}</p>

        {task.needsTarget && (
          <label className="mt-2 block text-[11px] text-slate-600">
            Target node
            <select
              className="mt-0.5 w-full rounded border border-slate-300 bg-white p-1.5 text-xs"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">— choose a node —</option>
              {targetGroups.map(({ root, nodes }) => (
                <optgroup key={root.id} label={root.content.slice(0, 60)}>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {NODE_META[n.type].icon} {n.content.slice(0, 70)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        )}

        {task.needsText && (
          <label className="mt-2 block text-[11px] text-slate-600">
            Your raw thought
            <textarea
              className="mt-0.5 w-full resize-y rounded border border-slate-300 p-2 text-xs"
              rows={2}
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              placeholder="e.g. “but what if the five people on the track are all murderers — surely that changes the calculus”"
            />
          </label>
        )}

        <button
          type="button"
          onClick={execute}
          disabled={
            running ||
            (task.needsTarget && !targetId) ||
            (task.needsText && !labelText.trim())
          }
          className="mt-3 rounded bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-40"
        >
          {running ? "Thinking…" : config ? "▶ Run agent" : "Configure a provider first"}
        </button>
        {error && (
          <p className="mt-2 rounded bg-rose-50 p-2 text-[11px] text-rose-600">
            {error}
          </p>
        )}
      </div>

      {/* Proposal review */}
      {run && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-violet-800">
                Proposal
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                {run.parsed.proposal.summary || "(no summary)"}
              </p>
            </div>
            {!readOnly && run.parsed.proposal.ops.length > 1 && (
              <button
                type="button"
                onClick={acceptAll}
                className="shrink-0 rounded bg-violet-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-violet-600"
              >
                Accept all
              </button>
            )}
          </div>

          <ul className="mt-2 space-y-1.5">
            {run.parsed.proposal.ops.map((op, i) => {
              const isApplied = applied.has(i);
              const stillValid = isApplied || validateOp(graph, op).ok;
              return (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-md bg-white p-2 ring-1 ring-violet-200/60"
                >
                  <span className="min-w-0 flex-1 text-xs text-slate-700">
                    {describeOp(graph, op)}
                  </span>
                  {readOnly ? null : isApplied ? (
                    <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      ✓ applied
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => accept(op, i)}
                      disabled={!stillValid}
                      className="shrink-0 rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
                      title={stillValid ? "Apply this change" : "No longer valid against the current graph"}
                    >
                      Accept
                    </button>
                  )}
                </li>
              );
            })}
            {run.parsed.proposal.ops.length === 0 && (
              <li className="rounded-md bg-white p-2 text-xs text-slate-400 ring-1 ring-violet-200/60">
                The agent proposed no valid operations.
              </li>
            )}
          </ul>

          {run.parsed.invalid.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Rejected by validation ({run.parsed.invalid.length})
              </p>
              <ul className="mt-1 space-y-1">
                {run.parsed.invalid.map((inv, i) => (
                  <li key={i} className="rounded bg-white/60 p-1.5 text-[11px] text-slate-400 ring-1 ring-slate-200">
                    {inv.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="mt-2 text-[10px] text-slate-400 hover:text-slate-600"
          >
            {showRaw ? "hide" : "show"} raw model output
          </button>
          {showRaw && (
            <pre className="mt-1 max-h-64 overflow-auto rounded bg-slate-900 p-2 text-[10px] leading-relaxed text-slate-100">
              {run.raw}
            </pre>
          )}
        </div>
      )}

      {applied.size > 0 && (
        <p className="text-center text-[11px] text-slate-400">
          Applied changes are in the Tree —{" "}
          <button
            type="button"
            className="text-slate-600 underline hover:text-slate-800"
            onClick={() => {
              const firstOp = run?.parsed.proposal.ops.find((_, i) => applied.has(i));
              if (firstOp && "parentId" in firstOp) onFocus(firstOp.parentId);
            }}
          >
            jump there
          </button>
          .
        </p>
      )}
    </div>
  );
}
