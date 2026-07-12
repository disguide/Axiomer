// The stance audit (docs/STATUS_AND_COMMITMENT.md §5): what you accept, what
// that commits you to, where it collides, and which bedrock you actually
// stand on. The system never decides — it prices the exits.

import { useMemo } from "react";
import type { Graph, GraphNode } from "@/lib/types";
import type { Stance } from "@/lib/commitment";
import {
  auditStance,
  getClosure,
  getRevealedValues,
} from "@/lib/commitment";
import { getNode } from "@/lib/graph";
import { NODE_META } from "@/lib/meta";

interface StancePanelProps {
  graph: Graph;
  stance: Stance;
  onAccept: (nodeId: string) => void; // toggles
  onReject: (nodeId: string) => void; // toggles
  onClear: () => void;
  onFocus: (nodeId: string) => void; // jump to the node in the tree
}

function NodeChip({
  node,
  onFocus,
}: {
  node: GraphNode;
  onFocus: (id: string) => void;
}) {
  const meta = NODE_META[node.type];
  return (
    <button
      type="button"
      onClick={() => onFocus(node.id)}
      className="inline-flex max-w-full items-center gap-1 rounded bg-white px-1.5 py-0.5 text-left text-xs text-slate-700 ring-1 ring-slate-200 hover:ring-slate-400"
      title={`${meta.label}: ${node.content} — click to open in tree`}
    >
      <span style={{ color: meta.color }}>{meta.icon}</span>
      <span className="truncate">{node.content}</span>
    </button>
  );
}

function Trace({
  trace,
  onFocus,
}: {
  trace: GraphNode[];
  onFocus: (id: string) => void;
}) {
  if (trace.length <= 1) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
      <span className="shrink-0">because you accept:</span>
      {trace.map((n, i) => (
        <span key={n.id} className="flex items-center gap-1">
          {i > 0 && <span>→</span>}
          <NodeChip node={n} onFocus={onFocus} />
        </span>
      ))}
    </div>
  );
}

export default function StancePanel({
  graph,
  stance,
  onAccept,
  onReject,
  onClear,
  onFocus,
}: StancePanelProps) {
  const accepted = stance.accepted
    .map((id) => getNode(graph, id))
    .filter((n): n is GraphNode => Boolean(n));
  const rejected = stance.rejected
    .map((id) => getNode(graph, id))
    .filter((n): n is GraphNode => Boolean(n));

  const closure = useMemo(() => getClosure(graph, stance), [graph, stance]);
  const findings = useMemo(() => auditStance(graph, stance), [graph, stance]);
  const revealed = useMemo(() => getRevealedValues(graph, stance), [graph, stance]);

  // Derived (non-explicit) commitments, for the "what you're signed up for" list.
  const derived = useMemo(
    () =>
      [...closure.committed.entries()]
        .filter(([, r]) => r.rule !== "explicit")
        .map(([id, r]) => ({ node: getNode(graph, id), rule: r.rule }))
        .filter((x): x is { node: GraphNode; rule: typeof x.rule } =>
          Boolean(x.node),
        ),
    [closure, graph],
  );

  const empty = accepted.length === 0 && rejected.length === 0;

  const RULE_LABEL: Record<string, string> = {
    entailment: "entailed",
    grounding: "its bedrock",
    presupposition: "presupposed",
    dependency: "it runs on this",
    denial: "denied by contraposition",
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Your stance</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Accept (✓) or reject (✗) claims in the Tree. Commitment propagates
              along <em>strict</em> relations only — entailment, grounding,
              presupposition — never mere support. Personal overlay: the shared
              graph is untouched.
            </p>
          </div>
          {!empty && (
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
            >
              Clear stance
            </button>
          )}
        </div>

        {empty ? (
          <p className="mt-3 rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
            No stance yet. Open the Tree and use ✓ / ✗ on positions, arguments,
            and values you actually hold — then come back to see what they
            commit you to.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold text-emerald-700">
                Accepted ({accepted.length})
              </h3>
              <ul className="mt-1.5 space-y-1">
                {accepted.map((n) => (
                  <li key={n.id} className="flex items-center gap-1.5">
                    <NodeChip node={n} onFocus={onFocus} />
                    <button
                      type="button"
                      onClick={() => onAccept(n.id)}
                      className="shrink-0 text-[10px] text-slate-400 hover:text-slate-600"
                      title="Remove from stance"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-rose-700">
                Rejected ({rejected.length})
              </h3>
              <ul className="mt-1.5 space-y-1">
                {rejected.map((n) => (
                  <li key={n.id} className="flex items-center gap-1.5">
                    <NodeChip node={n} onFocus={onFocus} />
                    <button
                      type="button"
                      onClick={() => onReject(n.id)}
                      className="shrink-0 text-[10px] text-slate-400 hover:text-slate-600"
                      title="Remove from stance"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {!empty && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            ⚓ Revealed values
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            The bedrock your stance actually stands on — convergence, turned
            inward.
          </p>
          {revealed.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              Nothing yet — your accepted claims haven't been traced to a
              value, principle, or epistemic limit. Accept the arguments that
              ground them, or ground them first.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {revealed.map(({ value, trace }) => (
                <li key={value.id} className="rounded-md bg-white p-2 ring-1 ring-amber-200/70">
                  <NodeChip node={value} onFocus={onFocus} />
                  <Trace trace={trace} onFocus={onFocus} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!empty && derived.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            What you're committed to
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Beyond what you clicked: everything your acceptances strictly carry.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {derived.map(({ node, rule }) => (
              <li key={node.id} className="flex items-center gap-1">
                <NodeChip node={node} onFocus={onFocus} />
                <span className="text-[10px] text-slate-400">
                  ({RULE_LABEL[rule] ?? rule})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!empty && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Audit</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Incoherences and undischarged commitments. The system never
            decides — it shows the price of each exit.
          </p>
          {findings.length === 0 ? (
            <p className="mt-2 rounded-md bg-emerald-50 p-2 text-xs font-medium text-emerald-700">
              ✓ Coherent. No contradictions among your commitments, nothing
              defeated or ungrounded.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {findings.map((f, i) => (
                <li
                  key={i}
                  className={`rounded-md p-2.5 text-xs ${
                    f.kind === "value-clash"
                      ? "bg-rose-50 ring-1 ring-rose-200"
                      : f.kind === "incoherence"
                        ? "bg-rose-50 ring-1 ring-rose-200"
                        : f.kind === "forced-choice"
                          ? "bg-violet-50 ring-1 ring-violet-200"
                          : "bg-amber-50 ring-1 ring-amber-200"
                  }`}
                >
                  {f.kind === "undischarged" ? (
                    <>
                      <p className="font-semibold text-amber-700">
                        ⚠ Undischarged commitment —{" "}
                        {f.problem === "defeated"
                          ? "currently defeated"
                          : "not grounded yet"}
                      </p>
                      <div className="mt-1.5">
                        <NodeChip node={f.node} onFocus={onFocus} />
                        <Trace trace={f.trace} onFocus={onFocus} />
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        {f.problem === "defeated"
                          ? "An undefeated attack stands against it. Defend it (rebut the attacker) or revise your stance."
                          : "Its chain hasn't reached a value, principle, or epistemic limit. You're committed to a claim that isn't standing on anything yet."}
                      </p>
                    </>
                  ) : f.kind === "forced-choice" ? (
                    <>
                      <p className="font-semibold text-violet-700">
                        ⑂ Forced choice — you reject something your acceptances
                        entail
                      </p>
                      <div className="mt-1.5">
                        <NodeChip node={f.node} onFocus={onFocus} />
                        <Trace trace={f.trace} onFocus={onFocus} />
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Keep the source (then this comes with it) — or keep
                        rejecting this (then the source goes with it).
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-rose-700">
                        {f.kind === "value-clash"
                          ? "⚔ Value clash — your commitments collide at bedrock"
                          : "⚔ Incoherence — two of your commitments contradict"}
                      </p>
                      <div className="mt-1.5 space-y-1.5">
                        <div>
                          <NodeChip node={f.a} onFocus={onFocus} />
                          <Trace trace={f.aTrace} onFocus={onFocus} />
                        </div>
                        <p className="text-[10px] font-medium text-rose-400">
                          — cannot both hold —
                        </p>
                        <div>
                          <NodeChip node={f.b} onFocus={onFocus} />
                          <Trace trace={f.bTrace} onFocus={onFocus} />
                        </div>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        To restore coherence, give up one side's source — or
                        author the distinction/caveat that reconciles them
                        (which the graph then gains).
                      </p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
