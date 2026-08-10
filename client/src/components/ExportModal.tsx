import { useState } from "react";
import type { Graph } from "@/lib/types";
import { exportGraphToMarkdown } from "@/lib/markdown";
import { Copy, X, Check } from "lucide-react";

interface Props {
  graph: Graph;
  onClose: () => void;
}

export default function ExportModal({ graph, onClose }: Props) {
  const [tab, setTab] = useState<"markdown" | "json">("markdown");
  const [copied, setCopied] = useState(false);

  const markdownText = exportGraphToMarkdown(graph);
  const jsonText = JSON.stringify(graph, null, 2);

  const activeText = tab === "markdown" ? markdownText : jsonText;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([activeText], {
      type: tab === "json" ? "application/json" : "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `axiomer-export-${Date.now()}.${tab === "json" ? "json" : "md"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl bg-white/70 backdrop-blur-3xl shadow-[0_32px_64px_rgba(0,0,0,0.1)] border border-white/50 max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200/50 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Export Graph</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200/50 bg-slate-50/50 px-6 pt-4 gap-6">
          <button
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              tab === "markdown"
                ? "border-slate-800 text-slate-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
            onClick={() => setTab("markdown")}
          >
            Markdown (Readable)
          </button>
          <button
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              tab === "json"
                ? "border-slate-800 text-slate-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
            onClick={() => setTab("json")}
          >
            JSON (Raw Data)
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
          <pre className="whitespace-pre-wrap rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-5 text-[13px] font-mono text-slate-700 shadow-sm min-h-[300px] leading-relaxed selection:bg-indigo-100">
            {activeText}
          </pre>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200/50 px-6 py-5 bg-white/40 rounded-b-2xl">
          <p className="text-xs font-medium text-slate-500 max-w-[200px] leading-relaxed">
            {tab === "markdown" 
              ? "Copy and paste into GitHub issues, Reddit, or Notion."
              : "Raw data for backup or importing into another Axiomer instance."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="rounded-full border border-slate-200/80 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm hover:shadow"
            >
              Download File
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 rounded-full bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 min-w-[160px]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy to Clipboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
