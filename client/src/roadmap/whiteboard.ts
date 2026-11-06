/** Serializable drawing layer. Argument nodes/connections remain in the DAG. */
export const WHITEBOARD_TYPES = ["draw", "rectangle", "ellipse", "triangle", "arrow", "text", "sticky"] as const;
export type WhiteboardType = (typeof WHITEBOARD_TYPES)[number];
export interface WhiteboardAnnotation {
  id: string;
  type: WhiteboardType;
  parentId: "page";
  childIndex: number;
  name: string;
  point: number[];
  rotation?: number;
  style: {
    color: string; size: string; dash: string;
    font?: string; textAlign?: string; isFilled?: boolean; scale?: number;
  };
  size?: number[];
  radius?: number[];
  points?: number[][];
  isComplete?: boolean;
  text?: string;
  label?: string;
  labelPoint?: number[];
  bend?: number;
  handles?: Record<string, { id: string; index: number; point: number[]; canBind?: boolean }>;
  decorations?: { start?: "arrow"; end?: "arrow"; middle?: "arrow" };
  isGhost?: boolean;
  isHidden?: boolean;
  isLocked?: boolean;
  isGenerated?: boolean;
  isAspectRatioLocked?: boolean;
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function fail(detail: string): never { throw new Error(`Invalid whiteboard: ${detail}`); }
function number(v: unknown, max = 1e8): number {
  if (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > max) fail("coordinate or number is out of range");
  return v as number;
}
function vector(v: unknown, positive = false): number[] {
  if (!Array.isArray(v) || v.length !== 2) fail("a point needs two coordinates");
  const point = (v as unknown[]).map(n => number(n));
  if (positive && point.some(n => n < 0)) fail("size cannot be negative");
  return point;
}
function text(v: unknown, max: number): string {
  if (typeof v !== "string" || v.length > max) fail("text is too long or missing");
  return v as string;
}
function oneOf(v: unknown, values: readonly string[]): string {
  if (typeof v !== "string" || !values.includes(v)) fail("unsupported drawing style");
  return v as string;
}
function keys(v: Record<string, unknown>, allowed: readonly string[]) {
  // Undefined own fields disappear in JSON transport and carry no document data.
  if (Object.keys(v).some(key => v[key] !== undefined && !allowed.includes(key))) fail("unsupported shape data, asset or binding");
}
const common = ["id", "type", "parentId", "childIndex", "name", "point", "rotation", "style", "isGhost", "isHidden", "isLocked", "isGenerated", "isAspectRatioLocked"];
const extra: Record<WhiteboardType, string[]> = {
  draw: ["points", "isComplete"], rectangle: ["size", "label", "labelPoint"],
  ellipse: ["radius", "label", "labelPoint"], triangle: ["size", "label", "labelPoint"],
  arrow: ["bend", "handles", "decorations", "label", "labelPoint"],
  text: ["text"], sticky: ["size", "text"],
};

/** No asset URLs, executable/custom metadata, nested groups or argument IDs. */
export function validateWhiteboard(value: unknown): WhiteboardAnnotation[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 2000) fail("up to 2,000 drawing objects are supported");
  const ids = new Set<string>();
  let points = 0;
  const annotations = (value as unknown[]).map(raw => {
    if (!object(raw)) fail("drawing object is missing");
    const s = raw as Record<string, unknown>;
    const type = oneOf(s.type, WHITEBOARD_TYPES) as WhiteboardType;
    keys(s, [...common, ...extra[type]]);
    const id = text(s.id, 150);
    if (!/^[A-Za-z0-9:_-]+$/.test(id) || id.startsWith("axiomer-") || ["__proto__", "constructor", "prototype"].includes(id) || ids.has(id)) fail("drawing ID is reserved, unsafe or duplicated");
    ids.add(id);
    if (s.parentId !== "page") fail("drawing must belong to the board page");
    if (!object(s.style)) fail("style is missing");
    const st = s.style as Record<string, unknown>;
    keys(st, ["color", "size", "dash", "font", "textAlign", "isFilled", "scale"]);
    const shape: WhiteboardAnnotation = {
      id, type, parentId: "page", childIndex: number(s.childIndex), name: text(s.name, 200),
      point: vector(s.point),
      style: {
        color: oneOf(st.color, ["white", "lightGray", "gray", "black", "green", "cyan", "blue", "indigo", "violet", "red", "orange", "yellow"]),
        size: oneOf(st.size, ["small", "medium", "large"]),
        dash: oneOf(st.dash, ["draw", "solid", "dashed", "dotted"]),
      },
    };
    if (st.font !== undefined) shape.style.font = oneOf(st.font, ["script", "sans", "serif", "mono"]);
    if (st.textAlign !== undefined) shape.style.textAlign = oneOf(st.textAlign, ["start", "middle", "end", "justify"]);
    if (st.isFilled !== undefined) {
      if (typeof st.isFilled !== "boolean") fail("fill is invalid");
      shape.style.isFilled = st.isFilled;
    }
    if (st.scale !== undefined) {
      const scale = number(st.scale, 1000);
      if (scale <= 0) fail("scale must be positive");
      shape.style.scale = scale;
    }
    if (s.rotation !== undefined) shape.rotation = number(s.rotation);
    for (const flag of ["isGhost", "isHidden", "isLocked", "isGenerated", "isAspectRatioLocked"] as const) {
      if (s[flag] !== undefined) {
        if (typeof s[flag] !== "boolean") fail("shape flag is invalid");
        shape[flag] = s[flag];
      }
    }
    if (s.label !== undefined) shape.label = text(s.label, 10000);
    if (s.labelPoint !== undefined) shape.labelPoint = vector(s.labelPoint);
    if (["rectangle", "triangle", "sticky"].includes(type)) shape.size = vector(s.size, true);
    if (type === "ellipse") shape.radius = vector(s.radius, true);
    if (type === "text" || type === "sticky") shape.text = text(s.text, 10000);
    if (type === "draw") {
      if (!Array.isArray(s.points) || !s.points.length || s.points.length > 20000) fail("a stroke needs 1–20,000 points");
      points += s.points.length;
      if (points > 100000) fail("the drawing has too many stroke points");
      shape.points = s.points.map(p => {
        if (!Array.isArray(p) || (p.length !== 2 && p.length !== 3)) fail("invalid stroke point");
        const point = [number(p[0]), number(p[1])];
        if (p.length === 3) {
          const pressure = number(p[2], 1);
          if (pressure < 0) fail("invalid pressure");
          point.push(pressure);
        }
        return point;
      });
      if (typeof s.isComplete !== "boolean") fail("stroke completion is missing");
      shape.isComplete = s.isComplete;
    }
    if (type === "arrow") {
      shape.bend = number(s.bend);
      if (!object(s.handles)) fail("arrow handles are missing");
      keys(s.handles as Record<string, unknown>, ["start", "bend", "end"]);
      shape.handles = {};
      for (const name of ["start", "bend", "end"]) {
        const h = (s.handles as Record<string, unknown>)[name];
        if (!object(h)) fail("arrow handle is missing");
        const handle = h as Record<string, unknown>;
        keys(handle, ["id", "index", "point", "canBind"]);
        const clean: NonNullable<WhiteboardAnnotation["handles"]>[string] = { id: text(handle.id, 150), index: number(handle.index), point: vector(handle.point) };
        if (handle.canBind !== undefined) {
          if (typeof handle.canBind !== "boolean") fail("invalid arrow handle");
          clean.canBind = handle.canBind;
        }
        shape.handles[name] = clean;
      }
      if (s.decorations !== undefined) {
        if (!object(s.decorations)) fail("arrow decorations are invalid");
        keys(s.decorations as Record<string, unknown>, ["start", "end", "middle"]);
        shape.decorations = {};
        for (const name of ["start", "end", "middle"] as const) {
          const d = (s.decorations as Record<string, unknown>)[name];
          if (d !== undefined) shape.decorations[name] = oneOf(d, ["arrow"]) as "arrow";
        }
      }
    }
    return shape;
  });
  annotations.sort((a, b) => a.childIndex - b.childIndex || a.id.localeCompare(b.id));
  if (new TextEncoder().encode(JSON.stringify(annotations)).byteLength > 2 * 1024 * 1024) fail("drawing exceeds 2 MiB");
  return annotations;
}

export function whiteboardMeaning(value: unknown): string {
  return JSON.stringify(validateWhiteboard(value));
}
