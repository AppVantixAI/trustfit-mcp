/**
 * Maps TrustFit catalog slugs to the names open datasets use. Hand-curated and
 * deliberately narrow: a tool is mapped only when the dataset row describes the
 * same product or its own developer. Wrappers that merely run someone else's
 * model (Cursor, Perplexity, Copilot and similar) are NOT mapped to that model.
 */
export type EntityMap = {
  /** Column name in the Foundation Model Transparency Index scores file. */
  fmti?: string;
  /** `organization` value in the LMArena leaderboard dataset. */
  arenaOrg?: string;
  /** Exact vendorProject and product pairs in the CISA KEV catalog. */
  kev?: { vendorProject: string; product: string }[];
  /** Entity slugs AIID lists as developer of the AI system (from its entities list). */
  aiid?: string[];
  /** True when the AIID entity is a whole company, not just this product (Google, Microsoft, OpenAI...). */
  aiidVendorWide?: boolean;
};

export const ENTITIES: Record<string, EntityMap> = {
  chatgpt: { fmti: "OpenAI", arenaOrg: "openai", aiid: ["openai"], aiidVendorWide: true },
  claude: { fmti: "Anthropic", arenaOrg: "anthropic", aiid: ["anthropic"], aiidVendorWide: true },
  gemini: { fmti: "Google", arenaOrg: "google", aiid: ["google", "google-deepmind"], aiidVendorWide: true },
  deepseek: { fmti: "DeepSeek", arenaOrg: "deepseek", aiid: ["deepseek"] },
  midjourney: { fmti: "Midjourney", aiid: ["midjourney"] },
  "n8n-ai": { kev: [{ vendorProject: "n8n", product: "n8n" }] },
  "microsoft-copilot": { aiid: ["microsoft"], aiidVendorWide: true },
  perplexity: { aiid: ["perplexity", "perplexity-ai"] },
  "github-copilot": { aiid: ["github"], aiidVendorWide: true },
  cursor: { aiid: ["cursor"] },
  "adobe-firefly": { aiid: ["adobe"], aiidVendorWide: true },
  otter: { aiid: ["otter.ai"] },
  fireflies: { aiid: ["fireflies.ai"] },
  granola: { aiid: ["granola"] },
  grammarly: { aiid: ["grammarly"] },
  elevenlabs: { aiid: ["elevenlabs"] },
  "zoom-ai-companion": { aiid: ["zoom"], aiidVendorWide: true },
  heygen: { aiid: ["heygen"] },
  "figma-ai": { aiid: ["figma"], aiidVendorWide: true },
};
