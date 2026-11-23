/**
 * Runs a tool against the bundled review data. Used by the local stdio server
 * and by the hosted API Worker, so both return the same shapes.
 */
import { compareTools, getIndexEntryWithFacts, getToolProfile, methodology, rankForCompany, searchTools } from "./core";
import { indexSummary, searchIndex } from "./index-search";
import type { ToolName } from "./tool-defs";

export const DEFAULT_SITE = "https://trustfit-iota.vercel.app";

type Row = Record<string, unknown>;
type Args = Record<string, unknown>;

export const toolUrl = (site: string, slug: string) => `${site}/tools/${encodeURIComponent(slug)}`;
export const entryUrl = (site: string, id: string) => `${site}/catalog/entry?id=${encodeURIComponent(id)}`;

/** The raw result of a tool, exactly as the scoring code returns it. */
export function runRaw(name: ToolName, a: Args): unknown {
  switch (name) {
    case "search_tools":
      return searchTools(a as Parameters<typeof searchTools>[0]);
    case "get_tool_profile":
      return getToolProfile(a.slug as string, a.profile as Parameters<typeof getToolProfile>[1]);
    case "rank_for_company":
      return rankForCompany(a as Parameters<typeof rankForCompany>[0]);
    case "compare_tools":
      return compareTools(a.slugs as string[], a.profile as Parameters<typeof compareTools>[1]);
    case "search_index":
      return searchIndex(a as Parameters<typeof searchIndex>[0]);
    case "get_index_entry":
      return getIndexEntryWithFacts(a.id as string);
    case "get_index_summary":
      return indexSummary();
    case "get_methodology":
      return methodology();
  }
}

const withToolUrl = (site: string) => (r: Row) => (typeof r.slug === "string" ? { ...r, url: toolUrl(site, r.slug) } : r);

const withEntryUrl = (site: string) => (r: Row) => ({
  ...r,
  url: entryUrl(site, String(r.id)),
  ...(typeof r.reviewedSlug === "string" ? { reviewedUrl: toolUrl(site, r.reviewedSlug) } : {}),
});

/** Adds a link to the TrustFit page behind every result. Errors pass through unchanged. */
export function withUrls(name: ToolName, data: unknown, site: string = DEFAULT_SITE): unknown {
  const d = data as Row;
  if (!d || typeof d !== "object" || "error" in d) return data;
  const list = (key: string, f: (r: Row) => Row) => ({ ...d, [key]: (d[key] as Row[]).map(f) });
  switch (name) {
    case "search_tools":
    case "rank_for_company":
      return list("results", withToolUrl(site));
    case "compare_tools":
      return list("compared", withToolUrl(site));
    case "get_tool_profile":
      return withToolUrl(site)(d);
    case "search_index":
      return list("results", withEntryUrl(site));
    case "get_index_entry":
      return withEntryUrl(site)(d);
    case "get_index_summary":
      return { ...d, url: `${site}/catalog` };
    case "get_methodology":
      return { ...d, url: `${site}/methodology` };
  }
}

/** A tool's result with page links. Not yet cleaned: callers pass it to toolResult or cleanDeep. */
export function runTool(name: ToolName, args: Args, site: string = DEFAULT_SITE): unknown {
  return withUrls(name, runRaw(name, args), site);
}

/** True when the tool found nothing for the given slug or id. */
export const isNotFound = (data: unknown) => Boolean(data && typeof data === "object" && "error" in (data as Row));
