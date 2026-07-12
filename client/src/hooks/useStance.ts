// A user's stance — their commitment store (docs/STATUS_AND_COMMITMENT.md §5).
// Stances are personal overlays on the shared graph: they persist locally and
// never enter graph.json, so they work in the read-only viewer too.

import { useEffect, useState } from "react";
import type { Stance } from "@/lib/commitment";
import { EMPTY_STANCE, toggleAccept, toggleReject } from "@/lib/commitment";

const STORAGE_KEY = "axiomer_stance";

function loadInitial(): Stance {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Stance;
      if (
        parsed &&
        Array.isArray(parsed.accepted) &&
        Array.isArray(parsed.rejected)
      ) {
        return parsed;
      }
    }
  } catch {
    // fall through to empty
  }
  return EMPTY_STANCE;
}

export interface UseStance {
  stance: Stance;
  accept: (nodeId: string) => void; // toggle
  reject: (nodeId: string) => void; // toggle
  clear: () => void;
}

export function useStance(): UseStance {
  const [stance, setStance] = useState<Stance>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stance));
    } catch {
      // ignore quota / serialization errors
    }
  }, [stance]);

  return {
    stance,
    accept: (nodeId) => setStance((s) => toggleAccept(s, nodeId)),
    reject: (nodeId) => setStance((s) => toggleReject(s, nodeId)),
    clear: () => setStance(EMPTY_STANCE),
  };
}
