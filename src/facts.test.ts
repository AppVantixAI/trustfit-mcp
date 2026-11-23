import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateMeta } from "../scripts/lib/open-data";
import { DATASET_IDS, factsForModel, factsForOrg, openFactsForIndexEntry, openFactsForSlug, openFactsSources } from "./facts";
import { ORGS, SLUG_ORG } from "./orgs";

const DIR = path.join(__dirname, "../data/snapshots");
const read = (f: string) => JSON.parse(readFileSync(path.join(DIR, f), "utf8"));

describe("snapshot metadata", () => {
  it("every snapshot names its source, licence and retrieval date", () => {
    for (const f of readdirSync(DIR).filter((x) => x.endsWith(".json"))) {
      const m = read(f).meta ?? {};
      expect(m.source || m.name, `${f} source`).toBeTruthy();
      expect(m.url || m.sourceUrl || m.sources, `${f} url`).toBeTruthy();
      expect(m.license || m.licence || m.licenses, `${f} licence`).toBeTruthy();
      expect(m.retrievedAt, `${f} date`).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });
  it("every open-data snapshot passes the full meta check and the shared shape", () => {
    for (const id of DATASET_IDS) {
      const s = read(`${id}.json`);
      expect(validateMeta(s.meta), id).toEqual([]);
      expect(s.meta.id).toBe(id);
      for (const k of ["bySlug", "byOrg", "byIndexId"]) expect(typeof s[k], `${id}.${k}`).toBe("object");
      for (const org of Object.keys(s.byOrg)) expect(ORGS[org], `${id} org ${org}`).toBeDefined();
    }
  });
  it("marks unlicensed sources as show-only", () => {
    for (const id of ["statuspage", "fedramp"]) expect(read(`${id}.json`).meta.redistribute, id).toBe(false);
  });
});

describe("open-data facts", () => {
  const all = [...Object.keys(SLUG_ORG).flatMap((s) => openFactsForSlug(s).facts), ...Object.keys(ORGS).flatMap((o) => factsForOrg(o))];
  it("every fact carries a dataset, source, licence and date", () => {
    for (const f of all) {
      expect(DATASET_IDS).toContain(f.dataset);
      expect(f.source && f.sourceUrl && f.license && f.attribution && f.value).toBeTruthy();
      expect(f.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("never calls a vendor safe, certified or approved, and uses no em dash", () => {
    for (const f of all) {
      // "safe harbor" is the legal term for a disclosure program's promise, not a claim about the vendor.
      const t = `${f.label} ${f.value} ${f.detail ?? ""}`.replace(/safe harbor/gi, "");
      expect(t).not.toMatch(/\b(safe|certified|approved)\b/i);
      expect(t).not.toContain("—");
    }
  });
  it("labels facts from a parent company", () => {
    const parentFacts = factsForOrg("github").filter((f) => f.about.startsWith("parent:"));
    for (const f of parentFacts) expect(f.about).toBe("parent: Microsoft");
  });
  it("returns nothing for an unknown tool or organization", () => {
    expect(openFactsForSlug("no-such-tool")).toMatchObject({ organization: null, facts: [] });
    expect(factsForOrg("no-such-org")).toEqual([]);
    expect(factsForModel("no-such-id")).toEqual([]);
  });
  it("adds model facts to index entries the model datasets matched", () => {
    const s = read("models-dev.json");
    const id = Object.keys(s.byIndexId)[0];
    if (!id) return; // the public copy ships some datasets empty
    const r = openFactsForIndexEntry({ id, vendor: null });
    expect(r.model.some((f) => f.dataset === "models-dev")).toBe(true);
  });
  it("lists every dataset for the methodology", () => {
    expect(openFactsSources().map((x) => x.id).sort()).toEqual([...DATASET_IDS].sort());
  });
});
