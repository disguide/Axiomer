// Graph state.
// - Authoring mode: editable, persisted in localStorage with auto-save.
// - Read-only (public viewer) mode: loads the canonical data/graph.json and
//   exposes the same API with mutations as no-ops, so the UI can stay simple.

import { useEffect, useState } from "react";
import type { Graph, NodeType } from "@/lib/types";
import { seedGraph } from "@/lib/seed";
import { isReadOnly, loadCanonicalGraph } from "@/lib/dataSource";
import * as G from "@/lib/graph";

const STORAGE_KEY = "axiomer_graph";

function loadInitial(): Graph {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Graph;
      if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        return parsed;
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
  editNode: (id: string, content: string) => void;
  deleteNode: (id: string) => void;
  linkToExistingValue: (argumentId: string, valueId: string) => void;
  resetToSeed: () => void;
}

export function useGraph(): UseGraph {
  const readOnly = isReadOnly();
  const [graph, setGraph] = useState<Graph>(() =>
    readOnly ? EMPTY : loadInitial(),
  );
  const [loading, setLoading] = useState<boolean>(readOnly);

  // Read-only: fetch the canonical graph once.
  useEffect(() => {
    if (!readOnly) return;
    let alive = true;
    loadCanonicalGraph()
      .then((g) => alive && setGraph(g))
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
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
      editNode: noop,
      deleteNode: noop,
      linkToExistingValue: noop,
      resetToSeed: noop,
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
    editNode: (id, content) => setGraph((g) => G.editNode(g, id, content)),
    deleteNode: (id) => setGraph((g) => G.deleteNode(g, id)),
    linkToExistingValue: (argumentId, valueId) =>
      setGraph((g) => G.linkToExistingValue(g, argumentId, valueId)),
    resetToSeed: () => setGraph(seedGraph),
  };
}
