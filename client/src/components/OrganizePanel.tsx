// The Organize tab: the deterministic worklist from lib/organize.ts with
// one-click actions. Works entirely without AI — agents only add suggestions
// on top (AgentsPanel).

import { useMemo } from "react";
import type { Graph, GraphNode } from "@/lib/types";
import { getWorkItems, summarizeWork, type WorkItem } from "@/lib/organize";
import { NODE_META } from "@/lib/meta";

interface OrganizePanelProps {
  graph: Graph;
  readOnly?: boolean;
  onFocus: (nodeId: string) => void;
  onMerge: (keepId: string, dropId: string) => void;
  onRetract: (nodeId: string) => void;
}

function Chip({
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

const KIND_META: Record<
  WorkItem["kind"],
  { title: string; tone: string; icon: string }
> = {
  "duplicate-terminals": {
    title: "Possible duplicate bedrock",
    tone: "border-indigo-200 bg-indigo-50/60",
    icon: "⧉",
  },
  "unanswered-attack": {
    title: "Unanswered attack",
    tone: "border-rose-200 bg-rose-50/60",
    icon: "⚔",
  },
  "ungrounded-argument": {
    title: "Never reaches bedrock",
    tone: "border-amber-200 bg-amber-50/60",
    icon: "⚓",
  },
  "unsupported-position": {
    title: "Unbacked position",
    tone: "border-amber-200 bg-amber-50/60",
    icon: "◆",
  },
  "positionless-question": {
    title: "Question without positions",
    tone: "border-slate-200 bg-slate-50",
    icon: "?",
  },
  "inert-orphan": {
    title: "Orphaned by a ghost",
    tone: "border-orange-200 bg-orange-50/60",
    icon: "👻",
  },
};

export default function OrganizePanel({
  graph,
  readOnly = false,
  onFocus,
  onMerge,
  onRetract,
}: OrganizePanelProps) {
  const items = useMemo(() => getWorkItems(graph), [graph]);
  const summary = useMemo(() => summarizeWork(items), [items]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Organize</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          The graph's structural to-do list, worst first: duplicates eroding
          convergence, winning attacks nobody answered, chains that never reach
          bedrock. Deterministic — no AI involved.
        </p>
        {summary.total === 0 ? (
          <p className="mt-3 rounded-md bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
            ✓ Nothing to organize. Every chain grounds out, every attack is
            answered, no duplicates detected.
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            {summary.total} item{summary.total === 1 ? "" : "s"}
            {Object.entries(summary.byKind)
              .map(([k, v]) => ` · ${v} ${KIND_META[k as WorkItem["kind"]].title.toLowerCase()}`)
              .join("")}
          </p>
        )}
      </div>

      {items.map((item, i) => {
        const km = KIND_META[item.kind];
        return (
          <div key={i} className={`rounded-lg border p-3 ${km.tone}`}>
            <p className="text-xs font-semibold text-slate-700">
              {km.icon} {km.title}
            </p>
            <div className="mt-1.5 space-y-1.5 text-xs text-slate-600">
              {item.kind === "duplicate-terminals" && (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">keep</span>
                    <Chip node={item.keep} onFocus={onFocus} />
                    <span className="text-[10px] text-slate-400">
                      absorb ({Math.round(item.score * 100)}% similar)
                    </span>
                    <Chip node={item.drop} onFocus={onFocus} />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Merging re-points every chain at the keeper and marks the
                    duplicate <em>merged</em> — provenance survives, the
                    convergence core stays small.
                  </p>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onMerge(item.keep.id, item.drop.id)}
                      className="rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-500"
                    >
                      ⧉ Merge into keeper
                    </button>
                  )}
                </>
              )}
              {item.kind === "unanswered-attack" && (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip node={item.target} onFocus={onFocus} />
                    <span className="text-[10px] text-rose-500">
                      defeated by
                    </span>
                    <Chip node={item.attacker} onFocus={onFocus} />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Rebut the attacker (revives the target), concede the point,
                    or accept the defeat — but don't leave it hanging.
                  </p>
                  <button
                    type="button"
                    onClick={() => onFocus(item.attacker.id)}
                    className="rounded bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-600"
                  >
                    Open to answer
                  </button>
                </>
              )}
              {item.kind === "ungrounded-argument" && (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip node={item.node} onFocus={onFocus} />
                    {item.root && (
                      <span className="text-[10px] text-slate-400">
                        under “{item.root.content}” · depth {item.depth}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onFocus(item.node.id)}
                      className="rounded bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-600"
                    >
                      Open to ground
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onRetract(item.node.id)}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                        title="Withdraw it as a ghost instead of grounding it"
                      >
                        Retract
                      </button>
                    )}
                  </div>
                </>
              )}
              {(item.kind === "unsupported-position" ||
                item.kind === "positionless-question") && (
                <>
                  <Chip node={item.node} onFocus={onFocus} />
                  <button
                    type="button"
                    onClick={() => onFocus(item.node.id)}
                    className="ml-1.5 rounded bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-600"
                  >
                    {item.kind === "unsupported-position"
                      ? "Open to back it"
                      : "Open to answer it"}
                  </button>
                </>
              )}
              {item.kind === "inert-orphan" && (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip node={item.node} onFocus={onFocus} />
                    <span className="text-[10px] text-slate-400">
                      under {item.parent.status} parent
                    </span>
                    <Chip node={item.parent} onFocus={onFocus} />
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onFocus(item.node.id)}
                      className="rounded bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-600"
                    >
                      Open
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onRetract(item.node.id)}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                      >
                        Retract too
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
