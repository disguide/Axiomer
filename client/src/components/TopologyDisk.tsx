import { useMemo } from "react";
import type { Graph, GraphNode, EdgeType } from "@/lib/types";
import * as G from "@/lib/graph";

interface Props {
  graph: Graph;
  currentId: string | null;
  onFocus: (id: string) => void;
}

interface Sector {
  node: GraphNode;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  color: string;
  depth: number;
  type: "pro" | "con" | "other" | "root";
}

function edgeColor(edgeType?: EdgeType): "pro" | "con" | "other" {
  if (!edgeType) return "other";
  if (["supports"].includes(edgeType)) return "pro";
  if (["conflicts"].includes(edgeType)) return "con";
  return "other";
}

function getFillColor(type: "pro" | "con" | "other" | "root", selected: boolean, dim: boolean) {
  if (type === "root") return selected ? "#1e293b" : "#64748b";
  if (dim) {
    if (type === "pro") return "#ecfdf5";
    if (type === "con") return "#fff1f2";
    return "#f8fafc";
  }
  if (type === "pro") return selected ? "#059669" : "#34d399";
  if (type === "con") return selected ? "#e11d48" : "#fb7185";
  return selected ? "#475569" : "#94a3b8";
}

export default function TopologyDisk({ graph, currentId, onFocus }: Props) {
  // If no root, or empty graph, return empty
  const roots = G.getRoots(graph);
  if (roots.length === 0) {
    return <div className="w-full aspect-square bg-slate-50 rounded-full border border-slate-200 animate-pulse" />;
  }

  // Find the root that this currentId belongs to.
  let activeRoot = roots[0];
  if (currentId) {
    const ancestors = G.getAncestors(graph, currentId);
    for (const root of roots) {
      if (ancestors.has(root.id) || root.id === currentId) {
        activeRoot = root;
        break;
      }
    }
  }

  // Build a tree from this root down, cycle-guarded.
  const sectors = useMemo(() => {
    const list: Sector[] = [];
    
    // 1. Calculate weights (number of leaves)
    const weights = new Map<string, number>();
    const visited = new Set<string>();
    
    function calcWeight(id: string): number {
      if (visited.has(id)) return 1; // cycle breaking weight
      visited.add(id);
      
      const children = graph.edges
        .filter((e) => G.edgeEndpoints(e).parent === id)
        .map((edge) => {
          const child = G.getNode(graph, G.edgeEndpoints(edge).child);
          return child ? { child, edge } : null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      if (children.length === 0) {
        weights.set(id, 1);
        return 1;
      }
      
      let sum = 0;
      for (const c of children) {
        sum += calcWeight(c.child.id);
      }
      weights.set(id, sum);
      return sum;
    }
    
    calcWeight(activeRoot.id);
    
    // 2. Map sectors
    const maxRadius = 150;
    const ringWidth = 20;
    const centerRadius = 35;
    
    const maxDepth = Math.floor((maxRadius - centerRadius) / ringWidth);

    function mapSectors(
      id: string, 
      startAngle: number, 
      endAngle: number, 
      depth: number, 
      visitedNodes: Set<string>,
      type: "pro" | "con" | "other" | "root"
    ) {
      const node = G.getNode(graph, id);
      if (!node) return;
      
      list.push({
        node,
        startAngle,
        endAngle,
        innerRadius: depth === 0 ? 0 : centerRadius + (depth - 1) * ringWidth,
        outerRadius: depth === 0 ? centerRadius : centerRadius + depth * ringWidth,
        color: "", // Set later
        depth,
        type
      });
      
      if (depth >= maxDepth) return;
      if (visitedNodes.has(id)) return;
      visitedNodes.add(id);
      
      const children = graph.edges
        .filter((e) => G.edgeEndpoints(e).parent === id)
        .map((edge) => {
          const child = G.getNode(graph, G.edgeEndpoints(edge).child);
          return child ? { child, edge } : null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      if (children.length === 0) return;
      
      const myWeight = weights.get(id) || 1;
      const angleSpan = endAngle - startAngle;
      
      let currentAngle = startAngle;
      for (const c of children) {
        const cWeight = weights.get(c.child.id) || 1;
        const sliceAngle = (cWeight / myWeight) * angleSpan;
        mapSectors(
          c.child.id,
          currentAngle,
          currentAngle + sliceAngle,
          depth + 1,
          new Set(visitedNodes),
          edgeColor(c.edge.edgeType)
        );
        currentAngle += sliceAngle;
      }
    }
    
    mapSectors(activeRoot.id, 0, Math.PI * 2, 0, new Set(), "root");
    return list;
  }, [graph, activeRoot.id]);

  // Determine path of the currentId to highlight
  const activePath = useMemo(() => {
    if (!currentId) return new Set<string>();
    const path = new Set<string>();
    path.add(currentId);
    const ancestors = G.getAncestors(graph, currentId);
    for (const a of ancestors) path.add(a);
    return path;
  }, [graph, currentId]);

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square">
      <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-sm">
        {sectors.map((s, i) => {
          const isSelected = s.node.id === currentId;
          const isActive = activePath.has(s.node.id);
          const isDim = currentId ? !isActive : false;
          
          const fill = getFillColor(s.type, isSelected, isDim);
          
          if (s.depth === 0) {
            return (
              <g key={`sector-${i}`}>
                <circle
                  cx={150}
                  cy={150}
                  r={s.outerRadius}
                  fill={fill}
                  className="cursor-pointer transition-colors hover:brightness-110"
                  onClick={() => onFocus(s.node.id)}
                />
                <text
                  x={150}
                  y={150}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize="12px"
                  fontWeight="bold"
                  pointerEvents="none"
                  className="tracking-wider"
                >
                  ROOT
                </text>
              </g>
            );
          }
          
          // Gap for padding
          const padAngle = 0.02;
          let a1 = s.startAngle + padAngle;
          let a2 = s.endAngle - padAngle;
          if (a1 >= a2) {
             a1 = s.startAngle;
             a2 = s.endAngle;
          }
          
          const x1 = 150 + Math.cos(a1 - Math.PI/2) * s.innerRadius;
          const y1 = 150 + Math.sin(a1 - Math.PI/2) * s.innerRadius;
          const x2 = 150 + Math.cos(a2 - Math.PI/2) * s.innerRadius;
          const y2 = 150 + Math.sin(a2 - Math.PI/2) * s.innerRadius;
          
          const x3 = 150 + Math.cos(a2 - Math.PI/2) * s.outerRadius;
          const y3 = 150 + Math.sin(a2 - Math.PI/2) * s.outerRadius;
          const x4 = 150 + Math.cos(a1 - Math.PI/2) * s.outerRadius;
          const y4 = 150 + Math.sin(a1 - Math.PI/2) * s.outerRadius;
          
          const largeArc = a2 - a1 > Math.PI ? 1 : 0;
          
          const path = `
            M ${x1} ${y1}
            A ${s.innerRadius} ${s.innerRadius} 0 ${largeArc} 1 ${x2} ${y2}
            L ${x3} ${y3}
            A ${s.outerRadius} ${s.outerRadius} 0 ${largeArc} 0 ${x4} ${y4}
            Z
          `;
          
          return (
            <path
              key={`sector-${i}`}
              d={path}
              fill={fill}
              className="cursor-pointer transition-colors hover:brightness-110"
              stroke="#ffffff"
              strokeWidth="1.5"
              onClick={() => onFocus(s.node.id)}
            >
              <title>{s.node.content}</title>
            </path>
          );
        })}
      </svg>
    </div>
  );
}
