import type { Graph } from "../lib/types";
import { getParents } from "../lib/graph";
import { NODE_META } from "../lib/meta";

interface Props {
  graph: Graph;
  onVerifySource: (id: string, verified: boolean) => void;
  readOnly: boolean;
}

export function Bibliography({ graph, onVerifySource, readOnly }: Props) {
  // Aggregate all sources
  const sources = graph.nodes.filter(n => n.type === "source");

  if (sources.length === 0) {
    return (
      <div className="flex-1 h-full overflow-y-auto p-6 sm:p-10">
        <div className="max-w-4xl mx-auto">
          <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-slate-500 bg-white">
            <span className="text-4xl block mb-4">📚</span>
            No sources yet. Add "Source" nodes to back up claims or arguments. They will appear here for easy auditing.
          </p>
        </div>
      </div>
    );
  }

  // Sort verified sources first
  const sortedSources = [...sources].sort((a, b) => {
    if (a.verified && !b.verified) return -1;
    if (!a.verified && b.verified) return 1;
    return 0;
  });

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 sm:p-10">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Bibliography</h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            A centralized audit of all sources cited across this argument graph.
          </p>
        </header>

        <div className="grid gap-4">
          {sortedSources.map((source) => {
            const citingNodes = getParents(graph, source.id);
            const isUrl = source.content.startsWith("http");
            return (
              <div key={source.id} className="rounded-md border border-slate-200 bg-white p-5 flex flex-col sm:flex-row items-start gap-4 hover:bg-slate-50 transition-colors">
                <button
                  type="button"
                  onClick={() => onVerifySource(source.id, !source.verified)}
                  disabled={readOnly}
                  className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xl transition-colors ${
                    source.verified
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  }`}
                  title={source.verified ? "Verified Source" : "Unverified Source (Click to verify)"}
                >
                  {source.verified ? "✓" : "?"}
                </button>
                <div className="flex-1 min-w-0">
                  {isUrl ? (
                    <a
                      href={source.content}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-lg font-bold text-indigo-700 hover:underline break-all leading-tight mb-4"
                    >
                      {source.content}
                    </a>
                  ) : (
                    <p className="text-lg font-bold text-slate-900 break-words leading-tight mb-4">
                      {source.content}
                    </p>
                  )}

                  <div className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-2">
                    Cited By ({citingNodes.length})
                  </div>
                  <ul className="space-y-1.5">
                    {citingNodes.map((p) => (
                      <li key={p.id} className="flex gap-2 items-center bg-slate-50 border border-slate-100 rounded-md px-3 py-1.5 w-fit">
                        <span style={{ color: NODE_META[p.type].color }} className="text-base shrink-0">
                          {NODE_META[p.type].icon}
                        </span>
                        <span className="font-medium text-slate-700 truncate">{p.content}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
