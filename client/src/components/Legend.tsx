import { NODE_META, NODE_ORDER } from "@/lib/meta";

export default function Legend() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Node types</h2>
      <p className="mt-0.5 text-[11px] text-slate-400">
        {NODE_ORDER.length} node types. Value, Principle, and Epistemic Limit are
        terminal — they end a chain. Premise is a root you reason forward from.
      </p>
      <ul className="mt-3 space-y-2">
        {NODE_ORDER.map((type) => {
          const meta = NODE_META[type];
          return (
            <li key={type} className="flex gap-2">
              <span
                className="mt-0.5 w-5 shrink-0 text-center text-base leading-none"
                style={{ color: meta.color }}
                aria-hidden
              >
                {meta.icon}
              </span>
              <div className="min-w-0">
                <span
                  className="text-[11px] font-semibold tracking-wide"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                  {meta.terminal && (
                    <span className="ml-1 text-slate-400">(terminal)</span>
                  )}
                </span>
                <p className="text-[11px] leading-snug text-slate-500">
                  {meta.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
