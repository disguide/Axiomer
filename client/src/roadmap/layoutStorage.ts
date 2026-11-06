// Personal canvas arrangement is view state, separate from shared argument meaning.
export const LAYOUT_KEY = "axiomer.tldraw.arrangements.v1";
export type Point = { x: number; y: number };
export type Arrangements = Record<string, Record<string, Point>>;
export function readArrangements(storage: Pick<Storage, "getItem">): {
  layouts: Arrangements;
  error: string | null;
} {
  try {
    const raw = storage.getItem(LAYOUT_KEY) ?? storage.getItem("axiomer.arrangements.v1");
    if (!raw) return { layouts: {}, error: null };
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error();
    const layouts: Arrangements = Object.create(null);
    for (const [draftId, positions] of Object.entries(value)) {
      if (!positions || typeof positions !== "object" || Array.isArray(positions)) throw Error();
      const clean: Record<string, Point> = Object.create(null);
      for (const [nodeId, point] of Object.entries(positions)) {
        if (!point || typeof point !== "object" ||
          !Number.isFinite((point as Point).x) || !Number.isFinite((point as Point).y) ||
          Math.abs((point as Point).x) > 1e8 || Math.abs((point as Point).y) > 1e8) throw Error();
        clean[nodeId] = { x: (point as Point).x, y: (point as Point).y };
      }
      layouts[draftId] = clean;
    }
    return { layouts, error: null };
  } catch {
    return { layouts: {}, error: "Your saved arrangement could not be read. Your argument is intact; the saved arrangement has not been overwritten." };
  }
}
/** Imported IDs are unrestricted strings; never read Object.prototype as a point. */
export function ownPosition(positions: Record<string, Point>, id: string): Point | undefined {
  if (!Object.hasOwn(positions, id)) return undefined;
  const point = positions[id];
  return point && Number.isFinite(point.x) && Number.isFinite(point.y) ? point : undefined;
}
