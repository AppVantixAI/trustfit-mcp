import { describe, expect, it } from "vitest";
import rawIndex from "../data/snapshots/index.json";
import type { Entry } from "./index-search";
const indexData = rawIndex as unknown as { meta: typeof rawIndex.meta; entries: Entry[] };
import { getIndexEntry, indexSummary, INDEX_NOTICE, searchIndex } from "./index-search";
import { methodology } from "./core";
import { tools } from "@/content/tools";

describe.skipIf(indexData.entries.length === 0)("broad index", () => {
  it("is large and every entry is traceable", () => {
    expect(indexData.entries.length).toBeGreaterThan(1000);
    const ids = new Set<string>();
    for (const e of indexData.entries) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(e.sources.length).toBeGreaterThan(0);
      for (const s of e.sources) {
        expect(s.url).toMatch(/^https:\/\//);
        expect(s.license.length).toBeGreaterThan(0);
        expect(s.asOf).toMatch(/^\d{4}-\d{2}-\d{2}/);
      }
    }
  });

  it("never carries a TrustFit score and always says so", () => {
    const r = searchIndex({ query: "llama", limit: 5 });
    expect(r.notice).toBe(INDEX_NOTICE);
    for (const x of r.results) expect(x).not.toHaveProperty("score");
    const e = getIndexEntry("or:openai/gpt-4o");
    if ("error" in e) throw new Error(e.error);
    expect(e.scored).toBe(false);
  });

  it("does not store counts or text we chose not to keep", () => {
    const keys = new Set(indexData.entries.flatMap((e) => Object.keys(e)));
    for (const banned of ["downloads", "likes", "description", "benchmarks"]) expect(keys.has(banned)).toBe(false);
  });

  it("filters combine", () => {
    const r = searchIndex({ kind: "model", openWeights: true, license: "apache", task: "text-generation", limit: 50 });
    expect(r.total).toBeGreaterThan(10);
    for (const x of r.results) {
      expect(x.openWeights).toBe(true);
      expect(x.license).toMatch(/apache/i);
      expect(x.task).toBe("text-generation");
    }
  });

  it("sorts by arena rating high to low and by price low to high, with missing values last", () => {
    const a = searchIndex({ sort: "arena", limit: 20 }).results.map((x) => x.arenaRating);
    for (let i = 1; i < a.length; i++) if (a[i] !== null && a[i - 1] !== null) expect(a[i - 1]!).toBeGreaterThanOrEqual(a[i]!);
    const p = searchIndex({ sort: "price", maxInputPricePerM: 5, limit: 20 }).results.map((x) => x.priceInputPerM!);
    for (let i = 1; i < p.length; i++) expect(p[i - 1]).toBeLessThanOrEqual(p[i]);
  });

  it("links to the reviewed catalog only through exact Wikidata matches", () => {
    const linked = indexData.entries.filter((e) => e.reviewedSlug);
    expect(linked.length).toBeGreaterThan(0);
    for (const e of linked) {
      expect(e.id.startsWith("wd:")).toBe(true);
      expect(tools.some((t) => t.slug === e.reviewedSlug)).toBe(true);
    }
    const chatgpt = indexData.entries.find((e) => e.reviewedSlug === "chatgpt")!;
    const full = getIndexEntry(chatgpt.id);
    if ("error" in full) throw new Error(full.error);
    expect(full.next).toMatch(/get_tool_profile/);
  });

  it("price is USD per million tokens (sanity range)", () => {
    for (const e of indexData.entries)
      if (e.priceInputPerM !== null) {
        expect(e.priceInputPerM).toBeGreaterThanOrEqual(0);
        expect(e.priceInputPerM).toBeLessThan(500);
      }
  });

  it("summary and methodology describe the index as unreviewed", () => {
    expect(indexSummary().total).toBe(indexData.entries.length);
    expect(methodology().notes.join(" ")).toMatch(/unreviewed and have no score/);
  });
});
