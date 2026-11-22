import indexData from "../data/snapshots/index.json";
import { tools } from "@/content/tools";

export type IndexSource = { source: string; url: string; license: string; asOf: string };
export type Entry = {
  id: string;
  kind: "model" | "tool";
  name: string;
  vendor: string | null;
  website: string | null;
  reviewedSlug: string | null;
  openWeights: boolean | null;
  license: string | null;
  task: string | null;
  contextTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  priceInputPerM: number | null;
  priceOutputPerM: number | null;
  released: string | null;
  arena: { rating: number; ratingLower: number; ratingUpper: number; votes: number; rank: number; modelName: string } | null;
  links: Record<string, string>;
  sources: IndexSource[];
};

export const INDEX_NOTICE =
  "Index entries are facts collected from public sources. They are not reviewed and have no TrustFit score. Only tools in the reviewed catalog (search_tools, get_tool_profile) are scored. Prices, context sizes and ratings change; check asOf on each source.";

const entries = indexData.entries as unknown as Entry[];
const catalogSlugs = new Set(tools.map((t) => t.slug));

export type IndexQuery = {
  query?: string;
  kind?: "model" | "tool";
  vendor?: string;
  openWeights?: boolean;
  license?: string;
  task?: string;
  inputModality?: string;
  minContextTokens?: number;
  maxInputPricePerM?: number;
  minArenaRating?: number;
  sort?: "arena" | "price" | "context" | "released" | "name";
  limit?: number;
  offset?: number;
};

const has = (hay: string | null | undefined, needle: string) => (hay ?? "").toLowerCase().includes(needle.toLowerCase());

function row(e: Entry) {
  return {
    id: e.id,
    kind: e.kind,
    name: e.name,
    vendor: e.vendor,
    openWeights: e.openWeights,
    license: e.license,
    task: e.task,
    contextTokens: e.contextTokens,
    priceInputPerM: e.priceInputPerM,
    priceOutputPerM: e.priceOutputPerM,
    arenaRating: e.arena?.rating ?? null,
    released: e.released,
    reviewedSlug: e.reviewedSlug && catalogSlugs.has(e.reviewedSlug) ? e.reviewedSlug : null,
  };
}

export const indexEntries = entries;

/** Every entry that passes the filters, sorted. searchIndex pages this. */
export function filterEntries(q: IndexQuery): Entry[] {
  const terms = (q.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const hits = entries.filter((e) => {
    if (q.kind && e.kind !== q.kind) return false;
    if (q.vendor && !has(e.vendor, q.vendor)) return false;
    if (q.openWeights !== undefined && (e.openWeights ?? false) !== q.openWeights) return false;
    if (q.license && !has(e.license, q.license)) return false;
    if (q.task && e.task !== q.task) return false;
    if (q.inputModality && !e.inputModalities.includes(q.inputModality)) return false;
    if (q.minContextTokens !== undefined && (e.contextTokens ?? 0) < q.minContextTokens) return false;
    if (q.maxInputPricePerM !== undefined && (e.priceInputPerM === null || e.priceInputPerM > q.maxInputPricePerM)) return false;
    if (q.minArenaRating !== undefined && (e.arena?.rating ?? -1) < q.minArenaRating) return false;
    if (terms.length) {
      const hay = `${e.name} ${e.id} ${e.vendor ?? ""}`.toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
  const sort = q.sort ?? (terms.length ? "name" : "arena");
  const num = (n: number | null | undefined, missing: number) => (n === null || n === undefined ? missing : n);
  return [...hits].sort((a, b) => {
    switch (sort) {
      case "arena": return num(b.arena?.rating, -1) - num(a.arena?.rating, -1) || a.name.localeCompare(b.name);
      case "price": return num(a.priceInputPerM, Infinity) - num(b.priceInputPerM, Infinity) || a.name.localeCompare(b.name);
      case "context": return num(b.contextTokens, -1) - num(a.contextTokens, -1) || a.name.localeCompare(b.name);
      case "released": return (b.released ?? "").localeCompare(a.released ?? "") || a.name.localeCompare(b.name);
      default: return a.name.localeCompare(b.name);
    }
  });
}

export function searchIndex(q: IndexQuery) {
  const hits = filterEntries(q);
  const limit = Math.min(q.limit ?? 20, 50);
  const offset = q.offset ?? 0;
  return {
    total: hits.length,
    offset,
    results: hits.slice(offset, offset + limit).map(row),
    notice: INDEX_NOTICE,
  };
}

export function getIndexEntry(id: string) {
  const e = entries.find((x) => x.id === id);
  if (!e) return { error: `No index entry "${id}". Use search_index first.` };
  return {
    ...e,
    reviewedSlug: e.reviewedSlug && catalogSlugs.has(e.reviewedSlug) ? e.reviewedSlug : null,
    scored: false,
    next: e.reviewedSlug ? `This product is in the reviewed catalog: call get_tool_profile with slug "${e.reviewedSlug}".` : "Not in the reviewed catalog, so there is no TrustFit score. Check the vendor's own terms before relying on this entry.",
    notice: INDEX_NOTICE,
  };
}

export function indexSummary() {
  const count = (f: (e: Entry) => string | null | undefined) => {
    const m = new Map<string, number>();
    for (const e of entries) { const k = f(e); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12));
  };
  return {
    total: entries.length,
    retrievedAt: indexData.meta.retrievedAt,
    byKind: count((e) => e.kind),
    openWeights: entries.filter((e) => e.openWeights).length,
    withArenaRating: entries.filter((e) => e.arena).length,
    withPrice: entries.filter((e) => e.priceInputPerM !== null).length,
    topLicenses: count((e) => e.license),
    topVendors: count((e) => e.vendor),
    notice: INDEX_NOTICE,
  };
}

export const indexMeta = indexData.meta;

/** Values for filter menus: most common licenses and tasks with counts. */
export function indexFacets() {
  const tally = (f: (e: Entry) => string | null | undefined, n: number) => {
    const m = new Map<string, number>();
    for (const e of entries) { const k = f(e); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));
  };
  return { licenses: tally((e) => e.license, 14), tasks: tally((e) => e.task, 14), total: entries.length };
}
