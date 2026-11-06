import { useMemo } from "react";
import {
  diffRoadmaps,
  type Connection,
  type MergeValue,
  type Roadmap,
  type Thought,
  type Source,
  type WhiteboardAnnotation,
} from "./model";

const drawingColors: Record<string, string> = { white: "#fafafa", lightGray: "#b8b8b8", gray: "#777", black: "#252525", green: "#3a8753", cyan: "#1b939d", blue: "#3874cb", indigo: "#5359a6", violet: "#9453b2", red: "#ca4141", orange: "#c67b26", yellow: "#b89c18" };
function WhiteboardPreview({ shapes }: { shapes: WhiteboardAnnotation[] }) {
  if (!shapes.length) return <p className="muted">No drawing objects</p>;
  const positions = shapes.flatMap(s => {
    const local = s.points || (s.handles ? Object.values(s.handles).map(h => h.point) : [[0, 0], s.size || (s.radius ? [s.radius[0] * 2, s.radius[1] * 2] : [250, 80])]);
    return local.map(p => [s.point[0] + p[0], s.point[1] + p[1]]);
  });
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const [x, y] of positions) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  const minX = left - 24, minY = top - 24;
  const width = Math.max(80, right - minX + 24);
  const height = Math.max(80, bottom - minY + 24);
  return <div className="whiteboard-review">
    <p>{shapes.length} drawing object{shapes.length === 1 ? "" : "s"}</p>
    <svg role="img" aria-label="Drawing layer preview" viewBox={`${minX} ${minY} ${width} ${height}`} style={{ width: "100%", height: 240, background: "#fff", border: "1px solid #ddd", borderRadius: 8 }}>
      {shapes.map(s => {
        const color = drawingColors[s.style.color] || "#252525";
        const strokeWidth = s.style.size === "large" ? 5 : s.style.size === "medium" ? 3 : 2;
        const paint = { stroke: color, strokeWidth, fill: s.style.isFilled ? color : "none", strokeDasharray: s.style.dash === "dashed" ? "8 5" : s.style.dash === "dotted" ? "2 5" : undefined };
        return <g key={s.id} transform={`translate(${s.point.join(" ")}) rotate(${(s.rotation || 0) * 180 / Math.PI})`} opacity={s.isHidden ? 0.2 : 1}>
          {s.type === "draw" && <polyline points={s.points!.map(p => p.slice(0, 2).join(",")).join(" ")} {...paint} fill="none" />}
          {s.type === "rectangle" && <rect width={s.size![0]} height={s.size![1]} {...paint} />}
          {s.type === "ellipse" && <ellipse cx={s.radius![0]} cy={s.radius![1]} rx={s.radius![0]} ry={s.radius![1]} {...paint} />}
          {s.type === "triangle" && <polygon points={`${s.size![0] / 2},0 0,${s.size![1]} ${s.size![0]},${s.size![1]}`} {...paint} />}
          {s.type === "sticky" && <rect width={s.size![0]} height={s.size![1]} fill="#fff0a8" stroke={color} />}
          {s.type === "arrow" && <polyline points={["start", "bend", "end"].map(n => s.handles![n].point.join(",")).join(" ")} {...paint} fill="none" />}
          {(s.text || s.label) && <text x={8} y={22} fill={color} fontSize={18}>{(s.text || s.label)!.slice(0, 300)}</text>}
        </g>;
      })}
    </svg>
    <details><summary>Drawing details</summary><pre style={{ maxHeight: 220, overflow: "auto", fontSize: 11 }}>{JSON.stringify(shapes, null, 2)}</pre></details>
  </div>;
}

function PositionReview({ positions, graph }: { positions?: Roadmap["whiteboardPositions"]; graph: Roadmap }) {
  if (!positions || !Object.keys(positions).length) return <p className="muted">Automatic argument arrangement</p>;
  return <details open><summary>Argument arrangement: {Object.keys(positions).length} placed thoughts</summary><ul>{Object.entries(positions).map(([id, p]) => <li key={id}>{graph.nodes.find(n => n.id === id)?.text || id}: ({p.x}, {p.y})</li>)}</ul></details>;
}

/** Show actual author-provided evidence, including removed/replaced sources in reviews. */
export function SourceLinks({ sources }: { sources?: Source[] }) {
  if (!sources?.length) return null;
  return (
    <ul className="thought-sources" aria-label="Sources">
      {sources.map((source) => (
        <li key={source.id}>
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            {source.title}
          </a>
          <small>{source.url}</small>
          {source.locator && <small>{source.locator}</small>}
        </li>
      ))}
    </ul>
  );
}

function Relationship({
  edge,
  nodes,
}: {
  edge: Connection;
  nodes: Map<string, Thought>;
}) {
  const name = (id: string) => nodes.get(id)?.text || id;
  return (
    <div className="relationship-description">
      <p>
        {name(edge.from)} <span aria-label="leads to">→</span> {name(edge.to)}
      </p>
      <p className="relationship-label">
        Reading relationship: <strong>{edge.label || "next step"}</strong>
      </p>
      {edge.semantic && (
        <p className="relationship-original">
          Original relationship: {name(edge.semantic.from)}{" "}
          <strong>— {edge.semantic.type} →</strong> {name(edge.semantic.to)}
        </p>
      )}
    </div>
  );
}
export function MergeVersion({
  value,
  graph,
}: {
  value: MergeValue;
  graph: Roadmap;
}) {
  const nodes = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph],
  );
  if (value === null) return <p className="muted">Removed</p>;
  if (typeof value === "string")
    return <p>{nodes.get(value)?.text || value}</p>;
  if (Array.isArray(value) && value.length && typeof value[0] !== "string")
    return <WhiteboardPreview shapes={value as WhiteboardAnnotation[]} />;
  if (Array.isArray(value) && !value.length) return <p className="muted">No items</p>;
  if (Array.isArray(value))
    return (
      <ol>
        {(value as string[]).map((id) => (
          <li key={id}>{nodes.get(id)?.text || id}</li>
        ))}
      </ol>
    );
  if ("annotations" in value) return <><WhiteboardPreview shapes={value.annotations} /><PositionReview positions={value.positions} graph={graph} /></>;
  if ("text" in value)
    return (
      <div>
        <p>{value.text}</p>
        <small className="relationship-label">{value.kind || "No label"}</small>
        <SourceLinks sources={value.sources} />
      </div>
    );
  return <Relationship edge={value} nodes={nodes} />;
}
export function ChangeSummary({
  before,
  after,
}: {
  before: Roadmap;
  after: Roadmap;
}) {
  const diff = useMemo(() => diffRoadmaps(before, after), [before, after]);
  const old = useMemo(
    () => new Map(before.nodes.map((n) => [n.id, n])),
    [before],
  );
  const next = useMemo(
    () => new Map(after.nodes.map((n) => [n.id, n])),
    [after],
  );
  return (
    <div className="change-summary">
      <div className="change-counts">
        <span>+{diff.added.length} added</span>
        <span>−{diff.removed.length} removed</span>
        <span>{diff.edited.length} edited</span>
      </div>
      {diff.anchorChanged && (
        <div>
          <p className="removal">
            Previous starting value:{" "}
            {old.get(before.anchor || "")?.text || "None"}
          </p>
          <p className="addition">
            New starting value: {next.get(after.anchor || "")?.text || "None"}
          </p>
        </div>
      )}
      {diff.whiteboardChanged && <section className="relationship-change">
        <strong>Drawing layer changed</strong>
        <div className="removal"><span>Before</span><WhiteboardPreview shapes={before.whiteboard || []} /><PositionReview positions={before.whiteboardPositions} graph={before} /></div>
        <div className="addition"><span>After</span><WhiteboardPreview shapes={after.whiteboard || []} /><PositionReview positions={after.whiteboardPositions} graph={after} /></div>
      </section>}
      {diff.added.map((n) => (
        <div className="addition" key={n.id}>
          <p>+ {n.text}</p>
          <SourceLinks sources={n.sources} />
        </div>
      ))}
      {diff.removed.map((n) => (
        <div className="removal" key={n.id}>
          <p>− {n.text}</p>
          <SourceLinks sources={n.sources} />
        </div>
      ))}
      {diff.edited.map((n) => (
        <div key={n.after.id}>
          <p className="removal">
            − {n.before.text}
            {n.before.kind !== n.after.kind
              ? ` · label: ${n.before.kind || "none"}`
              : ""}
          </p>
          <div className="removal"><SourceLinks sources={n.before.sources} /></div>
          <p className="addition">
            + {n.after.text}
            {n.before.kind !== n.after.kind
              ? ` · label: ${n.after.kind || "none"}`
              : ""}
          </p>
          <div className="addition"><SourceLinks sources={n.after.sources} /></div>
        </div>
      ))}
      {diff.branchOrderChanged.map((change) => (
        <section className="relationship-change" key={`order-${change.from}`}>
          <strong>
            Branch reading order changed after: {next.get(change.from)?.text}
          </strong>
          <div className="removal">
            <span>Before</span>
            <MergeVersion value={change.before} graph={before} />
          </div>
          <div className="addition">
            <span>After</span>
            <MergeVersion value={change.after} graph={after} />
          </div>
        </section>
      ))}
      <p className="muted">
        {diff.connectionsAdded.length} connections added ·{" "}
        {diff.connectionsRemoved.length} removed ·{" "}
        {diff.connectionsEdited.length} changed
      </p>
      {diff.connectionsAdded.map((e) => (
        <section className="relationship-change addition" key={`add-${e.id}`}>
          <strong>Connection added</strong>
          <Relationship edge={e} nodes={next} />
        </section>
      ))}
      {diff.connectionsRemoved.map((e) => (
        <section className="relationship-change removal" key={`remove-${e.id}`}>
          <strong>Connection removed</strong>
          <Relationship edge={e} nodes={old} />
        </section>
      ))}
      {diff.connectionsEdited.map(({ before: b, after: a }) => (
        <section className="relationship-change" key={`edit-${a.id}`}>
          <strong>Connection changed</strong>
          <div className="removal">
            <span>Before</span>
            <Relationship edge={b} nodes={old} />
          </div>
          <div className="addition">
            <span>After</span>
            <Relationship edge={a} nodes={next} />
          </div>
        </section>
      ))}
    </div>
  );
}
