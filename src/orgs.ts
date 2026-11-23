/**
 * Organization registry: the one place that says which company is behind a
 * reviewed tool or an index entry, and how each open dataset names it.
 *
 * Hand-curated and deliberately strict. Every matcher compares exact,
 * normalized names or domains; there is no fuzzy matching. A missing field means
 * "not looked up", never "nothing exists". A wrong name would attach someone
 * else's record to a company, so when unsure, leave the field out.
 *
 * Re-uploaders and quantizers on model hubs (unsloth, lmstudio-community,
 * bartowski...) are NOT aliases of the model's developer: their uploads are
 * matched to no organization.
 */

export type Ecosystem = "npm" | "pip" | "go" | "maven" | "nuget" | "rubygems" | "rust";

export type Org = {
  name: string;
  /** Company or product domains the organization controls (security.txt, disclosure programs). First is primary. */
  domains: string[];
  /** Lowercase names datasets use: index vendor field, Hugging Face org, OpenRouter prefix, models.dev provider id. */
  aliases?: string[];
  /** Exact "Organization" values in Epoch AI data (comma-separated lists are split first). */
  epoch?: string[];
  /** Exact legal entity names to look up in GLEIF. */
  legalNames?: string[];
  /** CPE "vendor" or "vendor:product" strings in the NVD (product-level where the vendor is large). */
  nvd?: string[];
  /** Packages the organization publishes, for GitHub security advisories. */
  packages?: { ecosystem: Ecosystem; name: string }[];
  /** Candidate public status page hosts; the ingest keeps only those that answer as this organization. */
  statusHosts?: string[];
  /** Exact "csp" values in the FedRAMP Marketplace. */
  fedramp?: string[];
  /** Exact names as printed on signatory lists (EU GPAI Code of Practice, Seoul commitments). */
  signatory?: string[];
  /** Organization is much bigger than any one AI product; its records describe the company. */
  vendorWide?: boolean;
  /** Parent organization id, when it is in this registry. */
  parent?: string;
};

export const ORGS: Record<string, Org> = {
  openai: {
    name: "OpenAI",
    domains: ["openai.com", "chatgpt.com"],
    aliases: ["openai", "~openai"],
    epoch: ["OpenAI"],
    legalNames: ["OpenAI, Inc.", "OpenAI OpCo, LLC", "OpenAI Group PBC", "OpenAI Global, LLC"],
    nvd: ["openai"],
    packages: [
      { ecosystem: "npm", name: "openai" },
      { ecosystem: "pip", name: "openai" },
      { ecosystem: "npm", name: "@openai/codex" },
    ],
    statusHosts: ["status.openai.com"],
    fedramp: ["OpenAI"],
    signatory: ["OpenAI"],
  },
  anthropic: {
    name: "Anthropic",
    domains: ["anthropic.com", "claude.ai", "claude.com"],
    aliases: ["anthropic", "~anthropic"],
    epoch: ["Anthropic"],
    legalNames: ["Anthropic, PBC", "Anthropic PBC"],
    nvd: ["anthropic"],
    packages: [
      { ecosystem: "npm", name: "@anthropic-ai/sdk" },
      { ecosystem: "pip", name: "anthropic" },
      { ecosystem: "npm", name: "@anthropic-ai/claude-code" },
    ],
    statusHosts: ["status.claude.com", "status.anthropic.com"],
    signatory: ["Anthropic"],
  },
  google: {
    name: "Google",
    vendorWide: true,
    domains: ["google.com", "gemini.google.com", "deepmind.google"],
    aliases: ["google", "~google", "google-deepmind"],
    epoch: ["Google", "Google DeepMind", "DeepMind", "Google Research", "Google Brain"],
    legalNames: ["Google LLC", "Alphabet Inc."],
    packages: [
      { ecosystem: "npm", name: "@google/genai" },
      { ecosystem: "pip", name: "google-genai" },
      { ecosystem: "npm", name: "@google/gemini-cli" },
    ],
    fedramp: ["Google"],
    signatory: ["Google"],
  },
  microsoft: {
    name: "Microsoft",
    vendorWide: true,
    domains: ["microsoft.com"],
    aliases: ["microsoft"],
    epoch: ["Microsoft", "Microsoft Research"],
    legalNames: ["Microsoft Corporation"],
    nvd: ["microsoft:copilot"],
    fedramp: ["Microsoft"],
    signatory: ["Microsoft"],
  },
  github: {
    name: "GitHub",
    vendorWide: true,
    parent: "microsoft",
    domains: ["github.com"],
    legalNames: ["GitHub, Inc."],
    statusHosts: ["www.githubstatus.com"],
    fedramp: ["GitHub"],
  },
  perplexity: {
    name: "Perplexity AI",
    domains: ["perplexity.ai"],
    aliases: ["perplexity", "perplexity ai"],
    epoch: ["Perplexity"],
    legalNames: ["Perplexity AI, Inc."],
    statusHosts: ["status.perplexity.com", "status.perplexity.ai"],
    fedramp: ["Perplexity AI"],
  },
  anysphere: {
    name: "Anysphere (Cursor)",
    domains: ["cursor.com", "cursor.sh", "anysphere.inc"],
    aliases: ["cursor", "anysphere"],
    epoch: ["Anysphere", "Cursor"],
    legalNames: ["Anysphere, Inc.", "Anysphere Inc."],
    nvd: ["anysphere"],
    statusHosts: ["status.cursor.com"],
  },
  deepseek: {
    name: "DeepSeek",
    domains: ["deepseek.com"],
    aliases: ["deepseek", "~deepseek", "deepseek-ai"],
    epoch: ["DeepSeek"],
    nvd: ["deepseek"],
    statusHosts: ["status.deepseek.com"],
  },
  midjourney: { name: "Midjourney", domains: ["midjourney.com"], epoch: ["Midjourney"], legalNames: ["Midjourney, Inc."] },
  adobe: {
    name: "Adobe",
    vendorWide: true,
    domains: ["adobe.com"],
    epoch: ["Adobe"],
    legalNames: ["Adobe Inc."],
    statusHosts: ["status.adobe.com"],
    fedramp: ["Adobe"],
  },
  otter: { name: "Otter.ai", domains: ["otter.ai"], legalNames: ["Otter.ai, Inc.", "AISense, Inc."], statusHosts: ["status.otter.ai"] },
  fireflies: { name: "Fireflies.ai", domains: ["fireflies.ai"], legalNames: ["Fireflies.AI Corp."], statusHosts: ["status.fireflies.ai"] },
  granola: { name: "Granola", domains: ["granola.ai", "granola.so"], statusHosts: ["status.granola.ai", "status.granola.so"] },
  descript: { name: "Descript", domains: ["descript.com"], legalNames: ["Descript, Inc."], statusHosts: ["status.descript.com"] },
  notion: {
    name: "Notion Labs",
    vendorWide: true,
    domains: ["notion.so", "notion.com"],
    legalNames: ["Notion Labs, Inc.", "Notion Labs Inc."],
    nvd: ["notion"],
    statusHosts: ["status.notion.so", "www.notion-status.com"],
  },
  grammarly: {
    name: "Grammarly",
    domains: ["grammarly.com"],
    legalNames: ["Grammarly, Inc.", "Grammarly Inc."],
    nvd: ["grammarly"],
    statusHosts: ["status.grammarly.com"],
  },
  jasper: { name: "Jasper AI", domains: ["jasper.ai"], statusHosts: ["status.jasper.ai"] },
  hubspot: {
    name: "HubSpot",
    vendorWide: true,
    domains: ["hubspot.com"],
    legalNames: ["HubSpot, Inc."],
    nvd: ["hubspot"],
    statusHosts: ["status.hubspot.com"],
  },
  salesforce: {
    name: "Salesforce",
    vendorWide: true,
    domains: ["salesforce.com"],
    aliases: ["salesforce"],
    epoch: ["Salesforce", "Salesforce Research"],
    legalNames: ["Salesforce, Inc."],
    fedramp: ["Salesforce"],
  },
  slack: {
    name: "Slack",
    vendorWide: true,
    parent: "salesforce",
    domains: ["slack.com"],
    legalNames: ["Slack Technologies, LLC"],
    fedramp: ["Slack Technologies"],
  },
  elevenlabs: { name: "ElevenLabs", domains: ["elevenlabs.io"], epoch: ["ElevenLabs"], statusHosts: ["status.elevenlabs.io"] },
  canva: { name: "Canva", vendorWide: true, domains: ["canva.com"], legalNames: ["Canva Pty Ltd"], nvd: ["canva"], statusHosts: ["status.canva.com"] },
  zoom: {
    name: "Zoom",
    vendorWide: true,
    domains: ["zoom.us", "zoom.com"],
    legalNames: ["Zoom Communications, Inc.", "Zoom Video Communications, Inc."],
    nvd: ["zoom"],
    statusHosts: ["status.zoom.us"],
    fedramp: ["Zoom Video Communications, LLC"],
  },
  tabnine: { name: "Tabnine", domains: ["tabnine.com"], statusHosts: ["status.tabnine.com"] },
  heygen: { name: "HeyGen", domains: ["heygen.com"], statusHosts: ["status.heygen.com"] },
  "read-ai": { name: "Read AI", domains: ["read.ai"], statusHosts: ["status.read.ai"] },
  zapier: { name: "Zapier", vendorWide: true, domains: ["zapier.com"], legalNames: ["Zapier, Inc."], nvd: ["zapier"], statusHosts: ["status.zapier.com"] },
  make: { name: "Make (Celonis)", vendorWide: true, domains: ["make.com"], legalNames: ["Celonis SE"], statusHosts: ["status.make.com"] },
  n8n: {
    name: "n8n",
    vendorWide: true,
    domains: ["n8n.io"],
    legalNames: ["n8n GmbH"],
    nvd: ["n8n"],
    packages: [{ ecosystem: "npm", name: "n8n" }, { ecosystem: "npm", name: "n8n-workflow" }, { ecosystem: "npm", name: "n8n-nodes-base" }],
    statusHosts: ["status.n8n.cloud", "status.n8n.io"],
  },
  intercom: { name: "Intercom", vendorWide: true, domains: ["intercom.com", "intercom.io"], legalNames: ["Intercom, Inc."], statusHosts: ["www.intercomstatus.com"] },
  zendesk: { name: "Zendesk", vendorWide: true, domains: ["zendesk.com"], legalNames: ["Zendesk, Inc."], nvd: ["zendesk"], fedramp: ["Zendesk"] },
  gong: { name: "Gong", domains: ["gong.io"], statusHosts: ["status.gong.io"] },
  "copy-ai": { name: "Copy.ai", domains: ["copy.ai"], statusHosts: ["status.copy.ai"] },
  synthflow: { name: "Synthflow AI", domains: ["synthflow.ai"], statusHosts: ["status.synthflow.ai"] },
  vapi: { name: "Vapi", domains: ["vapi.ai"], statusHosts: ["status.vapi.ai"] },
  retool: { name: "Retool", vendorWide: true, domains: ["retool.com"], legalNames: ["Retool, Inc."], nvd: ["retool"], statusHosts: ["status.retool.com"] },
  lindy: { name: "Lindy", domains: ["lindy.ai"], statusHosts: ["status.lindy.ai"] },
  "relevance-ai": { name: "Relevance AI", domains: ["relevanceai.com"], statusHosts: ["status.relevanceai.com"] },
  figma: { name: "Figma", vendorWide: true, domains: ["figma.com"], legalNames: ["Figma, Inc."], nvd: ["figma"], statusHosts: ["status.figma.com"], fedramp: ["Figma"] },
  amplitude: { name: "Amplitude", vendorWide: true, domains: ["amplitude.com"], legalNames: ["Amplitude, Inc."], statusHosts: ["status.amplitude.com"] },

  // Model developers in the broad index (not behind a reviewed tool).
  meta: {
    name: "Meta",
    vendorWide: true,
    domains: ["meta.com", "ai.meta.com"],
    aliases: ["meta", "meta-llama", "facebook"],
    epoch: ["Meta AI", "Facebook AI Research", "Facebook", "Meta"],
    legalNames: ["Meta Platforms, Inc."],
    signatory: ["Meta"],
  },
  mistral: {
    name: "Mistral AI",
    domains: ["mistral.ai"],
    aliases: ["mistral", "mistralai"],
    epoch: ["Mistral AI"],
    legalNames: ["MISTRAL AI", "Mistral AI"],
    packages: [{ ecosystem: "pip", name: "mistralai" }, { ecosystem: "npm", name: "@mistralai/mistralai" }],
    statusHosts: ["status.mistral.ai"],
    signatory: ["Mistral AI"],
  },
  alibaba: {
    name: "Alibaba (Qwen)",
    vendorWide: true,
    domains: ["alibabacloud.com", "qwen.ai"],
    aliases: ["alibaba", "qwen", "alibaba cloud"],
    epoch: ["Alibaba"],
    legalNames: ["Alibaba Group Holding Limited"],
  },
  xai: {
    name: "xAI",
    domains: ["x.ai"],
    aliases: ["xai", "x-ai", "~x-ai"],
    epoch: ["xAI"],
    legalNames: ["X.AI Corp.", "X.AI LLC"],
    statusHosts: ["status.x.ai"],
    fedramp: ["xAI"],
    signatory: ["xAI"],
  },
  cohere: {
    name: "Cohere",
    domains: ["cohere.com"],
    aliases: ["cohere", "coherelabs", "cohereforai"],
    epoch: ["Cohere", "Cohere For AI"],
    legalNames: ["Cohere Inc."],
    packages: [{ ecosystem: "pip", name: "cohere" }],
    statusHosts: ["status.cohere.com"],
    signatory: ["Cohere"],
  },
  amazon: {
    name: "Amazon",
    vendorWide: true,
    domains: ["amazon.com", "aws.amazon.com"],
    aliases: ["amazon"],
    epoch: ["Amazon"],
    legalNames: ["Amazon.com, Inc."],
    fedramp: ["Amazon"],
    signatory: ["Amazon"],
  },
  nvidia: {
    name: "NVIDIA",
    vendorWide: true,
    domains: ["nvidia.com"],
    aliases: ["nvidia"],
    epoch: ["NVIDIA", "Nvidia"],
    legalNames: ["NVIDIA Corporation"],
    signatory: ["NVIDIA"],
  },
  ibm: {
    name: "IBM",
    vendorWide: true,
    domains: ["ibm.com"],
    aliases: ["ibm", "ibm-granite"],
    epoch: ["IBM", "IBM Research"],
    legalNames: ["International Business Machines Corporation"],
    fedramp: ["IBM"],
    signatory: ["IBM"],
  },
  moonshot: { name: "Moonshot AI", domains: ["moonshot.ai", "moonshot.cn"], aliases: ["moonshot", "moonshotai", "~moonshotai", "moonshot ai"], epoch: ["Moonshot", "Moonshot AI"] },
  zhipu: { name: "Zhipu AI (Z.ai)", domains: ["z.ai", "zhipuai.cn"], aliases: ["z-ai", "~z-ai", "zai", "zai-org", "thudm"], epoch: ["Zhipu AI", "Z.ai (Zhipu AI)", "Z.ai"], signatory: ["Zhipu.ai"] },
  minimax: { name: "MiniMax", domains: ["minimax.io", "minimaxi.com"], aliases: ["minimax", "minimaxai"], epoch: ["MiniMax"], signatory: ["Minimax"] },
  tencent: { name: "Tencent", vendorWide: true, domains: ["tencent.com"], aliases: ["tencent"], epoch: ["Tencent"] },
  baidu: { name: "Baidu", vendorWide: true, domains: ["baidu.com"], aliases: ["baidu"], epoch: ["Baidu"] },
  bytedance: { name: "ByteDance", vendorWide: true, domains: ["bytedance.com"], aliases: ["bytedance", "bytedance-seed"], epoch: ["ByteDance"] },
  xiaomi: { name: "Xiaomi", vendorWide: true, domains: ["mi.com"], aliases: ["xiaomi", "xiaomimimo"], epoch: ["Xiaomi"] },
  allenai: { name: "Allen Institute for AI", domains: ["allenai.org"], aliases: ["allenai"], epoch: ["Allen Institute for AI"] },
  "black-forest-labs": { name: "Black Forest Labs", domains: ["bfl.ai"], aliases: ["black-forest-labs"], epoch: ["Black Forest Labs"], signatory: ["Black Forest Labs"] },
  stability: { name: "Stability AI", domains: ["stability.ai"], aliases: ["stabilityai", "stability-ai"], epoch: ["Stability AI"], statusHosts: ["stabilityai.instatus.com"] },
};

/** The organization behind each reviewed tool. */
export const SLUG_ORG: Record<string, string> = {
  chatgpt: "openai",
  claude: "anthropic",
  gemini: "google",
  "microsoft-copilot": "microsoft",
  perplexity: "perplexity",
  "github-copilot": "github",
  cursor: "anysphere",
  deepseek: "deepseek",
  midjourney: "midjourney",
  "adobe-firefly": "adobe",
  otter: "otter",
  fireflies: "fireflies",
  granola: "granola",
  descript: "descript",
  "notion-ai": "notion",
  grammarly: "grammarly",
  jasper: "jasper",
  "hubspot-breeze": "hubspot",
  "salesforce-einstein": "salesforce",
  elevenlabs: "elevenlabs",
  "canva-magic": "canva",
  "slack-ai": "slack",
  "zoom-ai-companion": "zoom",
  tabnine: "tabnine",
  heygen: "heygen",
  "read-ai": "read-ai",
  "zapier-central": "zapier",
  "make-ai": "make",
  "n8n-ai": "n8n",
  "intercom-fin": "intercom",
  "zendesk-ai": "zendesk",
  "gong-ai": "gong",
  "copy-ai": "copy-ai",
  synthflow: "synthflow",
  vapi: "vapi",
  "retool-ai": "retool",
  lindy: "lindy",
  "relevance-ai": "relevance-ai",
  "figma-ai": "figma",
  "amplitude-ai": "amplitude",
};

// ------------------------------------------------------------------ matching

/** Lowercase, trimmed, inner whitespace collapsed. */
export const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Legal-name form: lowercase, punctuation dropped, whitespace collapsed ("Anthropic, PBC" = "anthropic pbc"). */
export const normLegal = (s: string) => norm(s.replace(/[.,'"()]/g, " "));

const ALIAS = new Map<string, string>();
const EPOCH = new Map<string, string>();
const DOMAIN = new Map<string, string>();
for (const [id, o] of Object.entries(ORGS)) {
  for (const a of o.aliases ?? []) ALIAS.set(norm(a), id);
  for (const e of o.epoch ?? []) EPOCH.set(norm(e), id);
  for (const d of o.domains) DOMAIN.set(d.toLowerCase(), id);
}

/** Words that identify the organization in a program name: its name, aliases and domain labels. */
export function brandWords(org: string): string[] {
  const o = ORGS[org];
  if (!o) return [];
  const words = [o.name.split(/[\s(]/)[0], ...(o.aliases ?? []), ...o.domains.map((d) => d.split(".")[0])];
  return [...new Set(words.map((w) => norm(w).replace(/[^a-z0-9]/g, "")).filter((w) => w.length >= 3))];
}

export const orgForSlug = (slug: string): string | undefined => SLUG_ORG[slug];

/** Slugs of reviewed tools whose organization is this one. */
export const slugsForOrg = (org: string) => Object.entries(SLUG_ORG).filter(([, o]) => o === org).map(([s]) => s);

/** Exact alias match on a dataset's vendor or hub-organization name. */
export const orgForAlias = (name: string | null | undefined): string | undefined => (name ? ALIAS.get(norm(name)) : undefined);

/** Every registry organization named in an Epoch "Organization" cell (a comma-separated list). */
export function orgsForEpoch(cell: string): string[] {
  const out = new Set<string>();
  for (const part of cell.split(",")) {
    const id = EPOCH.get(norm(part));
    if (id) out.add(id);
  }
  return [...out];
}

/** Registry organization that controls this host, by exact domain or a subdomain of one. */
export function orgForHost(host: string): string | undefined {
  let h = host.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  while (h.includes(".")) {
    const hit = DOMAIN.get(h);
    if (hit) return hit;
    h = h.slice(h.indexOf(".") + 1);
  }
  return undefined;
}

export const orgForUrl = (u: string): string | undefined => {
  try {
    return orgForHost(new URL(u).hostname);
  } catch {
    return undefined;
  }
};

/** Organization for a broad-index entry: its vendor field, else the hub namespace in its id ("hf:Org/model", "or:org/model"). */
export function orgForIndexEntry(e: { id: string; vendor: string | null; reviewedSlug?: string | null }): string | undefined {
  if (e.reviewedSlug && SLUG_ORG[e.reviewedSlug]) return SLUG_ORG[e.reviewedSlug];
  const byVendor = orgForAlias(e.vendor);
  if (byVendor) return byVendor;
  const m = e.id.match(/^(?:hf|or):([^/]+)\//);
  return m ? orgForAlias(m[1]) : undefined;
}

/**
 * Model key for matching one dataset's model id to another's: the part after any
 * "vendor/" prefix, lowercased, with dots, underscores and spaces turned into
 * hyphens. "openai/GPT-4.1" and "gpt_4.1" both give "gpt-4-1". Dates and
 * version suffixes are kept, so a dated snapshot never matches the alias.
 */
export function modelKey(id: string): string {
  const tail = id.includes("/") ? id.slice(id.lastIndexOf("/") + 1) : id;
  return tail
    .toLowerCase()
    .replace(/^~/, "")
    .replace(/\+/g, "-plus")
    .replace(/[\s._:]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
