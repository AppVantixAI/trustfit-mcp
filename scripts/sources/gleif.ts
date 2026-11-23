/**
 * Legal Entity Identifiers from GLEIF (gleif.org), CC0. For each organization,
 * the LEI records whose legal name exactly equals one of the legal names curated
 * in src/orgs.ts (after case and punctuation are normalized). GLEIF's own search
 * is fuzzy, so every candidate is checked locally; ETFs and lookalikes drop out.
 * Run: npx tsx scripts/sources/gleif.ts
 */
import { ORGS, normLegal } from "../../src/orgs";
import { factsHash, getJson, isMain, today, writeSnapshot } from "../lib/open-data";

type Addr = { city?: string; region?: string | null; country?: string };
type RawRecord = {
  attributes: {
    lei: string;
    entity: { legalName: { name: string }; jurisdiction?: string; status: string; legalAddress: Addr; headquartersAddress: Addr; creationDate?: string | null };
    registration: { status: string; lastUpdateDate: string; nextRenewalDate?: string; corroborationLevel?: string };
  };
  relationships?: Record<string, { links?: { related?: string; "reporting-exception"?: string } }>;
};

export type LeiFact = {
  lei: string;
  legalName: string;
  jurisdiction: string | null;
  entityStatus: string;
  registrationStatus: string;
  headquarters: string;
  createdAt: string | null;
  lastUpdated: string;
  nextRenewal: string | null;
  ultimateParent: { lei: string; legalName: string } | null;
  parentReported: "parent" | "exception" | "none";
  url: string;
};
export type GleifOrg = { searchedNames: string[]; records: LeiFact[] };

/** Keeps only candidates whose legal name equals one of the wanted names, exactly after normalization. */
export function exactMatches(wanted: string[], candidates: RawRecord[]): RawRecord[] {
  const want = new Set(wanted.map(normLegal));
  const seen = new Set<string>();
  return candidates.filter((c) => {
    const ok = want.has(normLegal(c.attributes.entity.legalName.name)) && !seen.has(c.attributes.lei);
    seen.add(c.attributes.lei);
    return ok;
  });
}

export function toFact(r: RawRecord, parent: { lei: string; legalName: string } | null): LeiFact {
  const a = r.attributes;
  const hq = a.entity.headquartersAddress;
  const up = r.relationships?.["ultimate-parent"]?.links;
  return {
    lei: a.lei,
    legalName: a.entity.legalName.name,
    jurisdiction: a.entity.jurisdiction ?? null,
    entityStatus: a.entity.status,
    registrationStatus: a.registration.status,
    headquarters: [hq.city, hq.region, hq.country].filter(Boolean).join(", "),
    createdAt: a.entity.creationDate?.slice(0, 10) ?? null,
    lastUpdated: a.registration.lastUpdateDate.slice(0, 10),
    nextRenewal: a.registration.nextRenewalDate?.slice(0, 10) ?? null,
    ultimateParent: parent,
    parentReported: up?.related ? "parent" : up?.["reporting-exception"] ? "exception" : "none",
    url: `https://search.gleif.org/#/record/${a.lei}`,
  };
}

export async function run() {
  const byOrg: Record<string, GleifOrg> = {};
  for (const [id, o] of Object.entries(ORGS)) {
    if (!o.legalNames?.length) continue;
    const found: RawRecord[] = [];
    for (const name of o.legalNames) {
      const url = `https://api.gleif.org/api/v1/lei-records?filter%5Bentity.legalName%5D=${encodeURIComponent(name)}&page%5Bsize%5D=20`;
      found.push(...(await getJson<{ data: RawRecord[] }>(url, { gapMs: 1100 })).data);
    }
    const records: LeiFact[] = [];
    for (const r of exactMatches(o.legalNames, found)) {
      let parent: LeiFact["ultimateParent"] = null;
      const rel = r.relationships?.["ultimate-parent"]?.links?.related;
      if (rel) {
        const p = await getJson<{ data: RawRecord | null }>(rel, { gapMs: 1100, accept: [404] }).catch(() => ({ data: null }));
        if (p.data) parent = { lei: p.data.attributes.lei, legalName: p.data.attributes.entity.legalName.name };
      }
      records.push(toFact(r, parent));
    }
    if (records.length) byOrg[id] = { searchedNames: o.legalNames, records };
  }
  const body = { bySlug: {}, byOrg, byIndexId: {} };
  writeSnapshot({
    meta: {
      id: "gleif",
      source: "GLEIF Global LEI Index",
      url: "https://www.gleif.org/en/lei-data/gleif-api",
      license: "CC0 1.0",
      attribution: "Legal entity data from the Global LEI Index (GLEIF), CC0. GLEIF does not endorse TrustFit.",
      redistribute: true,
      retrievedAt: today(),
      sha256: factsHash(body),
      status: "collected",
      matching: "Exact legal name, case and punctuation ignored, against the legal names curated in src/orgs.ts. Organizations with no exact match are left out.",
      note: "An LEI identifies a legal entity for financial reporting. Having one says nothing about conduct; not having one is common for private startups. The ultimate parent is as reported to GLEIF; 'exception' means the entity declared a reason not to report one.",
    },
    ...body,
  });
}

if (isMain(import.meta.url)) await run();
