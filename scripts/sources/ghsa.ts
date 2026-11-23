/**
 * GitHub Advisory Database (reviewed advisories), CC BY 4.0, through the GitHub
 * REST API. For each organization, the advisories that affect the packages it
 * publishes (SDKs, CLIs, self-hosted products; listed in src/orgs.ts). A free
 * token in GITHUB_TOKEN (mcp/.env.local) raises the limit from 60 to 5,000
 * requests an hour; without one this script still fits under 60.
 * Run: npx tsx scripts/sources/ghsa.ts
 */
import { ORGS, type Ecosystem } from "../../src/orgs";
import { env, factsHash, getJson, isMain, today, writeSnapshot } from "../lib/open-data";

type RawAdvisory = {
  ghsa_id: string;
  cve_id: string | null;
  html_url: string;
  summary: string;
  severity: string;
  published_at: string;
  withdrawn_at: string | null;
  cvss?: { score: number | null } | null;
  vulnerabilities?: { package?: { ecosystem: string; name: string }; first_patched_version?: string | null }[];
};

export type Advisory = { id: string; cve: string | null; severity: string; score: number | null; published: string; package: string; summary: string; url: string };
export type GhsaOrg = {
  packages: string[];
  total: number;
  last24Months: number;
  bySeverity: Record<string, number>;
  latest: Advisory[];
};

const ECO: Record<Ecosystem, string> = { npm: "npm", pip: "pip", go: "go", maven: "maven", nuget: "nuget", rubygems: "rubygems", rust: "rust" };

/** Folds raw advisories for one organization into counts and the five most recent. */
export function summarize(packages: string[], raw: RawAdvisory[], asOf: string): GhsaOrg {
  const seen = new Map<string, Advisory>();
  for (const a of raw) {
    if (a.withdrawn_at || seen.has(a.ghsa_id)) continue;
    const pkg = a.vulnerabilities?.map((v) => (v.package ? `${v.package.ecosystem}:${v.package.name}` : "")).find((p) => packages.includes(p)) ?? packages[0];
    seen.set(a.ghsa_id, {
      id: a.ghsa_id,
      cve: a.cve_id,
      severity: a.severity,
      score: a.cvss?.score ?? null,
      published: a.published_at.slice(0, 10),
      package: pkg,
      summary: a.summary,
      url: a.html_url,
    });
  }
  const list = [...seen.values()].sort((a, b) => b.published.localeCompare(a.published));
  const cut = new Date(asOf);
  cut.setFullYear(cut.getFullYear() - 2);
  const since = cut.toISOString().slice(0, 10);
  const bySeverity: Record<string, number> = {};
  for (const a of list) bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
  return { packages, total: list.length, last24Months: list.filter((a) => a.published >= since).length, bySeverity, latest: list.slice(0, 5) };
}

export async function run() {
  const token = env("GITHUB_TOKEN");
  const headers: Record<string, string> = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" };
  if (token) headers.authorization = `Bearer ${token}`;
  const byOrg: Record<string, GhsaOrg> = {};
  for (const [id, o] of Object.entries(ORGS)) {
    if (!o.packages?.length) continue;
    const raw: RawAdvisory[] = [];
    for (const p of o.packages) {
      const url = `https://api.github.com/advisories?type=reviewed&ecosystem=${ECO[p.ecosystem]}&affects=${encodeURIComponent(p.name)}&per_page=100`;
      raw.push(...(await getJson<RawAdvisory[]>(url, { headers, gapMs: token ? 300 : 1500 })));
    }
    byOrg[id] = summarize(o.packages.map((p) => `${ECO[p.ecosystem]}:${p.name}`), raw, today());
  }
  const body = { bySlug: {}, byOrg, byIndexId: {} };
  writeSnapshot({
    meta: {
      id: "ghsa",
      source: "GitHub Advisory Database (reviewed advisories)",
      url: "https://github.com/advisories",
      license: "CC BY 4.0",
      attribution: "Security advisories from the GitHub Advisory Database (https://github.com/advisories), CC BY 4.0",
      redistribute: true,
      retrievedAt: today(),
      sha256: factsHash(body),
      status: "collected",
      matching: "By the exact package names each organization publishes (src/orgs.ts packages). Only GitHub-reviewed, not withdrawn advisories.",
      note: "An advisory means a flaw was found and disclosed, usually with a fix. Many advisories can mean a widely used, well-audited package, not a careless vendor. Read severity and dates; this covers the vendor's published code, not its hosted service.",
    },
    ...body,
  });
}

if (isMain(import.meta.url)) await run();
