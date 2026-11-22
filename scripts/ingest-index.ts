/**
 * Builds the broad INDEX: a large, facts-only list of AI models and tools.
 * Entries here are NOT reviewed and carry NO TrustFit score. Only the 40-tool catalog is scored.
 *
 * Sources (one entry per item, merged on exact identifiers only):
 *   OpenRouter   public model list: id, name, context, modalities, price, dates
 *   LMArena      human-preference rating per model (CC BY 4.0), matched by exact normalized name
 *   Hugging Face top open-weight repos by downloads: id, task, license tag, gated flag
 *   Wikidata     AI chatbots, models and tools with an official website (CC0)
 *
 * Run: npx tsx scripts/ingest-index.ts
 *
 * Polite by design: sequential requests, identified user agent. Not stored: model descriptions,
 * third-party benchmark numbers embedded by OpenRouter, Hugging Face download or like counts.
 */
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parquetReadObjects } from "hyparquet";
import { tools } from "@/content/tools";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/snapshots");
const UA = "trustfit-ingest/0.1 (+https://trustfit-iota.vercel.app)";
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getBytes(url: string, tries = 3): Promise<Uint8Array> {
  let err: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(120000) });
      if (r.ok) return new Uint8Array(await r.arrayBuffer());
      err = new Error(`${r.status} ${url}`);
    } catch (e) {
      err = e;
    }
    await sleep(2000);
  }
  throw err;
}
const getJson = async <T>(url: string): Promise<T> => JSON.parse(new TextDecoder().decode(await getBytes(url))) as T;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type Source = { source: string; url: string; license: string; asOf: string };
export type IndexEntry = {
  id: string;
  kind: "model" | "tool";
  name: string;
  vendor: string | null;
  website: string | null;
  /** Catalog slug when this item is the same product as a reviewed tool (exact Wikidata QID match only). */
  reviewedSlug: string | null;
  openWeights: boolean | null;
  license: string | null;
  task: string | null;
  contextTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  /** USD per million tokens, as listed by OpenRouter on asOf. Prices change. */
  priceInputPerM: number | null;
  priceOutputPerM: number | null;
  released: string | null;
  arena: { rating: number; ratingLower: number; ratingUpper: number; votes: number; rank: number; modelName: string } | null;
  links: Record<string, string>;
  sources: Source[];
};

const blank = (id: string, kind: IndexEntry["kind"], name: string): IndexEntry => ({
  id, kind, name, vendor: null, website: null, reviewedSlug: null, openWeights: null, license: null, task: null,
  contextTokens: null, inputModalities: [], outputModalities: [], priceInputPerM: null, priceOutputPerM: null,
  released: null, arena: null, links: {}, sources: [],
});

const entries = new Map<string, IndexEntry>();
const hfToId = new Map<string, string>(); // lowercase HF repo id -> entry id

const SRC = {
  openrouter: { source: "OpenRouter public model list", url: "https://openrouter.ai/api/v1/models", license: "Public API; facts only (no descriptions or embedded benchmarks stored)" },
  arena: { source: "LMArena text leaderboard", url: "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset", license: "CC BY 4.0" },
  hf: { source: "Hugging Face Hub model metadata", url: "https://huggingface.co/models", license: "Per-repo license tag; counts not stored; reuse terms of the Hub API not verified" },
  wikidata: { source: "Wikidata", url: "https://www.wikidata.org/", license: "CC0" },
};

// ------------------------------------------------------------ OpenRouter
async function openrouter() {
  type M = {
    id: string; name: string; created?: number; context_length?: number; hugging_face_id?: string; expiration_date?: string | null;
    architecture?: { input_modalities?: string[]; output_modalities?: string[] };
    pricing?: { prompt?: string; completion?: string };
  };
  const data = (await getJson<{ data: M[] }>("https://openrouter.ai/api/v1/models")).data;
  let n = 0;
  for (const m of data) {
    if (m.id.endsWith(":free") || m.id.includes(":")) continue; // variants of the same model
    const id = `or:${m.id}`;
    const e = blank(id, "model", m.name.replace(/^[^:]+:\s*/, ""));
    e.vendor = m.id.split("/")[0];
    e.contextTokens = m.context_length ?? null;
    e.inputModalities = m.architecture?.input_modalities ?? [];
    e.outputModalities = m.architecture?.output_modalities ?? [];
    const p = Number(m.pricing?.prompt), c = Number(m.pricing?.completion);
    e.priceInputPerM = Number.isFinite(p) && p >= 0 ? Math.round(p * 1e8) / 100 : null;
    e.priceOutputPerM = Number.isFinite(c) && c >= 0 ? Math.round(c * 1e8) / 100 : null;
    e.released = m.created ? new Date(m.created * 1000).toISOString().slice(0, 10) : null;
    e.links.openrouter = `https://openrouter.ai/${m.id}`;
    if (m.hugging_face_id) {
      e.openWeights = true;
      e.links.huggingface = `https://huggingface.co/${m.hugging_face_id}`;
      hfToId.set(m.hugging_face_id.toLowerCase(), id);
    }
    e.sources.push({ ...SRC.openrouter, asOf: today });
    entries.set(id, e);
    n++;
  }
  console.log("openrouter", n, "models");
}

// ------------------------------------------------------------ Hugging Face
const HF_TASKS = new Set([
  "text-generation", "text2text-generation", "image-text-to-text", "any-to-any", "text-to-image", "text-to-video", "image-to-video",
  "automatic-speech-recognition", "text-to-speech", "text-to-audio", "image-to-image", "visual-question-answering",
  "translation", "summarization", "image-to-text", "video-text-to-text", "audio-text-to-text",
]);
async function huggingface(limit: number) {
  type H = { id: string; author?: string; pipeline_tag?: string; gated?: boolean | string; tags?: string[]; lastModified?: string };
  const rows = await getJson<H[]>("https://huggingface.co/api/models?sort=downloads&direction=-1&limit=1000&full=false");
  let n = 0, merged = 0;
  for (const h of rows) {
    if (!h.pipeline_tag || !HF_TASKS.has(h.pipeline_tag)) continue;
    const license = (h.tags ?? []).find((t) => t.startsWith("license:"))?.slice(8) ?? null;
    const existing = hfToId.get(h.id.toLowerCase());
    if (existing) {
      const e = entries.get(existing)!;
      e.license = license;
      e.task = h.pipeline_tag;
      e.sources.push({ ...SRC.hf, asOf: today });
      merged++;
      continue;
    }
    if (n >= limit) continue;
    const id = `hf:${h.id}`;
    const e = blank(id, "model", h.id.split("/").pop() ?? h.id);
    e.vendor = h.author ?? h.id.split("/")[0];
    e.openWeights = true;
    e.license = license;
    e.task = h.pipeline_tag;
    e.released = null;
    e.links.huggingface = `https://huggingface.co/${h.id}`;
    e.sources.push({ ...SRC.hf, asOf: today });
    entries.set(id, e);
    hfToId.set(h.id.toLowerCase(), id);
    n++;
  }
  console.log("huggingface", n, "new,", merged, "merged into OpenRouter entries");
}

// ------------------------------------------------------------ LMArena
async function arena() {
  const url = "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/resolve/main/text_style_control/latest-00000-of-00001.parquet";
  const raw = await getBytes(url);
  const rows = (await parquetReadObjects({ file: raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer })) as Record<string, any>[];
  const overall = rows.filter((r) => r.category === "overall");
  // Unique normalized name -> entry, so a match is never ambiguous.
  const byKey = new Map<string, string[]>();
  for (const id of entries.keys()) {
    if (!id.startsWith("or:")) continue;
    const k = norm(id.slice(3).split("/").slice(1).join("/"));
    byKey.set(k, [...(byKey.get(k) ?? []), id]);
  }
  let matched = 0, added = 0;
  for (const r of overall) {
    const a = {
      rating: Math.round(r.rating * 10) / 10,
      ratingLower: Math.round(r.rating_lower * 10) / 10,
      ratingUpper: Math.round(r.rating_upper * 10) / 10,
      votes: Number(r.vote_count),
      rank: Number(r.rank),
      modelName: String(r.model_name),
    };
    const hit = byKey.get(norm(String(r.model_name)));
    if (hit && hit.length === 1) {
      const e = entries.get(hit[0])!;
      e.arena = a;
      e.sources.push({ ...SRC.arena, asOf: String(r.leaderboard_publish_date ?? today) });
      matched++;
    } else {
      const id = `arena:${r.model_name}`;
      const e = blank(id, "model", String(r.model_name));
      e.vendor = r.organization ? String(r.organization) : null;
      e.license = r.license ? String(r.license) : null;
      e.arena = a;
      e.links.arena = "https://lmarena.ai/leaderboard";
      e.sources.push({ ...SRC.arena, asOf: String(r.leaderboard_publish_date ?? today) });
      entries.set(id, e);
      added++;
    }
  }
  console.log("arena", overall.length, "rows:", matched, "matched to OpenRouter by exact name,", added, "arena-only entries");
}

// ------------------------------------------------------------ Wikidata
async function wikidata() {
  const MODEL = ["Q115305900", "Q117349473", "Q116777014"];
  const TOOL = ["Q133284163", "Q870780", "Q119018971", "Q116961403", "Q140456475", "Q117246174"];
  const classes = [...MODEL, ...TOOL].map((q) => "wd:" + q).join(" ");
  const sparql = `SELECT ?i ?iLabel ?w ?c ?devLabel ?inc WHERE { VALUES ?c { ${classes} } ?i wdt:P31 ?c . ?i wdt:P856 ?w . OPTIONAL{?i wdt:P178 ?dev} OPTIONAL{?i wdt:P571 ?inc} SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`;
  const res = await getJson<{ results: { bindings: Record<string, { value: string }>[] } }>(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`);
  const byQid = new Map<string, { label: string; sites: Set<string>; classes: Set<string>; devs: Set<string>; inc?: string }>();
  for (const b of res.results.bindings) {
    const qid = b.i.value.split("/").pop()!;
    const label = b.iLabel?.value ?? "";
    if (!label || /^Q\d+$/.test(label)) continue; // unlabeled items are not usable
    const x = byQid.get(qid) ?? { label, sites: new Set<string>(), classes: new Set<string>(), devs: new Set<string>() };
    x.sites.add(b.w.value);
    x.classes.add(b.c.value.split("/").pop()!);
    if (b.devLabel?.value && !/^Q\d+$/.test(b.devLabel.value)) x.devs.add(b.devLabel.value);
    if (b.inc?.value && !x.inc) x.inc = b.inc.value.slice(0, 10);
    byQid.set(qid, x);
  }
  const wd = (await import("../data/snapshots/wikidata.json", { with: { type: "json" } })).default as { bySlug: Record<string, { qid: string }> };
  const qidToSlug = new Map(Object.entries(wd.bySlug).map(([slug, v]) => [v.qid, slug]));
  const catalog = new Set(tools.map((t) => t.slug));
  let n = 0;
  for (const [qid, x] of byQid) {
    const isTool = [...x.classes].some((c) => TOOL.includes(c));
    const id = `wd:${qid}`;
    const e = blank(id, isTool ? "tool" : "model", x.label);
    e.vendor = [...x.devs][0] ?? null;
    e.website = [...x.sites][0];
    const slug = qidToSlug.get(qid);
    e.reviewedSlug = slug && catalog.has(slug) ? slug : null;
    e.released = x.inc ?? null;
    e.links.wikidata = `https://www.wikidata.org/wiki/${qid}`;
    e.sources.push({ ...SRC.wikidata, asOf: today });
    entries.set(id, e);
    n++;
  }
  console.log("wikidata", n, "labeled items with an official website");
}

await openrouter();
await huggingface(Number(process.env.HF_LIMIT ?? 450));
await arena();
await wikidata();

const list = [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
const body = JSON.stringify(list);
const meta = {
  source: "TrustFit broad index (facts only, not reviewed, not scored)",
  url: "https://trustfit-iota.vercel.app",
  license: "Mixed per source; see each entry's sources. Contains CC BY 4.0 (LMArena) and CC0 (Wikidata) data and public metadata from OpenRouter and Hugging Face.",
  retrievedAt: today,
  sha256: createHash("sha256").update(body).digest("hex"),
  count: list.length,
  note: "Entries have no TrustFit score. Only the reviewed catalog is scored. Prices and context sizes change; check asOf. Hugging Face download and like counts and OpenRouter descriptions and benchmarks are deliberately not stored.",
};
writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ meta, entries: list }) + "\n");
console.log("index", list.length, "entries", (body.length / 1024).toFixed(0), "KB");
