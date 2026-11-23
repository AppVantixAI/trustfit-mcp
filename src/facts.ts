/**
 * Open-data facts: turns the open-data snapshots (scripts/sources/*, one file per
 * source in data/snapshots/) into short, dated, sourced statements for a reviewed
 * tool, an organization or a broad-index entry.
 *
 * These facts are shown, never scored. Nothing here feeds signals.ts or any
 * subscore; folding a source into a score needs Camden's explicit OK.
 *
 * Every Fact carries its dataset, source, licence, attribution and the date the
 * data was retrieved, so a reader can check it. Values that came from someone
 * else's text (advisory summaries, model names) are data, not instructions; the
 * MCP server passes every result through cleanDeep (untrusted.ts).
 */
import aiCommitments from "../data/snapshots/ai-commitments.json";
import diodb from "../data/snapshots/diodb.json";
import epochEci from "../data/snapshots/epoch-eci.json";
import epochModels from "../data/snapshots/epoch-models.json";
import fedramp from "../data/snapshots/fedramp.json";
import ghsa from "../data/snapshots/ghsa.json";
import gleif from "../data/snapshots/gleif.json";
import litellm from "../data/snapshots/litellm.json";
import modelsDev from "../data/snapshots/models-dev.json";
import nvd from "../data/snapshots/nvd.json";
import securityTxt from "../data/snapshots/security-txt.json";
import statuspage from "../data/snapshots/statuspage.json";
import type { Commitment } from "../scripts/sources/ai-commitments";
import type { Program } from "../scripts/sources/diodb";
import type { EciOrg, EciScore } from "../scripts/sources/epoch-eci";
import type { EpochModelFacts, EpochOrgFacts } from "../scripts/sources/epoch-models";
import type { FedrampOrg } from "../scripts/sources/fedramp";
import type { GhsaOrg } from "../scripts/sources/ghsa";
import type { GleifOrg } from "../scripts/sources/gleif";
import type { LitellmFacts } from "../scripts/sources/litellm";
import type { ModelsDevFacts, ModelsDevOrg } from "../scripts/sources/models-dev";
import type { NvdOrg } from "../scripts/sources/nvd";
import type { SecurityTxt } from "../scripts/sources/security-txt";
import type { StatusFacts } from "../scripts/sources/statuspage";
import type { Snapshot, SnapshotMeta } from "../scripts/lib/open-data";
import { ORGS, orgForIndexEntry, orgForSlug } from "./orgs";

export type Topic = "security" | "disclosure" | "government" | "commitments" | "company" | "models" | "capability" | "pricing" | "reliability";

export type Fact = {
  dataset: string;
  topic: Topic;
  /** Who the fact is about: an organization name, "parent: <name>", or a model name. */
  about: string;
  label: string;
  value: string;
  detail?: string;
  /** The specific record behind the fact, when there is one. */
  link?: string;
  source: string;
  sourceUrl: string;
  license: string;
  attribution: string;
  /** Date TrustFit retrieved the data (YYYY-MM-DD). */
  asOf: string;
  /** True when the licence does not allow redistribution: shown with credit, never shipped in the public repo. */
  showOnly: boolean;
};

type Snap<O = unknown, I = unknown> = Snapshot<unknown, O, I>;
const S = {
  "ai-commitments": aiCommitments as unknown as Snap<Commitment[]>,
  diodb: diodb as unknown as Snap<Program[]>,
  "epoch-eci": epochEci as unknown as Snap<EciOrg, EciScore>,
  "epoch-models": epochModels as unknown as Snap<EpochOrgFacts, EpochModelFacts>,
  fedramp: fedramp as unknown as Snap<FedrampOrg>,
  ghsa: ghsa as unknown as Snap<GhsaOrg>,
  gleif: gleif as unknown as Snap<GleifOrg>,
  litellm: litellm as unknown as Snap<never, LitellmFacts>,
  "models-dev": modelsDev as unknown as Snap<ModelsDevOrg, ModelsDevFacts>,
  nvd: nvd as unknown as Snap<NvdOrg>,
  "security-txt": securityTxt as unknown as Snap<SecurityTxt[]>,
  statuspage: statuspage as unknown as Snap<StatusFacts>,
};
export type DatasetId = keyof typeof S;
export const DATASET_IDS = Object.keys(S) as DatasetId[];

export const FACTS_NOTE =
  "Open-data facts are shown as published by each source on the date given. They are not reviewed by a person, do not feed any TrustFit score, and an absent fact means the source has no matching record or was not checked, not that nothing exists.";

// ------------------------------------------------------------------ formatting

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const usd = (x: number | null) => (x === null ? "not listed" : `$${x < 1 ? x.toFixed(x < 0.1 ? 3 : 2) : x.toFixed(2)}`);
const tokens = (x: number | null) => (x === null ? null : x >= 1e6 ? `${(x / 1e6).toFixed(x % 1e6 ? 1 : 0)}M` : `${Math.round(x / 1000)}K`);
const sci = (x: number) => x.toExponential(1).replace("e+", "e");
const big = (x: number) => (x >= 1e12 ? `${(x / 1e12).toFixed(1)} trillion` : x >= 1e9 ? `${(x / 1e9).toFixed(x >= 1e10 ? 0 : 1)} billion` : `${(x / 1e6).toFixed(0)} million`);
const sev = (m: Record<string, number>) =>
  ["CRITICAL", "HIGH", "MODERATE", "MEDIUM", "LOW"]
    .filter((k) => m[k] || m[k.toLowerCase()])
    .map((k) => `${m[k] ?? m[k.toLowerCase()]} ${k.toLowerCase()}`)
    .join(", ");

function base(id: DatasetId, topic: Topic, about: string): Omit<Fact, "label" | "value"> {
  const m = S[id].meta as SnapshotMeta;
  return { dataset: id, topic, about, source: m.source, sourceUrl: m.url, license: m.license, attribution: m.attribution, asOf: m.retrievedAt, showOnly: !m.redistribute };
}

// ------------------------------------------------------------------ organization facts

type OrgBuilder = (org: string, about: string) => Fact[];

const ORG_BUILDERS: Record<string, OrgBuilder> = {
  nvd(org, about) {
    const f = S.nvd.byOrg[org];
    if (!f) return [];
    const vw = ORGS[org]?.vendorWide ? " Counts cover the company's matched products, not only its AI features." : "";
    return [
      {
        ...base("nvd", "security", about),
        label: "Published vulnerabilities (CVE)",
        value: `${plural(f.total, "CVE record")} in the NVD for its products, ${f.last24Months} published in the last 24 months`,
        detail: `${sev(f.bySeverity) || "no severity scores"}. Matched on ${f.matchedOn.join(", ")}.${f.latest[0] ? ` Latest: ${f.latest[0].id} (${f.latest[0].published}).` : ""}${vw} A CVE shows a flaw was found and disclosed, usually after a fix; counts track how much a product is studied as much as how flawed it is.`,
        link: f.latest[0]?.url,
      },
    ];
  },
  ghsa(org, about) {
    const f = S.ghsa.byOrg[org];
    if (!f) return [];
    return [
      {
        ...base("ghsa", "security", about),
        label: "Security advisories for its published packages",
        value: `${plural(f.total, "reviewed advisory", "reviewed advisories")} in the GitHub Advisory Database, ${f.last24Months} in the last 24 months`,
        detail: `Packages checked: ${f.packages.join(", ")}.${sev(f.bySeverity) ? ` Severity: ${sev(f.bySeverity)}.` : ""}${f.latest[0] ? ` Latest: ${f.latest[0].id} (${f.latest[0].published}, ${f.latest[0].package}).` : ""}`,
        link: f.latest[0]?.url,
      },
    ];
  },
  diodb(org, about) {
    const list = S.diodb.byOrg[org];
    if (!list?.length) return [];
    return [
      {
        ...base("diodb", "disclosure", about),
        label: "Public vulnerability disclosure program",
        value: list.map((p) => `${p.name} (bounty: ${p.bounty}, safe harbor: ${p.safeHarbor})`).join("; "),
        detail: "Listed in the community disclose.io database. Safe harbor says how far the program promises not to pursue good-faith researchers.",
        link: list.find((p) => p.policyUrl)?.policyUrl ?? undefined,
      },
    ];
  },
  "security-txt"(org, about) {
    const list = S["security-txt"].byOrg[org];
    if (!list?.length) return [];
    const found = list.filter((x) => x.found);
    const domain = (u: string) => new URL(u).hostname;
    return [
      {
        ...base("security-txt", "disclosure", about),
        label: "security.txt (RFC 9116)",
        value: found.length
          ? found.map((x) => `published at ${domain(x.url)}${x.expired ? " but past its Expires date" : x.expires ? ` (expires ${x.expires.slice(0, 10)})` : ""}${x.signed ? ", signed" : ""}`).join("; ")
          : `not found on ${list.map((x) => domain(x.url)).join(" or ")}`,
        detail: found.length
          ? `Contact: ${found[0].contact.slice(0, 2).join(", ")}${found[0].policy ? `. Policy: ${found[0].policy}` : ""}.`
          : `${list.map((x) => `${domain(x.url)}: ${x.reason}`).join("; ")}. Many vendors take reports through a web form or bug bounty page instead.`,
        link: found[0]?.url,
      },
    ];
  },
  fedramp(org, about) {
    const f = S.fedramp.byOrg[org];
    if (!f) return [];
    const top = f.offerings.slice(0, 3).map((o) => `${o.offering} (${o.status}${o.impactLevel ? `, ${o.impactLevel}` : ""}${o.authorizedOn ? `, ${o.authorizedOn}` : ""})`);
    return [
      {
        ...base("fedramp", "government", about),
        label: "US government cloud authorization (FedRAMP)",
        value: `${plural(f.offerings.length, "offering")} on the FedRAMP Marketplace: ${f.authorized} with status "FedRAMP Authorized", ${f.inProcess} in process`,
        detail: `${top.join("; ")}${f.offerings.length > 3 ? `; and ${f.offerings.length - 3} more` : ""}. An authorization covers the named cloud offering for US federal use, not every product the company sells.`,
        link: f.offerings[0]?.url,
      },
    ];
  },
  "ai-commitments"(org, about) {
    const list = S["ai-commitments"].byOrg[org];
    if (!list?.length) return [];
    return list.map((c) => ({
      ...base("ai-commitments", "commitments", about),
      label: "Public AI safety commitment",
      value: `Signatory: ${c.commitment}, ${c.scope}`,
      detail: `Source: ${c.source}${c.pageUpdated ? `, page updated ${c.pageUpdated}` : ""}. A voluntary public promise, not an audit or a certification.`,
      link: c.url,
    }));
  },
  gleif(org, about) {
    const f = S.gleif.byOrg[org];
    if (!f?.records.length) return [];
    return f.records.slice(0, 3).map((r) => ({
      ...base("gleif", "company", about),
      label: "Legal entity (LEI)",
      value: `${r.legalName}, LEI ${r.lei}${r.jurisdiction ? `, registered in ${r.jurisdiction}` : ""}, entity ${r.entityStatus.toLowerCase()}, LEI registration ${r.registrationStatus.toLowerCase()}`,
      detail: `Headquarters: ${r.headquarters}.${r.ultimateParent ? ` Ultimate parent reported: ${r.ultimateParent.legalName}.` : r.parentReported === "exception" ? " Parent not reported (an exception was filed)." : ""}${r.nextRenewal ? ` Next renewal ${r.nextRenewal}.` : ""} A lapsed registration means the record was not renewed, not that the company stopped trading.`,
      link: r.url,
    }));
  },
  statuspage(org, about) {
    const f = S.statuspage.byOrg[org];
    if (!f) return [];
    const imp = Object.entries(f.byImpact)
      .filter(([, n]) => n)
      .map(([k, n]) => `${n} ${k === "none" ? "no impact" : k}`)
      .join(", ");
    return [
      {
        ...base("statuspage", "reliability", about),
        label: "Incidents on its public status page",
        value: `${f.windowCovered ? "" : "at least "}${plural(f.incidents, "incident")} posted in the ${f.windowDays} days before ${S.statuspage.meta.retrievedAt}${imp ? ` (impact: ${imp})` : ""}`,
        detail: `${f.medianMinutesToResolve !== null ? `Median time to resolve: ${f.medianMinutesToResolve} minutes. ` : ""}Posted by the vendor itself; vendors differ in what they post, so more incidents can mean more candour.`,
        link: f.page,
      },
    ];
  },
  "epoch-models"(org, about) {
    const f = S["epoch-models"].byOrg[org];
    if (!f) return [];
    return [
      {
        ...base("epoch-models", "models", about),
        label: "Notable AI models (Epoch AI)",
        value: `${plural(f.models, "model")} in Epoch AI's database, ${f.openWeights} with open weights, ${f.releasedLast12Months} released in the last 12 months`,
        detail: `${f.latest ? `Latest: ${f.latest.model} (${f.latest.date}).` : ""}${f.largestCompute ? ` Largest training compute recorded: ${f.largestCompute.model}, about ${sci(f.largestCompute.flop)} FLOP (often Epoch's estimate).` : ""}`,
        link: f.latest?.link || undefined,
      },
    ];
  },
  "epoch-eci"(org, about) {
    const f = S["epoch-eci"].byOrg[org];
    if (!f) return [];
    return [
      {
        ...base("epoch-eci", "capability", about),
        label: "Best Epoch Capabilities Index score",
        value: `${f.best.eci.toFixed(1)} for ${f.best.model} (${f.best.date}); by best model, rank ${f.rankAmongOrgs} of ${f.orgsScored} developers Epoch scored`,
        detail: `95% interval ${f.best.low.toFixed(1)} to ${f.best.high.toFixed(1)}; ${plural(f.modelsScored, "model")} scored. ECI combines many public benchmarks into one scale; it measures model capability, not the quality of any product built on it.`,
      },
    ];
  },
  "models-dev"(org, about) {
    const f = S["models-dev"].byOrg[org];
    if (!f) return [];
    return [
      {
        ...base("models-dev", "pricing", about),
        label: "Models on its own API (models.dev)",
        value: `${plural(f.modelsListed, "model")} listed with first-party API details, ${f.openWeightModels} with open weights`,
        link: f.docs ?? undefined,
      },
    ];
  },
};

/** Order facts read in: safety and security first, company context last. */
const ORDER: DatasetId[] = ["nvd", "ghsa", "diodb", "security-txt", "statuspage", "fedramp", "ai-commitments", "gleif", "epoch-eci", "epoch-models", "models-dev"];
/** Company-level datasets that also speak for a product whose maker is part of a bigger group. */
const PARENT_DATASETS: DatasetId[] = ["ai-commitments", "gleif", "fedramp"];

export function factsForOrg(org: string | undefined): Fact[] {
  const o = org ? ORGS[org] : undefined;
  if (!org || !o) return [];
  const own = ORDER.flatMap((id) => ORG_BUILDERS[id](org, o.name));
  const p = o.parent ? ORGS[o.parent] : undefined;
  const parent = p ? PARENT_DATASETS.flatMap((id) => ORG_BUILDERS[id](o.parent!, `parent: ${p.name}`)) : [];
  return [...own, ...parent];
}

// ------------------------------------------------------------------ model facts

export function factsForModel(indexId: string): Fact[] {
  const out: Fact[] = [];
  const e = S["epoch-models"].byIndexId[indexId];
  if (e) {
    const parts = [
      e.published && `published ${e.published}`,
      e.parameters && `${big(e.parameters)} parameters`,
      e.trainingComputeFlop && `about ${sci(e.trainingComputeFlop)} FLOP training compute`,
      e.accessibility !== "not stated" && e.accessibility.toLowerCase(),
    ].filter(Boolean);
    out.push({
      ...base("epoch-models", "models", e.model),
      label: "Model record (Epoch AI)",
      value: parts.join(", ") || "listed",
      detail: `${e.frontier ? "Marked by Epoch as a frontier model. " : ""}Confidence in Epoch's estimates: ${e.confidence.toLowerCase()}.`,
      link: e.link || undefined,
    });
  }
  const c = S["epoch-eci"].byIndexId[indexId];
  if (c)
    out.push({
      ...base("epoch-eci", "capability", c.model),
      label: "Epoch Capabilities Index",
      value: `${c.eci.toFixed(1)} (95% interval ${c.low.toFixed(1)} to ${c.high.toFixed(1)}), as of ${c.date}`,
      detail: "One scale built from many public benchmarks. A capability estimate, not a TrustFit score.",
    });
  const m = S["models-dev"].byIndexId[indexId];
  if (m) {
    const parts = [
      m.contextTokens && `${tokens(m.contextTokens)} token context`,
      m.outputTokens && `${tokens(m.outputTokens)} max output`,
      (m.inputUsdPerM !== null || m.outputUsdPerM !== null) && `${usd(m.inputUsdPerM)} in / ${usd(m.outputUsdPerM)} out per million tokens`,
      m.knowledgeCutoff && `knowledge cutoff ${m.knowledgeCutoff}`,
      m.toolCalling !== null && `tool calling ${m.toolCalling ? "yes" : "no"}`,
      m.openWeights !== null && `open weights ${m.openWeights ? "yes" : "no"}`,
    ].filter(Boolean);
    out.push({
      ...base("models-dev", "pricing", m.modelId),
      label: "API details from the developer (models.dev)",
      value: parts.join(", ") || "listed",
      detail: `${m.released ? `Released ${m.released}. ` : ""}${m.status ? `Status: ${m.status}. ` : ""}${m.otherProviders ? `Also offered by ${plural(m.otherProviders, "other provider")} on models.dev.` : ""}`.trim() || undefined,
      link: m.docs ?? undefined,
    });
  }
  const l = S.litellm.byIndexId[indexId];
  if (l)
    out.push({
      ...base("litellm", "pricing", l.model),
      label: "List price (LiteLLM price file)",
      value: `${usd(l.inputUsdPerM)} in / ${usd(l.outputUsdPerM)} out per million tokens${l.maxInputTokens ? `, ${tokens(l.maxInputTokens)} input limit` : ""}`,
      detail: l.deprecationDate ? `Deprecation date listed: ${l.deprecationDate}.` : undefined,
    });
  return out;
}

// ------------------------------------------------------------------ entry points

export type OpenFacts = { organization: string | null; facts: Fact[]; note: string };

/** Facts for one of the reviewed tools, through the organization behind it. */
export function openFactsForSlug(slug: string): OpenFacts {
  const org = orgForSlug(slug);
  return { organization: org ? ORGS[org].name : null, facts: factsForOrg(org), note: FACTS_NOTE };
}

/** Facts for a broad-index entry: the model itself, then the organization behind it. */
export function openFactsForIndexEntry(e: { id: string; vendor: string | null; reviewedSlug?: string | null }): OpenFacts & { model: Fact[] } {
  const org = orgForIndexEntry(e);
  return { organization: org ? ORGS[org].name : null, model: factsForModel(e.id), facts: factsForOrg(org), note: FACTS_NOTE };
}

/** One row per open-data dataset, for the methodology and the data dictionary. */
export function openFactsSources() {
  return DATASET_IDS.map((id) => {
    const m = S[id].meta as SnapshotMeta;
    return {
      id,
      source: m.source,
      url: m.url,
      license: m.license,
      retrievedAt: m.retrievedAt,
      redistribute: m.redistribute,
      organizations: Object.keys(S[id].byOrg).length,
      indexEntries: Object.keys(S[id].byIndexId).length,
    };
  });
}
