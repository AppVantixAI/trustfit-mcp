import { describe, expect, it } from "vitest";
import { tools as catalog } from "@/content/tools";
import { compareTools, getIndexEntryWithFacts, getToolProfile, methodology, rankForCompany, searchTools } from "./core";
import { runRaw, runTool, toolUrl } from "./handlers";
import { indexSummary, searchIndex } from "./index-search";
import { parseArgs, TOOL_NAMES } from "./tool-defs";

const SITE = "https://example.test";

/** Removes the url fields this layer adds, so the rest can be compared with the scoring code. */
function stripUrls(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripUrls);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).filter(([k]) => k !== "url" && k !== "reviewedUrl").map(([k, x]) => [k, stripUrls(x)]));
  }
  return v;
}

describe.skipIf(catalog.length === 0)("tool handlers", () => {
  // Optional chaining: the public copy ships no reviews and skips this suite, but still collects it.
  const slug = searchTools({ limit: 1 }).results[0]?.slug ?? "";
  const slug2 = searchTools({ limit: 2 }).results[1]?.slug ?? "";
  const entryId = searchIndex({ limit: 1 }).results[0]?.id ?? "";

  it("returns the scoring code's own output, plus links", () => {
    const cases: [Parameters<typeof runRaw>[0], Record<string, unknown>, unknown][] = [
      ["search_tools", { query: "chat" }, searchTools({ query: "chat" })],
      ["get_tool_profile", { slug }, getToolProfile(slug)],
      ["rank_for_company", { profile: { industry: "finance" } }, rankForCompany({ profile: { industry: "finance" } })],
      ["compare_tools", { slugs: [slug, slug2] }, compareTools([slug, slug2])],
      ["search_index", { query: "llama" }, searchIndex({ query: "llama" })],
      ["get_index_entry", { id: entryId }, getIndexEntryWithFacts(entryId)],
      ["get_index_summary", {}, indexSummary()],
      ["get_methodology", {}, methodology()],
    ];
    expect(cases.map((c) => c[0]).sort()).toEqual([...TOOL_NAMES].sort());
    for (const [name, args, expected] of cases) {
      expect(stripUrls(runTool(name, args, SITE))).toEqual(stripUrls(expected));
    }
  });

  it("links every result to its TrustFit page", () => {
    const s = runTool("search_tools", {}, SITE) as { results: { slug: string; url: string }[] };
    expect(s.results.length).toBeGreaterThan(0);
    for (const r of s.results) expect(r.url).toBe(toolUrl(SITE, r.slug));
    expect((runTool("get_tool_profile", { slug }, SITE) as { url: string }).url).toBe(`${SITE}/tools/${slug}`);
    const c = runTool("compare_tools", { slugs: [slug, slug2] }, SITE) as { compared: { url: string }[] };
    expect(c.compared.every((r) => r.url.startsWith(`${SITE}/tools/`))).toBe(true);
    const e = runTool("get_index_entry", { id: entryId }, SITE) as { url: string };
    expect(e.url).toBe(`${SITE}/catalog/entry?id=${encodeURIComponent(entryId)}`);
    expect((runTool("get_methodology", {}, SITE) as { url: string }).url).toBe(`${SITE}/methodology`);
  });

  it("passes a not-found answer through without a link", () => {
    const r = runTool("get_tool_profile", { slug: "no-such-tool" }, SITE) as Record<string, unknown>;
    expect(r.error).toMatch(/No tool/);
    expect(r.url).toBeUndefined();
  });

  it("checks arguments against each tool's schema", () => {
    expect(parseArgs("compare_tools", { slugs: ["a"] }).success).toBe(false);
    expect(parseArgs("search_tools", { limit: 500 }).success).toBe(false);
    expect(parseArgs("search_tools", { surprise: 1 }).success).toBe(false);
    expect(parseArgs("get_index_summary", {}).success).toBe(true);
  });
});
