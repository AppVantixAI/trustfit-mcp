/**
 * security.txt (RFC 9116) check, a first-party observation by TrustFit: for each
 * organization's primary domains, fetch https://<domain>/.well-known/security.txt
 * and record whether a valid file is published, its contact channels, policy link
 * and expiry. One request per domain, two seconds apart.
 * Run: npx tsx scripts/sources/security-txt.ts
 */
import { ORGS } from "../../src/orgs";
import { factsHash, get, isMain, text, today, writeSnapshot } from "../lib/open-data";

export type SecurityTxt = {
  url: string;
  /** Final URL after redirects. */
  servedFrom: string | null;
  found: boolean;
  /** Why a file was not counted, when found is false. */
  reason?: string;
  contact: string[];
  policy: string | null;
  expires: string | null;
  expired: boolean | null;
  acknowledgments: string | null;
  hiring: string | null;
  preferredLanguages: string | null;
  canonical: string[];
  signed: boolean;
};

const MAX_BYTES = 32 * 1024;

/** Parses a security.txt body. Returns null when it has no Contact field (RFC 9116 requires one). */
export function parseSecurityTxt(body: string, asOf: string): Omit<SecurityTxt, "url" | "servedFrom" | "found" | "reason"> | null {
  const signed = body.includes("-----BEGIN PGP SIGNED MESSAGE-----");
  const fields: Record<string, string[]> = {};
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("#") || line.startsWith("-----") || line.startsWith("Hash:")) continue;
    const m = line.match(/^([A-Za-z-]+):\s*(.+?)\s*$/);
    if (m) (fields[m[1].toLowerCase()] ??= []).push(m[2]);
  }
  if (!fields.contact?.length) return null;
  const expires = fields.expires?.[0] ?? null;
  const exp = expires ? new Date(expires) : null;
  return {
    contact: fields.contact,
    policy: fields.policy?.[0] ?? null,
    expires,
    expired: exp && !Number.isNaN(exp.getTime()) ? exp.toISOString().slice(0, 10) < asOf : null,
    acknowledgments: fields.acknowledgments?.[0] ?? fields.acknowledgements?.[0] ?? null,
    hiring: fields.hiring?.[0] ?? null,
    preferredLanguages: fields["preferred-languages"]?.[0] ?? null,
    canonical: fields.canonical ?? [],
    signed,
  };
}

const empty = { contact: [], policy: null, expires: null, expired: null, acknowledgments: null, hiring: null, preferredLanguages: null, canonical: [], signed: false };

export async function check(domain: string, asOf: string): Promise<SecurityTxt> {
  const url = `https://${domain}/.well-known/security.txt`;
  try {
    const r = await get(url, { gapMs: 2000, tries: 2, timeoutMs: 20000, accept: [401, 403, 404, 410] });
    if (r.status !== 200) return { url, servedFrom: r.url, found: false, reason: `HTTP ${r.status}`, ...empty };
    const head = text(r.body.subarray(0, 512)).trimStart().toLowerCase();
    if (/html/i.test(r.contentType) || head.startsWith("<!doctype") || head.startsWith("<html"))
      return { url, servedFrom: r.url, found: false, reason: "served an HTML page, not a text file", ...empty };
    if (r.body.length > MAX_BYTES) return { url, servedFrom: r.url, found: false, reason: "larger than 32 KB", ...empty };
    const parsed = parseSecurityTxt(text(r.body), asOf);
    if (!parsed) return { url, servedFrom: r.url, found: false, reason: "no Contact field", ...empty };
    return { url, servedFrom: r.url, found: true, ...parsed };
  } catch (e) {
    return { url, servedFrom: null, found: false, reason: `request failed: ${e instanceof Error ? e.message.slice(0, 80) : "error"}`, ...empty };
  }
}

export async function run() {
  const byOrg: Record<string, SecurityTxt[]> = {};
  for (const [id, o] of Object.entries(ORGS)) {
    const results: SecurityTxt[] = [];
    for (const d of o.domains.filter((x) => x.split(".").length === 2).slice(0, 2)) results.push(await check(d, today()));
    if (results.length) byOrg[id] = results;
  }
  const body = { bySlug: {}, byOrg, byIndexId: {} };
  writeSnapshot({
    meta: {
      id: "security-txt",
      source: "TrustFit check of each vendor's /.well-known/security.txt (RFC 9116)",
      url: "https://www.rfc-editor.org/rfc/rfc9116",
      license: "TrustFit first-party observation, CC BY 4.0. The files themselves belong to each vendor; only field values are stored.",
      attribution: "Checked by TrustFit (https://trustfit-iota.vercel.app)",
      redistribute: true,
      retrievedAt: today(),
      sha256: factsHash(body),
      status: "collected",
      matching: "The organization's own registrable domains in src/orgs.ts (at most two per organization).",
      note: "security.txt tells researchers how to report a flaw. Publishing one is a small sign of a working disclosure process; lacking one does not mean the vendor ignores reports (many use a web form or a bug bounty page instead). A file past its Expires date should be treated as stale.",
    },
    ...body,
  });
}

if (isMain(import.meta.url)) await run();
