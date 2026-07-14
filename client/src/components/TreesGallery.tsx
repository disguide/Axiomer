// The Trees workspace — the entry point of the Tree tab. Instead of dumping
// the whole graph, it shows each root (question or premise) as a card: a
// self-contained tree you open on its own focused canvas and build brick by
// brick. The values a tree reaches are shown as chips — the shared bedrock
// that links it to other trees (see the Highways/Values view).

import { useMemo, useState } from "react";
import type { Graph, GraphNode } from "@/lib/types";
import type { ResolutionState } from "@/lib/graph";
import * as G from "@/lib/graph";
import { NODE_META } from "@/lib/meta";

interface TreesGalleryProps {
  graph: Graph;
  readOnly?: boolean;
  onOpen: (rootId: string) => void;
  onNew: (kind: "question" | "premise") => void;
  onOpenValues: () => void;
}

const RESOLUTION_BADGE: Record<
  ResolutionState,
  { label: string; cls: string }
> = {
  resolved: { label: "RESOLVED", cls: "bg-emerald-600 text-white" },
  grounded: { label: "GROUNDED", cls: "bg-emerald-100 text-emerald-700" },
  dissolved: { label: "DISSOLVED", cls: "bg-violet-100 text-violet-700" },
  open: { label: "OPEN", cls: "bg-amber-100 text-amber-700" },
};

export default function TreesGallery({
  graph,
  readOnly = false,
  onOpen,
  onNew,
  onOpenValues,
}: TreesGalleryProps) {
  const [q, setQ] = useState("");

  const roots = useMemo(() => G.getRoots(graph), [graph]);
  const sizes = useMemo(() => G.getSubtreeSizes(graph), [graph]);

  // For each root, the distinct bedrock values its chains reach.
  const rootValues = useMemo(() => {
    const map = new Map<string, GraphNode[]>();
    for (const usage of G.getValueUsage(graph)) {
      for (const root of usage.roots) {
        if (!map.has(root.id)) map.set(root.id, []);
        map.get(root.id)!.push(usage.value);
      }
    }
    return map;
  }, [graph]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return roots;
    return roots.filter((r) => r.content.toLowerCase().includes(needle));
  }, [roots, q]);

  const questions = filtered.filter((r) => r.type === "question");
  const premises = filtered.filter((r) => r.type === "premise");

  const card = (root: GraphNode) => {
    const meta = NODE_META[root.type];
    const size = sizes.get(root.id) ?? 0;
    const values = rootValues.get(root.id) ?? [];
    const resolution =
      root.type === "question" ? G.getResolution(graph, root.id) : null;
    const badge = resolution ? RESOLUTION_BADGE[resolution.state] : null;
    return (
      <button
        key={root.id}
        type="button"
        onClick={() => onOpen(root.id)}
        className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-slate-400"
        style={{ borderLeft: `5px solid ${meta.color}` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none" style={{ color: meta.color }}>
            {meta.icon}
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-slate-400">
            {meta.label}
          </span>
          {badge && (
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
              {badge.label}
            </span>
          )}
        </div>
        <p className="mt-1.5 line-clamp-3 text-sm font-medium text-slate-800">
          {root.content}
        </p>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
          <span>{size} node{size === 1 ? "" : "s"}</span>
          {values.length > 0 && (
            <span>· lands on {values.length} value{values.length === 1 ? "" : "s"}</span>
          )}
        </div>
        {values.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {values.slice(0, 4).map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                title={`${NODE_META[v.type].label}: ${v.content}`}
              >
                <span style={{ color: NODE_META[v.type].color }}>
                  {NODE_META[v.type].icon}
                </span>
                <span className="max-w-[9rem] truncate">{v.content}</span>
              </span>
            ))}
            {values.length > 4 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">
                +{values.length - 4}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Your trees</h2>
          <p className="text-xs text-slate-500">
            Each tree is its own canvas — open one and build it down to bedrock.
            Ground into shared values to link trees into{" "}
            <button type="button" onClick={onOpenValues} className="font-medium text-indigo-600 underline">
              highways
            </button>
            .
          </p>
        </div>
        {!readOnly && (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => onNew("premise")}
              className="rounded border border-teal-600 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
            >
              🌱 New premise tree
            </button>
            <button
              type="button"
              onClick={() => onNew("question")}
              className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              + New question tree
            </button>
          </div>
        )}
      </div>

      {roots.length > 6 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter trees…"
          className="mb-4 w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
        />
      )}

      {roots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm text-slate-500">No trees yet.</p>
          <p className="mt-1 text-xs text-slate-400">
            Start one blank canvas at a time — a question to explore down to its
            values, or a premise to build forward from.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {questions.length > 0 && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Questions — explored down to bedrock ({questions.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {questions.map(card)}
              </div>
            </section>
          )}
          {premises.length > 0 && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Premises — built forward from a base ({premises.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {premises.map(card)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
