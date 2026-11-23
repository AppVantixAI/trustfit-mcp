/**
 * CVE records from the NVD CVE API 2.0 (US government, public domain), matched
 * by CPE vendor or vendor:product strings in src/orgs.ts. Counts and dates are
 * derived by TrustFit; descriptions are not stored, every CVE links to its record.
 * Without a key the NVD allows 5 requests in 30 seconds; NVD_API_KEY (free, in
 * mcp/.env.local) allows 50.
 * Run: npx tsx scripts/sources/nvd.ts
 */
import { ORGS } from "../../src/orgs";
import { env, factsHash, getJson, isMain, today, writeSnapshot } from "../lib/open-data";

type Metric = { type?: string; cvssData: { baseScore: number; baseSeverity?: string } ; baseSeverity?: string };
type RawCve = {
  cve: {
    id: string;
    published: string;
    vulnStatus: string;
    metrics?: Record<string, Metric[]>;
    configurations?: { nodes: { cpeMatch: { criteria: string; vulnerable: boolean }[] }[] }[];
  };
};
type Page = { totalResults: number; resultsPerPage: number; startIndex: number; vulnerabilities: RawCve[] };

export type CveFact = { id: string; published: string; severity: string; score: number | null; products: string[]; url: string };
export type NvdOrg = { matchedOn: string[]; total: number; last24Months: number; bySeverity: Record<string, number>; products: Record<string, number>; latest: CveFact[] };

const METRIC_ORDER = ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"];

/** Highest-version primary CVSS metric, else the first one listed. */
export function severityOf(c: RawCve["cve"]): { severity: string; score: number | null } {
  for (const k of METRIC_ORDER) {
    const list = c.metrics?.[k];
    if (!list?.length) continue;
    const m = list.find((x) => x.type === "Primary") ?? list[0];
    return { severity: (m.cvssData.baseSeverity ?? m.baseSeverity ?? "UNKNOWN").toUpperCase(), score: m.cvssData.baseScore ?? null };
  }
  return { severity: "NOT SCORED", score: null };
}

/** vendor:product pairs in a CVE's configurations that start with one of the match strings. */
export function productsOf(c: RawCve["cve"], match: string[]): string[] {
  const out = new Set<string>();
  for (const cfg of c.configurations ?? [])
    for (const n of cfg.nodes)
      for (const m of n.cpeMatch) {
        if (!m.vulnerable) continue;
        const [, , , vendor, product] = m.criteria.split(":");
        const vp = `${vendor}:${product}`;
        if (match.some((s) => vp === s || vendor === s)) out.add(vp);
      }
  return [...out].sort();
}

export function summarize(match: string[], cves: RawCve[], asOf: string): NvdOrg {
  const cut = new Date(asOf);
  cut.setFullYear(cut.getFullYear() - 2);
  const since = cut.toISOString().slice(0, 10);
  const seen = new Map<string, CveFact>();
  for (const { cve } of cves) {
    if (seen.has(cve.id) || cve.vulnStatus === "Rejected") continue;
    seen.set(cve.id, { id: cve.id, published: cve.published.slice(0, 10), ...severityOf(cve), products: productsOf(cve, match), url: `https://nvd.nist.gov/vuln/detail/${cve.id}` });
  }
  const list = [...seen.values()].sort((a, b) => b.published.localeCompare(a.published));
  const bySeverity: Record<string, number> = {};
  const products: Record<string, number> = {};
  for (const c of list) {
    bySeverity[c.severity] = (bySeverity[c.severity] ?? 0) + 1;
    for (const p of c.products) products[p] = (products[p] ?? 0) + 1;
  }
  return { matchedOn: match, total: list.length, last24Months: list.filter((c) => c.published >= since).length, bySeverity, products, latest: list.slice(0, 5) };
}

export async function run() {
  const key = env("NVD_API_KEY");
  const headers: Record<string, string> = key ? { apiKey: key } : {};
  const gapMs = key ? 800 : 6500;
  const byOrg: Record<string, NvdOrg> = {};
  for (const [id, o] of Object.entries(ORGS)) {
    if (!o.nvd?.length) continue;
    const cves: RawCve[] = [];
    for (const m of o.nvd) {
      for (let start = 0; ; ) {
        const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?virtualMatchString=${encodeURIComponent(`cpe:2.3:a:${m}`)}&resultsPerPage=2000&startIndex=${start}`;
        const page = await getJson<Page>(url, { headers, gapMs, timeoutMs: 120000, tries: 4 });
        cves.push(...page.vulnerabilities);
        start += page.resultsPerPage;
        if (!page.resultsPerPage || start >= page.totalResults) break;
      }
    }
    byOrg[id] = summarize(o.nvd, cves, today());
  }
  const body = { bySlug: {}, byOrg, byIndexId: {} };
  writeSnapshot({
    meta: {
      id: "nvd",
      source: "CVE counts derived by TrustFit from the NVD CVE API",
      url: "https://nvd.nist.gov/developers/vulnerabilities",
      license: "US Government work, public domain (NVD terms of use)",
      attribution: "This product uses the NVD API but is not endorsed or certified by the NVD.",
      redistribute: true,
      retrievedAt: today(),
      sha256: factsHash(body),
      status: "collected",
      matching:
        "By CPE match string cpe:2.3:a:<vendor> or cpe:2.3:a:<vendor>:<product> from src/orgs.ts. For large vendors only an AI product string is used (microsoft:copilot); for others the whole vendor, so counts can include the vendor's non-AI software. Rejected CVEs are dropped.",
      note: "A CVE is a disclosed flaw, usually fixed. Counts depend on how much of a vendor's software is installable and audited: a cloud-only service has few CVEs because there is nothing to install, not because it has no flaws. Severity is the highest CVSS version given, primary scorer first.",
    },
    ...body,
  });
}

if (isMain(import.meta.url)) await run();
