import type { Tool } from "@/lib/schema";

/** Additional AI wrappers, platforms, and productized tools beyond core models. */
export const extraTools = [
  {
    slug: "zapier-central",
    name: "Zapier Central / AI Actions",
    category: "automation",
    kind: "wrapper",
    website: "https://zapier.com/ai",
    summary:
      "Automation wrapper that connects AI steps into existing SaaS workflows. Fit depends on how much customer data crosses Zapier.",
    scores: { reputation: 78, approval: 80, capability: 76, icpSafe: 72 },
    pros: [
      "Familiar procurement story for ops teams",
      "Huge connector surface for wrappers around models",
      "Useful for internal workflow AI without a custom agent stack",
    ],
    cons: [
      "Data path spans many vendors",
      "Can look like shadow IT if ungoverned",
      "Not a substitute for a governed model tier",
    ],
    vetoTags: ["opaque-data-policy"],
    fitTags: ["automation", "ops", "integration"],
    tiers: [
      {
        name: "Team / Company",
        trainsOnInputs: "depends",
        notes: "Confirm AI action data handling for your plan.",
      },
    ],
    evidence: [
      {
        url: "https://zapier.com/ai",
        title: "Zapier AI",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "make-ai",
    name: "Make AI",
    category: "automation",
    kind: "wrapper",
    website: "https://www.make.com",
    summary:
      "Visual automation platform with AI modules. Strong for ops wrappers; governance is on the buyer.",
    scores: { reputation: 74, approval: 77, capability: 75, icpSafe: 68 },
    pros: [
      "Flexible scenario builder for AI wrappers",
      "Good for non-engineering automation owners",
      "Can keep some flows internal",
    ],
    cons: [
      "Complex graphs can hide data exfiltration paths",
      "Brand optics weaker than Zapier for some buyers",
      "Needs explicit DPA review",
    ],
    vetoTags: ["weak-enterprise-controls"],
    fitTags: ["automation", "ops"],
    tiers: [
      {
        name: "Core / Pro / Enterprise",
        trainsOnInputs: "depends",
        notes: "Prefer Enterprise for customer data workflows.",
      },
    ],
    evidence: [
      {
        url: "https://www.make.com/ai-agents",
        title: "Make AI Agents",
        kind: "vendor-policy",
        dated: "2026-11-22",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "n8n-ai",
    name: "n8n AI",
    category: "automation",
    kind: "platform",
    website: "https://n8n.io",
    summary:
      "Open-source workflow automation with AI nodes. Self-host option can improve ICP-safe posture for technical teams.",
    scores: { reputation: 76, approval: 82, capability: 80, icpSafe: 84 },
    pros: [
      "Self-host path for sensitive environments",
      "Strong builder culture approval",
      "Good wrapper layer over many model APIs",
    ],
    cons: [
      "Requires engineering ownership",
      "Cloud SaaS still needs policy review",
      "Less known to non-technical executives",
    ],
    vetoTags: [],
    fitTags: ["automation", "self-host", "engineering"],
    tiers: [
      {
        name: "Cloud",
        trainsOnInputs: "depends",
        notes: "Review cloud data path before customer data.",
      },
      {
        name: "Self-hosted",
        trainsOnInputs: "no",
        notes: "Stronger ICP-safe story when operated well.",
      },
    ],
    evidence: [
      {
        url: "https://n8n.io/ai/",
        title: "n8n AI",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "intercom-fin",
    name: "Intercom Fin",
    category: "support",
    kind: "addon",
    website: "https://www.intercom.com/fin",
    summary:
      "Customer support AI agent inside Intercom. High leverage for support-led ICPs; customer-facing brand risk is real.",
    scores: { reputation: 74, approval: 78, capability: 82, icpSafe: 66 },
    pros: [
      "Native to a common support stack",
      "Can deflect ticket volume with citations",
      "Enterprise packaging exists",
    ],
    cons: [
      "Customer-facing answers can invent policy",
      "Brand damage if Fin mishandles edge cases",
      "Needs tight knowledge-base governance",
    ],
    vetoTags: ["high-controversy"],
    fitTags: ["support", "customer-facing"],
    tiers: [
      {
        name: "Fin add-on",
        trainsOnInputs: "depends",
        notes: "Confirm training and retention for your Intercom workspace.",
      },
    ],
    evidence: [
      {
        url: "https://www.intercom.com/fin",
        title: "Intercom Fin",
        kind: "vendor-policy",
        dated: "2026-10-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "zendesk-ai",
    name: "Zendesk AI",
    category: "support",
    kind: "addon",
    website: "https://www.zendesk.com/service/ai/",
    summary:
      "Support AI inside Zendesk. Safer procurement story for companies already on Zendesk.",
    scores: { reputation: 78, approval: 74, capability: 76, icpSafe: 78 },
    pros: [
      "Known enterprise support brand",
      "Lower new-vendor risk if Zendesk is already approved",
      "Admin controls fit IT buyers",
    ],
    cons: [
      "Quality varies by knowledge base hygiene",
      "Still customer-facing risk",
      "Pricing layers on Zendesk suites",
    ],
    vetoTags: [],
    fitTags: ["support", "enterprise"],
    tiers: [
      {
        name: "Zendesk AI features",
        trainsOnInputs: "no",
        notes: "Confirm plan tier and regional controls with Zendesk.",
      },
    ],
    evidence: [
      {
        url: "https://www.zendesk.com/service/ai/",
        title: "Zendesk AI",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "gong-ai",
    name: "Gong AI",
    category: "meetings",
    kind: "platform",
    website: "https://www.gong.io",
    summary:
      "Revenue intelligence over calls and emails. Powerful for sales ICPs; recording optics need process.",
    scores: { reputation: 76, approval: 81, capability: 84, icpSafe: 64 },
    pros: [
      "Strong sales-team approval",
      "Useful coaching and forecast signals",
      "Enterprise sales already understand Gong",
    ],
    cons: [
      "Always-on call analysis worries privacy-sensitive buyers",
      "Customer discovery calls become a brand-risk surface",
      "Hard veto for some regulated ICPs",
    ],
    vetoTags: ["weak-enterprise-controls"],
    fitTags: ["sales", "meetings", "crm"],
    tiers: [
      {
        name: "Enterprise",
        trainsOnInputs: "depends",
        notes: "Require participant disclosure and legal review.",
      },
    ],
    evidence: [
      {
        url: "https://www.gong.io/security/",
        title: "Gong security",
        kind: "vendor-policy",
        dated: "2026-08-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "copy-ai",
    name: "Copy.ai",
    category: "writing",
    kind: "wrapper",
    website: "https://www.copy.ai",
    summary:
      "GTM content and workflow wrapper around models. Useful for marketing teams; generic AI-copy stigma exists.",
    scores: { reputation: 66, approval: 74, capability: 72, icpSafe: 64 },
    pros: [
      "Workflows aimed at GTM teams",
      "Faster first drafts for campaigns",
      "Business packaging available",
    ],
    cons: [
      "Output can feel generic to sophisticated ICPs",
      "Brand voice still needs human editing",
      "Wrapper lock-in around prompts and tables",
    ],
    vetoTags: [],
    fitTags: ["marketing", "writing", "gtm"],
    tiers: [
      {
        name: "Business",
        trainsOnInputs: "depends",
        notes: "Keep unreleased product claims out of consumer tiers.",
      },
    ],
    evidence: [
      {
        url: "https://www.copy.ai",
        title: "Copy.ai",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "synthflow",
    name: "Synthflow",
    category: "voice",
    kind: "wrapper",
    website: "https://synthflow.ai",
    summary:
      "Voice agent wrapper for outbound and support calls. High capability, high brand risk if callers feel spoofed.",
    scores: { reputation: 55, approval: 70, capability: 78, icpSafe: 42 },
    pros: [
      "Fast voice agent setup",
      "Useful for after-hours support experiments",
      "API-friendly wrapper model",
    ],
    cons: [
      "Synthetic callers can damage trust with premium ICPs",
      "Consent and disclosure must be explicit",
      "Young vendor for conservative procurement",
    ],
    vetoTags: ["high-controversy", "weak-enterprise-controls"],
    fitTags: ["voice", "support", "outbound"],
    tiers: [
      {
        name: "Growth / Enterprise",
        trainsOnInputs: "depends",
        notes: "Do not use for undisclosed customer calls.",
      },
    ],
    evidence: [
      {
        url: "https://synthflow.ai",
        title: "Synthflow",
        kind: "vendor-policy",
        dated: "2026-10-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "vapi",
    name: "Vapi",
    category: "voice",
    kind: "platform",
    website: "https://vapi.ai",
    summary:
      "Developer voice-agent platform. Flexible for product teams building assistants; customer trust depends on disclosure.",
    scores: { reputation: 68, approval: 79, capability: 86, icpSafe: 58 },
    pros: [
      "Strong builder approval",
      "Composable voice stack",
      "Better than opaque dialer wrappers for engineering teams",
    ],
    cons: [
      "Still a synthetic-voice brand risk",
      "Needs product and legal design, not just an API key",
      "Enterprise controls vary by deployment",
    ],
    vetoTags: ["high-controversy"],
    fitTags: ["voice", "agents", "engineering"],
    tiers: [
      {
        name: "Platform",
        trainsOnInputs: "depends",
        notes: "Treat as product infrastructure with explicit UX disclosure.",
      },
    ],
    evidence: [
      {
        url: "https://vapi.ai",
        title: "Vapi",
        kind: "vendor-policy",
        dated: "2026-10-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "retool-ai",
    name: "Retool AI",
    category: "productivity",
    kind: "addon",
    website: "https://retool.com/ai",
    summary:
      "AI inside internal tools. Usually safer when kept employee-facing and connected to approved data sources.",
    scores: { reputation: 80, approval: 78, capability: 74, icpSafe: 82 },
    pros: [
      "Internal-tool context reduces public brand risk",
      "Fits ops and support back offices",
      "Enterprise Retool customers already trust the shell",
    ],
    cons: [
      "Connected resources can still leak via prompts",
      "Not a customer-facing assistant",
      "Quality depends on app design",
    ],
    vetoTags: [],
    fitTags: ["internal", "ops", "support"],
    tiers: [
      {
        name: "Retool AI",
        trainsOnInputs: "depends",
        notes: "Keep on internal apps with least-privilege resources.",
      },
    ],
    evidence: [
      {
        url: "https://retool.com/ai",
        title: "Retool AI",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "lindy",
    name: "Lindy",
    category: "agents",
    kind: "wrapper",
    website: "https://www.lindy.ai",
    summary:
      "No-code AI agent builder for GTM and ops tasks. Convenient wrapper; governance and brand risk need guardrails.",
    scores: { reputation: 62, approval: 76, capability: 78, icpSafe: 54 },
    pros: [
      "Fast agent setup for non-engineers",
      "Useful email and scheduling wrappers",
      "Good for internal experiments",
    ],
    cons: [
      "Agent actions can email customers without enough review",
      "Young brand for cautious ICPs",
      "Opaque failure modes in autonomous steps",
    ],
    vetoTags: ["weak-enterprise-controls", "opaque-data-policy"],
    fitTags: ["agents", "gtm", "ops"],
    tiers: [
      {
        name: "Business",
        trainsOnInputs: "depends",
        notes: "Disable customer-facing autonomy until reviewed.",
      },
    ],
    evidence: [
      {
        url: "https://www.lindy.ai",
        title: "Lindy",
        kind: "vendor-policy",
        dated: "2026-10-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "relevance-ai",
    name: "Relevance AI",
    category: "agents",
    kind: "platform",
    website: "https://relevanceai.com",
    summary:
      "Workforce agents platform. Strong for multi-agent wrappers; enterprise packaging helps ICP fit.",
    scores: { reputation: 70, approval: 75, capability: 83, icpSafe: 70 },
    pros: [
      "Built for agent teams rather than single chat",
      "Marketplace and tooling for GTM workflows",
      "Clearer product packaging than hobby agent repos",
    ],
    cons: [
      "Still a newer category for many buyers",
      "Needs evaluation harnesses before customer contact",
      "Data connectors require careful scoping",
    ],
    vetoTags: [],
    fitTags: ["agents", "gtm", "automation"],
    tiers: [
      {
        name: "Team / Enterprise",
        trainsOnInputs: "depends",
        notes: "Prefer Enterprise for production customer workflows.",
      },
    ],
    evidence: [
      {
        url: "https://relevanceai.com",
        title: "Relevance AI",
        kind: "vendor-policy",
        dated: "2026-10-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "figma-ai",
    name: "Figma AI",
    category: "design",
    kind: "addon",
    website: "https://www.figma.com/ai/",
    summary:
      "Design AI inside Figma. Usually a safe brand association for product and design orgs already on Figma.",
    scores: { reputation: 84, approval: 80, capability: 74, icpSafe: 86 },
    pros: [
      "Lives inside a trusted design system of record",
      "Low new-vendor friction",
      "Useful for early exploration, not final brand systems",
    ],
    cons: [
      "Can produce generic UI patterns",
      "File contents still need access control",
      "Not a replacement for design critique",
    ],
    vetoTags: [],
    fitTags: ["design", "product"],
    tiers: [
      {
        name: "Figma AI features",
        trainsOnInputs: "depends",
        notes: "Confirm plan and admin settings for your org.",
      },
    ],
    evidence: [
      {
        url: "https://www.figma.com/ai/",
        title: "Figma AI",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "amplitude-ai",
    name: "Amplitude AI",
    category: "analytics",
    kind: "addon",
    website: "https://amplitude.com",
    summary:
      "Product analytics AI assistants. Fit for product-led companies already trusting Amplitude with event data.",
    scores: { reputation: 80, approval: 76, capability: 72, icpSafe: 80 },
    pros: [
      "Uses analytics context teams already have",
      "Enterprise trust surface if Amplitude is approved",
      "Helps PMs ask questions without new warehouses",
    ],
    cons: [
      "Event data sensitivity still applies",
      "Answers only as good as tracking plans",
      "Not a general company assistant",
    ],
    vetoTags: [],
    fitTags: ["analytics", "product"],
    tiers: [
      {
        name: "Amplitude AI features",
        trainsOnInputs: "depends",
        notes: "Keep within existing Amplitude DPA and admin controls.",
      },
    ],
    evidence: [
      {
        url: "https://amplitude.com",
        title: "Amplitude",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
] as const satisfies ReadonlyArray<Omit<Tool, never>>;
