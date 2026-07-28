// Graph state.
// - Authoring mode: editable, persisted in localStorage with auto-save.
// - Read-only (public viewer) mode: loads the canonical data/graph.json and
//   exposes the same API with mutations as no-ops, so the UI can stay simple.

import { useEffect, useState } from "react";
import { migrateGraph, type Graph, type NodeType } from "@/lib/types";
import { seedGraph } from "@/lib/seed";
import { isReadOnly, loadCanonicalGraph } from "@/lib/dataSource";
import * as G from "@/lib/graph";

import * as LZString from "lz-string";

function loadInitial(graphId: string): Graph {
  try {
    if (typeof window !== "undefined" && window.location.hash.startsWith("#tree=")) {
      const compressed = window.location.hash.substring(6); // remove #tree=
      const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
      if (decompressed) {
        const parsed = JSON.parse(decompressed) as Graph;
        if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          // Clear the hash so it doesn't linger, since edits will be saved locally
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          return migrateGraph(parsed);
        }
      }
    }
  } catch (err) {
    console.error("failed to decode graph from URL", err);
  }

  try {
    const stored = localStorage.getItem(`axiomer_graph_${graphId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as Graph;
      if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        return migrateGraph(parsed);
      }
    }
  } catch {
    // fall through to seed
  }
  return seedGraph;
}

const EMPTY: Graph = { nodes: [], edges: [] };

export interface UseGraph {
  graph: Graph;
  readOnly: boolean;
  loading: boolean;
  addRootQuestion: (content: string) => void;
  addRootPremise: (content: string) => void;
  addNode: (type: NodeType, content: string, parentId: string) => void;
  addFloatingNode: (type: NodeType, content: string, position: { x: number; y: number }) => void;
  editNode: (id: string, content: string) => void;
  deleteNode: (id: string) => void;
  linkToExistingValue: (argumentId: string, valueId: string) => void;
  verifySource: (id: string, verified: boolean) => void;
  resetToSeed: () => void;
  importGraph: (graph: Graph) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  addEdge: (sourceId: string, targetId: string) => void;
}

export function useGraph(graphId: string = "default"): UseGraph {
  const readOnly = isReadOnly();
  const [graph, setGraph] = useState<Graph>(() =>
    readOnly ? EMPTY : loadInitial(graphId),
  );
  const [loading, setLoading] = useState<boolean>(readOnly);

  // Read-only: fetch the canonical graph once.
  useEffect(() => {
    if (!readOnly) return;
    let alive = true;
    loadCanonicalGraph()
      .then((g) => alive && setGraph(migrateGraph(g)))
      .catch((err) => console.error("failed to load canonical graph", err))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [readOnly]);

  // Authoring: persist on change.
  useEffect(() => {
    if (readOnly) return;
    try {
      localStorage.setItem(`axiomer_graph_${graphId}`, JSON.stringify(graph));
    } catch {
      // ignore quota / serialization errors
    }
  }, [graph, readOnly]);

  const noop = () => {};

  if (readOnly) {
    return {
      graph,
      readOnly,
      loading,
      addRootQuestion: noop,
      addRootPremise: noop,
      addNode: noop,
      addFloatingNode: noop,
      editNode: noop,
      deleteNode: noop,
      linkToExistingValue: noop,
      verifySource: noop,
      resetToSeed: noop,
      importGraph: noop,
      moveNode: noop,
      addEdge: noop,
    };
  }

  return {
    graph,
    readOnly,
    loading,
    addRootQuestion: (content) => setGraph((g) => G.addRootQuestion(g, content)),
    addRootPremise: (content) => setGraph((g) => G.addRootPremise(g, content)),
    addNode: (type, content, parentId) =>
      setGraph((g) => G.addNode(g, type, content, parentId)),
    addFloatingNode: (type, content, position) =>
      setGraph((g) => G.addFloatingNode(g, type, content, position)),
    editNode: (id, content) => setGraph((g) => G.editNode(g, id, content)),
    deleteNode: (id) => setGraph((g) => G.deleteNode(g, id)),
    linkToExistingValue: (argumentId, valueId) =>
      setGraph((g) => G.linkToExistingValue(g, argumentId, valueId)),
    verifySource: (id, verified) =>
      setGraph((g) => G.verifySource(g, id, verified)),
    resetToSeed: () => setGraph(seedGraph),
    importGraph: (newGraph) => setGraph(migrateGraph(newGraph)),
    moveNode: (id, position) => setGraph((g) => G.moveNode(g, id, position)),
    addEdge: (sourceId, targetId) => setGraph((g) => G.addEdge(g, sourceId, targetId)),
  };
}
