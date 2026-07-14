import type { Graph } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";

interface ValuesIndexProps {
  graph: Graph;
  onOpenTree?: (rootId: string) => void; // jump into a converging tree's canvas
}

export default function ValuesIndex({ graph, onOpenTree }: ValuesIndexProps) {
  const usage = G.getValueUsage(graph);
  const clashes = G.getValueClashes(graph);

  if (usage.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
        No bedrock values yet. Ground an argument in a value to see convergence
        here.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-slate-900">
          Highways — the values your trees share
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Every chain bottoms out at a value. When several trees land on the
          same one, that value is a{" "}
          <span className="font-medium text-indigo-600">highway</span> linking
          them — click any tree below to drive into its canvas.
        </p>

        <ul className="mt-3 space-y-3">
          {usage.map(({ value, roots, groundingNodes, convergent }) => {
            const meta = NODE_META[value.type];
            return (
              <li
                key={value.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
                style={{ borderLeft: `5px solid ${meta.color}` }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-lg leading-none"
                    style={{ color: meta.color }}
                    aria-hidden
                  >
                    {meta.icon}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {value.content}
                  </span>
                  <span className="text-[10px] font-semibold tracking-wide text-slate-400">
                    {meta.label}
                  </span>
                  {convergent && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                      CONVERGENT · {roots.length} roots
                    </span>
                  )}
                </div>

                <div className="mt-2 pl-7 text-xs text-slate-600">
                  {roots.length > 0 ? (
                    <>
                      <span className="text-slate-400">
                        Grounds {groundingNodes.length} argument
                        {groundingNodes.length === 1 ? "" : "s"} across:
                      </span>
                      <ul className="mt-1 flex flex-wrap gap-1.5">
                        {roots.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => onOpenTree?.(r.id)}
                              disabled={!onOpenTree}
                              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 enabled:hover:bg-indigo-100 disabled:cursor-default"
                              title={onOpenTree ? "Open this tree's canvas" : undefined}
                            >
                              <span style={{ color: NODE_META[r.type].color }}>
                                {NODE_META[r.type].icon}
                              </span>
                              <span className="max-w-[16rem] truncate">{r.content}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <span className="text-slate-400">
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
        <section>
          <h2 className="text-sm font-semibold text-slate-900">
            Value clashes
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Questions whose competing positions bottom out at{" "}
            <span className="font-medium text-amber-600">different values</span>{" "}
            — the real disagreement underneath.
          </p>
          <ul className="mt-3 space-y-3">
            {clashes.map(({ question, values }) => (
              <li
                key={question.id}
                className="rounded-lg border border-amber-200 bg-amber-50 p-3"
              >
                <div className="flex gap-1.5 text-sm font-medium text-slate-900">
                  <span style={{ color: NODE_META.question.color }}>
                    {NODE_META.question.icon}
                  </span>
                  {question.content}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 pl-6">
                  {values.map((v) => {
                    const meta = NODE_META[v.type];
                    return (
                      <span
                        key={v.id}
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        <span style={{ color: meta.color }}>{meta.icon}</span>{" "}
                        {v.content}
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
  );
}
