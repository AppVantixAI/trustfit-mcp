import type { CompanyProfile } from "./company";
import type { Tool } from "./schema";
import { KIND_LABELS, VETO_LABELS } from "./schema";
import { toolGuidance } from "./tool-guidance";
import {
  personalizedFit,
  rankTools,
  scoreBand,
  trustFitIndex,
} from "./scoring";

export type FitVerdict = "Fits" | "Fits with conditions" | "Hold";

export type FitBriefRow = {
  slug: string;
  name: string;
  kind: string;
  score: number;
  verdict: FitVerdict;
  reasons: string[];
  vetoed: boolean;
  checklist: string[];
  questions: string[];
  freshness: string;
  /** Same-category tools that fit this company, shown on Hold rows. */
  alternatives: string[];
};

export type FitBriefUseCase = {
  task: string;
  users: string;
  dataTypes: string[];
  outputAudience: string;
  connections: string[];
  humanReview: string;
};

export type FitBrief = {
  title: string;
  generatedAt: string;
  companyName: string;
  domain: string;
  icpSummary: string;
  brandSensitivity: string;
  useSurface: string;
  hardVetos: string[];
  useCase: FitBriefUseCase | null;
  recommended: FitBriefRow[];
  conditional: FitBriefRow[];
  hold: FitBriefRow[];
  disclaimer: string;
};

export function verdictFromFit(score: number, vetoed: boolean): FitVerdict {
  if (vetoed || score < 55) return "Hold";
  if (score >= 75) return "Fits";
  return "Fits with conditions";
}

export function buildFitBrief(
  company: CompanyProfile,
  tools: Tool[],
  opts?: {
    limit?: number;
    workspaceName?: string;
    useCase?: FitBriefUseCase | null;
  },
): FitBrief {
  const limit = opts?.limit ?? 12;
  const ranked = rankTools(tools, null, company).slice(0, Math.max(limit, 24));

  const everyTool = rankTools(tools, null, company);
  const rows: FitBriefRow[] = ranked.map((tool) => {
    const verdict = verdictFromFit(tool.index, tool.vetoed);
    const guidance = toolGuidance(tool);
    return {
      slug: tool.slug,
      name: tool.name,
      kind: KIND_LABELS[tool.kind],
      score: tool.index,
      verdict,
      reasons: tool.fitReasons,
      vetoed: tool.vetoed,
      checklist: guidance.checklist,
      questions: guidance.questions,
      freshness: guidance.freshness,
      alternatives:
        verdict === "Hold"
          ? everyTool
              .filter(
                (t) =>
                  t.slug !== tool.slug &&
                  t.category === tool.category &&
                  !t.vetoed &&
                  t.index >= 55,
              )
              .slice(0, 3)
              .map((t) => `${t.name} (${verdictFromFit(t.index, t.vetoed)})`)
          : [],
    };
  });

  const recommended = rows.filter((r) => r.verdict === "Fits").slice(0, 8);
  const conditional = rows
    .filter((r) => r.verdict === "Fits with conditions")
    .slice(0, 8);
  const hold = rows.filter((r) => r.verdict === "Hold").slice(0, 8);

  return {
    title: `TrustFit Fit Brief · ${opts?.workspaceName || company.companyName}`,
    generatedAt: new Date().toISOString(),
    companyName: company.companyName,
    domain: company.domain,
    icpSummary: company.icp.summary,
    brandSensitivity: company.icp.brandSensitivity,
    useSurface: company.icp.useSurface,
    hardVetos: company.icp.hardVetos.map(
      (tag) => VETO_LABELS[tag as keyof typeof VETO_LABELS] ?? tag,
    ),
    useCase: opts?.useCase ?? null,
    recommended,
    conditional,
    hold,
    disclaimer:
      "A snapshot of this use case and the public evidence available when created. Not a clearance, not legal advice, not a compliance certification.",
  };
}

export function buildToolVerdict(
  tool: Tool,
  company: CompanyProfile | null,
): {
  verdict: FitVerdict;
  score: number;
  band: ReturnType<typeof scoreBand>;
  reasons: string[];
  vetoed: boolean;
  publicIndex: number;
} {
  const fit = personalizedFit(tool, null, company);
  return {
    verdict: verdictFromFit(fit.score, fit.vetoed),
    score: fit.score,
    band: scoreBand(fit.score),
    reasons: fit.reasons,
    vetoed: fit.vetoed,
    publicIndex: trustFitIndex(tool.scores),
  };
}

export function fitBriefToMarkdown(brief: FitBrief): string {
  const lines: string[] = [
    `# ${brief.title}`,
    "",
    `Generated: ${brief.generatedAt}`,
    `Company: ${brief.companyName} (${brief.domain})`,
    `ICP: ${brief.icpSummary}`,
    `Brand sensitivity: ${brief.brandSensitivity} · Use surface: ${brief.useSurface}`,
    "",
  ];

  if (brief.useCase?.task) {
    lines.push(
      "## Use case",
      "",
      `Task: ${brief.useCase.task}`,
      `Users: ${brief.useCase.users || "Not given"}`,
      `Data: ${brief.useCase.dataTypes.join(", ") || "None"}`,
      `Outputs: ${brief.useCase.outputAudience}`,
      `Connections: ${brief.useCase.connections.join(", ") || "None"}`,
      `Human review: ${brief.useCase.humanReview}`,
      "",
    );
  }

  if (brief.hardVetos.length) {
    lines.push(`Hard vetoes: ${brief.hardVetos.join("; ")}`, "");
  }

  const section = (heading: string, rows: FitBriefRow[]) => {
    lines.push(`## ${heading}`, "");
    if (!rows.length) {
      lines.push("_None in this band._", "");
      return;
    }
    for (const row of rows) {
      lines.push(
        `### ${row.name} (${row.kind}) · ${row.verdict} · ${row.score.toFixed(1)}`,
      );
      for (const reason of row.reasons) lines.push(`- ${reason}`);
      lines.push("", `_${row.freshness}_`, "", "Before you adopt:");
      for (const item of row.checklist) lines.push(`- [ ] ${item}`);
      lines.push("", "Questions for the vendor:");
      for (const q of row.questions) lines.push(`- ${q}`);
      if (row.alternatives.length) {
        lines.push("", `Tools in the same category that fit: ${row.alternatives.join(", ")}`);
      }
      lines.push("");
    }
  };

  section("Fits", brief.recommended);
  section("Fits with conditions", brief.conditional);
  section("Hold", brief.hold);

  lines.push("---", brief.disclaimer, "");
  return lines.join("\n");
}
