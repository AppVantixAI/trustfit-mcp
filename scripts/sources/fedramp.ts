/**
 * FedRAMP Marketplace data (GSA), from the public data file behind
 * marketplace.fedramp.gov. No licence statement was found, so this snapshot is
 * show-only: facts on TrustFit pages with a link, kept out of the public repo.
 * Run: npx tsx scripts/sources/fedramp.ts
 */
import { ORGS } from "../../src/orgs";
import { get, isMain, sha256, text, today, writeSnapshot, type Snapshot } from "../lib/open-data";

export const URL_DATA = "https://raw.githubusercontent.com/FedRAMP/marketplace-fedramp-gov-data/main/data.json";

type RawProduct = { id: string; csp: string; cso: string; status: string; impact_level?: string; auth_date?: string; service_model?: string[] | string };
type RawFile = { meta?: { last_change?: string }; data: { Products: RawProduct[] } };

export type FedrampOffering = { offering: string; status: string; impactLevel: string | null; authorizedOn: string | null; url: string };
export type FedrampOrg = { provider: string[]; authorized: number; inProcess: number; offerings: FedrampOffering[] };

const date = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);

export function build(file: RawFile, retrievedAt: string, fileHash: string): Snapshot<never, FedrampOrg, never> {
  const byOrg: Record<string, FedrampOrg> = {};
  for (const [id, o] of Object.entries(ORGS)) {
    if (!o.fedramp?.length) continue;
    const hits = file.data.Products.filter((p) => o.fedramp!.includes(p.csp.trim()));
    if (!hits.length) continue;
    const offerings = hits
      .map((p) => ({ offering: p.cso.trim(), status: p.status, impactLevel: p.impact_level?.trim() || null, authorizedOn: date(p.auth_date), url: `https://marketplace.fedramp.gov/products/${p.id}` }))
      .sort((a, b) => (b.authorizedOn ?? "").localeCompare(a.authorizedOn ?? "") || a.offering.localeCompare(b.offering));
    byOrg[id] = {
      provider: [...new Set(hits.map((p) => p.csp.trim()))],
      authorized: offerings.filter((x) => x.status === "FedRAMP Authorized").length,
      inProcess: offerings.filter((x) => x.status !== "FedRAMP Authorized").length,
      offerings,
    };
  }
  return {
    meta: {
      id: "fedramp",
      source: "FedRAMP Marketplace (US General Services Administration)",
      url: "https://marketplace.fedramp.gov/",
      license: "NOT VERIFIED. Federal data with no licence statement found; shown with credit and a link, not redistributed.",
      attribution: "Source: FedRAMP Marketplace, US General Services Administration (https://marketplace.fedramp.gov/)",
      redistribute: false,
      retrievedAt,
      sourceUpdatedAt: date(file.meta?.last_change) ?? undefined,
      sha256: fileHash,
      status: "collected",
      matching: "By the exact cloud service provider name in the marketplace (src/orgs.ts fedramp field).",
      note: "FedRAMP authorizes a named cloud offering for US federal use at an impact level. It covers that offering only (for example a government edition), not every product the company sells, and it is not a general security certification.",
    },
    bySlug: {},
    byOrg,
    byIndexId: {},
  };
}

export async function run() {
  const raw = (await get(URL_DATA, { timeoutMs: 120000 })).body;
  writeSnapshot(build(JSON.parse(text(raw)), today(), sha256(raw)));
}

if (isMain(import.meta.url)) await run();
