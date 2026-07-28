import type { Graph } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";

interface ValuesIndexProps {
  graph: Graph;
}

export default function ValuesIndex({ graph }: ValuesIndexProps) {
  const usage = G.getValueUsage(graph);
  const clashes = G.getValueClashes(graph);

  if (usage.length === 0) {
    return (
      <div className="flex-1 h-full overflow-y-auto p-6 sm:p-10">
        <div className="max-w-4xl mx-auto">
          <p className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500 shadow-sm bg-white">
            <span className="text-4xl block mb-4">⚓</span>
            No bedrock values yet. Ground an argument in a value to see convergence here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 sm:p-10">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Values Directory
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            Where every chain bottoms out. A value used by more than one root shows <span className="font-bold text-indigo-600">convergence</span> — the shared foundation under different claims and premises.
          </p>
        </header>

        <section>
          <ul className="space-y-4">
            {usage.map(({ value, roots, groundingNodes, convergent }) => {
              const meta = NODE_META[value.type];
              return (
                <li
                  key={value.id}
                  className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="text-2xl leading-none"
                      style={{ color: meta.color }}
                      aria-hidden
                    >
                      {meta.icon}
                    </span>
                    <span className="text-base font-semibold text-slate-900 mt-0.5">
                      {value.content}
                    </span>
                    <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                      {meta.label}
                    </span>
                    {convergent && (
                      <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold tracking-wide text-indigo-700">
                        CONVERGENT · {roots.length} roots
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pl-9 text-sm text-slate-600">
                    {roots.length > 0 ? (
                      <>
                        <span className="text-slate-500 font-medium">
                          Grounds {groundingNodes.length} argument{groundingNodes.length === 1 ? "" : "s"} across:
                        </span>
                        <ul className="mt-2 space-y-1">
                          {roots.map((r) => (
                            <li key={r.id} className="flex gap-2 items-center bg-slate-50 border border-slate-100 rounded-md px-3 py-1.5 w-fit">
                              <span style={{ color: NODE_META[r.type].color }} className="text-base">
                                {NODE_META[r.type].icon}
                              </span>
                              <span className="font-medium text-slate-700">{r.content}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <span className="text-slate-400 italic">
                        Not yet linked into a tree.
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {clashes.length > 0 && (
          <section className="bg-white rounded-md border border-slate-200 p-6 mt-12">
            <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight flex items-center gap-2">
              <span className="text-rose-500">◆</span> Value Clashes
            </h2>
            <p className="text-sm text-amber-700/80 mb-6 max-w-2xl">
              Claims whose competing positions bottom out at different values — the real, fundamental disagreement underneath.
            </p>
            <ul className="space-y-4">
              {clashes.map(({ question, values }) => (
                <li
                  key={question.id}
                  className="rounded-md border border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-amber-100">
                    <span style={{ color: NODE_META.claim.color }} className="text-xl">
                      {NODE_META.claim.icon}
                    </span>
                    {question.content}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {values.map((v) => {
                      const meta = NODE_META[v.type];
                      return (
                        <span
                          key={v.id}
                          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium flex items-center gap-2"
                        >
                          <span style={{ color: meta.color }} className="text-base">{meta.icon}</span>{" "}
                          <span className="text-slate-800">{v.content}</span>
                        </span>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
