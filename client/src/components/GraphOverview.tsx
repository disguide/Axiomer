// Overview ("brain") mode — the whole territory at a glance, rendered on a
// CANVAS so it scales to many thousands of nodes (DOM-per-node dies at that
// size). Nodes are dots sized by importance (convergence hubs + big subtrees
// read large), colored by type, laid out top-down by a cheap O(V+E) layered
// layout (no dagre — this is the mode that must handle the most nodes).
// Labels stay hidden until you zoom in or hover. Click a dot to dive into
// Detail mode focused there.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Graph } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";

interface GraphOverviewProps {
  graph: Graph;
  onDive: (nodeId: string) => void;
}

interface Placed {
  id: string;
  x: number;
  y: number;
  r: number;
  color: string;
}

const RANK_Y = 80;
const COL_X = 34;
const CELL_GAP = 90;

// Longest-path depth via Kahn topological order (structural edges are acyclic),
// so bedrock sinks below everything that grounds in it. Depth gives the Y rank.
function depthMap(graph: Graph): Map<string, number> {
  const children = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const n of graph.nodes) {
    children.set(n.id, []);
    indeg.set(n.id, 0);
  }
  for (const e of graph.edges) {
    if (e.edgeType === "contradicts" || e.edgeType === "supersedes") continue;
    const { parent, child } = G.edgeEndpoints(e);
    if (!children.has(parent) || !indeg.has(child)) continue;
    children.get(parent)!.push(child);
    indeg.set(child, (indeg.get(child) ?? 0) + 1);
  }
  const depth = new Map<string, number>();
  const remaining = new Map(indeg);
  const queue: string[] = [];
  for (const n of graph.nodes)
    if ((indeg.get(n.id) ?? 0) === 0) {
      depth.set(n.id, 0);
      queue.push(n.id);
    }
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const d = depth.get(id) ?? 0;
    for (const c of children.get(id) ?? []) {
      depth.set(c, Math.max(depth.get(c) ?? 0, d + 1));
      remaining.set(c, (remaining.get(c) ?? 1) - 1);
      if ((remaining.get(c) ?? 0) === 0) queue.push(c);
    }
  }
  for (const n of graph.nodes) if (!depth.has(n.id)) depth.set(n.id, 0);
  return depth;
}

export default function GraphOverview({ graph, onDive }: GraphOverviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const view = useRef({ scale: 1, tx: 0, ty: 0 });
  const [, forceDraw] = useState(0);
  const [hover, setHover] = useState<Placed | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const subtreeSizes = useMemo(() => G.getSubtreeSizes(graph), [graph]);

  // Structural in-degree (parents) — convergence hubs have many.
  const inDegree = useMemo(() => {
    const d = new Map<string, number>();
    for (const n of graph.nodes) d.set(n.id, 0);
    for (const e of graph.edges) {
      if (e.edgeType === "contradicts" || e.edgeType === "supersedes") continue;
      const { child } = G.edgeEndpoints(e);
      d.set(child, (d.get(child) ?? 0) + 1);
    }
    return d;
  }, [graph]);

  // Placed nodes + world bounds. Each root's subtree is laid out as its own
  // compact little tree, and the clusters are arranged in a grid — so the whole
  // graph reads as a field of argument-trees converging on shared bedrock,
  // instead of one impossibly-wide pancake. Cross-cluster edges to shared
  // values are the visible convergence.
  const { placed, bounds } = useMemo(() => {
    const depth = depthMap(graph);

    // Assign each node to one cluster (its root). Shared bedrock lands in the
    // first root that reaches it; edges from other clusters cross to it.
    const clusterOf = new Map<string, string>();
    for (const n of graph.nodes) {
      const root = G.getRootFor(graph, n.id);
      clusterOf.set(n.id, root?.id ?? n.id);
    }
    const clusters = new Map<string, string[]>();
    for (const n of graph.nodes) {
      const c = clusterOf.get(n.id)!;
      if (!clusters.has(c)) clusters.set(c, []);
      clusters.get(c)!.push(n.id);
    }

    // Lay out one cluster locally; return positions (origin at 0,0) + size.
    const localPos = new Map<string, { x: number; y: number }>();
    const clusterSize = new Map<string, { w: number; h: number }>();
    for (const [cid, ids] of clusters) {
      const byDepth = new Map<number, string[]>();
      let maxDepth = 0;
      for (const id of ids) {
        const d = depth.get(id) ?? 0;
        if (!byDepth.has(d)) byDepth.set(d, []);
        byDepth.get(d)!.push(id);
        maxDepth = Math.max(maxDepth, d);
      }
      let maxRank = 1;
      for (const [d, bucket] of byDepth) {
        maxRank = Math.max(maxRank, bucket.length);
        const half = (bucket.length - 1) / 2;
        bucket.forEach((id, i) =>
          localPos.set(id, { x: (i - half) * COL_X, y: d * RANK_Y }),
        );
      }
      clusterSize.set(cid, { w: maxRank * COL_X, h: (maxDepth + 1) * RANK_Y });
    }

    // Arrange clusters in a grid, roughly square, using a uniform cell.
    const cids = [...clusters.keys()];
    const cellW = Math.max(...cids.map((c) => clusterSize.get(c)!.w)) + CELL_GAP;
    const cellH = Math.max(...cids.map((c) => clusterSize.get(c)!.h)) + CELL_GAP;
    const cols = Math.max(1, Math.ceil(Math.sqrt(cids.length)));
    const cellOrigin = new Map<string, { x: number; y: number }>();
    cids.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      cellOrigin.set(c, { x: col * cellW, y: row * cellH });
    });

    const placed: Placed[] = graph.nodes.map((n) => {
      const lp = localPos.get(n.id) ?? { x: 0, y: 0 };
      const origin = cellOrigin.get(clusterOf.get(n.id)!) ?? { x: 0, y: 0 };
      const importance =
        (subtreeSizes.get(n.id) ?? 0) + (inDegree.get(n.id) ?? 0) * 4;
      const r = 2.5 + Math.min(20, Math.sqrt(importance) * 2);
      return {
        id: n.id,
        x: origin.x + lp.x,
        y: origin.y + lp.y,
        r,
        color: NODE_META[n.type].color,
      };
    });

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of placed) {
      minX = Math.min(minX, p.x - p.r);
      maxX = Math.max(maxX, p.x + p.r);
      minY = Math.min(minY, p.y - p.r);
      maxY = Math.max(maxY, p.y + p.r);
    }
    return { placed, bounds: { minX, maxX, minY, maxY } };
  }, [graph, subtreeSizes, inDegree]);

  const placedById = useMemo(() => {
    const m = new Map<string, Placed>();
    for (const p of placed) m.set(p.id, p);
    return m;
  }, [placed]);

  // Fit to view whenever the graph or canvas size changes.
  useEffect(() => {
    const w = bounds.maxX - bounds.minX || 1;
    const h = bounds.maxY - bounds.minY || 1;
    const scale = Math.min(size.w / w, size.h / h) * 0.9;
    view.current = {
      scale,
      tx: size.w / 2 - ((bounds.minX + bounds.maxX) / 2) * scale,
      ty: size.h / 2 - ((bounds.minY + bounds.maxY) / 2) * scale + 20,
    };
    forceDraw((n) => n + 1);
  }, [bounds, size]);

  // Track container size.
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Draw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    const { scale, tx, ty } = view.current;
    const sx = (x: number) => x * scale + tx;
    const sy = (y: number) => y * scale + ty;

    // Edges (thin, faint) — skip lateral constraints.
    ctx.lineWidth = Math.max(0.3, 0.6 * scale);
    ctx.strokeStyle = "rgba(148,163,184,0.28)";
    ctx.beginPath();
    for (const e of graph.edges) {
      if (e.edgeType === "contradicts" || e.edgeType === "supersedes") continue;
      const { parent, child } = G.edgeEndpoints(e);
      const a = placedById.get(parent);
      const b = placedById.get(child);
      if (!a || !b) continue;
      ctx.moveTo(sx(a.x), sy(a.y));
      ctx.lineTo(sx(b.x), sy(b.y));
    }
    ctx.stroke();

    // Dots.
    const labelZoom = scale > 0.55;
    for (const p of placed) {
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(sx(p.x), sy(p.y), Math.max(1, p.r * scale), 0, Math.PI * 2);
      ctx.fill();
      // Label big hubs when zoomed in.
      if (labelZoom && p.r > 9) {
        const node = G.getNode(graph, p.id);
        if (node) {
          ctx.fillStyle = "#334155";
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillText(node.content.slice(0, 28), sx(p.x) + p.r * scale + 3, sy(p.y) + 3);
        }
      }
    }

    // Hover highlight + label.
    if (hover) {
      const node = G.getNode(graph, hover.id);
      ctx.beginPath();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.arc(sx(hover.x), sy(hover.y), Math.max(3, hover.r * scale) + 2, 0, Math.PI * 2);
      ctx.stroke();
      if (node) {
        const label = `${NODE_META[node.type].icon} ${node.content.slice(0, 48)}`;
        ctx.font = "11px system-ui, sans-serif";
        const tw = ctx.measureText(label).width;
        const lx = sx(hover.x) + 8;
        const ly = sy(hover.y) - 8;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillRect(lx - 3, ly - 12, tw + 6, 17);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        ctx.strokeRect(lx - 3, ly - 12, tw + 6, 17);
        ctx.fillStyle = "#0f172a";
        ctx.fillText(label, lx, ly);
      }
    }
  });

  // Pointer helpers.
  const hit = (clientX: number, clientY: number): Placed | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const { scale, tx, ty } = view.current;
    let best: Placed | null = null;
    let bestD = Infinity;
    for (const p of placed) {
      const dx = p.x * scale + tx - mx;
      const dy = p.y * scale + ty - my;
      const d = dx * dx + dy * dy;
      const rr = Math.max(4, p.r * scale + 3);
      if (d < rr * rr && d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  };

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h, cursor: drag.current ? "grabbing" : hover ? "pointer" : "grab" }}
        onMouseDown={(e) => (drag.current = { x: e.clientX, y: e.clientY, moved: false })}
        onMouseMove={(e) => {
          if (drag.current) {
            const dx = e.clientX - drag.current.x;
            const dy = e.clientY - drag.current.y;
            if (Math.abs(dx) + Math.abs(dy) > 2) drag.current.moved = true;
            view.current.tx += dx;
            view.current.ty += dy;
            drag.current.x = e.clientX;
            drag.current.y = e.clientY;
            forceDraw((n) => n + 1);
          } else {
            setHover(hit(e.clientX, e.clientY));
          }
        }}
        onMouseUp={(e) => {
          const wasDrag = drag.current?.moved;
          drag.current = null;
          if (!wasDrag) {
            const h = hit(e.clientX, e.clientY);
            if (h) onDive(h.id);
          }
        }}
        onMouseLeave={() => {
          drag.current = null;
          setHover(null);
        }}
        onWheel={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
          const v = view.current;
          // Zoom around the cursor.
          v.tx = mx - (mx - v.tx) * factor;
          v.ty = my - (my - v.ty) * factor;
          v.scale *= factor;
          forceDraw((n) => n + 1);
        }}
      />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-white/85 px-2 py-1 text-[10px] text-slate-500 shadow-sm">
        scroll to zoom · drag to pan · click a dot to dive in · big dots = convergence hubs
      </div>
    </div>
  );
}
