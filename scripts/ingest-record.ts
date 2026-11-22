/**
 * News and public-record ingest. One JSON snapshot per source in data/snapshots:
 *   news      GDELT headlines (title, link, outlet, date). No article text.
 *   hn        Hacker News stories with enough points (title, links, date, points).
 *   breaches  Have I Been Pwned breach catalogue, matched by DOMAIN.
 *   sec       SEC EDGAR: 8-K Item 1.05 cyber incident filings and the latest annual report.
 *   dockets   CourtListener federal dockets naming the vendor.
 *
 * Run from mcp/: npx tsx scripts/ingest-record.ts [news|hn|breaches|sec|dockets|all|tidy]
 *
 * Two sources need a value from the owner, read from mcp/.env.local (git-ignored)
 * or the environment. Without it the source is skipped and its snapshot says so.
 *   SEC_USER_AGENT        SEC requires a contact in the user agent ("Company name email").
 *   COURTLISTENER_TOKEN   free API token from courtlistener.com.
 *
 * A run never erases good data: when a source fails for one tool, the tool keeps
 * what the last successful run stored, with its own date.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tools } from "@/content/tools";
import { VENDORS } from "@/content/vendors";
import { NEWS_GROUP, gdeltUrl, hnUrl, mergeHeadlines, pickHeadlines, pickStories, tidyTitle, titleMatches, type Headline } from "@/lib/news-match";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "../data/snapshots");
const UA = "open-data-ingest/0.1";
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Points bar for Hacker News when a tool has no story at the usual 40. */
const HN_LOW_POINTS = 10;
/** Vendors per call in the second news pass, for vendors the first pass missed. */
const QUIET_GROUP = 4;
const file = (name: string) => path.join(OUT, name);
const write = (name: string, data: unknown) => writeFileSync(file(name), JSON.stringify(data, null, 2) + "\n");
const previous = <T>(name: string): T | null => (existsSync(file(name)) ? (JSON.parse(readFileSync(file(name), "utf8")) as T) : null);

// Owner-supplied values. Never logged.
const envFile = path.join(HERE, "../.env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function getText(url: string, headers: Record<string, string> = {}, timeoutMs = 40000): Promise<{ status: number; text: string } | null> {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, ...headers }, signal: AbortSignal.timeout(timeoutMs) });
    return { status: r.status, text: await r.text() };
  } catch {
    return null;
  }
}
const parse = <T>(text: string): T | null => {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

type Kept<T> = { items: T[]; checkedAt: string; status: "ok" | "none-found" };
type Snapshot<T> = { meta: Record<string, unknown>; bySlug: Record<string, Kept<T>> };

// ---------------------------------------------------------------- GDELT
// The service answers about one call a minute from one address and often refuses
// even then, so vendors are asked for in groups of NEWS_GROUP (7 calls for 40 tools).
// The snapshot is written after every group, and a group whose tools were all
// checked today is skipped, so an interrupted run picks up where it stopped.
// Pass --force to redo everything.
async function news() {
  const force = process.argv.includes("--force");
  const prev = previous<Snapshot<unknown>>("news.json");
  const bySlug: Record<string, Kept<unknown>> = { ...(prev?.bySlug ?? {}) };
  const failed: string[] = [];
  const save = () =>
    write("news.json", {
      meta: {
        source: "GDELT Project DOC 2.0 API (global news index)",
        url: "https://www.gdeltproject.org/",
        license: "NOT VERIFIED in this run. GDELT describes its data as free for any use with a citation and a link. Headlines belong to their publishers: only the title, link, outlet and date are stored, and every item links out.",
        retrievedAt: today,
        window: "the most recent 250 English-language mentions of each group of vendors in the 7 days before each check, then the 30 days before it for vendors that first call missed; a stored headline is kept for 30 days",
        failedThisRun: failed,
        note: "Automated keyword match, not reviewed by a person. A headline is kept only when its title names the product or vendor. GDELT returns a sample of coverage, not all of it, so a missing headline proves nothing. Coverage volume follows fame, not conduct, so headlines are shown and never scored. No headline is an endorsement or a finding by TrustFit.",
      },
      bySlug,
    });
  const slugs = tools.map((t) => t.slug);
  let first = true;
  let refusedGroups = 0;
  for (let g = 0; g < slugs.length; g += NEWS_GROUP) {
    // Two groups refused in a row means the service is turning this address away.
    // Stop and keep what is stored: more calls only lengthen the refusal.
    if (refusedGroups >= 2) {
      failed.push(...slugs.slice(g));
      console.log("news STOPPED: the service refused two groups in a row. Run again later; finished groups are kept.");
      break;
    }
    const group = slugs.slice(g, g + NEWS_GROUP);
    const url = gdeltUrl(group);
    if (!url) continue;
    if (!force && group.every((s) => bySlug[s]?.checkedAt === today)) continue;
    let done = false;
    for (let attempt = 0; attempt < 3 && !done; attempt++) {
      if (!first) await sleep(120000);
      first = false;
      const r = await getText(url, {}, 90000);
      const body = r?.text.trim() ?? "";
      if (!r || r.status !== 200) {
        console.log("news", group[0], "group attempt", attempt + 1, r ? `status ${r.status}` : "no response");
        continue;
      }
      const data = body === "" ? { articles: [] } : parse<{ articles?: unknown[] }>(body);
      if (!data) {
        console.log("news group rejected:", group.join(","), body.slice(0, 120));
        break;
      }
      for (const slug of group) {
        const fresh = pickHeadlines(slug, (data.articles ?? []) as never[]);
        const items = mergeHeadlines(fresh, (bySlug[slug]?.items ?? []) as Headline[], today);
        bySlug[slug] = { items, checkedAt: today, status: items.length ? "ok" : "none-found" };
        console.log("news", slug, fresh.length, "new;", items.length, "stored");
      }
      console.log("news group", group[0], "returned", data.articles?.length ?? 0, "mentions");
      done = true;
    }
    if (!done) failed.push(...group);
    refusedGroups = done ? 0 : refusedGroups + 1;
    save();
  }

  // Second pass. Famous vendors fill a group's 250 mentions within days, so the
  // smaller vendors that shared a call with them come back with nothing. Ask again
  // for those alone, a few at a time, over the 30 days a headline is kept anyway.
  const quiet = slugs.filter((s) => !(bySlug[s]?.items as unknown[] | undefined)?.length && !failed.includes(s) && (force || (bySlug[s] as { quietAt?: string } | undefined)?.quietAt !== today));
  refusedGroups = 0;
  for (let g = 0; g < quiet.length; g += QUIET_GROUP) {
    if (refusedGroups >= 2) {
      console.log("news quiet pass STOPPED after two refusals. Run again later; finished groups are kept.");
      break;
    }
    const group = quiet.slice(g, g + QUIET_GROUP);
    const url = gdeltUrl(group, 250, "1month");
    if (!url) continue;
    let done = false;
    for (let attempt = 0; attempt < 3 && !done; attempt++) {
      await sleep(90000);
      const r = await getText(url, {}, 90000);
      const body = r?.text.trim() ?? "";
      if (!r || r.status !== 200) {
        console.log("news quiet", group[0], "attempt", attempt + 1, r ? `status ${r.status}` : "no response");
        continue;
      }
      const data = body === "" ? { articles: [] } : parse<{ articles?: unknown[] }>(body);
      if (!data) {
        console.log("news quiet group rejected:", group.join(","), body.slice(0, 120));
        break;
      }
      for (const slug of group) {
        const fresh = pickHeadlines(slug, (data.articles ?? []) as never[]);
        const items = mergeHeadlines(fresh, [], today);
        bySlug[slug] = { items, checkedAt: today, status: items.length ? "ok" : "none-found", quietAt: today } as Kept<unknown>;
        console.log("news quiet", slug, items.length, "stored");
      }
      done = true;
    }
    refusedGroups = done ? 0 : refusedGroups + 1;
    save();
  }
  save();
  if (failed.length) console.log("news FAILED (kept earlier data if any):", failed.join(", "));
}

// ---------------------------------------------------------------- Hacker News
async function hn() {
  const prev = previous<Snapshot<unknown>>("hn.json");
  const bySlug: Record<string, Kept<unknown>> = { ...(prev?.bySlug ?? {}) };
  const failed: string[] = [];
  for (const t of tools) {
    const url = hnUrl(t.slug, new Date());
    if (!url) continue;
    const r = await getText(url);
    await sleep(400);
    const data = r && r.status === 200 ? parse<{ hits?: unknown[] }>(r.text) : null;
    if (!data) {
      failed.push(t.slug);
      continue;
    }
    let items = pickStories(t.slug, (data.hits ?? []) as never[]);
    // Smaller tools rarely reach 40 points; look again with a lower bar.
    if (!items.length) {
      await sleep(400);
      const low = await getText(hnUrl(t.slug, new Date(), 365, HN_LOW_POINTS)!);
      const lowData = low && low.status === 200 ? parse<{ hits?: unknown[] }>(low.text) : null;
      if (lowData) items = pickStories(t.slug, (lowData.hits ?? []) as never[]);
    }
    bySlug[t.slug] = { items, checkedAt: today, status: items.length ? "ok" : "none-found" };
    console.log("hn", t.slug, items.length, "kept of", data.hits?.length ?? 0);
  }
  write("hn.json", {
    meta: {
      source: "Hacker News (via the HN Search API by Algolia)",
      url: "https://hn.algolia.com/",
      license: "NOT VERIFIED. No data license is stated. Only the story title, links, date and counts are stored.",
      retrievedAt: today,
      window: "12 months before the check date, stories with 40 or more points (10 or more for a tool with none at 40), title match only",
      failedThisRun: failed,
      note: "Stories a developer audience voted up. Points measure attention, not approval, and the audience is not a sample of customers. Shown as links and never scored.",
    },
    bySlug,
  });
  if (failed.length) console.log("hn FAILED:", failed.join(", "));
}

// ---------------------------------------------------------------- Have I Been Pwned
async function breaches() {
  type B = { Name: string; Title: string; Domain: string; BreachDate: string; AddedDate: string; PwnCount: number; DataClasses: string[]; IsVerified: boolean; IsFabricated: boolean; IsRetired: boolean; IsSpamList: boolean; IsMalware: boolean; IsStealerLog?: boolean };
  const r = await getText("https://haveibeenpwned.com/api/v3/breaches");
  const all = r && r.status === 200 ? parse<B[]>(r.text) : null;
  if (!all) {
    console.log("breaches FAILED: no response. Snapshot left unchanged.");
    return;
  }
  const real = all.filter((b) => !b.IsFabricated && !b.IsRetired && !b.IsSpamList && !b.IsMalware && !b.IsStealerLog && b.Domain);
  const bySlug: Record<string, unknown> = {};
  for (const t of tools) {
    const v = VENDORS[t.slug];
    if (!v?.breachDomains?.length) continue;
    const hits = real.filter((b) => v.breachDomains!.includes(b.Domain.toLowerCase()));
    bySlug[t.slug] = {
      checkedAt: today,
      domainsChecked: v.breachDomains,
      vendorWide: Boolean(v.vendorWide),
      items: hits
        .sort((a, b) => b.BreachDate.localeCompare(a.BreachDate))
        .map((b) => ({ name: b.Title, domain: b.Domain, breachDate: b.BreachDate, addedDate: b.AddedDate.slice(0, 10), accounts: b.PwnCount, dataClasses: b.DataClasses, verified: b.IsVerified, link: `https://haveibeenpwned.com/Breach/${b.Name}` })),
    };
    if (hits.length) console.log("breaches", t.slug, hits.map((b) => `${b.Title} ${b.BreachDate}`).join("; "));
  }
  write("breaches.json", {
    meta: {
      source: "Have I Been Pwned breach catalogue",
      url: "https://haveibeenpwned.com/",
      license: "CC BY 4.0 (stated in the HIBP API documentation, read 2026-11-22). Attribution with a link to haveibeenpwned.com is required wherever the data is shown.",
      retrievedAt: today,
      catalogueSize: all.length,
      note: "Matched by the breached service's domain, never by name. The catalogue lists breaches whose data reached HIBP: an empty result means no breach of that domain is in the catalogue, not that none happened. A breach can be years old and long fixed; read the date.",
    },
    bySlug,
  });
}

// ---------------------------------------------------------------- SEC EDGAR
async function sec() {
  const agent = process.env.SEC_USER_AGENT;
  const base = { source: "SEC EDGAR company filings", url: "https://www.sec.gov/edgar", license: "US government work, public domain." };
  if (!agent) {
    if (!previous<{ meta: { status: string } }>("sec.json")?.meta.status.startsWith("collected")) {
      write("sec.json", { meta: { ...base, retrievedAt: today, status: "not collected: the SEC requires a contact in the request user agent. Set SEC_USER_AGENT in mcp/.env.local and run again.", note: "" }, bySlug: {} });
    }
    console.log("sec SKIPPED: SEC_USER_AGENT is not set.");
    return;
  }
  const h = { "user-agent": agent };
  const tick = await getText("https://www.sec.gov/files/company_tickers.json", h);
  const table = tick && tick.status === 200 ? parse<Record<string, { cik_str: number; ticker: string; title: string }>>(tick.text) : null;
  if (!table) {
    console.log("sec FAILED: ticker table not returned (status", tick?.status, "). Snapshot left unchanged.");
    return;
  }
  const byTicker = new Map(Object.values(table).map((x) => [x.ticker, x]));
  type Recent = { accessionNumber: string[]; filingDate: string[]; form: string[]; items: string[]; primaryDocument: string[] };
  const cache = new Map<string, unknown>();
  const bySlug: Record<string, unknown> = {};
  for (const t of tools) {
    const v = VENDORS[t.slug];
    if (!v?.ticker) continue;
    if (!cache.has(v.ticker)) {
      const co = byTicker.get(v.ticker);
      if (!co || (v.secName && !co.title.toLowerCase().includes(v.secName.toLowerCase()))) {
        console.log("sec", t.slug, "ticker", v.ticker, "did not resolve to", v.secName, "- skipped");
        cache.set(v.ticker, null);
      } else {
        await sleep(300);
        const cik = String(co.cik_str).padStart(10, "0");
        const sub = await getText(`https://data.sec.gov/submissions/CIK${cik}.json`, h);
        const rec = sub && sub.status === 200 ? parse<{ filings: { recent: Recent } }>(sub.text)?.filings.recent : null;
        if (!rec) cache.set(v.ticker, null);
        else {
          const link = (i: number) => `https://www.sec.gov/Archives/edgar/data/${co.cik_str}/${rec.accessionNumber[i].replace(/-/g, "")}/${rec.primaryDocument[i]}`;
          const idx = rec.form.map((_, i) => i);
          const cyber = idx.filter((i) => rec.form[i].startsWith("8-K") && rec.items[i].split(",").includes("1.05"));
          const annual = idx.find((i) => rec.form[i] === "10-K" || rec.form[i] === "20-F");
          cache.set(v.ticker, {
            ticker: v.ticker,
            company: co.title,
            cik: co.cik_str,
            cyberIncidentFilings: cyber.map((i) => ({ form: rec.form[i], filed: rec.filingDate[i], link: link(i) })),
            latestAnnualReport: annual === undefined ? null : { form: rec.form[annual], filed: rec.filingDate[annual], link: link(annual) },
            allFilings: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=8-K`,
          });
        }
      }
    }
    const got = cache.get(v.ticker);
    if (got) {
      bySlug[t.slug] = { checkedAt: today, ...(got as object) };
      console.log("sec", t.slug, v.ticker, JSON.stringify((got as { cyberIncidentFilings: unknown[] }).cyberIncidentFilings.length), "cyber filings");
    }
  }
  write("sec.json", {
    meta: {
      ...base,
      retrievedAt: today,
      status: "collected",
      note: "Only for vendors whose parent is listed in the US. Item 1.05 of Form 8-K is the SEC's material cybersecurity incident disclosure, required since December 2023; it covers the whole company, and none on file means none was reported under that item in the recent filing window. The annual report's Legal Proceedings and Risk Factors sections are the company's own account of open disputes.",
    },
    bySlug,
  });
}

// ---------------------------------------------------------------- CourtListener
// UNTESTED against the live API as of 2026-11-22: no token was available. Check the
// first run's output by hand before showing dockets on the site.
async function dockets() {
  const token = process.env.COURTLISTENER_TOKEN;
  const base = { source: "CourtListener (Free Law Project) RECAP archive of US federal dockets", url: "https://www.courtlistener.com/", license: "NOT VERIFIED. Court records are public; confirm the API terms before redistributing." };
  if (!token) {
    if (!previous<{ meta: { status: string } }>("dockets.json")?.meta.status.startsWith("collected")) {
      write("dockets.json", { meta: { ...base, retrievedAt: today, status: "not collected: the API needs a free token. Set COURTLISTENER_TOKEN in mcp/.env.local and run again.", note: "" }, bySlug: {} });
    }
    console.log("dockets SKIPPED: COURTLISTENER_TOKEN is not set.");
    return;
  }
  type Hit = { caseName?: string; court?: string; dateFiled?: string; docketNumber?: string; docket_absolute_url?: string };
  const bySlug: Record<string, unknown> = {};
  const failed: string[] = [];
  for (const t of tools) {
    const v = VENDORS[t.slug];
    if (!v?.courtParty) continue;
    const p = new URLSearchParams({ type: "r", case_name: `"${v.courtParty}"`, order_by: "dateFiled desc" });
    const r = await getText(`https://www.courtlistener.com/api/rest/v4/search/?${p}`, { authorization: `Token ${token}` });
    await sleep(1500);
    const data = r && r.status === 200 ? parse<{ count?: number; results?: Hit[] }>(r.text) : null;
    if (!data) {
      failed.push(t.slug);
      console.log("dockets", t.slug, "failed, status", r?.status);
      continue;
    }
    const items = (data.results ?? [])
      .filter((x) => x.caseName && x.dateFiled && x.docket_absolute_url)
      .slice(0, 5)
      .map((x) => ({ caseName: x.caseName, court: x.court ?? "", filed: x.dateFiled!.slice(0, 10), docketNumber: x.docketNumber ?? "", link: `https://www.courtlistener.com${x.docket_absolute_url}` }));
    bySlug[t.slug] = { checkedAt: today, searchedName: v.courtParty, vendorWide: Boolean(v.vendorWide), totalMatching: data.count ?? items.length, items, search: `https://www.courtlistener.com/?${p}` };
    console.log("dockets", t.slug, data.count, "matching");
  }
  write("dockets.json", {
    meta: {
      ...base,
      retrievedAt: today,
      status: "collected",
      failedThisRun: failed,
      note: "Federal cases whose caption contains the vendor's name. A caption match can be a different company with a similar name, and a vendor can be plaintiff, defendant or a third party. A filed case is an allegation, not a finding. State courts and arbitration are not covered.",
    },
    bySlug,
  });
}

/** Re-apply the title rules to stored headlines after a rule change. No network call. */
function tidy() {
  const snap = previous<{ meta: unknown; bySlug: Record<string, Kept<Headline>> }>("news.json");
  if (!snap) return;
  let dropped = 0;
  for (const [slug, rec] of Object.entries(snap.bySlug)) {
    const v = VENDORS[slug];
    const items = rec.items.map((h) => ({ ...h, title: tidyTitle(h.title) })).filter((h) => v && titleMatches(v, h.title));
    dropped += rec.items.length - items.length;
    snap.bySlug[slug] = { ...rec, items, status: items.length ? "ok" : "none-found" };
  }
  write("news.json", snap);
  console.log("tidy: headlines dropped", dropped);
}

const which = process.argv[2] ?? "all";
if (which === "tidy") tidy();
const run = (name: string) => which === name || which === "all";
if (run("breaches")) await breaches();
if (run("hn")) await hn();
if (run("sec")) await sec();
if (run("dockets")) await dockets();
if (run("news")) await news();
