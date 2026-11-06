import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tldraw, TDShapeType, type TDToolType, type TldrawApp, type TDShape } from "@tldraw/tldraw";
import { ArrowUpRight, GitBranch, MousePointer2, Pencil, Redo2, Square, StickyNote, Undo2, X } from "lucide-react";
import { type Point } from "./layoutStorage";
import { type Roadmap } from "./model";
import { validateWhiteboard, type WhiteboardAnnotation } from "./whiteboard";
import { annotationShapes, nativeProjection, thoughtShapeId } from "./nativeAdapter";
import "./nativeEditor.css";

export interface CanvasProps {
  graph: Roadmap;
  selected: string | null;
  overview: boolean;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  editable: boolean;
  manualPositions: Record<string, Point>;
  arrangeVersion: number;
  fitVersion: number;
  onMove: (id: string, position: Point) => void;
  onConnect: (from: string, to: string) => void;
  onEdgeSelect: (id: string) => void;
  onWhiteboardChange?: (annotations: WhiteboardAnnotation[]) => void;
  onThoughtChange?: (id: string, text: string) => void;
}

/** Native MIT tldraw v1, with the argument model kept outside its drawing store. */
export default function Canvas(props: CanvasProps) {
  const latest = useRef(props); latest.current = props;
  const editor = useRef<TldrawApp | null>(null);
  const projecting = useRef(false), committing = useRef(false);
  const deferred = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSelection = useRef(""), lastAnnotation = useRef("");
  const [mounted, setMounted] = useState(false);
  const [tool, setTool] = useState<string>("select");
  const [connecting, setConnecting] = useState(false);
  const connectingRef = useRef(false), connectFrom = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const canEdit = props.editable && props.overview;
  const projection = useMemo(() => nativeProjection(props.graph, props.manualPositions, props.overview, props.selected), [props.graph.nodes, props.graph.edges, props.graph.anchor, props.manualPositions, props.overview, props.overview ? null : props.selected]);
  const projectionRef = useRef(projection); projectionRef.current = projection;
  const document = useMemo(() => ({ id: "axiomer-board", name: "Argument whiteboard", version: 15.5, pages: { page: { id: "page", name: "Map", childIndex: 1, shapes: {}, bindings: {} } }, pageStates: { page: { id: "page", selectedIds: [], camera: { point: [0, 0], zoom: 1 } } }, assets: {} }), []);

  const installProjection = useCallback((app: TldrawApp, preserveNative = true) => {
    const p = latest.current;
    const annotations = preserveNative ? annotationShapes(app.shapes) : (p.graph.whiteboard || []).map((shape) => ({ ...shape, parentId: "page" }) as unknown as TDShape);
    projecting.current = true;
    try {
      const shapes = Object.fromEntries([...(p.overview ? annotations : []), ...projectionRef.current.shapes].map((shape) => [shape.id, shape]));
      app.replacePageContent(shapes, {}, {}, "page");
    } finally { projecting.current = false; }
  }, []);

  const commit = useCallback((app: TldrawApp) => {
    if (projecting.current || committing.current || !latest.current.editable || !latest.current.overview || app.session) return;
    committing.current = true;
    try {
      const p = latest.current, projected = projectionRef.current;
      let restore = false;
      for (const [nativeId, id] of projected.thoughtIds) {
        const shape = app.page.shapes[nativeId];
        const baseline = projected.shapes.find((item) => item.id === nativeId);
        if (!shape || shape.type !== TDShapeType.Rectangle || !baseline) { restore = true; continue; }
        if (shape.rotation || shape.size[0] !== 240 || shape.size[1] !== 112) restore = true;
        if (shape.point[0] !== baseline.point[0] || shape.point[1] !== baseline.point[1]) p.onMove(id, { x: shape.point[0], y: shape.point[1] });
        const original = p.graph.nodes.find((node) => node.id === id);
        if (original && shape.label !== original.text) {
          const text = (shape.label || "").trim();
          if (text && text.length <= 10000 && p.onThoughtChange) p.onThoughtChange(id, text);
          else { restore = true; setMessage("Keep a thought’s text. Use Edit thought to remove it."); }
        }
      }
      // Native arrows remain drawing annotations. Only Connect invokes the DAG callback.
      try {
        const annotations = validateWhiteboard(annotationShapes(app.shapes));
        const signature = JSON.stringify(annotations);
        if (signature !== lastAnnotation.current) { lastAnnotation.current = signature; p.onWhiteboardChange?.(annotations); }
      } catch { setMessage("That drawing could not be saved. Use simple pen, note or shape tools."); restore = true; }
      if (restore) installProjection(app);
    } finally { committing.current = false; }
  }, [installProjection]);

  const changed = useCallback((app: TldrawApp) => {
    if (projecting.current) return;
    const selection = app.selectedIds.join("\0");
    if (selection !== lastSelection.current) {
      lastSelection.current = selection;
      const id = app.selectedIds[0], thought = projectionRef.current.thoughtIds.get(id), edge = projectionRef.current.edgeIds.get(id);
      if (thought) {
        if (connectingRef.current) {
          if (connectFrom.current && connectFrom.current !== thought) {
            latest.current.onConnect(connectFrom.current, thought);
            connectingRef.current = false; connectFrom.current = null; setConnecting(false);
          } else connectFrom.current = thought;
        }
        latest.current.onSelect(thought);
      } else if (edge) latest.current.onEdgeSelect(edge);
    }
    setTool(app.appState.activeTool);
    if (deferred.current) clearTimeout(deferred.current);
    deferred.current = setTimeout(() => commit(app), 350);
  }, [commit]);

  const fit = useCallback(() => {
    const app = editor.current; if (!app || app.session) return;
    app.zoomToFit(); app.zoomTo(Math.min(app.zoom * 0.76, 0.95));
  }, []);
  useEffect(() => {
    if (!mounted || !editor.current) return;
    installProjection(editor.current, false);
    if (props.selected && props.overview && projection.thoughtIds.has(thoughtShapeId(props.selected))) {
      projecting.current = true; editor.current.select(thoughtShapeId(props.selected)); projecting.current = false;
    }
  }, [mounted, projection, installProjection]);
  useEffect(() => {
    if (!mounted || !editor.current) return;
    const current = JSON.stringify(props.graph.whiteboard || []);
    if (current !== lastAnnotation.current) { lastAnnotation.current = current; installProjection(editor.current, false); }
  }, [mounted, props.graph.whiteboard, installProjection]);
  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(fit, 100); return () => clearTimeout(timer);
  }, [mounted, props.overview, props.overview ? null : props.selected, props.arrangeVersion, props.fitVersion, fit]);
  useEffect(() => {
    if (!mounted || !editor.current) return;
    editor.current.readOnly = !canEdit;
    editor.current.setSetting("isReadonlyMode", !canEdit);
  }, [mounted, canEdit]);
  useEffect(() => () => { if (deferred.current) clearTimeout(deferred.current); }, []);
  function choose(next: TDToolType) {
    connectingRef.current = false; connectFrom.current = null; setConnecting(false);
    editor.current?.selectNone().selectTool(next); setTool(next);
  }
  return <div className="axiomer-native-editor" data-testid="tldraw-surface" aria-label="Argument whiteboard">
    <Tldraw document={document} currentPageId="page" autofocus={false} showUI={false} readOnly={!canEdit} disableAssets
      onMount={(app) => { editor.current = app; lastAnnotation.current = JSON.stringify(latest.current.graph.whiteboard || []); installProjection(app, false); setMounted(true); }}
      onChange={changed} onSessionEnd={(app) => { requestAnimationFrame(() => commit(app)); }} onUndo={commit} onRedo={commit}/>
    <div className="viewport-controls native-viewport-controls" role="group" aria-label="Map view controls">
      <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => editor.current?.zoomOut()}>−</button>
      <button type="button" aria-label="Fit map" title="Fit the visible map" onClick={fit}>Fit</button>
      <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => editor.current?.zoomIn()}>+</button>
    </div>
    {canEdit && <div className="native-tools" role="toolbar" aria-label="Whiteboard tools">
      <button type="button" aria-label="Select" title="Select and move" aria-pressed={tool === "select" && !connecting} onClick={() => choose("select")}><MousePointer2 size={17}/></button>
      <button type="button" aria-label="Draw" title="Draw freely" aria-pressed={tool === TDShapeType.Draw} onClick={() => choose(TDShapeType.Draw)}><Pencil size={17}/></button>
      <button type="button" aria-label="Add note" title="Add a drawing note" aria-pressed={tool === TDShapeType.Sticky} onClick={() => choose(TDShapeType.Sticky)}><StickyNote size={17}/></button>
      <button type="button" aria-label="Draw rectangle" title="Draw a rectangle" aria-pressed={tool === TDShapeType.Rectangle} onClick={() => choose(TDShapeType.Rectangle)}><Square size={17}/></button>
      <button type="button" aria-label="Draw arrow" title="Draw an annotation arrow" aria-pressed={tool === TDShapeType.Arrow} onClick={() => choose(TDShapeType.Arrow)}><ArrowUpRight size={17}/></button>
      <span className="native-tool-divider"/>
      <button type="button" aria-label="Connect thoughts" title="Connect the selected thought to another thought" aria-pressed={connecting} onClick={() => { choose("select"); connectFrom.current = props.selected; connectingRef.current = true; setConnecting(true); }}><GitBranch size={17}/></button>
      <button type="button" aria-label="Undo drawing" title="Undo drawing" onClick={() => editor.current?.undo()}><Undo2 size={17}/></button>
      <button type="button" aria-label="Redo drawing" title="Redo drawing" onClick={() => editor.current?.redo()}><Redo2 size={17}/></button>
    </div>}
    {(connecting || message) && <div className="native-hint" role="status"><span>{connecting ? connectFrom.current ? "Choose the next thought." : "Choose two thoughts to connect." : message}</span>
      <button type="button" aria-label="Dismiss whiteboard message" onClick={() => { connectingRef.current = false; connectFrom.current = null; setConnecting(false); setMessage(""); }}><X size={14}/></button>
    </div>}
  </div>;
}
