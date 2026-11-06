import {
  validateRoadmap,
  KINDS,
  type Kind,
  type Suggestion,
  type Draft,
} from "./model";
export const STORAGE_KEY = "axiomer.tldraw.roadmaps.v1";
export function readDrafts(storage: Pick<Storage, "getItem">): {
  drafts: Draft[];
  queue: { draftId: string; steps: Suggestion[] } | null;
  error: string | null;
  activeDraftId?: string;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY) ?? storage.getItem("axiomer.roadmaps.v2");
    if (!raw) return { drafts: [], queue: null, error: null };
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : data?.drafts;
    if (!Array.isArray(list)) throw new Error("Draft library is not a list");
    const ids = new Set<string>();
    const drafts = list.map((d): Draft => {
      if (
        !d ||
        typeof d.id !== "string" ||
        ids.has(d.id) ||
        typeof d.title !== "string" ||
        typeof d.updated !== "string"
      )
        throw new Error("Invalid draft");
      for (const key of [
        "publishedId",
        "revision",
        "ownerId",
        "replacesProposalId",
      ])
        if (
          d[key] !== undefined &&
          (typeof d[key] !== "string" || !d[key] || d[key].length > 150)
        )
          throw new Error("Invalid draft publication reference");
      ids.add(d.id);
      return { ...d, graph: validateRoadmap(d.graph) };
    });
    let queue: { draftId: string; steps: Suggestion[] } | null = null;
    if (data.queue) {
      const q = data.queue;
      if (
        typeof q.draftId !== "string" ||
        !drafts.some((d) => d.id === q.draftId) ||
        !Array.isArray(q.steps) ||
        q.steps.length > 20
      )
        throw new Error("Invalid saved review");
      const candidateIds = new Set<string>();
      const steps = q.steps.map((s: Suggestion): Suggestion => {
        if (
          !s ||
          typeof s.id !== "string" ||
          candidateIds.has(s.id) ||
          typeof s.text !== "string" ||
          !s.text.trim() ||
          s.text.length > 10000 ||
          typeof s.rationale !== "string" ||
          typeof s.excerpt !== "string" ||
          !["pending", "accepted", "rejected", "blocked"].includes(s.status) ||
          (s.kind !== null && !KINDS.includes(s.kind as Kind)) ||
          (s.parentId !== null && typeof s.parentId !== "string")
        )
          throw new Error("Invalid saved proposal");
        candidateIds.add(s.id);
        return s;
      });
      queue = { draftId: q.draftId, steps };
    }
    const activeDraftId = data.activeDraftId;
    if (
      activeDraftId !== undefined &&
      (typeof activeDraftId !== "string" || !ids.has(activeDraftId))
    )
      throw new Error("Invalid active draft");
    return { drafts, queue, error: null, activeDraftId };
  } catch {
    return {
      drafts: [],
      queue: null,
      error:
        "Your saved library could not be read and has not been overwritten. Current work is unsaved until storage recovers.",
    };
  }
}
