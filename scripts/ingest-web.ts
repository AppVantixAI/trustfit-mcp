/**
 * Network ingest for three public sources, one JSON snapshot each in data/snapshots:
 *   tosdr     ToS;DR service grade, matched by DOMAIN (never by name)
 *   wayback   Internet Archive captures of each vendor-policy evidence URL
 *   wikidata  Entity resolution (QID, parent organisation) verified by official website
 *
 * Run: npx tsx scripts/ingest-web.ts [tosdr|wayback|wikidata|all]
 *
 * Polite by design: sequential requests, an identified user agent, a pause between
 * calls, and no bodies stored. ToS;DR and Wayback reuse terms were NOT verified, so
 * only derived facts (grade, counts, dates, ids) are kept and everything links out.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tools } from "@/content/tools";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/snapshots");
const UA = "trustfit-ingest/0.1 (+https://trustfit-iota.vercel.app)";
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const write = (name: string, data: unknown) => writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + "\n");

async function getJson<T>(url: string, tries = 2): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30000) });
      if (r.ok) return (await r.json()) as T;
    } catch {
      /* retry */
    }
    await sleep(1500);
  }
  return null;
}

const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");
/** Registrable-ish domain: last two labels (good enough for these vendors; .co.uk style not present). */
const base = (h: string) => h.split(".").slice(-2).join(".");

// ---------------------------------------------------------------- ToS;DR
async function tosdr() {
  type Svc = { id: number; name: string; slug: string; rating: string; urls: string[]; is_comprehensively_reviewed: boolean; updated_at: string };
  type Detail = Svc & { documents?: { name: string; updated_at: string }[]; points?: { status: string; case?: { classification?: string } }[] };
  const bySlug: Record<string, unknown> = {};
  for (const t of tools) {
    const h = host(t.website);
    // Try the exact host first, then the registrable domain.
    let match: { svc: Svc; scope: "exact" | "vendor" } | null = null;
    for (const q of [...new Set([h, base(h)])]) {
      const res = await getJson<{ services: Svc[] }>(`https://api.tosdr.org/search/v5/?query=${encodeURIComponent(q)}`);
      await sleep(500);
      const hit = res?.services.find((s) => s.urls.some((u) => u === h || u === base(h) || h.endsWith("." + u)));
      if (hit) {
        match = { svc: hit, scope: hit.urls.includes(h) ? "exact" : "vendor" };
        break;
      }
    }
    if (!match) continue;
    const d = await getJson<Detail>(`https://api.tosdr.org/service/v3/?id=${match.svc.id}`);
    await sleep(500);
    const counts = { good: 0, neutral: 0, bad: 0, blocker: 0 } as Record<string, number>;
    for (const p of d?.points ?? []) {
      if (p.status !== "approved") continue;
      const c = p.case?.classification ?? "neutral";
      counts[c] = (counts[c] ?? 0) + 1;
    }
    bySlug[t.slug] = {
      serviceId: match.svc.id,
      serviceName: match.svc.name,
      matchedOn: match.scope === "exact" ? h : base(h),
      scope: match.scope,
      rating: match.svc.rating,
      comprehensivelyReviewed: match.svc.is_comprehensively_reviewed,
      serviceUpdatedAt: match.svc.updated_at.slice(0, 10),
      approvedPoints: counts,
      documents: (d?.documents ?? []).map((x) => ({ name: x.name, updatedAt: x.updated_at.slice(0, 10) })),
      link: `https://tosdr.org/en/service/${match.svc.id}`,
    };
    console.log("tosdr", t.slug, match.svc.name, match.svc.rating, match.scope);
  }
  write("tosdr.json", {
    meta: {
      source: "Terms of Service; Didn't Read (tosdr.org) service ratings",
      url: "https://tosdr.org/",
      license: "NOT VERIFIED. The site describes its work as open data but states no data license we could find; code repos are AGPL-3.0. Only derived facts are stored. Confirm before redistributing.",
      retrievedAt: today,
      note: "Community-reviewed grade A (best) to E of a service's terms and privacy policy. Many services are not comprehensively reviewed; a grade then rests on partial review. Matched by domain; 'vendor' scope means the grade is for the parent service, not this product.",
    },
    bySlug,
  });
}

// ---------------------------------------------------------------- Wayback
async function wayback() {
  const from = new Date();
  from.setUTCFullYear(from.getUTCFullYear() - 2);
  const fromStamp = from.toISOString().slice(0, 10).replace(/-/g, "");
  const bySlug: Record<string, unknown[]> = {};
  for (const t of tools) {
    for (const e of t.evidence.filter((x) => x.kind === "vendor-policy")) {
      const url = `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(e.url)}&output=json&fl=timestamp,digest&filter=statuscode:200&from=${fromStamp}&limit=2000`;
      const rows = await getJson<string[][]>(url, 3);
      await sleep(1200);
      if (!rows) {
        (bySlug[t.slug] ??= []).push({ url: e.url, error: "no response from CDX" });
        continue;
      }
      const data = rows.slice(1);
      const digests = new Set(data.map((r) => r[1]));
      const stamps = data.map((r) => r[0]).sort();
      const fmt = (s?: string) => (s ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : "");
      (bySlug[t.slug] ??= []).push({
        url: e.url,
        capturesLast24Months: data.length,
        distinctVersionsLast24Months: digests.size,
        firstCapture: fmt(stamps[0]),
        lastCapture: fmt(stamps[stamps.length - 1]),
        history: `https://web.archive.org/web/*/${e.url}`,
      });
      console.log("wayback", t.slug, e.url, data.length, "captures", digests.size, "versions");
    }
  }
  write("wayback.json", {
    meta: {
      source: "Internet Archive Wayback Machine CDX index",
      url: "https://web.archive.org/",
      license: "NOT VERIFIED for systematic commercial reuse. Only counts and dates are stored; pages are not copied.",
      retrievedAt: today,
      windowStart: from.toISOString().slice(0, 10),
      note: "Distinct versions is the number of different raw-HTML digests archived in 24 months. It over-counts: cosmetic or dynamic page changes also change the digest. Read it as 'how often the page was captured in a different state', not 'how often the policy changed'. Absence of captures is not absence of change.",
    },
    bySlug,
  });
}

// ---------------------------------------------------------------- Wikidata
async function wikidata() {
  type Search = { search: { id: string; label?: string }[] };
  type Ent = {
    entities: Record<string, { labels?: { en?: { value: string } }; claims?: Record<string, { mainsnak: { datavalue?: { value: any } } }[]> }>;
  };
  const bySlug: Record<string, unknown> = {};
  for (const t of tools) {
    const h = base(host(t.website));
    const names = [...new Set([t.name, t.name.split(" ")[0]])];
    let found: Record<string, unknown> | null = null;
    for (const n of names) {
      const s = await getJson<Search>(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(n)}&language=en&format=json&limit=7`);
      await sleep(400);
      const ids = (s?.search ?? []).map((x) => x.id);
      if (!ids.length) continue;
      const ents = await getJson<Ent>(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=labels|claims&languages=en&format=json`);
      await sleep(400);
      for (const id of ids) {
        const e = ents?.entities[id];
        const sites = (e?.claims?.P856 ?? []).map((c) => String(c.mainsnak.datavalue?.value ?? ""));
        // Accept only when the item's official website is on this tool's domain.
        if (!sites.some((u) => { try { return base(host(u)) === h; } catch { return false; } })) continue;
        const relatedIds = [...(e?.claims?.P749 ?? []), ...(e?.claims?.P127 ?? []), ...(e?.claims?.P176 ?? [])].map((c) => c.mainsnak.datavalue?.value?.id).filter(Boolean) as string[];
        let parents: string[] = [];
        if (relatedIds.length) {
          const p = await getJson<Ent>(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${[...new Set(relatedIds)].join("|")}&props=labels&languages=en&format=json`);
          await sleep(400);
          parents = relatedIds.map((pid) => p?.entities[pid]?.labels?.en?.value).filter(Boolean) as string[];
        }
        found = { qid: id, label: e?.labels?.en?.value ?? "", officialWebsite: sites[0], relatedOrganizations: [...new Set(parents)], link: `https://www.wikidata.org/wiki/${id}` };
        break;
      }
      if (found) break;
    }
    if (found) {
      bySlug[t.slug] = found;
      console.log("wikidata", t.slug, found.qid, found.label, JSON.stringify(found.relatedOrganizations));
    } else console.log("wikidata", t.slug, "no verified match");
  }
  write("wikidata.json", {
    meta: {
      source: "Wikidata",
      url: "https://www.wikidata.org/",
      license: "CC0",
      retrievedAt: today,
      note: "A match is accepted only when the item's official website (P856) is on the tool's own domain. Unmatched tools have no verified entity, not a wrong one.",
    },
    bySlug,
  });
}

const which = process.argv[2] ?? "all";
if (which === "tosdr" || which === "all") await tosdr();
if (which === "wikidata" || which === "all") await wikidata();
if (which === "wayback" || which === "all") await wayback();
