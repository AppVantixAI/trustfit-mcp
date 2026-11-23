/**
 * Parser tests for the open-data ingests. Every test runs on a small fixture,
 * never on the network.
 */
import { describe, expect, it } from "vitest";
import { listAfter, matchSignatories, parseGpai, parseSeoul } from "../ai-commitments";
import { brandWords, build as buildDiodb, matchProgram } from "../diodb";
import { build as buildEci } from "../epoch-eci";
import { build as buildEpoch, firstUrl } from "../epoch-models";
import { build as buildFedramp } from "../fedramp";
import { summarize as summarizeGhsa } from "../ghsa";
import { exactMatches } from "../gleif";
import { build as buildLitellm } from "../litellm";
import { build as buildModelsDev } from "../models-dev";
import { severityOf, summarize as summarizeNvd } from "../nvd";
import { parseSecurityTxt } from "../security-txt";
import { pageBelongs, summarize as summarizeStatus } from "../statuspage";
import { buildIndexMap } from "../../lib/index-map";
import { htmlText, parseCsv, unzipEntry, validateMeta } from "../../lib/open-data";
import { deflateRawSync } from "node:zlib";

const index = buildIndexMap([
  { id: "or:anthropic/claude-sonnet-4-5", kind: "model", name: "Claude Sonnet 4.5", vendor: "anthropic", reviewedSlug: null },
  { id: "hf:cohere/command-r-plus", kind: "model", name: "Command R+", vendor: "cohere", reviewedSlug: null },
  { id: "hf:cohere/command-r", kind: "model", name: "Command R", vendor: "cohere", reviewedSlug: null },
  { id: "hf:unsloth/claude-sonnet-4-5", kind: "model", name: "Claude Sonnet 4.5", vendor: "unsloth", reviewedSlug: null },
  { id: "tool:chatgpt", kind: "tool", name: "ChatGPT", vendor: "openai", reviewedSlug: "chatgpt" },
]);

describe("shared helpers", () => {
  it("parses quoted CSV with commas, quotes and newlines", () => {
    const rows = parseCsv('a,b\n"x, y","say ""hi""\nthere"\n1,2\n');
    expect(rows).toEqual([{ a: "x, y", b: 'say "hi"\nthere' }, { a: "1", b: "2" }]);
  });
  it("reads a deflated member from a zip archive", () => {
    const data = new TextEncoder().encode("hello,zip\n");
    const comp = deflateRawSync(data);
    const name = new TextEncoder().encode("dir/f.csv");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(0, 42);
    const cdStart = local.length + name.length + comp.length;
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(cd.length + name.length, 12);
    eocd.writeUInt32LE(cdStart, 16);
    const zip = new Uint8Array(Buffer.concat([local, name, comp, cd, name, eocd]));
    expect(new TextDecoder().decode(unzipEntry(zip, "dir/f.csv")!)).toBe("hello,zip\n");
    expect(unzipEntry(zip, "missing.csv")).toBeNull();
  });
  it("turns HTML into one line per block and keeps inline tags joined", () => {
    expect(htmlText("<ul><li>Mistral <abbr>AI</abbr></li><li>Open&amp;AI</li></ul><script>x()</script>")).toBe("Mistral AI\nOpen&AI");
  });
  it("refuses a meta block without licence or date", () => {
    expect(validateMeta({ id: "x", source: "s", url: "u", attribution: "a", status: "collected", matching: "m", redistribute: true })).toEqual(["license", "retrievedAt"]);
    expect(validateMeta({ id: "x", source: "s", url: "u", license: "CC0", attribution: "a", retrievedAt: "2026-11-22", status: "collected", matching: "m" })).toEqual(["redistribute"]);
  });
});

describe("index matching", () => {
  it("needs both the organization and the model key", () => {
    expect(index.lookup("anthropic", "claude-sonnet-4.5")).toEqual(["or:anthropic/claude-sonnet-4-5"]);
    expect(index.lookup("openai", "claude-sonnet-4.5")).toEqual([]);
    expect(index.lookup(undefined, "Claude Sonnet 4.5")).toEqual([]);
  });
  it("keeps Command R+ apart from Command R", () => {
    expect(index.lookup("cohere", "Command R+")).toEqual(["hf:cohere/command-r-plus"]);
    expect(index.lookup("cohere", "Command R")).toEqual(["hf:cohere/command-r"]);
  });
  it("never maps a re-uploader's copy to the developer", () => {
    expect(index.lookup("anthropic", "Claude Sonnet 4.5")).not.toContain("hf:unsloth/claude-sonnet-4-5");
  });
});

describe("Epoch AI", () => {
  const csv = [
    "Model,Organization,Publication date,Model accessibility,Training compute (FLOP),Frontier model,Parameters,Confidence,Link,Country (of organization)",
    'Claude Sonnet 4.5,Anthropic,2025-09-29,API access,3e25,True,,Likely,"https://a.example/1 https://x.example/2",United States of America',
    "Command R+,\"Cohere,Cohere Labs (formerly Cohere for AI)\",2024-04-04,Open weights (non-commercial),,False,104000000000,Confident,https://c.example,Canada",
    "Some model,Unknown Lab,2025-01-01,API access,,False,,Speculative,,",
  ].join("\n");
  const s = buildEpoch(csv, index, "2026-11-22", "h");
  it("counts models per organization and keeps one link", () => {
    expect(s.byOrg.anthropic.models).toBe(1);
    expect(s.byOrg.anthropic.latest?.link).toBe("https://a.example/1");
    expect(s.byOrg.cohere.openWeights).toBe(1);
    expect(Object.keys(s.byOrg)).not.toContain("unknown lab");
  });
  it("attaches model facts to the matching index entries only", () => {
    expect(Object.keys(s.byIndexId).sort()).toEqual(["hf:cohere/command-r-plus", "or:anthropic/claude-sonnet-4-5"]);
    expect(s.byIndexId["hf:cohere/command-r-plus"].parameters).toBe(104e9);
  });
  it("takes the first URL from a multi-link cell", () => expect(firstUrl("https://a.b/c \n\nhttps://d.e")).toBe("https://a.b/c"));
  it("ranks organizations by their best ECI score across everyone Epoch scored", () => {
    const eci = buildEci(
      "Model,Display name,eci,eci_ci_low,eci_ci_high,date,Organization\nclaude-sonnet-4-5,Claude Sonnet 4.5,150,148,152,2025-09-29,Anthropic\nm2,Other,160,158,162,2025-10-01,Other Lab\nm3,Command R+,100,98,102,2024-04-04,Cohere",
      index,
      "2026-11-22",
      "h",
    );
    expect(eci.byOrg.anthropic.rankAmongOrgs).toBe(2);
    expect(eci.byOrg.anthropic.orgsScored).toBe(3);
    expect(eci.byIndexId["or:anthropic/claude-sonnet-4-5"].eci).toBe(150);
  });
});

describe("models.dev and LiteLLM", () => {
  it("only counts the developer's own provider as first-party", () => {
    const api = {
      anthropic: { id: "anthropic", models: { "claude-sonnet-4-5": { id: "claude-sonnet-4-5", cost: { input: 3, output: 15 }, limit: { context: 200000, output: 64000 } } } },
      openrouter: { id: "openrouter", models: { "anthropic/claude-sonnet-4.5": { id: "anthropic/claude-sonnet-4.5", cost: { input: 9, output: 9 } } } },
    };
    const s = buildModelsDev(api as never, index, "2026-11-22", "h");
    const f = s.byIndexId["or:anthropic/claude-sonnet-4-5"];
    expect(f.inputUsdPerM).toBe(3);
    expect(f.otherProviders).toBe(1);
    expect(Object.keys(s.byOrg)).toEqual(["anthropic"]);
  });
  it("converts per-token prices to per-million", () => {
    const s = buildLitellm({ "claude-sonnet-4-5": { litellm_provider: "anthropic", mode: "chat", input_cost_per_token: 3e-6, output_cost_per_token: 1.5e-5 } } as never, index, "2026-11-22", "h");
    const f = s.byIndexId["or:anthropic/claude-sonnet-4-5"];
    expect([f.inputUsdPerM, f.outputUsdPerM]).toEqual([3, 15]);
  });
});

describe("vulnerability sources", () => {
  it("summarizes GitHub advisories, skipping withdrawn and duplicates", () => {
    const adv = (id: string, sev: string, date: string, withdrawn: string | null = null) => ({
      ghsa_id: id, cve_id: null, html_url: `https://github.com/advisories/${id}`, summary: "s", severity: sev, published_at: date, withdrawn_at: withdrawn,
      vulnerabilities: [{ package: { ecosystem: "npm", name: "openai" } }],
    });
    const s = summarizeGhsa(["npm:openai"], [adv("A", "high", "2026-01-01T00:00:00Z"), adv("A", "high", "2026-01-01T00:00:00Z"), adv("B", "low", "2020-01-01T00:00:00Z"), adv("C", "critical", "2026-02-01T00:00:00Z", "2026-03-01")], "2026-11-22");
    expect(s.total).toBe(2);
    expect(s.last24Months).toBe(1);
    expect(s.latest[0].id).toBe("A");
  });
  it("reads the newest CVSS version and drops rejected CVEs", () => {
    const cve = (id: string, status: string, metrics: Record<string, never[]> | object) => ({ cve: { id, published: "2026-05-01T00:00:00", vulnStatus: status, metrics: metrics as never, configurations: [{ nodes: [{ cpeMatch: [{ criteria: "cpe:2.3:a:openai:chatgpt:*:*:*:*:*:*:*:*", vulnerable: true }] }] }] } });
    const v31 = { cvssMetricV31: [{ type: "Primary", cvssData: { baseScore: 7.5, baseSeverity: "HIGH" } }], cvssMetricV2: [{ type: "Primary", cvssData: { baseScore: 5 }, baseSeverity: "MEDIUM" }] };
    expect(severityOf(cve("x", "Analyzed", v31).cve)).toEqual({ severity: "HIGH", score: 7.5 });
    const s = summarizeNvd(["openai"], [cve("CVE-1", "Analyzed", v31), cve("CVE-2", "Rejected", v31), cve("CVE-3", "Awaiting Analysis", {})], "2026-11-22");
    expect(s.total).toBe(2);
    expect(s.bySeverity).toEqual({ HIGH: 1, "NOT SCORED": 1 });
    expect(s.products).toEqual({ "openai:chatgpt": 2 });
  });
});

describe("company sources", () => {
  const rec = (lei: string, name: string) => ({ attributes: { lei, entity: { legalName: { name }, status: "ACTIVE", legalAddress: {}, headquartersAddress: {} }, registration: { status: "ISSUED", lastUpdateDate: "2026-01-01" } } });
  it("keeps only exact legal-name matches from GLEIF's fuzzy search", () => {
    const got = exactMatches(["OpenAI, Inc.", "OpenAI OpCo, LLC"], [rec("1", "OPENAI OPCO, LLC"), rec("2", "OpenAI Global, LLC"), rec("3", "Open AI ETF Trust"), rec("1", "OPENAI OPCO, LLC")] as never);
    expect(got.map((r) => r.attributes.lei)).toEqual(["1"]);
  });
  it("matches FedRAMP providers by exact name and splits authorized from in process", () => {
    const s = buildFedramp(
      { data: { Products: [
        { id: "p1", csp: "OpenAI", cso: "ChatGPT Enterprise", status: "FedRAMP Authorized", impact_level: "Moderate", auth_date: "2026-01-09" },
        { id: "p2", csp: "OpenAI Labs", cso: "Other", status: "FedRAMP Authorized" },
        { id: "p3", csp: "xAI", cso: "Grok for Government", status: "FedRAMP In Process" },
      ] } },
      "2026-11-22",
      "h",
    );
    expect(s.byOrg.openai).toMatchObject({ authorized: 1, inProcess: 0 });
    expect(s.byOrg.openai.offerings[0].url).toBe("https://marketplace.fedramp.gov/products/p1");
    expect(s.byOrg.xai).toMatchObject({ authorized: 0, inProcess: 1 });
  });
});

describe("disclosure sources", () => {
  it("needs the organization's brand in a program hosted on its domain", () => {
    expect(matchProgram({ program_name: "Zoom", policy_url: "https://www.zoom.com/en/trust/vulnerability-disclosure/" })?.org).toBe("zoom");
    expect(matchProgram({ program_name: "Acme Corp", policy_url: "https://acme.zendesk.com/hc/security" })).toBeNull();
    expect(matchProgram({ program_name: "HubSpot", policy_url: "https://hackerone.com/hubspot" })).toEqual({ org: "hubspot", by: "platform-name" });
    expect(matchProgram({ program_name: "HubSpot Fans", policy_url: "https://hackerone.com/hubspotfans" })).toBeNull();
    expect(brandWords("openai")).toContain("openai");
  });
  it("builds programs with 'not stated' for missing answers", () => {
    const s = buildDiodb([{ program_name: "Notion", policy_url: "https://www.notion.so/security" }], "2026-11-22", "h");
    expect(s.byOrg.notion[0]).toMatchObject({ bounty: "not stated", safeHarbor: "not stated", matchedBy: "domain" });
  });
  it("parses security.txt fields, expiry and signature", () => {
    const body = "-----BEGIN PGP SIGNED MESSAGE-----\nHash: SHA256\n\n# comment\nContact: mailto:security@example.com\nContact: https://example.com/report\nExpires: 2026-01-01T00:00:00Z\nPolicy: https://example.com/policy\n-----BEGIN PGP SIGNATURE-----\nabc\n-----END PGP SIGNATURE-----";
    const p = parseSecurityTxt(body, "2026-11-22")!;
    expect(p.contact).toEqual(["mailto:security@example.com", "https://example.com/report"]);
    expect(p.expired).toBe(true);
    expect(p.signed).toBe(true);
    expect(p.policy).toBe("https://example.com/policy");
    expect(parseSecurityTxt("Policy: https://x\n", "2026-11-22")).toBeNull();
  });
});

describe("status pages", () => {
  const sum = (name: string, url: string) => ({ page: { id: "p", name, url } });
  it("keeps a page only when it names the organization or sits on its domain", () => {
    expect(pageBelongs("openai", sum("OpenAI", "https://status.openai.com"))).toBe(true);
    expect(pageBelongs("anthropic", sum("Claude", "https://status.claude.com"))).toBe(true);
    expect(pageBelongs("anthropic", sum("Acme Status", "https://status.example.org"))).toBe(false);
    expect(pageBelongs("anysphere", sum("Cursor", "https://anysphere.statuspage.io"))).toBe(true);
    expect(pageBelongs("anthropic", sum("Anthropic", "https://status.claude.com"))).toBe(true);
    expect(pageBelongs("openai", sum("Acme", "https://status.acme.com"))).toBe(false);
  });
  it("counts incidents in the window and reports whether the feed covers it", () => {
    const inc = (d: string, impact: string, resolved: string | null) => ({ id: d, created_at: d, resolved_at: resolved, impact, status: "resolved", shortlink: `https://stspg.io/${d}` });
    const s = summarizeStatus("status.example.com", sum("Example", "https://status.example.com") as never, [
      inc("2026-11-01T00:00:00Z", "minor", "2026-11-01T01:00:00Z"),
      inc("2026-10-01T00:00:00Z", "major", "2026-10-01T00:30:00Z"),
      inc("2026-06-01T00:00:00Z", "none", "2026-06-01T00:10:00Z"),
    ], "2026-11-22");
    expect(s.incidents).toBe(2);
    expect(s.byImpact).toEqual({ minor: 1, major: 1 });
    expect(s.medianMinutesToResolve).toBe(60);
    expect(s.windowCovered).toBe(true);
    expect(s.latest?.date).toBe("2026-11-01");
  });
});

describe("AI commitments", () => {
  const gpai = ["Signatories of the code of practice", "The code of practice helps industry comply with the AI Act legal obligations on safety and more.", "Signatories of the code of practice", "Some signatories may not appear immediately", "Amazon", "Mistral AI", "OpenAI", "In addition, xAI signed up to the Safety and Security Chapter; this means more.", "Last update", "7 October 2026"].join("\n");
  it("reads the signatory list after the second heading, and the partial signatory", () => {
    const g = parseGpai(gpai);
    expect(g.full).toEqual(["Amazon", "Mistral AI", "OpenAI"]);
    expect(g.safetyOnly).toEqual(["xAI"]);
    expect(g.updated).toBe("2026-10-07");
  });
  it("reads both Seoul lists", () => {
    const s = parseSeoul(["Updated 7 February 2025", "The following organisations have agreed to the Frontier AI Safety Commitments:", "Amazon", "Anthropic", "The following organisations have been added to the existing list:", "NVIDIA", "The above organisations will publish."].join("\n"));
    expect(s.signatories).toEqual(["Amazon", "Anthropic", "NVIDIA"]);
    expect(s.updated).toBe("2025-02-07");
  });
  it("matches exact signatory names only", () => {
    const m = matchSignatories(["Mistral AI", "Open AI Fans", "xAI"]);
    expect([...m.keys()].sort()).toEqual(["mistral", "xai"]);
  });
  it("stops a list at a long line", () => expect(listAfter(["H", "a", "x".repeat(80), "b"], /^H$/, /^$/)).toEqual(["a"]));
});
