import {
  DEFAULT_WEIGHTS,
  ICP_WEIGHTS,
  type Tool,
  type ToolScores,
  type VetoTag,
} from "./schema";
import type { IcpProfile } from "./icp";
import type { CompanyProfile } from "./company";
import { toMatchVetos } from "./company";

export function trustFitIndex(
  scores: ToolScores,
  weights: typeof DEFAULT_WEIGHTS | typeof ICP_WEIGHTS = DEFAULT_WEIGHTS,
): number {
  const raw =
    scores.reputation * weights.reputation +
    scores.approval * weights.approval +
    scores.capability * weights.capability +
    scores.icpSafe * weights.icpSafe;
  return Math.round(raw * 10) / 10;
}

export function profileFromCompany(company: CompanyProfile): IcpProfile {
  return {
    industry: mapIndustry(company.icp.industry),
    buyerType: company.icp.buyerType,
    useSurface:
      company.icp.useSurface === "mixed"
        ? "customer-facing"
        : company.icp.useSurface,
    brandSensitivity: company.icp.brandSensitivity,
    hardVetos: toMatchVetos(company.icp.hardVetos),
  };
}

function mapIndustry(raw: string): IcpProfile["industry"] {
  const v = raw.toLowerCase();
  if (v.includes("health")) return "healthcare";
  if (v.includes("financ") || v.includes("bank") || v.includes("insur"))
    return "finance";
  if (v.includes("legal") || v.includes("law")) return "legal";
  if (v.includes("educat") || v.includes("school")) return "education";
  if (v.includes("manufact") || v.includes("industrial")) return "manufacturing";
  if (v.includes("consumer") || v.includes("retail") || v.includes("ecommerce"))
    return "consumer";
  if (v.includes("saas") || v.includes("software") || v.includes("tech"))
    return "saas";
  return "general";
}

export function personalizedFit(
  tool: Tool,
  profile: IcpProfile | null,
  company?: CompanyProfile | null,
): { score: number; reasons: string[]; vetoed: boolean } {
  if (!profile && !company) {
    return {
      score: trustFitIndex(tool.scores),
      reasons: ["Using default general B2B weights."],
      vetoed: false,
    };
  }

  const active = company ? profileFromCompany(company) : profile!;
  const hitVetos = tool.vetoTags.filter((tag) =>
    active.hardVetos.includes(tag),
  );
  if (hitVetos.length > 0) {
    return {
      score: 0,
      vetoed: true,
      reasons: hitVetos.map(
        (tag) => `Hard veto: ${tag} matches your company filters.`,
      ),
    };
  }

  let adjusted: ToolScores = { ...tool.scores };
  const reasons: string[] = [];

  if (active.useSurface === "customer-facing") {
    adjusted = {
      ...adjusted,
      icpSafe: clamp(adjusted.icpSafe - 8),
      reputation: clamp(adjusted.reputation - 4),
    };
    reasons.push(
      "Customer-facing work raises the bar on reputation and brand association.",
    );
  }

  if (active.brandSensitivity === "high") {
    adjusted = {
      ...adjusted,
      icpSafe: clamp(adjusted.icpSafe - 10),
      reputation: clamp(adjusted.reputation - 6),
    };
    reasons.push("High brand sensitivity penalizes controversy-prone vendors.");
  } else if (active.brandSensitivity === "low") {
    adjusted = {
      ...adjusted,
      icpSafe: clamp(adjusted.icpSafe + 4),
    };
    reasons.push("Lower brand sensitivity softens association-fit penalties.");
  }

  if (active.buyerType === "regulated") {
    adjusted = {
      ...adjusted,
      icpSafe: clamp(adjusted.icpSafe - 12),
    };
    reasons.push(
      "Regulated buyers need stronger enterprise posture and clearer data terms.",
    );
    if (tool.vetoTags.includes("weak-enterprise-controls")) {
      adjusted = { ...adjusted, icpSafe: clamp(adjusted.icpSafe - 15) };
      reasons.push("Weak enterprise controls are costly in regulated contexts.");
    }
  }

  if (active.buyerType === "enterprise") {
    const hasEnterpriseTier = tool.tiers.some((t) =>
      /enterprise|business|team|work/i.test(t.name),
    );
    if (hasEnterpriseTier) {
      adjusted = { ...adjusted, icpSafe: clamp(adjusted.icpSafe + 5) };
      reasons.push("Enterprise or team tier available.");
    }
  }

  if (
    active.industry === "healthcare" ||
    active.industry === "finance" ||
    active.industry === "legal"
  ) {
    if (tool.vetoTags.includes("training-on-inputs")) {
      adjusted = { ...adjusted, icpSafe: clamp(adjusted.icpSafe - 18) };
      reasons.push(
        `${active.industry} ICPs punish training-on-inputs defaults.`,
      );
    }
    if (tool.vetoTags.includes("opaque-data-policy")) {
      adjusted = { ...adjusted, icpSafe: clamp(adjusted.icpSafe - 10) };
      reasons.push("Opaque data policy clashes with sensitive vertical buyers.");
    }
  }

  if (company) {
    const productBlob = company.products
      .map((p) => `${p.name} ${p.description}`)
      .join(" ")
      .toLowerCase();
    const brandBlob = `${company.brand.positioning} ${company.brand.voice} ${company.icp.summary}`.toLowerCase();
    const haystack = `${productBlob} ${brandBlob}`;

    const boosts: Array<{ needle: RegExp; tag: string; delta: number; why: string }> = [
      {
        needle: /sales|crm|pipeline|outbound/,
        tag: "crm",
        delta: 6,
        why: "Your products mention sales or CRM workflows.",
      },
      {
        needle: /code|developer|api|sdk|engineer/,
        tag: "coding",
        delta: 6,
        why: "Your site points at developer or product engineering work.",
      },
      {
        needle: /design|creative|brand|visual/,
        tag: "design",
        delta: 5,
        why: "Brand or design language shows up on your site.",
      },
      {
        needle: /support|customer service|helpdesk|ticket/,
        tag: "support",
        delta: 6,
        why: "Support or service language appears in your ICP.",
      },
      {
        needle: /meeting|call|demo|webinar/,
        tag: "meetings",
        delta: 4,
        why: "Meetings and demos look central to how you sell.",
      },
      {
        needle: /automat|workflow|ops|integrat/,
        tag: "automation",
        delta: 5,
        why: "Automation or integration language fits wrapper tools.",
      },
      {
        needle: /agent|orchestr/,
        tag: "agents",
        delta: 5,
        why: "Agent or orchestration language matches agent platforms.",
      },
      {
        needle: /video|content|marketing/,
        tag: "video",
        delta: 4,
        why: "Content or marketing surfaces favor creative AI tools.",
      },
    ];

    for (const boost of boosts) {
      if (boost.needle.test(haystack) && tool.category === boost.tag) {
        adjusted = {
          ...adjusted,
          capability: clamp(adjusted.capability + boost.delta),
          icpSafe: clamp(adjusted.icpSafe + 3),
        };
        reasons.push(boost.why);
      }
      if (
        boost.needle.test(haystack) &&
        tool.fitTags.some((t) => t.includes(boost.tag) || boost.tag.includes(t))
      ) {
        adjusted = {
          ...adjusted,
          capability: clamp(adjusted.capability + 2),
        };
      }
    }

    if (tool.kind === "wrapper" || tool.kind === "platform") {
      reasons.push(
        `${tool.name} is a ${tool.kind}, not a raw model, so fit depends on workflow lock-in.`,
      );
    }

    reasons.push(`Matched against ${company.domain} brand and product pages.`);
  }

  if (tool.scores.icpSafe >= 80) {
    reasons.push("Strong baseline association-fit editorial score.");
  } else if (tool.scores.icpSafe < 55) {
    reasons.push(
      "Baseline association-fit score is already soft for picky buyers.",
    );
  }

  const score = trustFitIndex(adjusted, ICP_WEIGHTS);
  return { score, reasons: dedupe(reasons).slice(0, 5), vetoed: false };
}

export function rankTools(
  tools: Tool[],
  profile: IcpProfile | null,
  company?: CompanyProfile | null,
): Array<Tool & { index: number; fitReasons: string[]; vetoed: boolean }> {
  return tools
    .map((tool) => {
      const fit = personalizedFit(tool, profile, company);
      return {
        ...tool,
        index: fit.score,
        fitReasons: fit.reasons,
        vetoed: fit.vetoed,
      };
    })
    .sort((a, b) => {
      if (a.vetoed !== b.vetoed) return a.vetoed ? 1 : -1;
      return b.index - a.index;
    });
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

export function scoreBand(score: number): "strong" | "mixed" | "weak" {
  if (score >= 75) return "strong";
  if (score >= 55) return "mixed";
  return "weak";
}

export function hasVeto(tool: Tool, tag: VetoTag): boolean {
  return tool.vetoTags.includes(tag);
}

/** Evidence coverage for a tool dossier, not a claim that the vendor is safe. */
export type EvidenceConfidence = "high" | "medium" | "low";

export function evidenceConfidence(tool: Tool): {
  level: EvidenceConfidence;
  evidenceCount: number;
  unknownCount: number;
  label: string;
} {
  const evidenceCount = tool.evidence.length;
  const firstParty = tool.evidence.filter(
    (e) => e.kind === "vendor-policy",
  ).length;
  const unknownCount =
    (tool.vetoTags.includes("opaque-data-policy") ? 1 : 0) +
    (tool.tiers.some((t) => t.trainsOnInputs === "depends") ? 1 : 0) +
    (evidenceCount < 2 ? 1 : 0);

  let level: EvidenceConfidence = "low";
  if (evidenceCount >= 3 && firstParty >= 1 && unknownCount === 0) {
    level = "high";
  } else if (evidenceCount >= 2) {
    level = "medium";
  }

  return {
    level,
    evidenceCount,
    unknownCount,
    label:
      level === "high" ? "High" : level === "medium" ? "Medium" : "Low",
  };
}

export const BASELINE_WEIGHT_LABELS = [
  { key: "reputation", label: "Reputation", weight: DEFAULT_WEIGHTS.reputation },
  { key: "approval", label: "Published approval signals", weight: DEFAULT_WEIGHTS.approval },
  { key: "capability", label: "Capability", weight: DEFAULT_WEIGHTS.capability },
  { key: "icpSafe", label: "Association fit", weight: DEFAULT_WEIGHTS.icpSafe },
] as const;
