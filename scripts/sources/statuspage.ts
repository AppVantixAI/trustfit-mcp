/**
 * Public status pages (the Statuspage /api/v2 JSON format that most vendors use).
 * For each candidate host in src/orgs.ts, the page is kept only if it answers in
 * that format and names the organization. Stored: derived counts and dates of
 * recent incidents and a link, never incident text. No licence is stated, so this
 * snapshot is show-only and stays out of the public repo.
 * Run: npx tsx scripts/sources/statuspage.ts
 */
import { ORGS, brandWords, norm, orgForUrl } from "../../src/orgs";
import { factsHash, getJson, isMain, today, writeSnapshot } from "../lib/open-data";

type RawIncident = { id: string; created_at: string; resolved_at: string | null; impact: string; shortlink?: string; status: string };
type Summary = { page: { id: string; name: string; url: string; updated_at?: string }; status?: { indicator: string } };

export type StatusFacts = {
  page: string;
  pageName: string;
  indicatorAtCheck: string | null;
  windowDays: number;
  incidents: number;
  byImpact: Record<string, number>;
  unresolved: number;
  medianMinutesToResolve: number | null;
  latest: { date: string; impact: string; minutesToResolve: number | null; url: string | null } | null;
  /** True when the feed's oldest incident is inside the window, so the count is complete; false means at least this many. */
  windowCovered: boolean;
};

export const WINDOW_DAYS = 90;

/** A page belongs to the organization when its URL is on one of its domains or its name carries one of its brand words (name, alias, domain label). */
export function pageBelongs(orgId: string, s: Summary): boolean {
  if (orgForUrl(s.page.url) === orgId) return true;
  const words = norm(s.page.name).replace(/[^a-z0-9 ]/g, " ").split(" ").filter(Boolean);
  return brandWords(orgId).some((w) => words.includes(w) || words.join("") === w);
}

export function summarize(host: string, s: Summary, incidents: RawIncident[], asOf: string): StatusFacts {
  const since = new Date(asOf).getTime() - WINDOW_DAYS * 864e5;
  const inWin = incidents.filter((i) => new Date(i.created_at).getTime() >= since);
  const mins = (i: RawIncident) => (i.resolved_at ? Math.round((new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime()) / 60000) : null);
  const durations = inWin.map(mins).filter((m): m is number => m !== null).sort((a, b) => a - b);
  const byImpact: Record<string, number> = {};
  for (const i of inWin) byImpact[i.impact] = (byImpact[i.impact] ?? 0) + 1;
  const latest = [...incidents].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const oldest = incidents.reduce((m, i) => Math.min(m, new Date(i.created_at).getTime()), Infinity);
  return {
    page: `https://${host}/`,
    pageName: s.page.name,
    indicatorAtCheck: s.status?.indicator ?? null,
    windowDays: WINDOW_DAYS,
    incidents: inWin.length,
    byImpact,
    unresolved: inWin.filter((i) => !i.resolved_at).length,
    medianMinutesToResolve: durations.length ? durations[Math.floor(durations.length / 2)] : null,
    latest: latest ? { date: latest.created_at.slice(0, 10), impact: latest.impact, minutesToResolve: mins(latest), url: latest.shortlink ?? null } : null,
    windowCovered: incidents.length === 0 || oldest <= since,
  };
}

export async function run() {
  const byOrg: Record<string, StatusFacts> = {};
  const skipped: string[] = [];
  for (const [id, o] of Object.entries(ORGS)) {
    for (const host of o.statusHosts ?? []) {
      try {
        const s = await getJson<Summary>(`https://${host}/api/v2/summary.json`, { gapMs: 1500, tries: 2, timeoutMs: 20000 });
        if (!s?.page?.name || !pageBelongs(id, s)) {
          skipped.push(`${host} (does not name ${o.name})`);
          continue;
        }
        const inc = await getJson<{ incidents: RawIncident[] }>(`https://${host}/api/v2/incidents.json`, { gapMs: 1500, tries: 2, timeoutMs: 20000 });
        byOrg[id] = summarize(host, s, inc.incidents ?? [], today());
        break;
      } catch {
        skipped.push(`${host} (no Statuspage JSON)`);
      }
    }
  }
  const body = { bySlug: {}, byOrg, byIndexId: {} };
  writeSnapshot({
    meta: {
      id: "statuspage",
      source: "Vendors' public status pages (Statuspage JSON format)",
      url: "https://www.atlassian.com/software/statuspage",
      license: "NOT VERIFIED. No licence stated by the vendors or Atlassian; only derived counts and dates are kept, each with a link to the vendor's page. Not redistributed.",
      attribution: "Incident counts derived by TrustFit from each vendor's own public status page (linked).",
      redistribute: false,
      retrievedAt: today(),
      sha256: factsHash(body),
      status: "collected",
      hostsSkipped: skipped,
      matching: "Candidate status hosts in src/orgs.ts; a page is kept only if its URL is on the organization's domain or its name contains the organization's name.",
      note: `Incidents a vendor itself posted in the ${WINDOW_DAYS} days before the check. Vendors differ in what they post: a long list can mean a candid vendor, a short one a quiet vendor. The feed returns about 50 recent incidents, so a busy page may have more than shown (windowCovered false).`,
    },
    ...body,
  });
}

if (isMain(import.meta.url)) await run();
