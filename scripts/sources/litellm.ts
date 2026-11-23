/**
 * LiteLLM model price and context file (github.com/BerriAI/litellm), MIT.
 * Used for what other open sources rarely carry: announced deprecation dates, plus
 * list prices and token limits as a second source next to models.dev. Only rows
 * whose provider is the developer itself are used (openai for OpenAI models).
 * Run: npx tsx scripts/sources/litellm.ts
 */
import { buildIndexMap, loadIndex, type IndexMap } from "../lib/index-map";
import { get, isMain, sha256, text, today, writeSnapshot, type Snapshot } from "../lib/open-data";

export const URL_FILE = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

/** LiteLLM provider value to organization id, first-party APIs only. */
export const PROVIDER_ORG: Record<string, string> = {
  openai: "openai",
  text_completion_openai: "openai",
  anthropic: "anthropic",
  gemini: "google",
  mistral: "mistral",
  codestral: "mistral",
  xai: "xai",
  deepseek: "deepseek",
  cohere: "cohere",
  cohere_chat: "cohere",
  perplexity: "perplexity",
  moonshot: "moonshot",
  dashscope: "alibaba",
  zai: "zhipu",
  minimax: "minimax",
};

type Row = {
  litellm_provider?: string;
  mode?: string;
  max_input_tokens?: number;
  max_output_tokens?: number;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  deprecation_date?: string;
  supports_function_calling?: boolean;
  supports_vision?: boolean;
};

export type LitellmFacts = {
  /** The model name in the LiteLLM price file. */
  model: string;
  provider: string;
  mode: string | null;
  deprecationDate: string | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  inputUsdPerM: number | null;
  outputUsdPerM: number | null;
  functionCalling: boolean | null;
  vision: boolean | null;
};

const perM = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? Math.round(x * 1e6 * 10000) / 10000 : null);
const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);

export function build(file: Record<string, Row>, index: IndexMap, retrievedAt: string, fileHash: string): Snapshot<never, never, LitellmFacts> {
  const byIndexId: Record<string, LitellmFacts> = {};
  for (const [key, r] of Object.entries(file)) {
    if (key === "sample_spec" || !r || typeof r !== "object") continue;
    const org = r.litellm_provider ? PROVIDER_ORG[r.litellm_provider] : undefined;
    if (!org) continue;
    const facts: LitellmFacts = {
      model: key,
      provider: r.litellm_provider!,
      mode: r.mode ?? null,
      deprecationDate: typeof r.deprecation_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.deprecation_date) ? r.deprecation_date : null,
      maxInputTokens: n(r.max_input_tokens),
      maxOutputTokens: n(r.max_output_tokens),
      inputUsdPerM: perM(r.input_cost_per_token),
      outputUsdPerM: perM(r.output_cost_per_token),
      functionCalling: typeof r.supports_function_calling === "boolean" ? r.supports_function_calling : null,
      vision: typeof r.supports_vision === "boolean" ? r.supports_vision : null,
    };
    // Prefer the bare first-party key ("gpt-4.1") over a prefixed one ("openai/gpt-4.1").
    for (const id of index.lookup(org, key)) if (!byIndexId[id] || (byIndexId[id].model.includes("/") && !key.includes("/"))) byIndexId[id] = facts;
  }
  return {
    meta: {
      id: "litellm",
      source: "LiteLLM model prices and context windows",
      url: "https://github.com/BerriAI/litellm",
      license: "MIT",
      attribution: "Data from LiteLLM (https://github.com/BerriAI/litellm), MIT License, Copyright (c) 2023 Berri AI",
      redistribute: true,
      retrievedAt,
      sha256: fileHash,
      status: "collected",
      matching: "Only rows whose litellm_provider is the developer's own API (PROVIDER_ORG in the script). Index entries by the same organization and normalized model id.",
      note: "Maintained by the LiteLLM project for its router; not a vendor publication. A deprecation date is the date LiteLLM recorded from the vendor's notice; confirm on the vendor's deprecation page.",
    },
    bySlug: {},
    byOrg: {},
    byIndexId,
  };
}

export async function run() {
  const raw = (await get(URL_FILE, { timeoutMs: 120000 })).body;
  writeSnapshot(build(JSON.parse(text(raw)), buildIndexMap(loadIndex()), today(), sha256(raw)));
}

if (isMain(import.meta.url)) await run();
