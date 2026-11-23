/**
 * disclose.io diodb (github.com/disclose/diodb): public vulnerability disclosure
 * and bug bounty programs. CC0 in the licence file, CC BY 4.0 in the README, so it
 * is credited either way. A program is matched to an organization when its policy,
 * security.txt or contact URL is on one of the organization's domains, or when it
 * is hosted on a bug bounty platform under the organization's exact name.
 * Run: npx tsx scripts/sources/diodb.ts
 */
import { ORGS, brandWords, norm, orgForUrl } from "../../src/orgs";
import { get, isMain, sha256, text, today, writeSnapshot, type Snapshot } from "../lib/open-data";

export const URL_LIST = "https://raw.githubusercontent.com/disclose/diodb/master/program-list.json";
const PLATFORMS = ["hackerone.com", "bugcrowd.com", "intigriti.com", "yeswehack.com", "app.intigriti.com"];

type RawProgram = {
  program_name: string;
  policy_url?: string;
  contact_url?: string;
  securitytxt_url?: string;
  launch_date?: string;
  offers_bounty?: string;
  safe_harbor?: string;
  policy_url_status?: string;
};
export type Program = { name: string; policyUrl: string | null; securityTxtUrl: string | null; bounty: string; safeHarbor: string; launched: string | null; policyUrlStatus: string | null; matchedBy: "domain" | "platform-name" };

const host = (u?: string) => {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};

const nameHas = (programName: string, org: string) => {
  const tokens = norm(programName).replace(/[^a-z0-9 ]/g, " ").split(" ").filter(Boolean);
  const joined = tokens.join("");
  return brandWords(org).some((w) => tokens.includes(w) || joined === w);
};

/**
 * Domain matches also need the program's name to carry the organization's brand:
 * many programs are pages hosted on a vendor's domain (acme.zendesk.com,
 * github.com/acme), and those belong to Acme, not to the host.
 */
export function matchProgram(p: RawProgram): { org: string; by: Program["matchedBy"] } | null {
  for (const u of [p.policy_url, p.securitytxt_url, p.contact_url]) {
    const org = u ? orgForUrl(u) : undefined;
    if (org && nameHas(p.program_name, org)) return { org, by: "domain" };
  }
  if (PLATFORMS.includes(host(p.policy_url))) {
    const hit = Object.entries(ORGS).find(([, o]) => norm(o.name) === norm(p.program_name));
    if (hit) return { org: hit[0], by: "platform-name" };
  }
  return null;
}

export { brandWords };

export function build(list: RawProgram[], retrievedAt: string, fileHash: string): Snapshot<never, Program[], never> {
  const byOrg: Record<string, Program[]> = {};
  for (const p of list) {
    const m = matchProgram(p);
    if (!m) continue;
    (byOrg[m.org] ??= []).push({
      name: p.program_name,
      policyUrl: p.policy_url || null,
      securityTxtUrl: p.securitytxt_url || null,
      bounty: p.offers_bounty || "not stated",
      safeHarbor: p.safe_harbor || "not stated",
      launched: p.launch_date || null,
      policyUrlStatus: p.policy_url_status || null,
      matchedBy: m.by,
    });
  }
  return {
    meta: {
      id: "diodb",
      source: "disclose.io diodb, the open vulnerability disclosure program database",
      url: "https://github.com/disclose/diodb",
      license: "CC0 1.0 (licence file); the README says CC BY 4.0, so credit is given",
      attribution: "Disclosure program data from disclose.io diodb (https://github.com/disclose/diodb)",
      redistribute: true,
      retrievedAt,
      sha256: fileHash,
      status: "collected",
      programsInList: list.length,
      matching: "Policy, security.txt or contact URL on an organization's own domain; or a program on a bug bounty platform whose name equals the organization's name exactly.",
      note: "Community-maintained. A listed program means the vendor publicly invites security reports; safe harbor says how far it promises not to pursue good-faith researchers. Not listed does not mean no program exists.",
    },
    bySlug: {},
    byOrg,
    byIndexId: {},
  };
}

export async function run() {
  const raw = (await get(URL_LIST, { timeoutMs: 120000 })).body;
  writeSnapshot(build(JSON.parse(text(raw)), today(), sha256(raw)));
}

if (isMain(import.meta.url)) await run();
