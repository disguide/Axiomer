// Graph state.
// - Authoring mode: editable, persisted in localStorage with auto-save.
// - Read-only (public viewer) mode: loads the canonical data/graph.json and
//   exposes the same API with mutations as no-ops, so the UI can stay simple.

import { useEffect, useState } from "react";
import type { Graph, NodeStatus, NodeType, ProofStandard } from "@/lib/types";
import { seedGraph } from "@/lib/seed";
import { isReadOnly, loadCanonicalGraph } from "@/lib/dataSource";
import * as G from "@/lib/graph";
import type { AddNodeOpts } from "@/lib/graph";
import { applyOp, type ProposalOp } from "@/lib/proposals";

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
  addNode: (
    type: NodeType,
    content: string,
    parentId: string,
    opts?: AddNodeOpts,
  ) => void;
  editNode: (id: string, content: string) => void;
  deleteNode: (id: string) => void;
  linkToExistingValue: (argumentId: string, valueId: string) => void;
  setNodeStatus: (id: string, status: NodeStatus, reason?: string) => void;
  setProofStandard: (questionId: string, standard: ProofStandard) => void;
  mergeTerminals: (keepId: string, dropId: string) => void;
  relabelNode: (nodeId: string, type: NodeType) => void;
  addBox: (content: string, x: number, y: number) => string; // returns new id
  moveNode: (nodeId: string, x: number, y: number) => void;
  connectNodes: (fromId: string, toId: string) => void;
  deleteEdge: (edgeId: string) => void;
  removeBox: (nodeId: string) => void; // Canvas delete: node + its edges, no cascade
  applyProposalOp: (op: ProposalOp) => void;
  replaceGraph: (graph: Graph) => void; // import/restore (already validated)
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
      setNodeStatus: noop,
      setProofStandard: noop,
      mergeTerminals: noop,
      relabelNode: noop,
      addBox: () => "",
      moveNode: noop,
      connectNodes: noop,
      deleteEdge: noop,
      removeBox: noop,
      applyProposalOp: noop,
      replaceGraph: noop,
      resetToSeed: noop,
    };
  }

  return {
    graph,
    readOnly,
    loading,
    addRootQuestion: (content) => setGraph((g) => G.addRootQuestion(g, content)),
    addRootPremise: (content) => setGraph((g) => G.addRootPremise(g, content)),
    addNode: (type, content, parentId, opts) =>
      setGraph((g) => G.addNode(g, type, content, parentId, opts)),
    editNode: (id, content) => setGraph((g) => G.editNode(g, id, content)),
    deleteNode: (id) => setGraph((g) => G.deleteNode(g, id)),
    linkToExistingValue: (argumentId, valueId) =>
      setGraph((g) => G.linkToExistingValue(g, argumentId, valueId)),
    setNodeStatus: (id, status, reason) =>
      setGraph((g) => G.setNodeStatus(g, id, status, reason ? { reason } : undefined)),
    setProofStandard: (questionId, standard) =>
      setGraph((g) => G.setProofStandard(g, questionId, standard)),
    mergeTerminals: (keepId, dropId) =>
      setGraph((g) => G.mergeTerminals(g, keepId, dropId)),
    relabelNode: (nodeId, type) => setGraph((g) => G.relabelNode(g, nodeId, type)),
    addBox: (content, x, y) => {
      const { graph: next, node } = G.addFloatingNode(graph, content, x, y);
      setGraph(next);
      return node.id;
    },
    moveNode: (nodeId, x, y) => setGraph((g) => G.setNodePosition(g, nodeId, x, y)),
    connectNodes: (fromId, toId) => setGraph((g) => G.connectNodes(g, fromId, toId)),
    deleteEdge: (edgeId) => setGraph((g) => G.deleteEdge(g, edgeId)),
    removeBox: (nodeId) => setGraph((g) => G.removeNodeOnly(g, nodeId)),
    applyProposalOp: (op) => setGraph((g) => applyOp(g, op)),
    replaceGraph: (next) => setGraph(next),
    resetToSeed: () => setGraph(seedGraph),
  };
}
