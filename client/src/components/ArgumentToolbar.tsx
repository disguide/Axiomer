interface ArgumentToolbarProps {
  onAddClaim: () => void;
  onAddPremise: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export default function ArgumentToolbar({
  onAddClaim,
  onAddPremise,
  onExpandAll,
  onCollapseAll,
}: ArgumentToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 bg-white/85 backdrop-blur-md px-4 py-2 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAddPremise}
          className="rounded border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
        >
          🌱 New Premise
        </button>
        <button
          type="button"
          onClick={onAddClaim}
          className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 shadow-sm transition-colors"
        >
          + New Claim
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExpandAll}
          className="rounded px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Expand all nodes (Coming soon)"
        >
          Expand All
        </button>
        <button
          type="button"
          onClick={onCollapseAll}
          className="rounded px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Collapse all nodes (Coming soon)"
        >
          Collapse All
        </button>
      </div>
    </div>
  );
}
