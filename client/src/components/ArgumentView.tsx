import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Edit2, Trash2 } from "lucide-react";
import type { Graph, NodeType, GraphNode } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";
import TopologyDisk from "./TopologyDisk";
import AddNodeForm from "./AddNodeForm";

interface ArgumentViewProps {
  graph: Graph;
  readOnly?: boolean;
  focusId: string | null;
  onSetFocus: (id: string | null) => void;
  onAddNode: (type: NodeType, content: string, parentId: string) => void;
  onLinkValue: (argumentId: string, valueId: string) => void;
  onEditNode: (nodeId: string, content: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onVerifySource: (nodeId: string, verified: boolean) => void;
}

export default function ArgumentView({
  graph,
  readOnly = false,
  focusId,
  onSetFocus,
  onAddNode,
  onLinkValue,
  onEditNode,
  onDeleteNode,
  // onVerifySource,
}: ArgumentViewProps) {
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [showTopology, setShowTopology] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const roots = G.getRoots(graph);
  
  if (roots.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-slate-300 p-12 text-center text-slate-500 bg-[var(--color-glass)] backdrop-blur-[var(--blur-glass)]">
        <p>No claims yet. Switch to the graph to create one.</p>
      </div>
    );
  }

  const currentId = focusId || roots[0].id;
  const current = G.getNode(graph, currentId);

  if (!current) {
    onSetFocus(roots[0].id);
    return null;
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const parents = G.getParents(graph, current.id);
        if (parents.length > 0) onSetFocus(parents[0].id);
      } else if (e.key === "ArrowLeft") {
        const vEdge = graph.edges.find(e => G.edgeEndpoints(e).parent === current.id && e.edgeType === "supports");
        if (vEdge) {
          e.preventDefault();
          onSetFocus(G.edgeEndpoints(vEdge).child);
        }
      } else if (e.key === "ArrowRight") {
        const oEdge = graph.edges.find(e => G.edgeEndpoints(e).parent === current.id && e.edgeType === "attacks");
        if (oEdge) {
          e.preventDefault();
          onSetFocus(G.edgeEndpoints(oEdge).child);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current.id, graph, onSetFocus]);

  const childrenEdges = graph.edges
    .filter((e) => G.edgeEndpoints(e).parent === currentId)
    .map((edge) => {
      const child = G.getNode(graph, G.edgeEndpoints(edge).child);
      return child ? { child, edge } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const validations = childrenEdges.filter(c => c.edge.edgeType === "supports");
  const objections = childrenEdges.filter(c => c.edge.edgeType === "attacks");
  const others = childrenEdges.filter(c => c.edge.edgeType !== "supports" && c.edge.edgeType !== "attacks");

  const breadcrumbs: GraphNode[] = [];
  let tracer = currentId;
  const visited = new Set<string>();
  while (tracer && !visited.has(tracer)) {
    visited.add(tracer);
    const parents = G.getParents(graph, tracer);
    if (parents.length > 0) {
      breadcrumbs.unshift(parents[0]);
      tracer = parents[0].id;
    } else {
      break;
    }
  }

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== current.content) {
      onEditNode(current.id, editContent.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 w-full">
      {/* Action Bar / Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {breadcrumbs.length > 0 && (
          <nav className="flex flex-wrap gap-2 text-sm items-center bg-[var(--color-glass)] backdrop-blur-[var(--blur-glass)] px-4 py-2 rounded-full border border-slate-200/60 shadow-sm">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.id} className="flex items-center gap-2">
                {idx > 0 && <span className="text-slate-300">/</span>}
                <button
                  type="button"
                  onClick={() => onSetFocus(crumb.id)}
                  className="text-slate-500 hover:text-slate-900 transition-colors truncate max-w-[150px]"
                  title={crumb.content}
                >
                  {crumb.content}
                </button>
              </div>
            ))}
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium truncate max-w-[150px]">{current.content}</span>
          </nav>
        )}
        
        <button
          onClick={() => setShowTopology(!showTopology)}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-[var(--color-glass-solid)] backdrop-blur-[var(--blur-glass)] border border-slate-200/60 rounded-full px-4 py-2 shadow-sm self-start"
        >
          {showTopology ? "Hide Topology" : "View Topology"}
        </button>
      </div>

      {showTopology && (
        <div className="bg-[var(--color-glass-solid)] backdrop-blur-[var(--blur-glass)] border border-slate-200/60 rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] animate-in slide-in-from-top-2 fade-in duration-200">
          <h3 className="text-[12px] font-bold text-slate-400 mb-4 uppercase tracking-wider text-center">Depth Topology</h3>
          <TopologyDisk graph={graph} currentId={currentId} onFocus={onSetFocus} />
        </div>
      )}

      {/* Main Node View */}
      <div className="bg-[var(--color-glass-solid)] backdrop-blur-[var(--blur-glass)] rounded-[var(--radius-card)] border border-slate-200/60 shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200/60 flex flex-wrap items-center justify-between bg-white/40 gap-4">
          <div className="flex items-center gap-2">
            <span style={{ color: NODE_META[current.type].color }} className="text-xl">
              {NODE_META[current.type].icon}
            </span>
            <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-600">
              {NODE_META[current.type].label}
            </span>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditContent(current.content);
                  setIsEditing(true);
                }}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                title="Edit node"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this node?")) {
                    onDeleteNode(current.id);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                title="Delete node"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <div className="p-6">
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
                className="w-full min-h-[100px] p-3 rounded-lg border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-slate-800 text-lg resize-y bg-white/80"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-md transition-colors">Cancel</button>
                <button onClick={handleEditSubmit} className="px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors">Save Changes</button>
              </div>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-a:text-indigo-600">
              <h2 className="text-2xl font-semibold text-slate-900 leading-tight tracking-tight mt-0 mb-0">
                <ReactMarkdown>{current.content}</ReactMarkdown>
              </h2>
            </div>
          )}
        </div>
      </div>

      {addingTo === current.id && (
        <div className="bg-[var(--color-glass)] backdrop-blur-[var(--blur-glass)] border border-slate-200/60 rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-card)]">
          <AddNodeForm
            parent={current}
            existingTerminals={G.getTerminals(graph)}
            onAdd={(type, content) => {
              onAddNode(type, content, current.id);
              setAddingTo(null);
            }}
            onLinkValue={(valueId) => {
              onLinkValue(current.id, valueId);
              setAddingTo(null);
            }}
            onClose={() => setAddingTo(null)}
          />
        </div>
      )}

      {/* Children blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Validations */}
        <div className="flex-1 space-y-3">
          <h3 className="font-semibold text-slate-500 pb-1 flex items-center gap-2 text-xs uppercase tracking-wider">
            <span className="text-emerald-500">{NODE_META['support'].icon}</span>
            <span>Supports ({validations.length})</span>
          </h3>
          
          <AnimatePresence mode="popLayout">
            {validations.map(({ child }) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={child.id} 
                className="cursor-pointer group relative bg-[var(--color-glass-solid)] backdrop-blur-[var(--blur-glass)] border border-slate-200/60 rounded-[var(--radius-card)] p-4 shadow-sm hover:shadow-[var(--shadow-card)] transition-all"
                onClick={() => onSetFocus(child.id)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400 rounded-l-[var(--radius-card)]"></div>
                <div className="pl-2">
                  <div className="text-sm text-slate-800 font-medium leading-relaxed">
                    <ReactMarkdown>{child.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {!readOnly && (
            <button
              onClick={() => setAddingTo(current.id)}
              className="w-full text-left text-sm font-medium text-slate-400 hover:text-slate-700 bg-white/40 border border-slate-200/60 border-dashed rounded-[var(--radius-card)] p-3 hover:bg-white/60 transition-colors"
            >
              + Add Support
            </button>
          )}
        </div>

        {/* Objections */}
        <div className="flex-1 space-y-3">
          <h3 className="font-semibold text-slate-500 pb-1 flex items-center gap-2 text-xs uppercase tracking-wider">
            <span className="text-rose-500">{NODE_META['attack'].icon}</span>
            <span>Attacks ({objections.length})</span>
          </h3>

          <AnimatePresence mode="popLayout">
            {objections.map(({ child }) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={child.id} 
                className="cursor-pointer group relative bg-[var(--color-glass-solid)] backdrop-blur-[var(--blur-glass)] border border-slate-200/60 rounded-[var(--radius-card)] p-4 shadow-sm hover:shadow-[var(--shadow-card)] transition-all"
                onClick={() => onSetFocus(child.id)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400 rounded-l-[var(--radius-card)]"></div>
                <div className="pl-2">
                  <div className="text-sm text-slate-800 font-medium leading-relaxed">
                    <ReactMarkdown>{child.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {!readOnly && (
            <button
              onClick={() => setAddingTo(current.id)}
              className="w-full text-left text-sm font-medium text-slate-400 hover:text-slate-700 bg-white/40 border border-slate-200/60 border-dashed rounded-[var(--radius-card)] p-3 hover:bg-white/60 transition-colors"
            >
              + Add Attack
            </button>
          )}
        </div>
      </div>

      {/* Others */}
      {others.length > 0 && (
        <div className="flex flex-col gap-3 mt-6">
           <h3 className="font-semibold text-slate-500 pb-1 text-xs uppercase tracking-wider border-b border-slate-200/60">
             Annotations & Details
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             {others.map(({ child, edge }) => (
               <div 
                 key={child.id} 
                 className="cursor-pointer group relative bg-[var(--color-glass)] backdrop-blur-[var(--blur-glass)] border border-slate-200/60 rounded-[var(--radius-card)] p-4 shadow-sm hover:shadow-[var(--shadow-card)] transition-all"
                 onClick={() => onSetFocus(child.id)}
               >
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300 rounded-l-[var(--radius-card)]"></div>
                 <div className="pl-2">
                   <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium uppercase tracking-wide">
                     <span style={{ color: NODE_META[child.type].color }}>{NODE_META[child.type].icon}</span>
                     {edge.edgeType.replace("-", " ")}
                   </div>
                   <p className="text-sm text-slate-700 font-medium leading-relaxed group-hover:text-slate-900 transition-colors">
                     {child.content}
                   </p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

    </div>
  );
}
