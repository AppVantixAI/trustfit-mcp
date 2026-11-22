/**
 * Fetches the open datasets and writes small, provenance-stamped snapshots to
 * data/snapshots. This is the only script that uses the network, and it never
 * executes or evals anything it downloads (CSV, JSON and Parquet are parsed as
 * data). Run: npx tsx scripts/ingest.ts
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parquetReadObjects } from "hyparquet";
import { ENTITIES } from "../src/entities";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/snapshots");
mkdirSync(OUT, { recursive: true });

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
async function get(url: string): Promise<Uint8Array> {
  const r = await fetch(url, { headers: { "user-agent": "trustfit-ingest/0.1" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return new Uint8Array(await r.arrayBuffer());
}
const today = new Date().toISOString().slice(0, 10);
const write = (name: string, data: unknown) =>
  writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + "\n");

async function fmti() {
  const url = "https://raw.githubusercontent.com/stanford-crfm/fmti/main/Dec2025/Dec2025_scores.csv";
  const raw = await get(url);
  const lines = new TextDecoder().decode(raw).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const devs = header.slice(1);
  const totals = new Array(devs.length).fill(0);
  let indicators = 0;
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    // Indicator names may contain commas; the last N cells are the scores.
    const vals = cells.slice(cells.length - devs.length).map(Number);
    if (vals.some((v) => v !== 0 && v !== 1)) continue;
    indicators++;
    vals.forEach((v, i) => (totals[i] += v));
  }
  write("fmti.json", {
    meta: {
      source: "Stanford CRFM Foundation Model Transparency Index, December 2025 edition",
      url: "https://github.com/stanford-crfm/fmti",
      file: url,
      license: "CC BY 4.0",
      retrievedAt: today,
      sha256: sha(raw),
      note: "Developer-reported transparency (share of indicators satisfied). Not a security certification.",
    },
    indicators,
    developers: Object.fromEntries(devs.map((d, i) => [d, { satisfied: totals[i], score: Math.round((totals[i] / indicators) * 1000) / 10 }])),
  });
  console.log("fmti", indicators, "indicators,", devs.length, "developers");
}

async function arena() {
  const url = "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/resolve/main/text_style_control/latest-00000-of-00001.parquet";
  const raw = await get(url);
  const rows = (await parquetReadObjects({ file: raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer })) as Record<string, any>[];
  const overall = rows.filter((r) => r.category === "overall" && r.organization);
  const best: Record<string, any> = {};
  for (const r of overall) if (!best[r.organization] || r.rating > best[r.organization].rating) best[r.organization] = r;
  write("arena.json", {
    meta: {
      source: "LMArena text leaderboard (style control), overall category",
      url: "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset",
      file: url,
      license: "CC BY 4.0",
      retrievedAt: today,
      publishedAt: String(overall[0]?.leaderboard_publish_date ?? ""),
      sha256: sha(raw),
      note: "Human preference ratings for text chat models. Measures model quality, not vendor trust.",
    },
    organizations: Object.fromEntries(
      Object.entries(best).map(([org, r]) => [
        org,
        {
          model: r.model_name,
          rating: Math.round(r.rating * 10) / 10,
          ratingLower: Math.round(r.rating_lower * 10) / 10,
          ratingUpper: Math.round(r.rating_upper * 10) / 10,
          votes: Number(r.vote_count),
          rank: Number(r.rank),
        },
      ]),
    ),
  });
  console.log("arena", Object.keys(best).length, "organizations");
}

async function kev() {
  const url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
  const raw = await get(url);
  const cat = JSON.parse(new TextDecoder().decode(raw)) as { catalogVersion: string; vulnerabilities: any[] };
  const out: Record<string, { cves: string[]; latestAdded: string }> = {};
  for (const [slug, e] of Object.entries(ENTITIES)) {
    if (!e.kev) continue;
    const hits = cat.vulnerabilities.filter((v) => e.kev!.some((k) => k.vendorProject === v.vendorProject && k.product === v.product));
    out[slug] = { cves: hits.map((h) => h.cveID), latestAdded: hits.map((h) => h.dateAdded).sort().pop() ?? "" };
  }
  write("kev.json", {
    meta: {
      source: "CISA Known Exploited Vulnerabilities catalog",
      url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
      file: url,
      license: "US Government work, public",
      retrievedAt: today,
      catalogVersion: cat.catalogVersion,
      sha256: sha(raw),
      note: "Matched on exact vendorProject and product only. Vendor-wide counts (for example Microsoft Windows) say nothing about an AI add-on and are not used.",
    },
    bySlug: out,
  });
  console.log("kev", Object.keys(out).length, "mapped tools");
}

await fmti();
await arena();
await kev();
