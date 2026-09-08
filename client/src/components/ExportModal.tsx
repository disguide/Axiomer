import { useState } from "react";
import type { Graph } from "@/lib/types";
import { exportGraphToMarkdown } from "@/lib/markdown";
import * as G from "@/lib/graph";
import { Copy, X, Check, Bot, FileText, Code2 } from "lucide-react";

interface Props {
  graph: Graph;
  onClose: () => void;
}

export default function ExportModal({ graph, onClose }: Props) {
  const [tab, setTab] = useState<"markdown" | "json" | "agent">("markdown");
  const [copied, setCopied] = useState(false);

  const markdownText = exportGraphToMarkdown(graph);
  const jsonText = JSON.stringify(graph, null, 2);
  
  // Format for AI Agents / LLMs
  const formatAgentContext = () => {
    const roots = G.getRoots(graph);
    const terminals = G.getTerminals(graph);
    const gaps = G.getGroundingGaps(graph);
    
    let text = `# Axiomer Epistemic Knowledge Context\n\n`;
    text += `## Core Questions / Claims\n`;
    roots.forEach((r) => {
      text += `- [${r.type.toUpperCase()}] ${r.content} (ID: ${r.id})\n`;
    });
    
    text += `\n## Full Derivation Tree (Markdown)\n\`\`\`markdown\n${markdownText}\n\`\`\`\n\n`;
    
    text += `## Grounding Foundations & Sources\n`;
    terminals.forEach((t) => {
      text += `- [${t.type.toUpperCase()}] ${t.content}\n`;
    });
    
    if (gaps.length > 0) {
      text += `\n## Epistemic Gaps / Ungrounded Nodes\n`;
      gaps.forEach((gap) => {
        text += `- [Ungrounded ${gap.node.type}] "${gap.node.content}" (Root: ${gap.root?.content || "unknown"}, Depth: ${gap.depth})\n`;
      });
    }
    
    text += `\nPrompt Directive: Use the above epistemic structure as grounded premises. Challenge ungrounded claims and preserve terminal values.`;
    return text;
  };

  const agentText = formatAgentContext();

  const activeText = tab === "markdown" ? markdownText : tab === "json" ? jsonText : agentText;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const ext = tab === "json" ? "json" : tab === "agent" ? "prompt.md" : "md";
    const blob = new Blob([activeText], {
      type: tab === "json" ? "application/json" : "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `axiomer-export-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl bg-white/90 backdrop-blur-3xl shadow-[0_32px_64px_rgba(0,0,0,0.12)] border border-white/60 max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Export Graph</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200/60 bg-slate-50/50 px-6 pt-3 gap-5">
          <button
            className={`flex items-center gap-1.5 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              tab === "markdown"
                ? "border-slate-950 text-slate-950"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
            onClick={() => setTab("markdown")}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Markdown</span>
          </button>
          <button
            className={`flex items-center gap-1.5 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              tab === "json"
                ? "border-slate-950 text-slate-950"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
            onClick={() => setTab("json")}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>JSON (Raw)</span>
          </button>
          <button
            className={`flex items-center gap-1.5 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              tab === "agent"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
            onClick={() => setTab("agent")}
          >
            <Bot className="h-3.5 w-3.5 text-indigo-600" />
            <span>AI Agent Prompt</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 bg-slate-50/30">
          <pre className="whitespace-pre-wrap rounded-xl border border-slate-200/60 bg-white/90 backdrop-blur-sm p-4 text-[12px] font-mono text-slate-700 shadow-sm min-h-[280px] leading-relaxed selection:bg-indigo-100">
            {activeText}
          </pre>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/60 px-6 py-4 bg-white/60 rounded-b-2xl">
          <p className="text-xs font-medium text-slate-500 max-w-xs leading-relaxed">
            {tab === "markdown"
              ? "Readable outline for GitHub, Obsidian, or Notion."
              : tab === "json"
              ? "Raw schema data for backup or cross-instance import."
              : "Structured context for Claude, Gemini, or ChatGPT."}
          </p>
          <div className="flex gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownload}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
            >
              Download
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all shadow-md min-w-[140px]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy Text
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
