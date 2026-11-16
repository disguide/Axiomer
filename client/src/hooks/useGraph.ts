import { useEffect, useState } from "react";
import type { Graph, NodeType } from "@/lib/types";
import { seedGraph } from "@/lib/seed";
import { isReadOnly, loadCanonicalGraph } from "@/lib/dataSource";
import { validateGraph } from "@/lib/io";
import { snapshotFromHash, type SharedSnapshot } from "@/lib/sharing";
import * as G from "@/lib/graph";

const EMPTY: Graph = { nodes: [], edges: [] };
function loadInitial(graphId: string): { graph: Graph; shared?: SharedSnapshot; error?: string } {
  try {
    if (location.hash.startsWith("#tree=") || location.pathname === "/shared") {
      const shared = snapshotFromHash(location.hash);
      return { graph: shared.graph, shared };
    }
    if (isReadOnly()) return { graph: EMPTY };
    const stored = localStorage.getItem(`axiomer_graph_${graphId}`);
    return { graph: stored ? validateGraph(JSON.parse(stored)) : graphId === "starter" || graphId === "default" ? seedGraph : EMPTY };
  } catch (error) {
    return { graph: EMPTY, error: `Couldn't open this map: ${(error as Error).message} Your saved data has been kept.` };
  }
}
export interface UseGraph {
  graph: Graph; readOnly: boolean; loading: boolean; error?: string;
  shared?: SharedSnapshot; publicMode: boolean; saveError: string | null;
  canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void;
  addRootQuestion: (content: string) => void;
  addRootPremise: (content: string) => void;
  addNode: (type: NodeType, content: string, parentId: string) => void;
  addFloatingNode: (type: NodeType, content: string, position: { x: number; y: number }) => void;
  editNode: (id: string, content: string) => void;
  deleteNode: (id: string) => void;
  linkToExistingValue: (argumentId: string, valueId: string) => void;
  verifySource: (id: string, verified: boolean) => void;
  resetToSeed: () => void; importGraph: (graph: Graph) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  addEdge: (sourceId: string, targetId: string) => void;
}
export function useGraph(graphId = "default"): UseGraph {
  const [initial] = useState(() => loadInitial(graphId));
  const [history, setHistory] = useState({ past: [] as Graph[], current: initial.graph, future: [] as Graph[] });
  const publicMode = isReadOnly();
  const [error, setError] = useState(initial.error);
  const readOnly = publicMode || Boolean(initial.shared) || Boolean(error);
  const [loading, setLoading] = useState(publicMode && !initial.shared && !initial.error);
  const [saveError, setSaveError] = useState<string | null>(null);
  const graph = history.current;
  useEffect(() => {
    if (!publicMode || initial.shared || initial.error) return;
    let active = true;
    loadCanonicalGraph().then((g) => { if (active) setHistory({ past: [], current: g, future: [] }); })
      .catch((e: Error) => active && setError(e.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [publicMode, initial]);
  useEffect(() => {
    if (readOnly) return;
    try { localStorage.setItem(`axiomer_graph_${graphId}`, JSON.stringify(graph)); setSaveError(null); }
    catch { setSaveError("This change couldn't be saved on this device. Export a snapshot to keep a copy."); }
  }, [graph, graphId, readOnly]);
  const commit = (next: Graph) => {
    if (readOnly) return;
    const validated = validateGraph(next);
    setHistory((h) => ({ past: [...h.past.slice(-19), h.current], current: validated, future: [] }));
  };
  return {
    graph, readOnly, publicMode, loading, error, shared: initial.shared, saveError,
    canUndo: !readOnly && history.past.length > 0,
    canRedo: !readOnly && history.future.length > 0,
    undo: () => { if (!readOnly) setHistory((h) => h.past.length ? { past: h.past.slice(0, -1), current: h.past[h.past.length - 1], future: [h.current, ...h.future] } : h); },
    redo: () => { if (!readOnly) setHistory((h) => h.future.length ? { past: [...h.past, h.current], current: h.future[0], future: h.future.slice(1) } : h); },
    addRootQuestion: (content) => commit(G.addRootQuestion(graph, content)),
    addRootPremise: (content) => commit(G.addRootPremise(graph, content)),
    addNode: (type, content, parentId) => commit(G.addNode(graph, type, content, parentId)),
    addFloatingNode: (type, content, position) => commit(G.addFloatingNode(graph, type, content, position)),
    editNode: (id, content) => commit(G.editNode(graph, id, content)),
    deleteNode: (id) => commit(G.deleteNode(graph, id)),
    linkToExistingValue: (parentId, valueId) => commit(G.linkToExistingValue(graph, parentId, valueId)),
    verifySource: (id, verified) => commit(G.verifySource(graph, id, verified)),
    resetToSeed: () => commit(seedGraph), importGraph: commit,
    moveNode: (id, position) => commit(G.moveNode(graph, id, position)),
    addEdge: (sourceId, targetId) => commit(G.addEdge(graph, sourceId, targetId)),
  };
}
