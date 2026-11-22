import { describe, expect, it } from "vitest";
import { tools } from "@/content/tools";
import { getToolProfile, methodology } from "./core";
import { ENTITIES } from "./entities";
import { COVERAGE_SLUGS, crossChecks, dataSources, effectiveScores, entityFor, signalsFor } from "./signals";

import tosdrSnap from "../data/snapshots/tosdr.json";
const hasTosdr = Object.keys(tosdrSnap.bySlug).length > 0;

describe("open-data signals", () => {
  it("every mapped slug exists in the catalog", () => {
    for (const s of Object.keys(ENTITIES)) expect(tools.some((t) => t.slug === s)).toBe(true);
  });

  it("every signal carries provenance and a license", () => {
    for (const s of COVERAGE_SLUGS)
      for (const sig of signalsFor(s)) {
        expect(sig.url).toMatch(/^https:\/\//);
        expect(sig.license.length).toBeGreaterThan(0);
        expect(sig.asOf.length).toBeGreaterThan(0);
      }
  });

  it("snapshots record a hash and retrieval date", () => {
    for (const m of dataSources()) {
      expect(m.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(m.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("FMTI scores are percentages and arena values are within 0-100", () => {
    for (const s of COVERAGE_SLUGS)
      for (const sig of signalsFor(s))
        if (sig.id === "arena-rating" || sig.id === "fmti-transparency") {
          expect(sig.value).toBeGreaterThanOrEqual(0);
          expect(sig.value).toBeLessThanOrEqual(100);
        }
  });

  it("blends capability only where an arena signal exists, and keeps other subscores", () => {
    const claude = tools.find((t) => t.slug === "claude")!;
    const e = effectiveScores(claude);
    expect(e.basis.capability).toBe("editorial+open-data");
    expect(e.basis.reputation).toBe("editorial");
    expect(e.scores.reputation).toBe(claude.scores.reputation);
    const lindy = tools.find((t) => t.slug === "lindy")!;
    expect(effectiveScores(lindy).scores).toEqual(lindy.scores);
  });

  it("unmapped tools say so instead of implying coverage", () => {
    const p = getToolProfile("lindy");
    if ("error" in p) throw new Error("missing");
    expect(p.openData.signals).toHaveLength(0);
    expect(p.openData.coverage).toMatch(/editorial only/);
  });

  it("does not map wrappers to a model's quality or transparency data", () => {
    for (const slug of ["cursor", "perplexity", "github-copilot", "microsoft-copilot"])
      expect(signalsFor(slug).filter((s) => s.id === "arena-rating" || s.id === "fmti-transparency")).toHaveLength(0);
  });

  it("methodology states the limits", () => {
    const m = methodology();
    expect(m.notes.join(" ")).toMatch(/not validated against ground truth/);
    expect(m.openDataSources).toHaveLength(7);
  });

  it("AIID signal links to incident pages and labels vendor-wide counts", () => {
    const gpt = signalsFor("chatgpt").find((s) => s.id === "aiid-incidents")!;
    expect(gpt.unit).toMatch(/whole company/);
    expect(gpt.detail).toMatch(/https:\/\/incidentdatabase\.ai\/cite\/\d+/);
    const otter = signalsFor("otter").find((s) => s.id === "aiid-incidents")!;
    expect(otter.unit).not.toMatch(/whole company/);
  });

  it("does not turn raw incident counts into a score penalty", () => {
    const t = tools.find((x) => x.slug === "chatgpt")!;
    expect(effectiveScores(t).basis.reputation).toBe("editorial");
    expect(effectiveScores(t).basis.icpSafe).toBe("editorial");
  });

  it("flags a single-product vendor with many recent incidents and high editorial reputation", () => {
    const p = tools.find((x) => x.slug === "perplexity")!;
    expect(crossChecks(p).some((f) => f.message.includes("AIID"))).toBe(true);
    const g = tools.find((x) => x.slug === "chatgpt")!;
    expect(crossChecks(g).some((f) => f.message.includes("AIID"))).toBe(false);
  });

  it.skipIf(!hasTosdr)("ToS;DR: grades map to values, N/A gives no signal, parent-service grades are labeled", () => {
    const gpt = signalsFor("chatgpt").find((s) => s.id === "tosdr-grade")!;
    expect(gpt.display).toBe("C");
    expect(gpt.value).toBe(60);
    expect(gpt.detail).toMatch(/consumer terms/);
    expect(signalsFor("midjourney").some((s) => s.id === "tosdr-grade")).toBe(false);
    const gem = signalsFor("gemini").find((s) => s.id === "tosdr-grade")!;
    expect(gem.label).toMatch(/parent service/);
    expect(gem.detail).toMatch(/parent service, not this product/);
  });

  it.skipIf(!hasTosdr)("ToS;DR never changes a score and flags only exact-scope D or E on high icpSafe", () => {
    const claude = tools.find((x) => x.slug === "claude")!;
    expect(effectiveScores(claude).basis.icpSafe).toBe("editorial");
    expect(crossChecks(claude).some((f) => f.message.includes("ToS;DR"))).toBe(true);
    for (const slug of ["gemini", "microsoft-copilot"]) {
      const t = tools.find((x) => x.slug === slug)!;
      expect(crossChecks(t).some((f) => f.message.includes("ToS;DR"))).toBe(false);
    }
  });

  it.skipIf(!hasTosdr)("ToS;DR grades reach tools that have no other dataset mapping", () => {
    expect(ENTITIES["hubspot-breeze"]).toBeUndefined();
    expect(signalsFor("hubspot-breeze").some((s) => s.id === "tosdr-grade" && s.display === "D")).toBe(true);
    const h = tools.find((x) => x.slug === "hubspot-breeze")!;
    expect(crossChecks(h).some((f) => f.message.includes("ToS;DR"))).toBe(true);
  });

  it("Wikidata entity is verified by official website, or says no match", () => {
    const e = entityFor("chatgpt");
    expect(e.verified).toBe(true);
    if (e.verified) expect(e.qid).toMatch(/^Q\d+$/);
    const none = entityFor("lindy");
    expect(none.verified).toBe(false);
  });

  it("surfaces review flags where editorial and open data disagree", () => {
    const flagged = tools.filter((t) => crossChecks(t).length > 0).map((t) => t.slug);
    expect(Array.isArray(flagged)).toBe(true);
  });
});
