import { useState } from "react";
import { useGraph } from "@/hooks/useGraph";
import TreeView from "@/components/TreeView";
import Legend from "@/components/Legend";

export default function Home() {
  const {
    graph,
    addRootQuestion,
    addNode,
    editNode,
    deleteNode,
    linkToExistingValue,
    resetToSeed,
  } = useGraph();

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [showLegend, setShowLegend] = useState(false);

  const createQuestion = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addRootQuestion(trimmed);
    setDraft("");
    setCreating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Axiomer</h1>
            <p className="text-xs text-slate-500">
              Trace questions down to their bedrock values.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLegend((v) => !v)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              {showLegend ? "Hide legend" : "Legend"}
            </button>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              + New Question
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_18rem]">
        <section>
          {creating && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
              <label className="block text-sm font-medium text-slate-700">
                What question do you want to explore?
              </label>
              <textarea
                className="mt-1 w-full resize-y rounded border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none"
                rows={2}
                autoFocus
                placeholder="Should you pull the lever?"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                    createQuestion();
                  if (e.key === "Escape") {
                    setDraft("");
                    setCreating(false);
                  }
                }}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraft("");
                    setCreating(false);
                  }}
                  className="rounded px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createQuestion}
                  className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
                >
                  Create Question
                </button>
              </div>
            </div>
          )}

          <TreeView
            graph={graph}
            onAddNode={addNode}
            onLinkValue={linkToExistingValue}
            onEditNode={editNode}
            onDeleteNode={deleteNode}
          />

          <div className="mt-8 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Reset the graph to the seed examples? This discards your current graph.",
                  )
                )
                  resetToSeed();
              }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Reset to seed examples
            </button>
          </div>
        </section>

        <aside
          className={`${showLegend ? "block" : "hidden"} lg:block`}
        >
          <div className="lg:sticky lg:top-6">
            <Legend />
          </div>
        </aside>
      </main>
    </div>
  );
}
