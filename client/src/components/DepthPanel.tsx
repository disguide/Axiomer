import type { Graph } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";

interface DepthPanelProps {
  graph: Graph;
  onFocus: (nodeId: string) => void;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1.5 text-center">
      <div className="text-base font-semibold text-slate-800">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}

export default function DepthPanel({ graph, onFocus }: DepthPanelProps) {
  const stats = G.getGraphStats(graph);
  const gaps = G.getGroundingGaps(graph);

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Depth & progress</h2>
        <span className="text-[11px] text-slate-400">
          deepest chain: {stats.maxDepth}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        <Stat
          label="grounded"
          value={`${stats.groundedQuestions}/${
            stats.groundedQuestions + stats.openQuestions
          }`}
        />
        <Stat label="open" value={stats.openQuestions} />
        <Stat label="arguments" value={stats.arguments} />
        <Stat label="values" value={stats.terminals} />
        <Stat label="convergent" value={stats.convergentValues} />
        <Stat label="clashes" value={stats.clashes} />
      </div>

      {gaps.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs text-slate-500">
            {gaps.length} argument{gaps.length === 1 ? "" : "s"} still need
            grounding. Weakest link first (closest to a root):
          </p>
          <ul className="mt-1.5 space-y-1">
            {gaps.slice(0, 5).map(({ node, root, depth }, i) => {
              const meta = NODE_META[node.type];
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => onFocus(node.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-slate-50"
                    title="Focus this node in the tree"
                  >
                    {i === 0 && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                        WEAKEST
                      </span>
                    )}
                    <span style={{ color: meta.color }}>{meta.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">
                      {node.content}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      depth {depth}
                      {root ? ` · ${NODE_META[root.type].icon}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {gaps.length > 5 && (
            <p className="mt-1 px-2 text-[10px] text-slate-400">
              +{gaps.length - 5} more
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-md bg-emerald-50 px-2 py-1.5 text-xs text-emerald-700">
          Every argument reaches a foundation. Nothing left to ground.
        </p>
      )}
    </div>
  );
}
