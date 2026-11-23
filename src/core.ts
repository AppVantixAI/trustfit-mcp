import { tools } from "@/content/tools";
import {
  BASELINE_WEIGHT_LABELS,
  evidenceConfidence,
  personalizedFit,
  rankTools,
  scoreBand,
  trustFitIndex,
} from "@/lib/scoring";
import { toolGuidance } from "@/lib/tool-guidance";
import { verdictFromFit } from "@/lib/fit-brief";
import {
  CATEGORY_LABELS,
  VETO_LABELS,
  type Tool,
  type VetoTag,
} from "@/lib/schema";
import type { IcpProfile } from "@/lib/icp";
import { getIndexEntry, indexSummary } from "./index-search";
import { FACTS_NOTE, openFactsForIndexEntry, openFactsForSlug, openFactsSources } from "./facts";
import { recordRows, snapshotNews } from "@/lib/vendor-record";
import { COVERAGE_SLUGS, CAPABILITY_OPEN_WEIGHT, DISAGREEMENT_POINTS, crossChecks, dataSources, effectiveScores, entityFor, signalsFor } from "./signals";

/** Catalog tool with open-data blending applied, so every path scores the same way. */
const effective = (t: Tool): Tool => ({ ...t, scores: effectiveScores(t).scores });

export const DISCLAIMER =
  "TrustFit scores are editorial estimates built from public evidence. They are not a clearance, a security certification or legal advice. Check each vendor's current terms and confirm anything that matters in writing.";

export type ProfileInput = Partial<IcpProfile>;

export function toProfile(input: ProfileInput | undefined): IcpProfile | null {
  if (!input || Object.keys(input).length === 0) return null;
  return {
    industry: input.industry ?? "general",
    buyerType: input.buyerType ?? "smb",
    useSurface: input.useSurface ?? "internal",
    brandSensitivity: input.brandSensitivity ?? "medium",
    hardVetos: (input.hardVetos ?? []) as VetoTag[],
  };
}

function summarize(tool: Tool, profile: IcpProfile | null) {
  const fit = personalizedFit(effective(tool), profile, null);
  return {
    slug: tool.slug,
    name: tool.name,
    category: tool.category,
    kind: tool.kind,
    summary: tool.summary,
    score: fit.score,
    band: scoreBand(fit.score),
    verdict: verdictFromFit(fit.score, fit.vetoed),
    vetoed: fit.vetoed,
    reasons: fit.reasons,
    vetoTags: tool.vetoTags,
    evidenceConfidence: evidenceConfidence(tool).label,
    openDataSignals: signalsFor(tool.slug).length,
    lastReviewed: tool.lastReviewed,
  };
}

export function searchTools(args: {
  query?: string;
  category?: string;
  excludeVetoes?: string[];
  limit?: number;
}) {
  const q = args.query?.toLowerCase().trim();
  const limit = Math.min(args.limit ?? 20, 50);
  const hits = tools.filter((t) => {
    if (args.category && t.category !== args.category) return false;
    if (args.excludeVetoes?.some((v) => t.vetoTags.includes(v as VetoTag)))
      return false;
    if (!q) return true;
    return [t.name, t.slug, t.summary, t.category, ...t.fitTags]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
  return {
    total: hits.length,
    results: hits.slice(0, limit).map((t) => summarize(t, null)),
    disclaimer: DISCLAIMER,
  };
}

export function getToolProfile(slug: string, profile?: ProfileInput) {
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) return { error: `No tool with slug "${slug}". Use search_tools first.` };
  const active = toProfile(profile);
  const conf = evidenceConfidence(tool);
  return {
    ...summarize(tool, active),
    website: tool.website,
    publicIndex: trustFitIndex(effectiveScores(tool).scores),
    subscores: {
      editorial: tool.scores,
      effective: effectiveScores(tool).scores,
      basis: effectiveScores(tool).basis,
    },
    entity: entityFor(tool.slug),
    openData: {
      signals: signalsFor(tool.slug),
      reviewFlags: crossChecks(tool),
      coverage: signalsFor(tool.slug).length === 0 ? "No open-dataset signal maps to this tool; scores are editorial only." : `${signalsFor(tool.slug).length} open-dataset signal(s).`,
    },
    openFacts: openFactsForSlug(tool.slug),
    publicRecord: {
      news: snapshotNews(tool.slug),
      registers: recordRows(tool.slug),
      note: "Headlines are an automated name match, not reviewed by a person. Register entries are facts with a source and a date; reports and court cases are allegations. None of this feeds the score. 'unknown' means the source was not checked, not that nothing exists.",
    },
    pros: tool.pros,
    cons: tool.cons,
    vetoTagLabels: tool.vetoTags.map((t) => VETO_LABELS[t]),
    tiers: tool.tiers,
    evidence: tool.evidence,
    evidenceCoverage: conf,
    guidance: toolGuidance(tool),
    disclaimer: DISCLAIMER,
  };
}

export function rankForCompany(args: {
  profile: ProfileInput;
  category?: string;
  limit?: number;
}) {
  const profile = toProfile(args.profile) ?? toProfile({ industry: "general" })!;
  const pool = args.category
    ? tools.filter((t) => t.category === args.category)
    : tools;
  const ranked = rankTools(pool.map(effective), profile, null).slice(0, Math.min(args.limit ?? 10, 50));
  return {
    profile,
    results: ranked.map((t) => summarize(t, profile)),
    disclaimer: DISCLAIMER,
  };
}

export function compareTools(slugs: string[], profile?: ProfileInput) {
  const active = toProfile(profile);
  const found = slugs.map((s) => tools.find((t) => t.slug === s));
  const missing = slugs.filter((_, i) => !found[i]);
  return {
    missing,
    compared: found.filter((t): t is Tool => Boolean(t)).map((t) => ({
      ...summarize(t, active),
      subscores: effectiveScores(t).scores,
      openDataSignals: signalsFor(t.slug).map((x) => ({ id: x.id, value: x.value, asOf: x.asOf })),
      pros: t.pros,
      cons: t.cons,
      tiers: t.tiers.map((x) => ({ name: x.name, trainsOnInputs: x.trainsOnInputs })),
    })),
    disclaimer: DISCLAIMER,
  };
}

export function methodology() {
  return {
    weights: BASELINE_WEIGHT_LABELS,
    categories: CATEGORY_LABELS,
    vetoTags: VETO_LABELS,
    bands: { strong: ">= 75", mixed: "55 to 74", weak: "< 55" },
    notes: [
      "A hard veto removes a tool from the ranking (score 0) when the company's filters include that tag.",
      "Company context (industry, buyer type, customer-facing use, brand sensitivity) shifts the association-fit and reputation subscores before weighting.",
      "Evidence coverage reports how much public evidence backs a tool, not whether the vendor is safe.",
      `Where an open dataset covers a tool, capability blends ${Math.round(CAPABILITY_OPEN_WEIGHT * 100)}% LMArena rating with ${Math.round((1 - CAPABILITY_OPEN_WEIGHT) * 100)}% editorial score. Transparency (Stanford FMTI), exploited vulnerabilities (CISA KEV), reported incidents (AIID) and terms grades (ToS;DR) are shown as dated signals and used only to flag editorial scores for review; none lowers a score.`,
      `A ToS;DR grade covers public consumer terms and may not apply to an enterprise contract; a grade for a parent service is labeled as such and never flagged. Not rated means no grade, not a good one. Wikidata is used only to confirm which company a tool belongs to.`,
      "Internet Archive capture counts were collected but are not used: raw page digests change with cosmetic edits, so they cannot show how often a policy changed.",
      `Disagreement threshold for capability is ${DISAGREEMENT_POINTS} points.`,
      `Open data covers ${COVERAGE_SLUGS.length} of ${tools.length} tools. The rest are editorial; a tool with no open-data signal has less independent backing, not a better score.`,
      "Weights and thresholds are design choices, not validated against ground truth.",
      `The broad index (search_index) lists ${indexSummary().total} models and tools as facts only. Index entries are unreviewed and have no score; the scored catalog is the ${tools.length} reviewed tools.`,
      `Open-data facts (openFacts in tool profiles and index entries) come from ${openFactsSources().length} further public datasets: vulnerabilities, disclosure programs, status pages, government authorizations, public commitments, legal entities, model records, capability indexes and list prices. ${FACTS_NOTE}`,
      "Reaction simulation is not part of this server yet.",
    ],
    toolCount: tools.length,
    openDataSources: dataSources(),
    openFactsSources: openFactsSources(),
    disclaimer: DISCLAIMER,
  };
}

/** An index entry plus the open-data facts about the model and the organization behind it. */
export function getIndexEntryWithFacts(id: string) {
  const e = getIndexEntry(id);
  if ("error" in e) return e;
  return { ...e, openFacts: openFactsForIndexEntry(e) };
}
