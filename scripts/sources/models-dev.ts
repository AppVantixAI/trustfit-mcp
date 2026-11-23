/**
 * models.dev (github.com/sst/models.dev), MIT. Model metadata per provider:
 * price, context and output limits, knowledge cutoff, release date, open weights,
 * tool calling. Only the developer's OWN listing is used for an index entry's
 * facts (OpenAI's listing for an OpenAI model); other providers are only counted.
 * Run: npx tsx scripts/sources/models-dev.ts
 */
import { modelKey, orgForAlias } from "../../src/orgs";
import { buildIndexMap, loadIndex, type IndexMap } from "../lib/index-map";
import { get, isMain, sha256, text, today, writeSnapshot, type Snapshot } from "../lib/open-data";

export const URL_API = "https://models.dev/api.json";

type RawModel = {
  id: string;
  name?: string;
  release_date?: string;
  last_updated?: string;
  knowledge?: string;
  open_weights?: boolean;
  tool_call?: boolean;
  reasoning?: boolean;
  structured_output?: boolean;
  status?: string;
  modalities?: { input?: string[]; output?: string[] };
  limit?: { context?: number; output?: number };
  cost?: { input?: number; output?: number; cache_read?: number };
};
type RawProvider = { id: string; name?: string; doc?: string; models: Record<string, RawModel> };

export type ModelsDevFacts = {
  provider: string;
  modelId: string;
  released: string | null;
  knowledgeCutoff: string | null;
  openWeights: boolean | null;
  toolCalling: boolean | null;
  reasoning: boolean | null;
  contextTokens: number | null;
  outputTokens: number | null;
  inputUsdPerM: number | null;
  outputUsdPerM: number | null;
  status: string | null;
  inputModalities: string[];
  outputModalities: string[];
  /** Other providers on models.dev listing a model with the same key. */
  otherProviders: number;
  docs: string | null;
};
export type ModelsDevOrg = { provider: string; modelsListed: number; openWeightModels: number; docs: string | null };

const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);

export function build(api: Record<string, RawProvider>, index: IndexMap, retrievedAt: string, fileHash: string): Snapshot<never, ModelsDevOrg, ModelsDevFacts> {
  const hosts = new Map<string, Set<string>>();
  for (const p of Object.values(api)) for (const m of Object.values(p.models ?? {})) {
    const k = modelKey(m.id);
    if (!hosts.has(k)) hosts.set(k, new Set());
    hosts.get(k)!.add(p.id);
  }
  const byIndexId: Record<string, ModelsDevFacts> = {};
  const byOrg: Record<string, ModelsDevOrg> = {};
  for (const p of Object.values(api)) {
    const org = orgForAlias(p.id);
    if (!org) continue;
    const models = Object.values(p.models ?? {});
    byOrg[org] ??= { provider: p.id, modelsListed: models.length, openWeightModels: models.filter((m) => m.open_weights).length, docs: p.doc ?? null };
    for (const m of models) {
      const facts: ModelsDevFacts = {
        provider: p.id,
        modelId: m.id,
        released: m.release_date ?? null,
        knowledgeCutoff: m.knowledge ?? null,
        openWeights: typeof m.open_weights === "boolean" ? m.open_weights : null,
        toolCalling: typeof m.tool_call === "boolean" ? m.tool_call : null,
        reasoning: typeof m.reasoning === "boolean" ? m.reasoning : null,
        contextTokens: n(m.limit?.context),
        outputTokens: n(m.limit?.output),
        inputUsdPerM: n(m.cost?.input),
        outputUsdPerM: n(m.cost?.output),
        status: m.status ?? null,
        inputModalities: m.modalities?.input ?? [],
        outputModalities: m.modalities?.output ?? [],
        otherProviders: Math.max(0, (hosts.get(modelKey(m.id))?.size ?? 1) - 1),
        docs: p.doc ?? null,
      };
      for (const id of new Set([...index.lookup(org, m.id), ...(m.name ? index.lookup(org, m.name) : [])])) byIndexId[id] ??= facts;
    }
  }
  return {
    meta: {
      id: "models-dev",
      source: "models.dev open model database",
      url: "https://models.dev/",
      license: "MIT",
      attribution: "Data from models.dev (https://github.com/sst/models.dev), MIT License, Copyright (c) 2025 models.dev",
      redistribute: true,
      retrievedAt,
      sha256: fileHash,
      status: "collected",
      providers: Object.keys(api).length,
      matching:
        "A models.dev provider is matched to an organization only when its provider id is an exact alias in src/orgs.ts (so 'openai', never a reseller). Index entries by the same organization and normalized model id or name.",
      note: "Community-maintained listing of provider documentation. Prices are list prices in US dollars per million tokens and change often; check the provider's own page before relying on one.",
    },
    bySlug: {},
    byOrg,
    byIndexId,
  };
}

export async function run() {
  const raw = (await get(URL_API, { timeoutMs: 120000 })).body;
  writeSnapshot(build(JSON.parse(text(raw)), buildIndexMap(loadIndex()), today(), sha256(raw)));
}

if (isMain(import.meta.url)) await run();
