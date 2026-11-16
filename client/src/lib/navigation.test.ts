import { describe, expect, it } from 'vitest';
import type { Graph } from './types';
import { indexGraph, indexedNodeStates, relatedIds, selectVisibleGraph } from './navigation';
import { seedGraph } from './seed';
import { getAcceptability, isNodeGrounded } from './graph';

const wide: Graph = {
  nodes: [{ id: 'root', type: 'claim', content: 'Root' }, ...Array.from({ length: 1000 }, (_, i) => ({ id: `n${i}`, type: 'support' as const, content: `Reason ${i}` }))],
  edges: Array.from({ length: 1000 }, (_, i) => ({ id: `e${i}`, from: `n${i}`, to: 'root', edgeType: 'supports' as const })),
};

describe('large-map navigation', () => {
  it('caps a wide map explicitly without dropping document nodes or breaking visible edges', () => {
    const before = JSON.stringify(wide);
    const index = indexGraph(wide);
    const scope = selectVisibleGraph(wide, index, { focusId: 'root', depth: 2 });
    expect(scope.graph.nodes).toHaveLength(200);
    expect(scope.reachableCount).toBe(1001);
    expect(scope.truncated).toBe(true);
    expect(scope.graph.edges).toHaveLength(199);
    expect(JSON.stringify(wide)).toBe(before);
    // Full-document search results can become their own focus even outside the initial budget.
    expect(selectVisibleGraph(wide, index, { focusId: 'n999' }).graph.nodes.map(node => node.id)).toEqual(['n999']);
  });
  it('bounds visible depth on a 10000-node chain without recursive stack overflow', () => {
    const graph: Graph = { nodes: Array.from({ length: 10000 }, (_, i) => ({ id: String(i), type: 'claim', content: String(i) })), edges: Array.from({ length: 9999 }, (_, i) => ({ id: `e${i}`, from: String(i + 1), to: String(i), edgeType: 'supports' })) };
    const index = indexGraph(graph);
    expect(selectVisibleGraph(graph, index, { focusId: '0', depth: 2 }).graph.nodes).toHaveLength(3);
    expect(relatedIds(index, '9999', 'parents').size).toBe(10000);
    expect(indexedNodeStates(index).grounded.size).toBe(10000);
  });
  it('keeps a shared foundation reachable from each topic and when directly focused', () => {
    const graph: Graph = { nodes: [{ id: 'a', type: 'claim', content: 'A' }, { id: 'b', type: 'claim', content: 'B' }, { id: 'v', type: 'value', content: 'Shared' }], edges: [{ id: 'av', from: 'a', to: 'v', edgeType: 'grounds' }, { id: 'bv', from: 'b', to: 'v', edgeType: 'grounds' }] };
    const index = indexGraph(graph);
    expect(relatedIds(index, 'v', 'parents')).toEqual(new Set(['v', 'a', 'b']));
    expect(selectVisibleGraph(graph, index, { focusId: 'b' }).graph.nodes.map(node => node.id)).toEqual(['b', 'v']);
    expect(selectVisibleGraph(graph, index, { focusId: 'v' }).graph.nodes.map(node => node.id)).toEqual(['v']);
  });
  it('finishes safely on malformed cyclic legacy input', () => {
    const cyclic: Graph = { nodes: [{ id: 'a', type: 'claim', content: 'A' }, { id: 'b', type: 'support', content: 'B' }], edges: [{ id: '1', from: 'b', to: 'a', edgeType: 'supports' }, { id: '2', from: 'a', to: 'b', edgeType: 'supports' }] };
    const index = indexGraph(cyclic);
    expect(relatedIds(index, 'a', 'children').size).toBe(2);
    expect(selectVisibleGraph(cyclic, index).graph.nodes).toHaveLength(2);
    expect(indexedNodeStates(index).acceptability.get('a')).toBe('contested');
  });
  it('preserves the existing structural grounding and conflict labels', () => {
    const states = indexedNodeStates(indexGraph(seedGraph));
    const expectedAcceptability = getAcceptability(seedGraph);
    for (const node of seedGraph.nodes) {
      expect(states.grounded.get(node.id), node.id).toBe(isNodeGrounded(seedGraph, node.id));
      expect(states.acceptability.get(node.id), node.id).toBe(expectedAcceptability.get(node.id));
    }
  });
});
