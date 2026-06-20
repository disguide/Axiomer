// Graph state with localStorage persistence and auto-save.

import { useEffect, useState } from "react";
import type { Graph, NodeType } from "@/lib/types";
import { seedGraph } from "@/lib/seed";
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

export function useGraph() {
  const [graph, setGraph] = useState<Graph>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
    } catch {
      // ignore quota / serialization errors
    }
  }, [graph]);

  return {
    graph,
    addRootQuestion: (content: string) =>
      setGraph((g) => G.addRootQuestion(g, content)),
    addRootPremise: (content: string) =>
      setGraph((g) => G.addRootPremise(g, content)),
    addNode: (type: NodeType, content: string, parentId: string) =>
      setGraph((g) => G.addNode(g, type, content, parentId)),
    editNode: (id: string, content: string) =>
      setGraph((g) => G.editNode(g, id, content)),
    deleteNode: (id: string) => setGraph((g) => G.deleteNode(g, id)),
    linkToExistingValue: (argumentId: string, valueId: string) =>
      setGraph((g) => G.linkToExistingValue(g, argumentId, valueId)),
    resetToSeed: () => setGraph(seedGraph),
  };
}
