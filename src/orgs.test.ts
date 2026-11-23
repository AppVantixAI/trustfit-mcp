import { describe, expect, it } from "vitest";
import { tools } from "@/content/tools";
import { ORGS, SLUG_ORG, modelKey, orgForHost, orgForIndexEntry, orgForUrl, orgsForEpoch } from "./orgs";

describe("organization registry", () => {
  it("maps every reviewed tool to a known organization", () => {
    for (const t of tools) expect(ORGS[SLUG_ORG[t.slug]], t.slug).toBeDefined();
    for (const o of Object.values(SLUG_ORG)) expect(ORGS[o]).toBeDefined();
  });
  it("points every parent at a known organization", () => {
    for (const [id, o] of Object.entries(ORGS)) if (o.parent) expect(ORGS[o.parent], id).toBeDefined();
  });
  it("gives no domain to two organizations", () => {
    const seen = new Map<string, string>();
    for (const [id, o] of Object.entries(ORGS)) for (const d of o.domains) {
      expect(seen.get(d), `${d} in ${id} and ${seen.get(d)}`).toBeUndefined();
      seen.set(d, id);
    }
  });
  it("matches hosts by walking up subdomains only", () => {
    expect(orgForHost("status.openai.com")).toBe("openai");
    expect(orgForHost("notopenai.com")).toBeUndefined();
    expect(orgForUrl("https://www.anthropic.com/security")).toBe("anthropic");
    expect(orgForUrl("not a url")).toBeUndefined();
  });
  it("splits Epoch organization lists and matches exact names", () => {
    expect(orgsForEpoch("Google DeepMind,Google")).toContain("google");
    expect(orgsForEpoch("Anthropic Fans")).toEqual([]);
  });
  it("matches index entries by reviewed slug, vendor alias or namespace, and not re-uploaders", () => {
    expect(orgForIndexEntry({ id: "tool:x", vendor: null, reviewedSlug: "claude" })).toBe("anthropic");
    expect(orgForIndexEntry({ id: "or:openai/gpt-4o", vendor: null })).toBe("openai");
    expect(orgForIndexEntry({ id: "hf:unsloth/llama-3", vendor: "unsloth" })).toBeUndefined();
  });
  it("normalizes model keys without merging different models", () => {
    expect(modelKey("anthropic/Claude Sonnet 4.5")).toBe("claude-sonnet-4-5");
    expect(modelKey("Command R+")).toBe("command-r-plus");
    expect(modelKey("Command R")).toBe("command-r");
  });
});
