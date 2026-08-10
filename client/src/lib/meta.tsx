// Display metadata and authoring rules for every node type.
// Single source of truth shared by NodeCard, AddNodeForm, Legend, and Toolbar.

import type { NodeType } from "./types";
import type { ReactNode } from "react";
import {
  MessageSquare, Sprout, CheckCircle2, XCircle,
  StickyNote, Anchor, BookOpen, Ban, Mountain, Heart,
} from "lucide-react";

export interface NodeMeta {
  label: string;
  icon: ReactNode;
  color: string;       // hex accent
  description: string;
  prompt: string;       // input prompt when authoring
  placeholder: string;  // example text for the input
  terminal: boolean;
}

export const NODE_META: Record<NodeType, NodeMeta> = {
  claim: {
    label: "CLAIM",
    icon: <MessageSquare className="w-[1em] h-[1em]" />,
    color: "#334155",   // slate-700
    description: "A question, position, or statement you're exploring.",
    prompt: "What are you claiming or exploring?",
    placeholder: "Should you pull the lever?",
    terminal: false,
  },
  premise: {
    label: "PREMISE",
    icon: <Sprout className="w-[1em] h-[1em]" />,
    color: "#64748b",   // slate-500
    description: "A foundational assumption you reason forward from.",
    prompt: "What premise are you starting from?",
    placeholder: "All humans have equal moral worth",
    terminal: false,
  },
  support: {
    label: "SUPPORT",
    icon: <CheckCircle2 className="w-[1em] h-[1em]" />,
    color: "#16a34a",   // green-600
    description: "Evidence, reasoning, or data that backs a claim.",
    prompt: "What supports this?",
    placeholder: "Studies show 78% success rate...",
    terminal: false,
  },
  conflict: {
    label: "CONFLICT",
    icon: <XCircle className="w-[1em] h-[1em]" />,
    color: "#e11d48",   // rose-600
    description: "A logical inconsistency or contradiction in the derivation.",
    prompt: "What does this conflict with?",
    placeholder: "This contradicts the premise that...",
    terminal: false,
  },
  note: {
    label: "NOTE",
    icon: <StickyNote className="w-[1em] h-[1em]" />,
    color: "#94a3b8",   // slate-400
    description: "Context, clarification, caveat, or annotation.",
    prompt: "What context or annotation to add?",
    placeholder: "By 'justice' I mean distributive fairness...",
    terminal: false,
  },
  value: {
    label: "VALUE",
    icon: <Anchor className="w-[1em] h-[1em]" />,
    color: "#d97706",   // amber-600
    description: "A bedrock value or principle — intrinsically important.",
    prompt: "What is the bedrock value?",
    placeholder: "Minimize total suffering",
    terminal: true,
  },
  source: {
    label: "SOURCE",
    icon: <BookOpen className="w-[1em] h-[1em]" />,
    color: "#0d9488",   // teal-600
    description: "A citation, reference, or link to evidence.",
    prompt: "What is the source?",
    placeholder: "https://example.com/study",
    terminal: true,
  },
  limit: {
    label: "LIMIT",
    icon: <Ban className="w-[1em] h-[1em]" />,
    color: "#94a3b8",   // slate-400
    description: "The boundary of what we can know.",
    prompt: "What is the epistemic limit?",
    placeholder: "We can't know if consciousness is fundamental",
    terminal: true,
  },
  bedrock: {
    label: "BEDROCK",
    icon: <Mountain className="w-[1em] h-[1em]" />,
    color: "#4f46e5",   // indigo-600
    description: "Absolute bedrock where you cannot go any deeper.",
    prompt: "What is the ultimate bedrock truth?",
    placeholder: "I think, therefore I am",
    terminal: true,
  },
  preference: {
    label: "PREFERENCE",
    icon: <Heart className="w-[1em] h-[1em]" />,
    color: "#ec4899",   // pink-500
    description: "A subjective human desire, aesthetic choice, or personal inclination.",
    prompt: "What is the underlying preference?",
    placeholder: "I prefer autonomy over security",
    terminal: true,
  },
};

// Context-sensitive children: which node types may be added under a given
// parent type. Terminal types map to an empty list.
export const ALLOWED_CHILDREN: Record<NodeType, NodeType[]> = {
  claim:   ["claim", "support", "conflict", "note", "value", "source", "limit", "bedrock", "preference"],
  premise: ["claim", "support", "conflict", "note", "value", "source", "limit", "bedrock", "preference"],
  support: ["support", "conflict", "note", "value", "source", "limit", "bedrock", "preference"],
  conflict: ["support", "conflict", "note", "value", "source", "limit", "bedrock", "preference"],
  note:    ["conflict", "note", "source"],
  value:   [],
  source:  [],
  limit:   [],
  bedrock: [],
  preference: [],
};

// Display order for the Legend panel.
export const NODE_ORDER: NodeType[] = [
  "claim",
  "premise",
  "support",
  "conflict",
  "note",
  "value",
  "preference",
  "source",
  "limit",
  "bedrock",
];
