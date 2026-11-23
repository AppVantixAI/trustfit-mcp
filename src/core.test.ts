import { describe, expect, it } from "vitest";
import { tools as catalog } from "@/content/tools";
import { compareTools, getToolProfile, methodology, rankForCompany, searchTools } from "./core";

describe.skipIf(catalog.length === 0)("trustfit mcp core", () => {
  it("lists tools and filters by category", () => {
    const all = searchTools({ limit: 50 });
    expect(all.total).toBeGreaterThan(10);
    const coding = searchTools({ category: "coding" });
    expect(coding.results.every((r) => r.category === "coding")).toBe(true);
  });

  it("excludes tools carrying a veto tag", () => {
    const r = searchTools({ excludeVetoes: ["china-hosted"], limit: 50 });
    expect(r.results.every((t) => !t.vetoTags.includes("china-hosted"))).toBe(true);
  });

  it("returns a dossier with evidence and a disclaimer", () => {
    const slug = searchTools({ limit: 1 }).results[0].slug;
    const p = getToolProfile(slug);
    expect("error" in p).toBe(false);
    if (!("error" in p)) {
      expect(p.evidence.length).toBeGreaterThan(0);
      expect(p.disclaimer).toMatch(/not a clearance/);
    }
  });

  it("reports an unknown slug instead of throwing", () => {
    expect(getToolProfile("nope-nope")).toHaveProperty("error");
  });

  it("sorts vetoed tools last with score 0 and a reason", () => {
    const r = rankForCompany({ profile: { hardVetos: ["china-hosted", "training-on-inputs"] }, limit: 50 });
    const vetoed = r.results.filter((t) => t.vetoed);
    expect(vetoed.length).toBeGreaterThan(0);
    expect(vetoed.every((t) => t.score === 0)).toBe(true);
    const firstVetoed = r.results.findIndex((t) => t.vetoed);
    expect(r.results.slice(firstVetoed).every((t) => t.vetoed)).toBe(true);
  });

  it("regulated, brand-sensitive buyers score the same tool lower", () => {
    const slug = searchTools({ limit: 1 }).results[0].slug;
    const base = getToolProfile(slug);
    const strict = getToolProfile(slug, { buyerType: "regulated", brandSensitivity: "high", useSurface: "customer-facing" });
    if ("error" in base || "error" in strict) throw new Error("missing");
    expect(strict.score).toBeLessThan(base.score);
  });

  it("compare reports missing slugs", () => {
    const slug = searchTools({ limit: 1 }).results[0].slug;
    const c = compareTools([slug, "nope"]);
    expect(c.missing).toEqual(["nope"]);
    expect(c.compared).toHaveLength(1);
  });

  it("methodology weights sum to 1", () => {
    const sum = methodology().weights.reduce((a, w) => a + w.weight, 0);
    expect(Math.round(sum * 100)).toBe(100);
  });
});
