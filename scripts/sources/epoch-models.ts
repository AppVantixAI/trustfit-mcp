/**
 * Epoch AI "Data on AI models" (all_ai_models.csv), CC BY 4.0.
 * byOrg: how many models each developer has released, how many are open-weight
 *        or frontier, its latest and its largest-compute model.
 * byIndexId: per-model facts (publication date, parameters, training compute,
 *        accessibility) for index entries by the same developer and model name.
 * Run: npx tsx scripts/sources/epoch-models.ts
 */
import { orgsForEpoch } from "../../src/orgs";
import { buildIndexMap, loadIndex, type IndexMap } from "../lib/index-map";
import { get, isMain, parseCsv, sha256, text, today, writeSnapshot, type Snapshot } from "../lib/open-data";

export const URL_CSV = "https://epoch.ai/data/all_ai_models.csv";

export type EpochOrgFacts = {
  models: number;
  openWeights: number;
  frontier: number;
  releasedLast12Months: number;
  latest: { model: string; date: string; link: string } | null;
  largestCompute: { model: string; flop: number; date: string } | null;
  countries: string[];
};
export type EpochModelFacts = {
  model: string;
  organization: string;
  published: string;
  parameters: number | null;
  trainingComputeFlop: number | null;
  accessibility: string;
  frontier: boolean;
  confidence: string;
  link: string;
};

const num = (s: string) => {
  const n = Number(s);
  return s.trim() && Number.isFinite(n) && n > 0 ? n : null;
};
const isOpen = (acc: string) => acc.startsWith("Open weights");
/** Epoch's Link column can hold several URLs separated by whitespace; keep the first. */
export const firstUrl = (s: string) => (s.match(/https?:\/\/\S+/) ?? [""])[0];

export function build(csv: string, index: IndexMap, retrievedAt: string, fileHash: string): Snapshot<never, EpochOrgFacts, EpochModelFacts> {
  const rows = parseCsv(csv);
  const cutoff = new Date(retrievedAt);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const yearAgo = cutoff.toISOString().slice(0, 10);
  const byOrg: Record<string, EpochOrgFacts> = {};
  const byIndexId: Record<string, EpochModelFacts> = {};
  for (const r of rows) {
    const orgs = orgsForEpoch(r["Organization"] ?? "");
    if (!orgs.length) continue;
    const date = (r["Publication date"] ?? "").slice(0, 10);
    const acc = r["Model accessibility"] ?? "";
    const flop = num(r["Training compute (FLOP)"] ?? "");
    const frontier = r["Frontier model"] === "True";
    for (const org of orgs) {
      const f = (byOrg[org] ??= { models: 0, openWeights: 0, frontier: 0, releasedLast12Months: 0, latest: null, largestCompute: null, countries: [] });
      f.models++;
      if (isOpen(acc)) f.openWeights++;
      if (frontier) f.frontier++;
      if (date >= yearAgo && date <= retrievedAt) f.releasedLast12Months++;
      if (date && date <= retrievedAt && (!f.latest || date > f.latest.date)) f.latest = { model: r["Model"], date, link: firstUrl(r["Link"] ?? "") };
      if (flop && (!f.largestCompute || flop > f.largestCompute.flop)) f.largestCompute = { model: r["Model"], flop, date };
      for (const c of (r["Country (of organization)"] ?? "").split(",").map((x) => x.trim()).filter(Boolean)) if (!f.countries.includes(c)) f.countries.push(c);
    }
    const facts: EpochModelFacts = {
      model: r["Model"],
      organization: r["Organization"],
      published: date,
      parameters: num(r["Parameters"] ?? ""),
      trainingComputeFlop: flop,
      accessibility: acc || "not stated",
      frontier,
      confidence: r["Confidence"] || "not stated",
      link: firstUrl(r["Link"] ?? ""),
    };
    for (const org of orgs) for (const id of index.lookup(org, r["Model"])) byIndexId[id] ??= facts;
  }
  for (const f of Object.values(byOrg)) f.countries.sort();
  return {
    meta: {
      id: "epoch-models",
      source: "Epoch AI, Data on AI models",
      url: "https://epoch.ai/data/ai-models",
      license: "CC BY 4.0",
      attribution: "Epoch AI, 'Data on AI models'. Published online at epoch.ai. Retrieved from https://epoch.ai/data/ai-models",
      redistribute: true,
      retrievedAt,
      sha256: fileHash,
      status: "collected",
      rows: rows.length,
      matching:
        "Organizations by exact Epoch organization name (src/orgs.ts epoch field); a model with several organizations counts for each. Index entries by the same organization and the same normalized model name.",
      note: "Epoch curates notable and frontier models from public sources; it is not a complete list of every model a company has shipped. Training compute is often Epoch's estimate (see confidence), not a vendor disclosure.",
    },
    bySlug: {},
    byOrg,
    byIndexId,
  };
}

export async function run() {
  const raw = (await get(URL_CSV, { timeoutMs: 120000 })).body;
  writeSnapshot(build(text(raw), buildIndexMap(loadIndex()), today(), sha256(raw)));
}

if (isMain(import.meta.url)) await run();
