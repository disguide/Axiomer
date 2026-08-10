import { useState, useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import type { Graph, NodeType, GraphNode } from "@/lib/types";
import { isTerminalType } from "@/lib/types";
import { NODE_META, ALLOWED_CHILDREN } from "@/lib/meta";
import * as G from "@/lib/graph";
import { Plus, Pencil, Trash2, Link2, X, AlertCircle } from "lucide-react";

interface Props {
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

function NodeItem({
  node,
  graph,
  depth,
  visited,
  readOnly,
  onAddInline,
  onAddLinkModal,
  onEdit,
  onDelete,
}: {
  node: GraphNode;
  graph: Graph;
  depth: number;
  visited: Set<string>;
  readOnly: boolean;
  onAddInline: (type: NodeType, content: string, parentId: string) => void;
  onAddLinkModal: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const [inlineAddType, setInlineAddType] = useState<NodeType | null>(null);
  const [inlineAddDraft, setInlineAddDraft] = useState("");
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandFilter, setCommandFilter] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inlineAddType && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [inlineAddType]);

  if (visited.has(node.id)) {
    return (
      <div className="text-xs text-slate-400 italic py-1 pl-6">
        (Cyclic reference to {node.content.substring(0, 20)}...)
      </div>
    );
  }
  visited.add(node.id);

  const meta = NODE_META[node.type] || { color: "#94a3b8", icon: "❓" };
  const children = G.getChildren(graph, node.id);
  const isTerminal = isTerminalType(node.type);

  // Styling logic based on depth and type
  const isRoot = depth === 0;
  
  let containerClass = "relative ";
  if (isRoot) {
    containerClass += "mb-12";
  } else {
    containerClass += "mt-4 ml-3 sm:ml-6 border-l-[1.5px] border-slate-100/50 hover:border-slate-300 transition-colors duration-300 pl-4 sm:pl-6";
  }

  let nodeBoxClass = "group flex items-start gap-3 relative transition-all duration-200 ";
  let nodeBoxStyle: React.CSSProperties = {};

  if (isRoot) {
    nodeBoxClass += "text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight";
  } else if (isTerminal) {
    nodeBoxClass += "px-4 py-3 rounded-xl text-sm font-semibold shadow-sm ring-1";
    nodeBoxStyle = { backgroundColor: meta.color + "0A", color: meta.color };
  } else {
    nodeBoxClass += "text-base text-slate-700 leading-relaxed font-medium";
  }

  const handleInlineAddSubmit = () => {
    if (inlineAddType && inlineAddDraft.trim()) {
      onAddInline(inlineAddType, inlineAddDraft.trim(), node.id);
      setInlineAddDraft("");
      // Close menu
      setInlineAddType(null);
    }
  };

  return (
    <div className={containerClass}>
      {isRoot && (
        <div className="flex items-center gap-2 mb-3 text-[11px] font-bold tracking-widest uppercase opacity-70" style={{ color: meta.color }}>
          <span>{meta.icon}</span> <span>{meta.label}</span>
        </div>
      )}
      
      <div className={nodeBoxClass} style={nodeBoxStyle}>
        {!isRoot && (
          <span style={isTerminal ? {} : { color: meta.color }} className="shrink-0 pt-0.5">
            {meta.icon}
          </span>
        )}
        
        {editing ? (
          <div className="flex-1 flex gap-2 w-full">
            <TextareaAutosize
              className={`flex-1 w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none overflow-hidden p-0 m-0 placeholder-slate-300 ${isRoot ? 'text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight' : 'text-base font-medium text-slate-900 leading-relaxed'}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { 
                  e.preventDefault(); 
                  onEdit(node.id, draft); 
                  setEditing(false); 
                }
                if (e.key === "Tab") {
                  e.preventDefault();
                  onEdit(node.id, draft);
                  setEditing(false);
                  setInlineAddType("supports" as NodeType); // Default child type
                }
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <div className="flex flex-col gap-1 shrink-0 justify-center">
              <button onClick={() => { onEdit(node.id, draft); setEditing(false); }} className="text-[11px] uppercase tracking-wider font-semibold text-indigo-600">Save</button>
              <button onClick={() => setEditing(false)} className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 hover:text-slate-600">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <span className="flex-1 whitespace-pre-wrap leading-relaxed">{node.content}</span>
            {!readOnly && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-full mr-2 top-1">
                <button onClick={() => { setDraft(node.content); setEditing(true); }} className="hover:text-indigo-600 transition-colors p-0.5" title="Edit node">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => { 
                    if (confirmDelete) {
                      onDelete(node.id);
                      clearTimeout(deleteTimeoutRef.current);
                    } else {
                      setConfirmDelete(true);
                      deleteTimeoutRef.current = setTimeout(() => setConfirmDelete(false), 2000);
                    }
                  }} 
                  className={`transition-all p-0.5 rounded ${confirmDelete ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-500 scale-110' : 'hover:text-rose-600'}`} 
                  title={confirmDelete ? "Click again to confirm" : "Delete node"}
                >
                  {confirmDelete ? <AlertCircle className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!isTerminal && !inlineAddType && !readOnly && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-4 mt-1 mb-2">
          <button 
            onClick={() => setInlineAddType("supports" as NodeType)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-500 py-1 px-2 rounded-md hover:bg-indigo-50 transition-colors w-max"
          >
            <Plus className="w-3.5 h-3.5" /> 
            <span>Click or press <kbd className="font-mono bg-slate-100 px-1 rounded text-[10px]">Tab</kbd> to add child</span>
          </button>
        </div>
      )}

      {inlineAddType && (
        <div className="relative mt-2 ml-4 p-2.5 bg-white border border-indigo-100 rounded-lg shadow-md focus-within:ring-2 focus-within:ring-indigo-100 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex gap-2">
            <span style={{ color: NODE_META[inlineAddType].color }} className="shrink-0 pt-1 pl-1 text-sm font-medium flex items-center gap-1">
              {NODE_META[inlineAddType].icon}
            </span>
            <TextareaAutosize
              ref={textareaRef}
              className="flex-1 text-sm bg-transparent border-none px-1 py-1 focus:outline-none focus:ring-0 resize-none overflow-hidden"
              placeholder={`Type '/' for commands or add a ${NODE_META[inlineAddType].label}...`}
              value={inlineAddDraft}
              onChange={(e) => {
                const val = e.target.value;
                setInlineAddDraft(val);
                
                if (val.startsWith("/")) {
                  setShowCommandMenu(true);
                  setCommandFilter(val.substring(1).toLowerCase());
                } else {
                  setShowCommandMenu(false);
                }
              }}
              onKeyDown={(e) => {
                if (showCommandMenu) {
                  const allowed = ALLOWED_CHILDREN[node.type];
                  const filtered = allowed.filter(t => t.includes(commandFilter));
                  if (e.key === "Enter" && filtered.length > 0) {
                    e.preventDefault();
                    setInlineAddType(filtered[0]);
                    setInlineAddDraft("");
                    setShowCommandMenu(false);
                    return;
                  }
                }

                if (e.key === "Enter" && !e.shiftKey) { 
                  e.preventDefault(); 
                  handleInlineAddSubmit(); 
                }
                if (e.key === "Escape") { 
                  setInlineAddType(null); 
                  setInlineAddDraft(""); 
                  setShowCommandMenu(false);
                }
              }}
            />
            <div className="flex flex-col gap-1 justify-center shrink-0">
              <button onClick={handleInlineAddSubmit} className="p-1.5 text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors shadow-sm" title="Add (Enter)">
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setInlineAddType(null); setInlineAddDraft(""); setShowCommandMenu(false); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors" title="Cancel (Esc)">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Command Menu Popover */}
          {showCommandMenu && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                Change Type
              </div>
              <div className="p-1 flex flex-col">
                {ALLOWED_CHILDREN[node.type].filter(t => t.includes(commandFilter)).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setInlineAddType(type);
                      setInlineAddDraft("");
                      setShowCommandMenu(false);
                      textareaRef.current?.focus();
                    }}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 hover:bg-indigo-50 rounded-lg transition-colors text-left"
                  >
                    <span style={{ color: NODE_META[type].color }}>{NODE_META[type].icon}</span>
                    <span className="font-medium">{NODE_META[type].label}</span>
                  </button>
                ))}
                <div className="my-1 border-t border-slate-100"></div>
                <button
                  onClick={() => {
                    setShowCommandMenu(false);
                    setInlineAddType(null);
                    setInlineAddDraft("");
                    onAddLinkModal(node.id);
                  }}
                  className="flex items-center gap-2 px-2 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-left"
                >
                  <Link2 className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">Link existing value...</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {children.length > 0 && (
        <div className="ml-3 pl-4 border-l border-slate-200/80 mt-2 flex flex-col gap-1">
          {children.map((child) => (
            <NodeItem 
              key={`${node.id}-${child.id}`} 
              node={child} 
              graph={graph} 
              depth={depth + 1} 
              visited={new Set(visited)} 
              readOnly={readOnly} 
              onAddInline={onAddInline}
              onAddLinkModal={onAddLinkModal} 
              onEdit={onEdit} 
              onDelete={onDelete} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArgumentView({
  graph,
  readOnly = false,
  onAddNode,
  onLinkValue,
  onEditNode,
  onDeleteNode,
}: Props) {
  const roots = G.getRoots(graph);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkArgumentId, setLinkArgumentId] = useState<string | null>(null);

  const handleOpenLinkModal = (argumentId: string) => {
    setLinkArgumentId(argumentId);
    setLinkModalOpen(true);
  };

  return (
    <div className="w-full">
      {roots.map((root) => (
        <NodeItem
          key={root.id}
          node={root}
          graph={graph}
          depth={0}
          visited={new Set()}
          readOnly={readOnly}
          onAddInline={onAddNode}
          onAddLinkModal={handleOpenLinkModal}
          onEdit={onEditNode}
          onDelete={onDeleteNode}
        />
      ))}
      
      {linkModalOpen && linkArgumentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-sm">
            <h3 className="font-semibold text-slate-900 mb-2">Link Existing Value</h3>
            <p className="text-sm text-slate-500 mb-4">Choose a terminal that already exists in this graph.</p>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {G.getValues(graph).map(v => (
                <button
                  key={v.id}
                  onClick={() => {
                    onLinkValue(linkArgumentId, v.id);
                    setLinkModalOpen(false);
                    setLinkArgumentId(null);
                  }}
                  className="text-left px-3 py-2 text-sm border border-slate-200 rounded-md hover:bg-slate-50"
                >
                  <span style={{ color: NODE_META[v.type].color }} className="mr-2">{NODE_META[v.type].icon}</span>
                  {v.content}
                </button>
              ))}
            </div>
            <button onClick={() => { setLinkModalOpen(false); setLinkArgumentId(null); }} className="mt-4 w-full py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
