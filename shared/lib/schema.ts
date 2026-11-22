import { z } from "zod";

export const CategorySchema = z.enum([
  "chat",
  "coding",
  "meetings",
  "image",
  "search",
  "crm",
  "writing",
  "productivity",
  "automation",
  "agents",
  "voice",
  "video",
  "support",
  "analytics",
  "design",
]);

export const VetoTagSchema = z.enum([
  "training-on-inputs",
  "china-hosted",
  "lawsuit-active",
  "weak-enterprise-controls",
  "consumer-default-training",
  "high-controversy",
  "opaque-data-policy",
]);

export const EvidenceKindSchema = z.enum([
  "vendor-policy",
  "news",
  "review",
  "research",
  "estimate",
]);

export const ToolKindSchema = z.enum([
  "model",
  "assistant",
  "wrapper",
  "platform",
  "addon",
]);

export const ToolScoresSchema = z.object({
  reputation: z.number().min(0).max(100),
  approval: z.number().min(0).max(100),
  capability: z.number().min(0).max(100),
  icpSafe: z.number().min(0).max(100),
});

export const ToolTierSchema = z.object({
  name: z.string().min(1),
  trainsOnInputs: z.enum(["yes", "no", "depends"]),
  notes: z.string().min(1),
});

export const EvidenceSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  kind: EvidenceKindSchema,
  dated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const ToolSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  category: CategorySchema,
  kind: ToolKindSchema.default("assistant"),
  website: z.string().url(),
  summary: z.string().min(1),
  scores: ToolScoresSchema,
  pros: z.array(z.string()).min(1),
  cons: z.array(z.string()).min(1),
  vetoTags: z.array(VetoTagSchema),
  fitTags: z.array(z.string()).default([]),
  tiers: z.array(ToolTierSchema).min(1),
  evidence: z.array(EvidenceSchema).min(1),
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const ToolsArraySchema = z.array(ToolSchema).min(1);

export type Category = z.infer<typeof CategorySchema>;
export type VetoTag = z.infer<typeof VetoTagSchema>;
export type ToolScores = z.infer<typeof ToolScoresSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type ToolKind = z.infer<typeof ToolKindSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;

export const DEFAULT_WEIGHTS = {
  reputation: 0.3,
  approval: 0.25,
  capability: 0.2,
  icpSafe: 0.25,
} as const;

export const ICP_WEIGHTS = {
  reputation: 0.2,
  approval: 0.2,
  capability: 0.15,
  icpSafe: 0.45,
} as const;

export const CATEGORY_LABELS: Record<Category, string> = {
  chat: "Chat",
  coding: "Coding",
  meetings: "Meetings",
  image: "Image",
  search: "Search",
  crm: "CRM",
  writing: "Writing",
  productivity: "Productivity",
  automation: "Automation",
  agents: "Agents",
  voice: "Voice",
  video: "Video",
  support: "Support",
  analytics: "Analytics",
  design: "Design",
};

export const KIND_LABELS: Record<ToolKind, string> = {
  model: "Model",
  assistant: "Assistant",
  wrapper: "Wrapper",
  platform: "Platform",
  addon: "Add-on",
};

export const VETO_LABELS: Record<VetoTag, string> = {
  "training-on-inputs": "Trains on inputs by default",
  "china-hosted": "China-hosted or China-owned",
  "lawsuit-active": "Active high-profile litigation",
  "weak-enterprise-controls": "Weak enterprise controls",
  "consumer-default-training": "Consumer tier trains by default",
  "high-controversy": "High public controversy",
  "opaque-data-policy": "Opaque data policy",
};
