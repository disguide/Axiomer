import { useEffect, useRef, useMemo } from "react";
import p5 from "p5";
import type { Graph } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";

interface Props {
  graph: Graph;
  selectedId: string | null;
  onSelectNode?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

interface NodePosition {
  id: string;
  type: string;
  content: string;
  degree: number;
  densityTier: "hub" | "mid" | "leaf";
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
}

export default function ConnectionDensityCanvas({
  graph,
  selectedId,
  onSelectNode,
  width = 300,
  height = 240,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  // Compute node degree and positions in radial density orbit
  const nodeMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    const totalNodes = graph.nodes.length;
    if (totalNodes === 0) return map;

    // Calculate degrees
    const degrees = new Map<string, number>();
    for (const node of graph.nodes) {
      degrees.set(node.id, 0);
    }
    for (const edge of graph.edges) {
      const { parent, child } = G.edgeEndpoints(edge);
      degrees.set(parent, (degrees.get(parent) || 0) + 1);
      degrees.set(child, (degrees.get(child) || 0) + 1);
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.42;

    // Sort nodes into tiers by degree
    const sorted = [...graph.nodes].sort((a, b) => (degrees.get(b.id) || 0) - (degrees.get(a.id) || 0));
    const maxDeg = Math.max(1, ...Array.from(degrees.values()));

    sorted.forEach((node, i) => {
      const deg = degrees.get(node.id) || 0;
      let tier: "hub" | "mid" | "leaf" = "leaf";
      let orbitRadius = maxRadius * 0.85;

      if (deg >= Math.max(3, maxDeg * 0.6)) {
        tier = "hub";
        orbitRadius = maxRadius * 0.32;
      } else if (deg >= 2) {
        tier = "mid";
        orbitRadius = maxRadius * 0.60;
      }

      // Distribute evenly around orbit
      const angle = (i / totalNodes) * Math.PI * 2 + (tier === "hub" ? 0 : 0.3);
      const baseX = centerX + Math.cos(angle) * orbitRadius;
      const baseY = centerY + Math.sin(angle) * orbitRadius;
      const meta = NODE_META[node.type] || { color: "#64748b" };

      map.set(node.id, {
        id: node.id,
        type: node.type,
        content: node.content,
        degree: deg,
        densityTier: tier,
        x: baseX,
        y: baseY,
        baseX,
        baseY,
        radius: tier === "hub" ? 8 : tier === "mid" ? 6 : 4.5,
        color: meta.color,
      });
    });

    return map;
  }, [graph, width, height]);

  // Keep live refs for p5 sketch draw loop
  const graphRef = useRef(graph);
  graphRef.current = graph;
  const nodeMapRef = useRef(nodeMap);
  nodeMapRef.current = nodeMap;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;

  useEffect(() => {
    if (!containerRef.current) return;

    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
      p5InstanceRef.current = null;
    }

    const sketch = (p: p5) => {
      let hoveredId: string | null = null;
      let time = 0;

      p.setup = () => {
        const renderer = p.createCanvas(width, height);
        renderer.parent(containerRef.current!);
        p.ellipseMode(p.CENTER);
        p.rectMode(p.CENTER);
        p.frameRate(30);
      };

      p.draw = () => {
        time += 0.025;
        p.clear();

        const currentMap = nodeMapRef.current;
        const currentGraph = graphRef.current;
        const currentSelected = selectedIdRef.current;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.42;

        if (currentMap.size === 0) {
          p.fill(148, 163, 184);
          p.noStroke();
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(11);
          p.text("No thoughts to map", centerX, centerY);
          return;
        }

        // 1. Draw subtle concentric density orbits
        p.noFill();
        p.stroke(226, 232, 240, 140);
        p.strokeWeight(1);
        p.ellipse(centerX, centerY, maxRadius * 0.64 * 2, maxRadius * 0.64 * 2);
        p.ellipse(centerX, centerY, maxRadius * 1.20 * 2, maxRadius * 1.20 * 2);
        p.ellipse(centerX, centerY, maxRadius * 1.70 * 2, maxRadius * 1.70 * 2);

        // Density wave pulse radiating outward
        const pulseR = ((time * 25) % (maxRadius * 0.95)) + 15;
        const pulseAlpha = p.map(pulseR, 15, maxRadius * 0.95, 120, 0);
        p.stroke(99, 102, 241, pulseAlpha);
        p.strokeWeight(1);
        p.ellipse(centerX, centerY, pulseR * 2, pulseR * 2);

        // Compute floating animated positions
        currentMap.forEach((node, id) => {
          const isSelected = id === currentSelected;
          const floatOffset = Math.sin(time + id.charCodeAt(0) * 0.5) * (node.densityTier === "hub" ? 1.5 : 2.5);
          node.x = node.baseX + Math.cos(time * 0.8 + id.charCodeAt(0)) * floatOffset;
          node.y = node.baseY + Math.sin(time * 0.8 + id.charCodeAt(0)) * floatOffset;
          if (isSelected) {
            node.radius = 9;
          } else {
            node.radius = node.densityTier === "hub" ? 7 : node.densityTier === "mid" ? 5.5 : 4.5;
          }
        });

        // Check mouse hover
        hoveredId = null;
        currentMap.forEach((node) => {
          const d = p.dist(p.mouseX, p.mouseY, node.x, node.y);
          if (d <= node.radius + 5) {
            hoveredId = node.id;
          }
        });

        // 2. Draw Connection Filaments & Traveling Photons
        for (const edge of currentGraph.edges) {
          const { parent, child } = G.edgeEndpoints(edge);
          const pNode = currentMap.get(parent);
          const cNode = currentMap.get(child);
          if (!pNode || !cNode) continue;

          const isEdgeActive =
            !currentSelected ||
            parent === currentSelected ||
            child === currentSelected ||
            parent === hoveredId ||
            child === hoveredId;

          // Stroke color
          if (edge.edgeType === "conflicts") {
            p.stroke(225, 29, 72, isEdgeActive ? 180 : 35);
          } else if (edge.edgeType === "supports") {
            p.stroke(5, 150, 105, isEdgeActive ? 160 : 35);
          } else {
            p.stroke(148, 163, 184, isEdgeActive ? 140 : 30);
          }
          p.strokeWeight(isEdgeActive ? 1.5 : 0.8);
          p.line(pNode.x, pNode.y, cNode.x, cNode.y);

          // Moving photon pulse along active edges
          if (isEdgeActive) {
            const photonT = ((time * 0.8) + (edge.id.charCodeAt(0) % 10) * 0.1) % 1;
            const photonX = p.lerp(pNode.x, cNode.x, photonT);
            const photonY = p.lerp(pNode.y, cNode.y, photonT);
            p.noStroke();
            p.fill(99, 102, 241, 200);
            p.ellipse(photonX, photonY, 3, 3);
          }
        }

        // 3. Draw Nodes
        currentMap.forEach((node) => {
          const isSelected = node.id === currentSelected;
          const isHovered = node.id === hoveredId;

          // Selected pulsing halo
          if (isSelected) {
            const ringR = node.radius + 6 + Math.sin(time * 6) * 2;
            p.noFill();
            p.stroke(79, 70, 229, 180);
            p.strokeWeight(2);
            p.ellipse(node.x, node.y, ringR * 2, ringR * 2);
          }

          // Node body
          p.noStroke();
          p.fill(node.color);
          p.ellipse(node.x, node.y, node.radius * 2, node.radius * 2);

          // Inner core highlight
          p.fill(255, 255, 255, 190);
          p.ellipse(node.x, node.y, node.radius * 0.8, node.radius * 0.8);

          // Hover badge ring
          if (isHovered && !isSelected) {
            p.noFill();
            p.stroke(15, 23, 42, 160);
            p.strokeWeight(1.5);
            p.ellipse(node.x, node.y, (node.radius + 3) * 2, (node.radius + 3) * 2);
          }
        });

        // 4. Hover Tooltip
        if (hoveredId) {
          const hNode = currentMap.get(hoveredId);
          if (hNode) {
            const txt = hNode.content.length > 28 ? hNode.content.slice(0, 28) + "…" : hNode.content;
            p.textSize(10);
            p.textAlign(p.LEFT, p.CENTER);
            const badgeW = p.textWidth(txt) + 16;
            const tipX = p.constrain(hNode.x, badgeW / 2 + 8, width - badgeW / 2 - 8);
            const tipY = hNode.y > 40 ? hNode.y - 18 : hNode.y + 20;

            p.rectMode(p.CENTER);
            p.fill(15, 23, 42, 230);
            p.noStroke();
            p.rect(tipX, tipY, badgeW, 20, 5);

            p.fill(255);
            p.text(txt, tipX - badgeW / 2 + 8, tipY);
          }
        }
      };

      p.mousePressed = () => {
        if (p.mouseX < 0 || p.mouseX > width || p.mouseY < 0 || p.mouseY > height) return;
        if (hoveredId && onSelectNodeRef.current) {
          onSelectNodeRef.current(hoveredId);
        }
      };
    };

    const instance = new p5(sketch);
    p5InstanceRef.current = instance;

    return () => {
      instance.remove();
      p5InstanceRef.current = null;
    };
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center overflow-hidden rounded-xl bg-slate-50/80 border border-slate-200/80"
      style={{ width, height }}
    />
  );
}
