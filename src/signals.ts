import arena from "../data/snapshots/arena.json";
import aiid from "../data/snapshots/aiid.json";
import fmti from "../data/snapshots/fmti.json";
import kev from "../data/snapshots/kev.json";
import tosdr from "../data/snapshots/tosdr.json";
import wikidata from "../data/snapshots/wikidata.json";
import indexData from "../data/snapshots/index.json";
import { createHash } from "node:crypto";
import { tools } from "@/content/tools";
import type { Tool, ToolScores } from "@/lib/schema";
import { ENTITIES } from "./entities";

/** Share of the open-data value mixed into the editorial capability score. */
export const CAPABILITY_OPEN_WEIGHT = 0.5;
/** A gap this large between editorial and open data is flagged for human review. */
export const DISAGREEMENT_POINTS = 25;

/** Reported incidents in 24 months, for a single-product vendor, that trigger a review flag. */
export const RECENT_INCIDENT_REVIEW = 5;

export type Signal = {
  id: "arena-rating" | "fmti-transparency" | "kev-exploited" | "aiid-incidents" | "tosdr-grade";
  label: string;
  value: number;
  unit: string;
  detail: string;
  source: string;
  url: string;
  license: string;
  asOf: string;
  /** Human-readable form of the value, such as a letter grade. */
  display?: string;
};

export type Flag = { subscore: keyof ToolScores; editorial: number; openData: number; message: string };

type TosdrRecord = {
  serviceId: number;
  serviceName: string;
  matchedOn: string;
  scope: "exact" | "vendor";
  rating: string;
  comprehensivelyReviewed: boolean;
  serviceUpdatedAt: string;
  approvedPoints: Record<string, number>;
  link: string;
};

type WikidataRecord = { qid: string; label: string; officialWebsite: string; relatedOrganizations: string[]; link: string };

/** ToS;DR letter grade to a 0-100 value. "N/A" (not rated) produces no signal. */
export const TOSDR_VALUES: Record<string, number> = { A: 100, B: 80, C: 60, D: 40, E: 20 };
/** Flag a grade this low (D or E) when editorial icpSafe is at least this high. */
export const TOSDR_REVIEW_ICPSAFE = 80;

type AiidRecord = {
  vendorWide: boolean;
  developerIncidents: number;
  deployerIncidents: number;
  developerIncidentsLast24Months: number;
  latestDeveloperIncident: string;
  developerIncidentIds: number[];
};

const orgs = Object.values(arena.organizations);
const ratings = orgs.map((o) => o.rating);
const minR = Math.min(...ratings);
const maxR = Math.max(...ratings);
const fmtiScores = Object.values(fmti.developers).map((d) => d.score);

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function signalsFor(slug: string): Signal[] {
  const e = ENTITIES[slug] ?? {};
  const out: Signal[] = [];

  const a = e.arenaOrg ? (arena.organizations as Record<string, (typeof orgs)[number]>)[e.arenaOrg] : undefined;
  if (a) {
    out.push({
      id: "arena-rating",
      label: "Model quality (LMArena)",
      value: round1(((a.rating - minR) / (maxR - minR)) * 100),
      unit: "0-100 across the 28 developers' best models",
      detail: `Best model ${a.model}: rating ${a.rating} (${a.ratingLower} to ${a.ratingUpper}), ${a.votes} votes, rank ${a.rank}.`,
      source: arena.meta.source,
      url: arena.meta.url,
      license: arena.meta.license,
      asOf: arena.meta.publishedAt,
    });
  }

  const f = e.fmti ? (fmti.developers as Record<string, { satisfied: number; score: number }>)[e.fmti] : undefined;
  if (f) {
    out.push({
      id: "fmti-transparency",
      label: "Developer transparency (FMTI)",
      value: f.score,
      unit: `% of ${fmti.indicators} indicators disclosed`,
      detail: `${f.satisfied} of ${fmti.indicators} indicators satisfied; higher than ${Math.round((fmtiScores.filter((s) => s < f.score).length / fmtiScores.length) * 100)}% of the ${fmtiScores.length} developers scored.`,
      source: fmti.meta.source,
      url: fmti.meta.url,
      license: fmti.meta.license,
      asOf: "2025-12",
    });
  }

  const k = (kev.bySlug as Record<string, { cves: string[]; latestAdded: string }>)[slug];
  if (k) {
    out.push({
      id: "kev-exploited",
      label: "Known exploited vulnerabilities (CISA KEV)",
      value: k.cves.length,
      unit: "CVEs in the catalog for this exact product",
      detail: `${k.cves.join(", ")} (latest added ${k.latestAdded}). Exploited in the wild; remediation status is not in the dataset.`,
      source: kev.meta.source,
      url: kev.meta.url,
      license: kev.meta.license,
      asOf: kev.meta.catalogVersion,
    });
  }

  const ai = (aiid.bySlug as Record<string, AiidRecord>)[slug];
  if (ai) {
    out.push({
      id: "aiid-incidents",
      label: "Reported AI incidents (AIID)",
      value: ai.developerIncidents,
      unit: `reported incidents naming ${ai.vendorWide ? "the vendor (whole company, not only this product)" : "the developer"} as developer; allegations, not normalized by usage`,
      detail: `${ai.developerIncidentsLast24Months} in the 24 months before ${aiid.meta.latestIncidentDate}; latest ${ai.latestDeveloperIncident || "none"}. Also named as deployer in ${ai.deployerIncidents}. Most recent: ${ai.developerIncidentIds.slice(0, 3).map((id) => `https://incidentdatabase.ai/cite/${id}`).join(" ") || "none"}.`,
      source: aiid.meta.source,
      url: aiid.meta.url,
      license: aiid.meta.license,
      asOf: aiid.meta.latestIncidentDate,
    });
  }

  const t = (tosdr.bySlug as Record<string, TosdrRecord>)[slug];
  if (t && t.rating in TOSDR_VALUES) {
    const p = t.approvedPoints;
    out.push({
      id: "tosdr-grade",
      label: t.scope === "exact" ? "Terms and privacy grade (ToS;DR)" : "Terms and privacy grade (ToS;DR, parent service)",
      value: TOSDR_VALUES[t.rating],
      display: t.rating,
      unit: "grade A (best) to E on public consumer terms; A=100 down to E=20",
      detail: `${t.serviceName}: grade ${t.rating}, matched by domain ${t.matchedOn}. ${t.scope === "vendor" ? "This is the grade of the parent service, not this product. " : ""}${t.comprehensivelyReviewed ? "Comprehensively reviewed" : "Not comprehensively reviewed, so the grade rests on partial review"}; ${p.bad ?? 0} bad and ${p.blocker ?? 0} blocker points, ${p.good ?? 0} good. Covers public consumer terms, not enterprise contracts. Reviewed ${t.serviceUpdatedAt}. ${t.link}`,
      source: tosdr.meta.source,
      url: t.link,
      license: tosdr.meta.license,
      asOf: t.serviceUpdatedAt,
    });
  }
  return out;
}

/** Wikidata entity, accepted only when its official website is on the tool's own domain. */
export function entityFor(slug: string) {
  const w = (wikidata.bySlug as Record<string, WikidataRecord>)[slug];
  if (!w) return { verified: false as const, note: "No Wikidata item with an official website on this tool's domain was found." };
  return {
    verified: true as const,
    qid: w.qid,
    label: w.label,
    officialWebsite: w.officialWebsite,
    relatedOrganizations: w.relatedOrganizations,
    link: w.link,
    license: wikidata.meta.license,
    asOf: wikidata.meta.retrievedAt,
    note: "Verified by official website. Related organizations come from Wikidata (parent, owner or developer properties) and can include people or holding companies; use them to ask who is behind the product, not to infer the vendor's conduct.",
  };
}

/** Editorial scores with open-data blending applied where a signal exists. */
export function effectiveScores(tool: Tool): { scores: ToolScores; basis: Record<keyof ToolScores, "editorial" | "editorial+open-data"> } {
  const basis = { reputation: "editorial", approval: "editorial", capability: "editorial", icpSafe: "editorial" } as Record<keyof ToolScores, "editorial" | "editorial+open-data">;
  const scores = { ...tool.scores };
  const arenaSig = signalsFor(tool.slug).find((s) => s.id === "arena-rating");
  if (arenaSig) {
    scores.capability = clamp(round1(tool.scores.capability * (1 - CAPABILITY_OPEN_WEIGHT) + arenaSig.value * CAPABILITY_OPEN_WEIGHT));
    basis.capability = "editorial+open-data";
  }
  return { scores, basis };
}

/** Where independent open data disagrees with a hand-entered score by a lot. */
export function crossChecks(tool: Tool): Flag[] {
  const flags: Flag[] = [];
  const sigs = signalsFor(tool.slug);
  const arenaSig = sigs.find((s) => s.id === "arena-rating");
  if (arenaSig && Math.abs(tool.scores.capability - arenaSig.value) > DISAGREEMENT_POINTS) {
    flags.push({
      subscore: "capability",
      editorial: tool.scores.capability,
      openData: arenaSig.value,
      message: "Editorial capability and LMArena rating differ by more than the review threshold.",
    });
  }
  const f = sigs.find((s) => s.id === "fmti-transparency");
  if (f) {
    const pct = (fmtiScores.filter((s) => s < f.value).length / fmtiScores.length) * 100;
    if (Math.abs(tool.scores.reputation - pct) > 2 * DISAGREEMENT_POINTS) {
      flags.push({
        subscore: "reputation",
        editorial: tool.scores.reputation,
        openData: round1(pct),
        message: "Editorial reputation sits far from the developer's transparency percentile (FMTI). Transparency is one input to reputation, not all of it; review the editorial score.",
      });
    }
  }
  const ai = (aiid.bySlug as Record<string, AiidRecord>)[tool.slug];
  if (ai && !ai.vendorWide && ai.developerIncidentsLast24Months >= RECENT_INCIDENT_REVIEW && tool.scores.reputation >= 70) {
    flags.push({
      subscore: "reputation",
      editorial: tool.scores.reputation,
      openData: ai.developerIncidentsLast24Months,
      message: `AIID lists ${ai.developerIncidentsLast24Months} reported incidents naming this developer in the last 24 months while editorial reputation is ${tool.scores.reputation}. Incidents are allegations and are not normalized by usage; read them before changing the score.`,
    });
  }
  const tr = (tosdr.bySlug as Record<string, TosdrRecord>)[tool.slug];
  if (tr && tr.scope === "exact" && (tr.rating === "D" || tr.rating === "E") && tool.scores.icpSafe >= TOSDR_REVIEW_ICPSAFE) {
    flags.push({
      subscore: "icpSafe",
      editorial: tool.scores.icpSafe,
      openData: TOSDR_VALUES[tr.rating],
      message: `ToS;DR grades this service's public terms ${tr.rating} while editorial icpSafe is ${tool.scores.icpSafe}. The grade covers consumer terms and may not apply to a business plan; read the cited points and the vendor's enterprise terms before relying on the score.`,
    });
  }
  return flags;
}

export function dataSources() {
  // Sources downloaded as one file record that file's hash; API-derived snapshots record the hash of the stored facts.
  const snapshotHash = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
  const hash = (m: Record<string, unknown>, stored: unknown) => ((m.sha256 ?? m.incidentsCsvSha256 ?? snapshotHash(stored)) as string);
  return [
    { m: arena.meta, d: arena },
    { m: fmti.meta, d: fmti },
    { m: kev.meta, d: kev },
    { m: aiid.meta, d: aiid },
    { m: tosdr.meta, d: tosdr.bySlug },
    { m: wikidata.meta, d: wikidata.bySlug },
    { m: indexData.meta, d: indexData.entries },
  ].map(({ m, d }) => ({ source: m.source, url: m.url, license: m.license, retrievedAt: m.retrievedAt, sha256: hash(m as Record<string, unknown>, d), note: m.note }));
}

/** Tools with at least one open-data signal. */
export const COVERAGE_SLUGS = tools.filter((t) => signalsFor(t.slug).length > 0).map((t) => t.slug);
