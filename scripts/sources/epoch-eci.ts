/**
 * Epoch Capabilities Index (ECI) from Epoch AI's benchmarking hub, CC BY 4.0.
 * One composite capability score per model, built by Epoch from many benchmarks,
 * with a 90% interval. Only Epoch's own index file is kept; the per-benchmark
 * rows from other publishers are not stored.
 * byOrg: the developer's best-scoring model. byIndexId: each matched model's score.
 * Run: npx tsx scripts/sources/epoch-eci.ts
 */
import { orgsForEpoch } from "../../src/orgs";
import { buildIndexMap, loadIndex, type IndexMap } from "../lib/index-map";
import { get, isMain, parseCsv, sha256, text, today, unzipEntry, writeSnapshot, type Snapshot } from "../lib/open-data";

export const URL_ZIP = "https://epoch.ai/data/benchmark_data.zip";
export const MEMBER = "epoch_capabilities_index/eci_scores.csv";

export type EciScore = { model: string; eci: number; low: number; high: number; date: string };
export type EciOrg = { best: EciScore; modelsScored: number; rankAmongOrgs: number; orgsScored: number };

export function build(csv: string, index: IndexMap, retrievedAt: string, fileHash: string): Snapshot<never, EciOrg, EciScore> {
  const rows = parseCsv(csv).filter((r) => Number.isFinite(Number(r.eci)) && r.eci !== "");
  const byIndexId: Record<string, EciScore> = {};
  const best: Record<string, { best: EciScore; n: number }> = {};
  // Rank organizations across every organization Epoch scored, not only ours.
  const allBest = new Map<string, number>();
  for (const r of rows) {
    const s: EciScore = { model: r["Display name"] || r.Model, eci: Number(r.eci), low: Number(r.eci_ci_low), high: Number(r.eci_ci_high), date: r.date };
    for (const raw of (r.Organization ?? "").split(",").map((x) => x.trim()).filter(Boolean)) allBest.set(raw, Math.max(allBest.get(raw) ?? -Infinity, s.eci));
    for (const org of orgsForEpoch(r.Organization ?? "")) {
      const b = (best[org] ??= { best: s, n: 0 });
      b.n++;
      if (s.eci > b.best.eci) b.best = s;
      for (const id of index.lookup(org, r.Model)) if (!byIndexId[id] || byIndexId[id].eci < s.eci) byIndexId[id] = s;
    }
  }
  const ranking = [...allBest.values()].sort((a, b) => b - a);
  const byOrg = Object.fromEntries(
    Object.entries(best).map(([org, b]) => [org, { best: b.best, modelsScored: b.n, rankAmongOrgs: ranking.indexOf(b.best.eci) + 1, orgsScored: ranking.length }]),
  );
  return {
    meta: {
      id: "epoch-eci",
      source: "Epoch AI Capabilities Index (Epoch AI benchmarking hub)",
      url: "https://epoch.ai/benchmarks",
      license: "CC BY 4.0",
      attribution: "Epoch AI, 'Capabilities & benchmarking'. Published online at epoch.ai. Retrieved from https://epoch.ai/benchmarks",
      redistribute: true,
      retrievedAt,
      sha256: fileHash,
      status: "collected",
      modelsScored: rows.length,
      matching: "Organizations by exact Epoch organization name; index entries by the same organization and normalized model name. An organization's rank counts every organization in the file, ties share a rank.",
      note: "The ECI combines many benchmarks into one capability number on Epoch's scale (Claude 3.5 Sonnet = 130, GPT-5 = 150). It measures what a model can do on tests, not how a vendor handles data or customers.",
    },
    bySlug: {},
    byOrg,
    byIndexId,
  };
}

export async function run() {
  const zip = (await get(URL_ZIP, { timeoutMs: 180000 })).body;
  const csv = unzipEntry(zip, MEMBER);
  if (!csv) throw new Error(`${MEMBER} not found in ${URL_ZIP}`);
  writeSnapshot(build(text(csv), buildIndexMap(loadIndex()), today(), sha256(zip)));
}

if (isMain(import.meta.url)) await run();
