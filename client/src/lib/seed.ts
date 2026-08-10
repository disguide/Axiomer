// Seed graphs loaded on first visit (empty localStorage).
// Reproduces the spec's two examples verbatim so node IDs stay stable.

import type { Graph } from "./types";

// Example 1: Trolley Problem — OPEN (two distinct values at the bottom).
const trolleyNodes: Graph["nodes"] = [
  { id: "trolley-q1", type: "claim", content: "Should you pull the lever?" },
  { id: "trolley-p1", type: "claim", content: "Yes, pull the lever" },
  {
    id: "trolley-a1",
    type: "support",
    content: "Saving more lives is better",
  },
  {
    id: "trolley-e1",
    type: "support",
    content: "Pulling saves 5 lives vs 1",
  },
  {
    id: "trolley-c1",
    type: "note",
    content: "This assumes the trolley will definitely hit someone",
  },
  {
    id: "trolley-q2",
    type: "claim",
    content: "Why does saving lives matter?",
  },
  {
    id: "trolley-p2",
    type: "claim",
    content: "Because minimizing suffering is the goal",
  },
  { id: "trolley-a2", type: "support", content: "Suffering is bad" },
  { id: "trolley-v1", type: "value", content: "Minimize total suffering" },
  { id: "trolley-p3", type: "claim", content: "No, don't pull the lever" },
  {
    id: "trolley-a3",
    type: "support",
    content: "Using people as means is wrong",
  },
  {
    id: "trolley-v2",
    type: "value",
    content: "Never use a person merely as a means",
  },
];

const trolleyEdges: Graph["edges"] = [
  { id: "t-edge-1", from: "trolley-p1", to: "trolley-q1", edgeType: "supports" },
  {
    id: "t-edge-2",
    from: "trolley-a1",
    to: "trolley-p1",
    edgeType: "supports",
  },
  { id: "t-edge-3", from: "trolley-e1", to: "trolley-a1", edgeType: "supports" },
  {
    id: "t-edge-4",
    from: "trolley-c1",
    to: "trolley-a1",
    edgeType: "annotates",
  },
  { id: "t-edge-5", from: "trolley-a1", to: "trolley-q2", edgeType: "annotates" },
  { id: "t-edge-6", from: "trolley-p2", to: "trolley-q2", edgeType: "supports" },
  {
    id: "t-edge-7",
    from: "trolley-a2",
    to: "trolley-p2",
    edgeType: "supports",
  },
  {
    id: "t-edge-8",
    from: "trolley-a2",
    to: "trolley-v1",
    edgeType: "grounds",
  },
  { id: "t-edge-9", from: "trolley-p3", to: "trolley-q1", edgeType: "supports" },
  {
    id: "t-edge-10",
    from: "trolley-a3",
    to: "trolley-p3",
    edgeType: "supports",
  },
  {
    id: "t-edge-11",
    from: "trolley-a3",
    to: "trolley-v2",
    edgeType: "grounds",
  },
];

// Example 2: Why is the sky blue? — FULLY GROUNDED (reaches an epistemic limit).
const skyNodes: Graph["nodes"] = [
  { id: "sky-q1", type: "claim", content: "Why is the sky blue?" },
  {
    id: "sky-p1",
    type: "claim",
    content: "Because of Rayleigh scattering",
  },
  {
    id: "sky-e1",
    type: "support",
    content: "Shorter wavelengths scatter more",
  },
  {
    id: "sky-a1",
    type: "support",
    content: "Scattering intensity is proportional to wavelength^-4",
  },
  {
    id: "sky-q2",
    type: "claim",
    content: "Why is it proportional to wavelength^-4?",
  },
  {
    id: "sky-p2",
    type: "claim",
    content: "That's derived from Maxwell's equations",
  },
  {
    id: "sky-el1",
    type: "limit",
    content: "That's our best current scientific theory",
  },
];

const skyEdges: Graph["edges"] = [
  { id: "s-edge-1", from: "sky-p1", to: "sky-q1", edgeType: "supports" },
  { id: "s-edge-2", from: "sky-e1", to: "sky-p1", edgeType: "supports" },
  { id: "s-edge-3", from: "sky-a1", to: "sky-p1", edgeType: "supports" },
  { id: "s-edge-4", from: "sky-a1", to: "sky-q2", edgeType: "annotates" },
  { id: "s-edge-5", from: "sky-p2", to: "sky-q2", edgeType: "supports" },
  { id: "s-edge-6", from: "sky-p2", to: "sky-el1", edgeType: "grounds" },
];

// Example 3: AI Regulation — deep tree with 3 branches
const aiNodes: Graph["nodes"] = [
  { id: "ai-q1", type: "claim", content: "Should AI be regulated by a global body?" },
  
  // Branch 1: Yes (Safety)
  { id: "ai-p1", type: "claim", content: "Yes, to mitigate catastrophic risks" },
  { id: "ai-a1", type: "support", content: "Unaligned AGI poses an existential threat" },
  { id: "ai-e1", type: "support", content: "Many AI scientists assign non-trivial extinction probabilities" },
  { id: "ai-a2", type: "support", content: "Global coordination prevents dangerous race conditions" },
  { id: "ai-q2", type: "claim", content: "Why are race conditions dangerous here?" },
  { id: "ai-p2", type: "claim", content: "Competitors will cut safety corners to deploy first" },
  { id: "ai-a3", type: "support", content: "Rogue actors can operate in unregulated jurisdictions" },
  { id: "ai-e2", type: "support", content: "Digital technologies are highly mobile and easily duplicated" },
  { id: "ai-v1", type: "bedrock", content: "Survival of humanity is the absolute highest priority" },

  // Branch 2: No (Innovation)
  { id: "ai-p3", type: "claim", content: "No, heavy regulation stifles innovation and economic growth" },
  { id: "ai-a4", type: "support", content: "Compliance costs create moats for big tech, crushing startups" },
  { id: "ai-e3", type: "support", content: "Historical analysis shows regulation disproportionately harms small companies" },
  { id: "ai-a5", type: "support", content: "AI is necessary to solve major global problems" },
  { id: "ai-a6", type: "support", content: "Delaying AI deployment delays life-saving medical breakthroughs" },
  { id: "ai-v2", type: "bedrock", content: "Maximize technological progress and human utility" },

  // Branch 3: No (Sovereignty/Liberty)
  { id: "ai-p4", type: "claim", content: "No, a global body would be undemocratic and prone to capture" },
  { id: "ai-a7", type: "support", content: "Global institutions lack direct accountability to local populations" },
  { id: "ai-e4", type: "support", content: "Global bodies have historically been influenced by authoritarian regimes" },
  { id: "ai-a8", type: "support", content: "It concentrates power over the most important technology in few hands" },
  { id: "ai-q3", type: "claim", content: "How can we address risks without a global body?" },
  { id: "ai-p5", type: "claim", content: "Through decentralized democratic treaties and open-source security" },
  { id: "ai-a9", type: "support", content: "Open source allows many independent actors to find and patch vulnerabilities" },
  { id: "ai-v3", type: "bedrock", content: "Preserve individual liberty and decentralization of power" },
];

const aiEdges: Graph["edges"] = [
  // Branch 1
  { id: "ai-edge-1", from: "ai-p1", to: "ai-q1", edgeType: "supports" },
  { id: "ai-edge-2", from: "ai-a1", to: "ai-p1", edgeType: "supports" },
  { id: "ai-edge-3", from: "ai-e1", to: "ai-a1", edgeType: "supports" },
  { id: "ai-edge-4", from: "ai-a2", to: "ai-p1", edgeType: "supports" },
  { id: "ai-edge-5", from: "ai-a2", to: "ai-q2", edgeType: "annotates" },
  { id: "ai-edge-6", from: "ai-p2", to: "ai-q2", edgeType: "supports" },
  { id: "ai-edge-7", from: "ai-a3", to: "ai-p1", edgeType: "supports" },
  { id: "ai-edge-8", from: "ai-e2", to: "ai-a3", edgeType: "supports" },
  { id: "ai-edge-9", from: "ai-a1", to: "ai-v1", edgeType: "grounds" },
  
  // Branch 2
  { id: "ai-edge-10", from: "ai-p3", to: "ai-q1", edgeType: "supports" },
  { id: "ai-edge-11", from: "ai-a4", to: "ai-p3", edgeType: "supports" },
  { id: "ai-edge-12", from: "ai-e3", to: "ai-a4", edgeType: "supports" },
  { id: "ai-edge-13", from: "ai-a5", to: "ai-p3", edgeType: "supports" },
  { id: "ai-edge-14", from: "ai-a6", to: "ai-a5", edgeType: "supports" },
  { id: "ai-edge-15", from: "ai-a6", to: "ai-v2", edgeType: "grounds" },

  // Branch 3
  { id: "ai-edge-16", from: "ai-p4", to: "ai-q1", edgeType: "supports" },
  { id: "ai-edge-17", from: "ai-a7", to: "ai-p4", edgeType: "supports" },
  { id: "ai-edge-18", from: "ai-e4", to: "ai-a7", edgeType: "supports" },
  { id: "ai-edge-19", from: "ai-a8", to: "ai-p4", edgeType: "supports" },
  { id: "ai-edge-20", from: "ai-a8", to: "ai-v3", edgeType: "grounds" },
  { id: "ai-edge-21", from: "ai-p4", to: "ai-q3", edgeType: "annotates" },
  { id: "ai-edge-22", from: "ai-p5", to: "ai-q3", edgeType: "supports" },
  { id: "ai-edge-23", from: "ai-a9", to: "ai-p5", edgeType: "supports" },
  { id: "ai-edge-24", from: "ai-a9", to: "ai-v3", edgeType: "grounds" },
];

// Example 4: Epistemology & Ethics — demonstrating terminal layers
const epNodes: Graph["nodes"] = [
  { id: "ep-q1", type: "claim", content: "How do I know what actions are right or wrong?" },
  
  // Branch 1: Utilitarian Preference
  { id: "ep-p1", type: "claim", content: "Actions are right if they maximize total happiness." },
  { id: "ep-a1", type: "support", content: "Happiness is the only measurable intrinsic good." },
  { id: "ep-pref1", type: "preference", content: "I prefer a utilitarian framework where collective well-being is the metric." },

  // Branch 2: Epistemological Limit
  { id: "ep-a2", type: "conflict", content: "We can't even be sure other people's happiness exists." },
  { id: "ep-e1", type: "support", content: "The philosophical problem of other minds." },
  { id: "ep-lim1", type: "limit", content: "We cannot directly experience another entity's consciousness." },

  // Branch 3: Absolute Bedrock
  { id: "ep-q2", type: "claim", content: "If I can't be sure of others, what can I be sure of?" },
  { id: "ep-p2", type: "claim", content: "I can only be sure that my own mind exists." },
  { id: "ep-bed1", type: "bedrock", content: "I think, therefore I am." },

  // Branch 4: Deontological Value
  { id: "ep-p3", type: "claim", content: "Actions are right if they adhere to universal moral duties." },
  { id: "ep-a3", type: "support", content: "Human beings possess inherent dignity that cannot be violated for utility." },
  { id: "ep-val1", type: "value", content: "Human life has intrinsic moral worth." },
];

const epEdges: Graph["edges"] = [
  // Branch 1
  { id: "ep-edge-1", from: "ep-p1", to: "ep-q1", edgeType: "supports" },
  { id: "ep-edge-2", from: "ep-a1", to: "ep-p1", edgeType: "supports" },
  { id: "ep-edge-3", from: "ep-pref1", to: "ep-a1", edgeType: "grounds" },
  
  // Branch 2
  { id: "ep-edge-4", from: "ep-a2", to: "ep-p1", edgeType: "conflicts" },
  { id: "ep-edge-5", from: "ep-e1", to: "ep-a2", edgeType: "supports" },
  { id: "ep-edge-6", from: "ep-lim1", to: "ep-e1", edgeType: "grounds" },

  // Branch 3
  { id: "ep-edge-7", from: "ep-a2", to: "ep-q2", edgeType: "annotates" },
  { id: "ep-edge-8", from: "ep-p2", to: "ep-q2", edgeType: "supports" },
  { id: "ep-edge-9", from: "ep-bed1", to: "ep-p2", edgeType: "grounds" },

  // Branch 4
  { id: "ep-edge-10", from: "ep-p3", to: "ep-q1", edgeType: "supports" },
  { id: "ep-edge-11", from: "ep-a3", to: "ep-p3", edgeType: "supports" },
  { id: "ep-edge-12", from: "ep-val1", to: "ep-a3", edgeType: "grounds" },
];

export const seedGraph: Graph = {
  nodes: [...trolleyNodes, ...skyNodes, ...aiNodes, ...epNodes],
  edges: [...trolleyEdges, ...skyEdges, ...aiEdges, ...epEdges],
};
