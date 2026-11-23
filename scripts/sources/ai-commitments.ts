/**
 * Public AI safety commitments, read from the official pages:
 *   - EU General-Purpose AI Code of Practice signatories (European Commission, CC BY 4.0)
 *   - Frontier AI Safety Commitments, AI Seoul Summit 2024 (UK government, OGL v3.0)
 * Each page is fetched, its signatory list is read from the page text, and an
 * organization counts as a signatory only when one of its exact signatory names
 * (src/orgs.ts) is on that list.
 * Run: npx tsx scripts/sources/ai-commitments.ts
 */
import { ORGS, norm } from "../../src/orgs";
import { factsHash, get, htmlText, isMain, text, today, writeSnapshot } from "../lib/open-data";

export const GPAI_URL = "https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai";
export const SEOUL_URL = "https://www.gov.uk/government/publications/frontier-ai-safety-commitments-ai-seoul-summit-2024/frontier-ai-safety-commitments-ai-seoul-summit-2024";

export type Commitment = { commitment: string; scope: string; source: string; url: string; pageUpdated: string | null; licence: string };

/**
 * Short lines after a line matching `start`, until a line longer than `maxLen` or matching
 * `stop`; lines matching `skip` are passed over. A heading can appear more than once (a
 * contents list, then the section), so every occurrence is tried and the longest list wins.
 */
export function listAfter(lines: string[], start: RegExp, stop: RegExp, maxLen = 60, skip?: RegExp): string[] {
  let best: string[] = [];
  lines.forEach((l, i) => {
    if (!start.test(l)) return;
    const out: string[] = [];
    for (const x of lines.slice(i + 1)) {
      if (skip?.test(x)) continue;
      if (stop.test(x) || x.length > maxLen) break;
      out.push(x);
    }
    if (out.length > best.length) best = out;
  });
  return best;
}

export function parseGpai(pageText: string): { full: string[]; safetyOnly: string[]; updated: string | null } {
  const lines = pageText.split("\n");
  const full = listAfter(lines, /^Signatories of the code of practice$/i, /^In addition|^Quick links/i, 60, /^Some signatories/i);
  const safetyOnly = [...pageText.matchAll(/In addition, (.+?) signed up to the Safety and Security Chapter/gi)].map((m) => m[1].trim());
  const u = pageText.match(/Last update\s*\n\s*(\d{1,2} \w+ \d{4})/i);
  return { full, safetyOnly, updated: u ? new Date(`${u[1]} UTC`).toISOString().slice(0, 10) : null };
}

export function parseSeoul(pageText: string): { signatories: string[]; updated: string | null } {
  const lines = pageText.split("\n");
  const first = listAfter(lines, /agreed to the Frontier AI Safety Commitments:?$/i, /^The following organisations have been added/i);
  const added = listAfter(lines, /^The following organisations have been added/i, /^The above organisations/i);
  const u = pageText.match(/Updated\s+(\d{1,2} \w+ \d{4})/i);
  return { signatories: [...first, ...added], updated: u ? new Date(`${u[1]} UTC`).toISOString().slice(0, 10) : null };
}

export function matchSignatories(names: string[]): Map<string, string> {
  const want = new Map(names.map((n) => [norm(n), n]));
  const out = new Map<string, string>();
  for (const [id, o] of Object.entries(ORGS)) for (const s of o.signatory ?? []) if (want.has(norm(s))) out.set(id, want.get(norm(s))!);
  return out;
}

export async function run() {
  const gpai = parseGpai(htmlText(text((await get(GPAI_URL)).body)));
  const seoul = parseSeoul(htmlText(text((await get(SEOUL_URL)).body)));
  if (gpai.full.length < 5 || seoul.signatories.length < 5) throw new Error(`signatory lists not found (GPAI ${gpai.full.length}, Seoul ${seoul.signatories.length}); the page layout changed`);
  const byOrg: Record<string, Commitment[]> = {};
  const add = (org: string, c: Commitment) => (byOrg[org] ??= []).push(c);
  const gpaiBase = { source: "European Commission, Shaping Europe's digital future", url: GPAI_URL, pageUpdated: gpai.updated, licence: "CC BY 4.0" };
  for (const [org] of matchSignatories(gpai.full)) add(org, { commitment: "EU General-Purpose AI Code of Practice", scope: "all three chapters (transparency, copyright, safety and security)", ...gpaiBase });
  for (const [org] of matchSignatories(gpai.safetyOnly)) add(org, { commitment: "EU General-Purpose AI Code of Practice", scope: "Safety and Security chapter only", ...gpaiBase });
  for (const [org] of matchSignatories(seoul.signatories))
    add(org, { commitment: "Frontier AI Safety Commitments (AI Seoul Summit 2024)", scope: "publish a safety framework for severe risks", source: "UK Department for Science, Innovation and Technology", url: SEOUL_URL, pageUpdated: seoul.updated, licence: "OGL v3.0" });
  const body = { bySlug: {}, byOrg, byIndexId: {} };
  writeSnapshot({
    meta: {
      id: "ai-commitments",
      source: "Official signatory lists: EU General-Purpose AI Code of Practice and the Frontier AI Safety Commitments",
      url: GPAI_URL,
      license: "CC BY 4.0 (European Commission content, Decision 2011/833/EU) and Open Government Licence v3.0 (UK)",
      attribution:
        "Signatory list of the General-Purpose AI Code of Practice, European Union, https://digital-strategy.ec.europa.eu/. Contains public sector information licensed under the Open Government Licence v3.0.",
      redistribute: true,
      retrievedAt: today(),
      sha256: factsHash(body),
      status: "collected",
      gpaiSignatoriesOnPage: gpai.full.length,
      seoulSignatoriesOnPage: seoul.signatories.length,
      matching: "Exact organization name as printed on each list (src/orgs.ts signatory field).",
      note: "Signing is a voluntary public promise, not an audit or a certification. Not signing says nothing about practice; many companies are not eligible (the EU code covers providers of general-purpose AI models).",
    },
    ...body,
  });
}

if (isMain(import.meta.url)) await run();
