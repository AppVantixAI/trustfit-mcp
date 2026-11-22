import { VENDORS, type VendorInfo } from "@/content/vendors";

/** One linked headline. We keep the title, link, outlet and date. Never the article text. */
export type Headline = { title: string; url: string; outlet: string; date: string };
/** One Hacker News story. `url` is the linked article, `discussion` is the HN thread. */
export type Story = { title: string; url: string; discussion: string; date: string; points: number; comments: number };

export const MAX_HEADLINES = 6;
export const MAX_STORIES = 5;
/** A stored headline is dropped once it is this many days old. */
export const HEADLINE_KEEP_DAYS = 30;

/** Fresh headlines first, then stored ones that are still inside the keep window. */
export function mergeHeadlines(fresh: Headline[], stored: Headline[], today: string, max = MAX_HEADLINES): Headline[] {
  const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) - HEADLINE_KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  const seen = new Set<string>();
  return [...fresh, ...stored]
    .filter((h) => h.date >= cutoff && (seen.has(h.url) ? false : (seen.add(h.url), true)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, max);
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
/**
 * GDELT puts a space around every punctuation mark ("35 - year - old", "$64 . 6 Billion").
 * Close the gaps that are safe to close. A spaced hyphen is joined unless it looks like
 * the dash before an outlet name: the last one in the title, after a word, with three
 * words or fewer behind it ("OpenAI cuts prices - Reuters").
 */
function joinHyphens(s: string): string {
  const parts = s.split(" - ");
  let out = parts[0];
  let chained = false;
  for (let i = 1; i < parts.length; i++) {
    const last = i === parts.length - 1;
    const tail = parts[i].split(" ").length;
    const afterNumber = /\d$/.test(out);
    const join: boolean = !last || tail > 3 || afterNumber || chained || /^[a-z0-9]/.test(parts[i]);
    out += (join ? "-" : " - ") + parts[i];
    chained = join && !parts[i].includes(" ");
  }
  return out;
}
export const tidyTitle = (s: string) =>
  joinHyphens(clean(s))
    .replace(/\s+([,?!:;])/g, "$1")
    .replace(/(\d) \. (\d)/g, "$1.$2")
    .replace(/(\w) ' (s|t|re|ve|ll|d)\b/g, "$1'$2");
/** Syndicated copies differ by punctuation and outlet suffix. */
const titleKey = (s: string) => s.toLowerCase().replace(/\s[-|:]\s[^-|:]{2,40}$/, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Titles about someone else's product that only borrow the name: "open-source X", "X alternative", "X for circuit boards". */
const BORROWED = /\balternatives?\b|\bclone\b|open[- ]source\b|\bvs\.? /i;
/** Investment listicles that use an AI product's name as bait ("X predicts the better buy"). Not news about the vendor. */
const BAIT = /\bpredicts?\b.*\b(buy|price|stocks?|crypto|coin|xrp|bitcoin)\b|price prediction|\bstocks? to buy\b/i;

export function titleMatches(v: Pick<VendorInfo, "title" | "exclude">, title: string): boolean {
  return v.title.test(title) && !(v.exclude?.test(title) ?? false) && !BORROWED.test(title) && !BAIT.test(title);
}

const isHttp = (u: string) => /^https?:\/\//i.test(u);

/** GDELT `seendate` is 20261122T101500Z. */
export function gdeltDate(seen: string): string {
  return /^\d{8}/.test(seen) ? `${seen.slice(0, 4)}-${seen.slice(4, 6)}-${seen.slice(6, 8)}` : "";
}

type GdeltArticle = { url?: string; title?: string; seendate?: string; domain?: string };

/** Filter, de-duplicate and cap GDELT articles for one tool. Newest first. */
export function pickHeadlines(slug: string, articles: GdeltArticle[], max = MAX_HEADLINES): Headline[] {
  const v = VENDORS[slug];
  if (!v) return [];
  const seen = new Set<string>();
  const out: Headline[] = [];
  const sorted = [...articles].sort((a, b) => (b.seendate ?? "").localeCompare(a.seendate ?? ""));
  for (const a of sorted) {
    const title = tidyTitle(a.title ?? "");
    const url = a.url ?? "";
    const date = gdeltDate(a.seendate ?? "");
    if (!title || !date || !isHttp(url) || !titleMatches(v, title)) continue;
    const key = titleKey(title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, url, outlet: (a.domain ?? new URL(url).hostname).replace(/^www\./, ""), date });
    if (out.length >= max) break;
  }
  return out;
}

type HnHit = { objectID?: string; title?: string; url?: string | null; created_at?: string; points?: number | null; num_comments?: number | null };

/** Filter and cap Hacker News stories for one tool. Newest first. */
export function pickStories(slug: string, hits: HnHit[], max = MAX_STORIES): Story[] {
  const v = VENDORS[slug];
  if (!v) return [];
  const out: Story[] = [];
  const sorted = [...hits].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  for (const h of sorted) {
    const title = clean(h.title ?? "");
    // "Show HN" posts are other people's projects, not news about the vendor.
    if (!title || !h.objectID || !h.created_at || /^show hn\b/i.test(title) || !titleMatches({ title: v.hnTitle ?? v.title, exclude: v.exclude }, title)) continue;
    const discussion = `https://news.ycombinator.com/item?id=${h.objectID}`;
    out.push({
      title,
      url: h.url && isHttp(h.url) ? h.url : discussion,
      discussion,
      date: h.created_at.slice(0, 10),
      points: h.points ?? 0,
      comments: h.num_comments ?? 0,
    });
    if (out.length >= max) break;
  }
  return out;
}

/** How many vendors share one GDELT call. */
export const NEWS_GROUP = 6;

/**
 * One GDELT call for a group of tools. GDELT matches the article text, not the
 * title, so we ask for the most recent 250 mentions of any vendor in the group and
 * `pickHeadlines` keeps, per tool, the ones whose title names it.
 *
 * Measured on 2026-11-22: the service answers about one call a minute from one
 * address, so 40 separate calls do not finish; a 3 month window came back empty
 * while a 1 week window returned 113 articles for the same query; and a quoted
 * single word returns nothing. Hence groups, a one week window, and quotes only
 * on real phrases.
 */
export function gdeltUrl(slugs: string[], maxRecords = 250, timespan = "1week"): string | null {
  const terms = slugs.map((s) => VENDORS[s]?.newsTerm).filter(Boolean) as string[];
  if (!terms.length) return null;
  const query = terms.length === 1 ? terms[0] : `(${terms.join(" OR ")})`;
  const p = new URLSearchParams({ query: `${query} sourcelang:english`, mode: "artlist", maxrecords: String(maxRecords), format: "json", sort: "datedesc", timespan });
  return `https://api.gdeltproject.org/api/v2/doc/doc?${p}`;
}

/** Stories from the last `days` days with at least `minPoints` points, title search only. */
export function hnUrl(slug: string, now: Date, days = 365, minPoints = 40): string | null {
  const v = VENDORS[slug];
  if (!v) return null;
  const since = Math.floor(now.getTime() / 1000) - days * 86400;
  const p = new URLSearchParams({ query: v.hnQuery, tags: "story", restrictSearchableAttributes: "title", typoTolerance: "false", queryType: "prefixNone", numericFilters: `points>=${minPoints},created_at_i>${since}`, hitsPerPage: "50" });
  return `https://hn.algolia.com/api/v1/search_by_date?${p}`;
}

/** Search pages on review and community sites. Links only: nothing is fetched or scored. */
export function outboundLinks(slug: string, name: string, website: string): { label: string; url: string; note: string }[] {
  const v = VENDORS[slug];
  const q = encodeURIComponent(v?.hnQuery ?? name);
  const host = new URL(website).hostname.replace(/^www\./, "");
  return [
    { label: "Trustpilot", url: `https://www.trustpilot.com/search?query=${encodeURIComponent(host)}`, note: "Customer reviews" },
    { label: "G2", url: `https://www.g2.com/search?query=${encodeURIComponent(name)}`, note: "Business software reviews" },
    { label: "Hacker News", url: `https://hn.algolia.com/?q=${q}`, note: "Developer discussion" },
    { label: "Reddit", url: `https://www.reddit.com/search/?q=${encodeURIComponent(`"${name}"`)}`, note: "Community discussion" },
    { label: "Google News", url: `https://news.google.com/search?q=${encodeURIComponent(`"${name}"`)}`, note: "Latest coverage" },
  ];
}
