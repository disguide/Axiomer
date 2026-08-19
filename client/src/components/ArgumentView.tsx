import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Check, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Graph, GraphNode, NodeType } from "@/lib/types";
import { isTerminalType } from "@/lib/types";
import { ALLOWED_CHILDREN, NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";

interface Props {
  graph: Graph;
  readOnly?: boolean;
  focusId: string | null;
  onSetFocus: (id: string | null) => void;
  onAddNode: (type: NodeType, content: string, parentId: string) => void;
  onLinkValue: (parentId: string, terminalId: string) => void;
  onEditNode: (nodeId: string, content: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onVerifySource: (nodeId: string, verified: boolean) => void;
}

const QUICK_TYPES: NodeType[] = ["support", "conflict", "note", "value"];

function OutlineNode({
  node,
  graph,
  depth,
  visited,
  readOnly,
  onAddNode,
  onLinkValue,
  onEditNode,
  onDeleteNode,
}: {
  node: GraphNode;
  graph: Graph;
  depth: number;
  visited: Set<string>;
  readOnly: boolean;
  onAddNode: Props["onAddNode"];
  onLinkValue: Props["onLinkValue"];
  onEditNode: Props["onEditNode"];
  onDeleteNode: Props["onDeleteNode"];
}) {
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(node.content);
  const [adding, setAdding] = useState<NodeType | null>(null);
  const [addDraft, setAddDraft] = useState("");
  const [linking, setLinking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const children = G.getChildren(graph, node.id);
  const meta = NODE_META[node.type];
  const terminal = isTerminalType(node.type);
  const root = depth === 0;
  const allowed = ALLOWED_CHILDREN[node.type];
  const foundations = G.getTerminals(graph).filter((item) => item.id !== node.id);
  const grounded = G.isNodeGrounded(graph, node.id);
  const acceptability = G.getAcceptability(graph).get(node.id);

  useEffect(() => setEditDraft(node.content), [node.content]);

  if (visited.has(node.id)) {
    return <p className="ml-6 py-2 text-xs italic text-slate-400">Linked above: {node.content}</p>;
  }
  const nextVisited = new Set(visited).add(node.id);

  const submitEdit = () => {
    if (editDraft.trim() && editDraft.trim() !== node.content) onEditNode(node.id, editDraft.trim());
    setEditing(false);
  };

  const submitAdd = () => {
    if (!adding || !addDraft.trim()) return;
    onAddNode(adding, addDraft.trim(), node.id);
    setAdding(null);
    setAddDraft("");
  };

  const status = acceptability === "conflicted"
    ? { label: "Conflicted", className: "bg-rose-50 text-rose-700 ring-rose-200" }
    : grounded
      ? { label: "Grounded", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
      : { label: "Open", className: "bg-amber-50 text-amber-700 ring-amber-200" };

  return (
    <div className={root ? "mb-9" : "relative mt-3 pl-4 sm:pl-6"}>
      {!root && <span className="absolute bottom-0 left-0 top-0 w-px bg-slate-200" />}
      <article className={`group relative ${root ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" : terminal ? "rounded-xl border p-3" : "rounded-xl border border-transparent px-3 py-2.5 hover:border-slate-200 hover:bg-white"}`} style={terminal ? { borderColor: `${meta.color}35`, backgroundColor: `${meta.color}08` } : undefined}>
        <div className="flex items-start gap-3">
          <span className={`grid shrink-0 place-items-center ${root ? "h-9 w-9 rounded-xl" : "h-7 w-7 rounded-lg"}`} style={{ backgroundColor: `${meta.color}12`, color: meta.color }}>{meta.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: meta.color }}>{meta.label}</span>
              {!terminal && node.type !== "note" && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${status.className}`}>{status.label}</span>}
            </div>

            {editing ? (
              <form className="mt-2" onSubmit={(event) => { event.preventDefault(); submitEdit(); }}>
                <TextareaAutosize autoFocus value={editDraft} onChange={(event) => setEditDraft(event.target.value)} minRows={2} className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm leading-6 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100" />
                <div className="mt-2 flex gap-2"><button className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">Save</button><button type="button" onClick={() => { setEditing(false); setEditDraft(node.content); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button></div>
              </form>
            ) : (
              <p className={`${root ? "mt-3 text-xl font-semibold leading-8 tracking-[-0.02em]" : "mt-1 text-sm leading-6"} whitespace-pre-wrap text-slate-800`}>{node.content}</p>
            )}
          </div>

          {!readOnly && !editing && (
            <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <button onClick={() => setEditing(true)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => { if (confirmDelete) onDeleteNode(node.id); else { setConfirmDelete(true); clearTimeout(deleteTimer.current); deleteTimer.current = setTimeout(() => setConfirmDelete(false), 2200); } }} className={`rounded-lg p-2 ${confirmDelete ? "bg-rose-50 text-rose-700" : "text-slate-400 hover:bg-rose-50 hover:text-rose-700"}`} title={confirmDelete ? `Delete this and ${G.countDescendants(graph, node.id)} descendants` : "Delete"}>{confirmDelete ? <Check className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}</button>
            </div>
          )}
        </div>

        {!readOnly && !terminal && (
          <div className="ml-10 mt-3">
            {!adding && !linking ? (
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TYPES.filter((type) => allowed.includes(type)).map((type) => (
                  <button key={type} onClick={() => setAdding(type)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-800"><Plus className="h-3 w-3" />{type === "value" ? "Foundation" : NODE_META[type].label}</button>
                ))}
                {foundations.length > 0 && <button onClick={() => setLinking(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Link2 className="h-3 w-3" />Existing foundation</button>}
              </div>
            ) : adding ? (
              <form className="rounded-xl border border-slate-200 bg-slate-50 p-3" onSubmit={(event) => { event.preventDefault(); submitAdd(); }}>
                <div className="flex items-center gap-2">
                  <select value={adding} onChange={(event) => setAdding(event.target.value as NodeType)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none">
                    {allowed.map((type) => <option key={type} value={type}>{NODE_META[type].label}</option>)}
                  </select>
                  <span className="text-xs text-slate-400">{NODE_META[adding].prompt}</span>
                  <button type="button" onClick={() => setAdding(null)} className="ml-auto rounded p-1 text-slate-400 hover:bg-white"><X className="h-3.5 w-3.5" /></button>
                </div>
                <TextareaAutosize autoFocus value={addDraft} onChange={(event) => setAddDraft(event.target.value)} placeholder={NODE_META[adding].placeholder} minRows={2} className="mt-2 w-full resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-slate-400" />
                <button disabled={!addDraft.trim()} className="mt-2 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30">Add thought</button>
              </form>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="flex items-center justify-between px-2 py-1"><p className="text-xs font-semibold text-slate-600">Choose a foundation to reuse</p><button onClick={() => setLinking(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button></div>
                <div className="mt-1 max-h-44 overflow-y-auto">{foundations.map((item) => <button key={item.id} onClick={() => { onLinkValue(node.id, item.id); setLinking(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-600 hover:bg-slate-50"><span style={{ color: NODE_META[item.type].color }}>{NODE_META[item.type].icon}</span><span className="truncate">{item.content}</span></button>)}</div>
              </div>
            )}
          </div>
        )}
      </article>

      {children.length > 0 && <div className={`${root ? "mt-3 sm:ml-5" : ""}`}>{children.map((child) => <OutlineNode key={`${node.id}-${child.id}`} node={child} graph={graph} depth={depth + 1} visited={nextVisited} readOnly={readOnly} onAddNode={onAddNode} onLinkValue={onLinkValue} onEditNode={onEditNode} onDeleteNode={onDeleteNode} />)}</div>}
    </div>
  );
}

export default function ArgumentView({ graph, readOnly = false, onAddNode, onLinkValue, onEditNode, onDeleteNode }: Props) {
  const roots = G.getRoots(graph);
  if (roots.length === 0) return null;
  return <div>{roots.map((root) => <OutlineNode key={root.id} node={root} graph={graph} depth={0} visited={new Set()} readOnly={readOnly} onAddNode={onAddNode} onLinkValue={onLinkValue} onEditNode={onEditNode} onDeleteNode={onDeleteNode} />)}</div>;
}
