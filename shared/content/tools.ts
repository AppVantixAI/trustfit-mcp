import { ToolsArraySchema, type Tool } from "@/lib/schema";
import { extraTools } from "./tools-extra";

const rawTools = [
  {
    slug: "chatgpt",
    name: "ChatGPT",
    category: "chat",
    website: "https://chatgpt.com",
    summary:
      "OpenAI's flagship assistant. Ubiquitous, capable, and plan-tier dependent for brand-safe enterprise use.",
    scores: { reputation: 72, approval: 84, capability: 92, icpSafe: 68 },
    pros: [
      "Best-known AI brand; buyers already understand it",
      "Strong multimodal and agent features on paid tiers",
      "Business/Enterprise options with clearer data terms",
    ],
    cons: [
      "Consumer brand association can feel casual for regulated ICPs",
      "Ongoing copyright and safety headlines",
      "Free/Plus posture differs sharply from Enterprise",
    ],
    vetoTags: ["consumer-default-training", "lawsuit-active"],
    tiers: [
      {
        name: "Free / Plus / Pro",
        trainsOnInputs: "depends",
        notes: "Consumer settings and product defaults vary; treat as higher brand risk.",
      },
      {
        name: "Business / Enterprise / API ZDR",
        trainsOnInputs: "no",
        notes: "Prefer these for customer data and external-facing workflows.",
      },
    ],
    evidence: [
      {
        url: "https://openai.com/enterprise-privacy/",
        title: "OpenAI enterprise privacy",
        kind: "vendor-policy",
        dated: "2026-11-01",
      },
      {
        url: "https://aileakage.com/ai-tool-risk-directory/",
        title: "AI Leakage tool risk notes (editorial)",
        kind: "research",
        dated: "2026-05-30",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "claude",
    name: "Claude",
    category: "chat",
    website: "https://claude.ai",
    summary:
      "Anthropic assistant with a safety-forward brand. Strong for careful B2B buyers who want depth without hype noise.",
    scores: { reputation: 86, approval: 82, capability: 90, icpSafe: 84 },
    pros: [
      "Safety and constitutional AI positioning lands with cautious ICPs",
      "Team/Enterprise and API paths with clearer retention posture",
      "Strong long-context analysis for internal knowledge work",
    ],
    cons: [
      "Less household recognition than ChatGPT for some consumer brands",
      "Consumer Free/Pro still need tier discipline",
      "Capacity and rate limits can frustrate heavy teams",
    ],
    vetoTags: ["consumer-default-training"],
    tiers: [
      {
        name: "Free / Pro / Max",
        trainsOnInputs: "depends",
        notes: "Consumer products; confirm settings before sensitive work.",
      },
      {
        name: "Team / Enterprise / API",
        trainsOnInputs: "no",
        notes: "Better default for company-wide and customer-adjacent use.",
      },
    ],
    evidence: [
      {
        url: "https://www.anthropic.com/news/updates-to-our-consumer-terms",
        title: "Anthropic consumer terms updates",
        kind: "vendor-policy",
        dated: "2026-08-01",
      },
      {
        url: "https://shadowaipolicy.com/ai-tools/",
        title: "Shadow AI policy tool tiers",
        kind: "research",
        dated: "2026-07-29",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "gemini",
    name: "Google Gemini",
    category: "chat",
    website: "https://gemini.google.com",
    summary:
      "Google's assistant family. Workspace Gemini is a different brand story than consumer Gemini.",
    scores: { reputation: 70, approval: 76, capability: 88, icpSafe: 62 },
    pros: [
      "Deep Workspace integration for Google-centric companies",
      "Enterprise Google trust surface for many buyers",
      "Strong multimodal capability",
    ],
    cons: [
      "Consumer Gemini often scored as higher training/data risk",
      "Brand confusion between personal and Workspace products",
      "Privacy headlines still color some ICP reactions",
    ],
    vetoTags: ["consumer-default-training", "training-on-inputs"],
    tiers: [
      {
        name: "Consumer Gemini",
        trainsOnInputs: "yes",
        notes: "Often treated as limited or prohibited for client data.",
      },
      {
        name: "Gemini for Workspace",
        trainsOnInputs: "no",
        notes: "Prefer for company accounts with admin controls.",
      },
    ],
    evidence: [
      {
        url: "https://shadowaipolicy.com/ai-tools/",
        title: "Gemini personal vs Workspace verdicts",
        kind: "research",
        dated: "2026-07-29",
      },
      {
        url: "https://aileakage.com/ai-tool-risk-directory/",
        title: "Gemini risk by plan tier",
        kind: "research",
        dated: "2026-05-30",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "microsoft-copilot",
    name: "Microsoft Copilot",
    category: "productivity",
    website: "https://copilot.microsoft.com",
    summary:
      "Microsoft's assistant spanning consumer Copilot and M365 Copilot. Enterprise story is strongest inside Microsoft estates.",
    scores: { reputation: 78, approval: 80, capability: 85, icpSafe: 80 },
    pros: [
      "Familiar Microsoft brand for enterprise ICPs",
      "M365 Copilot sits inside existing compliance programs",
      "Admin and identity controls via Entra",
    ],
    cons: [
      "Consumer Copilot is a different posture than work Copilot",
      "Cost and seat sprawl can become a GTM objection",
      "Quality varies by workload",
    ],
    vetoTags: [],
    tiers: [
      {
        name: "Personal Copilot",
        trainsOnInputs: "depends",
        notes: "Keep off client work unless policy explicitly allows.",
      },
      {
        name: "Microsoft 365 Copilot",
        trainsOnInputs: "no",
        notes: "Stronger fit for enterprise and regulated buyers.",
      },
    ],
    evidence: [
      {
        url: "https://www.microsoft.com/en-us/copilot",
        title: "Microsoft Copilot: AI built for work",
        kind: "vendor-policy",
        dated: "2026-11-22",
      },
      {
        url: "https://shadowaipolicy.com/ai-tools/",
        title: "Copilot work vs personal tiers",
        kind: "research",
        dated: "2026-07-29",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    category: "search",
    website: "https://www.perplexity.ai",
    summary:
      "Answer engine with citations. Useful research aid; enterprise tier matters for brand-safe use.",
    scores: { reputation: 74, approval: 81, capability: 84, icpSafe: 70 },
    pros: [
      "Cited answers help internal research workflows",
      "Enterprise offering with clearer security messaging",
      "Fast for competitive and market scans",
    ],
    cons: [
      "Publisher and scraping controversies affect some ICPs",
      "Consumer product can feel unofficial for client work",
      "Citation quality still needs human verification",
    ],
    vetoTags: ["consumer-default-training"],
    tiers: [
      {
        name: "Consumer",
        trainsOnInputs: "depends",
        notes: "Fine for public research; avoid confidential uploads.",
      },
      {
        name: "Enterprise",
        trainsOnInputs: "no",
        notes: "Prefer for company accounts and shared workspaces.",
      },
    ],
    evidence: [
      {
        url: "https://www.perplexity.ai/enterprise",
        title: "Perplexity Enterprise",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
      {
        url: "https://aileakage.com/ai-tool-risk-directory/",
        title: "Perplexity risk by tier",
        kind: "research",
        dated: "2026-05-30",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "github-copilot",
    name: "GitHub Copilot",
    category: "coding",
    website: "https://github.com/features/copilot",
    summary:
      "Microsoft/GitHub coding assistant. Business/Enterprise tiers are the reputation-safe path for software teams.",
    scores: { reputation: 76, approval: 83, capability: 88, icpSafe: 74 },
    pros: [
      "Default choice for many engineering orgs",
      "Business/Enterprise IP and admin controls",
      "Strong IDE ecosystem",
    ],
    cons: [
      "Free/Pro posture is weaker for client codebases",
      "IP training debates still surface with legal buyers",
      "Can encourage noisy diffs if ungoverned",
    ],
    vetoTags: ["consumer-default-training"],
    tiers: [
      {
        name: "Free / Pro / Pro+",
        trainsOnInputs: "depends",
        notes: "Higher caution for proprietary client repos.",
      },
      {
        name: "Business / Enterprise",
        trainsOnInputs: "no",
        notes: "Standard for companies shipping product code.",
      },
    ],
    evidence: [
      {
        url: "https://docs.github.com/en/copilot/about-github-copilot",
        title: "GitHub Copilot docs",
        kind: "vendor-policy",
        dated: "2026-10-15",
      },
      {
        url: "https://aileakage.com/ai-tool-risk-directory/",
        title: "Copilot plan-tier risk notes",
        kind: "research",
        dated: "2026-05-30",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "cursor",
    name: "Cursor",
    category: "coding",
    website: "https://cursor.com",
    summary:
      "Agentic code editor. Loved by builders; Privacy Mode and Teams/Enterprise matter for ICP optics.",
    scores: { reputation: 78, approval: 88, capability: 91, icpSafe: 72 },
    pros: [
      "High developer approval and velocity narrative",
      "Privacy Mode and Teams/Enterprise improve posture",
      "Strong multi-file agent workflows",
    ],
    cons: [
      "Young brand versus Microsoft/GitHub for conservative buyers",
      "Hobby/Pro without Privacy Mode is a hard no for many policies",
      "Appears on some high data-risk watchlists",
    ],
    vetoTags: ["weak-enterprise-controls"],
    tiers: [
      {
        name: "Hobby / Pro (no Privacy Mode)",
        trainsOnInputs: "depends",
        notes: "Elevated risk for proprietary code.",
      },
      {
        name: "Pro with Privacy Mode / Teams / Enterprise",
        trainsOnInputs: "no",
        notes: "Use these before putting Cursor near client IP.",
      },
    ],
    evidence: [
      {
        url: "https://cursor.com/security",
        title: "Cursor security",
        kind: "vendor-policy",
        dated: "2026-10-01",
      },
      {
        url: "https://ailist.airiskmanagement.ca/top",
        title: "Shadow AI List exposure notes",
        kind: "research",
        dated: "2026-11-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "deepseek",
    name: "DeepSeek",
    category: "chat",
    website: "https://www.deepseek.com",
    summary:
      "Low-cost frontier models with strong technical buzz and sharp geopolitical/brand risk for many Western ICPs.",
    scores: { reputation: 48, approval: 70, capability: 86, icpSafe: 28 },
    pros: [
      "Impressive price/performance for experimentation",
      "Open-weight options for self-host paths",
      "Fast research iteration for non-sensitive work",
    ],
    cons: [
      "China-associated brand is a deal-breaker for many buyers",
      "Critical ratings on several enterprise risk lists",
      "Hard to defend in regulated or government-adjacent sales",
    ],
    vetoTags: ["china-hosted", "high-controversy", "opaque-data-policy"],
    tiers: [
      {
        name: "Cloud chatbot / API",
        trainsOnInputs: "depends",
        notes: "Treat as high brand and data risk unless self-hosted and reviewed.",
      },
      {
        name: "Self-hosted open weights",
        trainsOnInputs: "no",
        notes: "Can reduce data egress; does not erase ICP brand optics.",
      },
    ],
    evidence: [
      {
        url: "https://sanitized.ai/ai-tools/",
        title: "DeepSeek critical risk profile",
        kind: "research",
        dated: "2026-11-01",
      },
      {
        url: "https://ailist.airiskmanagement.ca/",
        title: "Shadow AI List risk ranking",
        kind: "research",
        dated: "2026-11-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "midjourney",
    name: "Midjourney",
    category: "image",
    website: "https://www.midjourney.com",
    summary:
      "High-taste image generation. Creative strength is clear; training defaults and Discord-era brand complicate B2B optics.",
    scores: { reputation: 68, approval: 85, capability: 90, icpSafe: 52 },
    pros: [
      "Excellent aesthetic quality for marketing exploration",
      "Strong community craft culture",
      "Fast concepting for brand moodboards",
    ],
    cons: [
      "Training-on-inputs and IP debates worry legal buyers",
      "Less enterprise packaging than Adobe Firefly",
      "Consumer creative brand may not fit regulated ICPs",
    ],
    vetoTags: ["training-on-inputs", "weak-enterprise-controls"],
    tiers: [
      {
        name: "Standard plans",
        trainsOnInputs: "yes",
        notes: "Confirm commercial terms before client deliverables.",
      },
    ],
    evidence: [
      {
        url: "https://docs.midjourney.com/hc/en-us/articles/32083472637453-Privacy-Policy",
        title: "Midjourney privacy policy",
        kind: "vendor-policy",
        dated: "2026-09-03",
      },
      {
        url: "https://aileakage.com/ai-tool-risk-directory/",
        title: "Midjourney training notes",
        kind: "research",
        dated: "2026-05-30",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "adobe-firefly",
    name: "Adobe Firefly",
    category: "image",
    website: "https://www.adobe.com/products/firefly.html",
    summary:
      "Adobe generative creative suite with stronger enterprise indemnification story than most consumer image tools.",
    scores: { reputation: 82, approval: 78, capability: 82, icpSafe: 86 },
    pros: [
      "Adobe brand trust with design and marketing orgs",
      "Enterprise indemnification narrative",
      "Fits existing Creative Cloud procurement",
    ],
    cons: [
      "Quality/taste tradeoffs versus Midjourney for some styles",
      "Seat and plan complexity",
      "Free tier should not be confused with Firefly Enterprise",
    ],
    vetoTags: [],
    tiers: [
      {
        name: "Firefly Free / Creative Cloud",
        trainsOnInputs: "depends",
        notes: "Acceptable for many marketing teams; still check policy.",
      },
      {
        name: "Firefly Enterprise",
        trainsOnInputs: "no",
        notes: "Best ICP-safe path for brand-sensitive companies.",
      },
    ],
    evidence: [
      {
        url: "https://www.adobe.com/legal/licenses-terms/adobe-gen-ai-user-guidelines.html",
        title: "Adobe Generative AI User Guidelines",
        kind: "vendor-policy",
        dated: "2026-05-15",
      },
      {
        url: "https://aileakage.com/ai-tool-risk-directory/",
        title: "Firefly tier risk ratings",
        kind: "research",
        dated: "2026-05-30",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "otter",
    name: "Otter.ai",
    category: "meetings",
    website: "https://otter.ai",
    summary:
      "Meeting transcription with high exposure. Litigation and consent optics make it a common ICP risk flag.",
    scores: { reputation: 42, approval: 64, capability: 72, icpSafe: 30 },
    pros: [
      "Easy note capture for sales and recruiting teams",
      "Business/Enterprise options exist",
      "Fast search across past meetings",
    ],
    cons: [
      "Litigation and consent controversies damage brand association",
      "Often rated critical on risk directories",
      "Hard to defend with privacy-sensitive ICPs",
    ],
    vetoTags: ["lawsuit-active", "high-controversy", "opaque-data-policy"],
    tiers: [
      {
        name: "Free / Pro",
        trainsOnInputs: "depends",
        notes: "High caution; disclosure to participants is mandatory.",
      },
      {
        name: "Business / Enterprise",
        trainsOnInputs: "no",
        notes: "Better controls, but controversy baggage remains.",
      },
    ],
    evidence: [
      {
        url: "https://ailist.airiskmanagement.ca/top",
        title: "Otter high risk on Shadow AI List",
        kind: "research",
        dated: "2026-11-01",
      },
      {
        url: "https://aileakage.com/ai-tool-risk-directory/",
        title: "Otter litigation-sensitive rating",
        kind: "research",
        dated: "2026-05-30",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "fireflies",
    name: "Fireflies.ai",
    category: "meetings",
    website: "https://fireflies.ai",
    summary:
      "Meeting assistant popular with sales orgs. Usable with policy, but consent and recording optics still matter.",
    scores: { reputation: 58, approval: 76, capability: 78, icpSafe: 55 },
    pros: [
      "CRM integrations help revenue teams",
      "SOC 2 / GDPR claims on security pages",
      "Useful coaching and search features",
    ],
    cons: [
      "Bot joining calls can feel aggressive to premium ICPs",
      "Consent theater is still on the buyer",
      "Brand association with always-on recording",
    ],
    vetoTags: ["weak-enterprise-controls"],
    tiers: [
      {
        name: "Free / Pro",
        trainsOnInputs: "depends",
        notes: "Require explicit meeting disclosure.",
      },
      {
        name: "Business / Enterprise",
        trainsOnInputs: "no",
        notes: "Better admin story; still manage participant trust.",
      },
    ],
    evidence: [
      {
        url: "https://fireflies.ai/security",
        title: "Fireflies security",
        kind: "vendor-policy",
        dated: "2026-08-01",
      },
      {
        url: "https://shadowaipolicy.com/ai-tools/",
        title: "Fireflies limited tier verdict",
        kind: "research",
        dated: "2026-07-29",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "granola",
    name: "Granola",
    category: "meetings",
    website: "https://www.granola.ai",
    summary:
      "Meeting notes product with a calmer UX. Training defaults and disclosure gaps hurt ICP-safe scores.",
    scores: { reputation: 66, approval: 80, capability: 74, icpSafe: 48 },
    pros: [
      "Less bot-intrusive feel than classic notetakers",
      "Strong product taste among operators",
      "Enterprise Workspace improves defaults",
    ],
    cons: [
      "Training-on by default on lower tiers",
      "Participant disclosure still a process burden",
      "Younger vendor for risk-averse procurement",
    ],
    vetoTags: ["training-on-inputs", "consumer-default-training"],
    tiers: [
      {
        name: "Free / Business",
        trainsOnInputs: "yes",
        notes: "Elevated risk if training remains on by default.",
      },
      {
        name: "Enterprise Workspace",
        trainsOnInputs: "no",
        notes: "Prefer when meeting content is sensitive.",
      },
    ],
    evidence: [
      {
        url: "https://aileakage.com/ai-tool-risk-directory/",
        title: "Granola training default notes",
        kind: "research",
        dated: "2026-05-30",
      },
      {
        url: "https://www.granola.ai",
        title: "Granola product site",
        kind: "vendor-policy",
        dated: "2026-11-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "descript",
    name: "Descript",
    category: "meetings",
    website: "https://www.descript.com",
    summary:
      "AV editing and transcription suite. Powerful for content teams; appears on high-risk exposure lists.",
    scores: { reputation: 62, approval: 79, capability: 86, icpSafe: 50 },
    pros: [
      "Excellent for podcast and video post",
      "Overdub and edit-by-text workflows",
      "Enterprise plan available",
    ],
    cons: [
      "Critical risk scores on some directories",
      "Media of customers/employees raises consent stakes",
      "Brand optics if used on sales calls without process",
    ],
    vetoTags: ["weak-enterprise-controls"],
    tiers: [
      {
        name: "Creator plans",
        trainsOnInputs: "depends",
        notes: "Keep customer raw media off lower tiers.",
      },
      {
        name: "Enterprise",
        trainsOnInputs: "no",
        notes: "Use for company content pipelines with contracts.",
      },
    ],
    evidence: [
      {
        url: "https://ailist.airiskmanagement.ca/top",
        title: "Descript critical risk listing",
        kind: "research",
        dated: "2026-11-01",
      },
      {
        url: "https://www.descript.com/security",
        title: "Descript security",
        kind: "vendor-policy",
        dated: "2026-07-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "notion-ai",
    name: "Notion AI",
    category: "productivity",
    website: "https://www.notion.com/product/ai",
    summary:
      "Workspace AI inside Notion. Enterprise zero-retention path is the safe story for knowledge bases.",
    scores: { reputation: 80, approval: 82, capability: 78, icpSafe: 82 },
    pros: [
      "Lives where docs already live",
      "Enterprise AI controls and SOC/ISO claims",
      "Low friction for operators and PMs",
    ],
    cons: [
      "Workspace sprawl can leak sensitive pages into AI prompts",
      "Free/Plus should not be treated like Enterprise",
      "Quality varies for deep technical drafting",
    ],
    vetoTags: [],
    tiers: [
      {
        name: "Free / Plus / Business",
        trainsOnInputs: "depends",
        notes: "Confirm AI settings before client material.",
      },
      {
        name: "Enterprise",
        trainsOnInputs: "no",
        notes: "Preferred for company wikis with customer data.",
      },
    ],
    evidence: [
      {
        url: "https://www.notion.com/security",
        title: "Notion security",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
      {
        url: "https://shadowaipolicy.com/ai-tools/",
        title: "Notion AI approved-on-enterprise notes",
        kind: "research",
        dated: "2026-07-29",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "grammarly",
    name: "Grammarly",
    category: "writing",
    website: "https://www.grammarly.com",
    summary:
      "Writing assistant embedded across browsers. Business/Enterprise is the reputation-safer path.",
    scores: { reputation: 74, approval: 80, capability: 76, icpSafe: 68 },
    pros: [
      "Familiar to non-technical teams",
      "Business plans with stronger admin story",
      "Helps brand voice consistency",
    ],
    cons: [
      "Browser extension sees a lot of text",
      "Free/Premium posture weaker for confidential drafts",
      "Some ICPs still balk at third-party writing overlays",
    ],
    vetoTags: ["consumer-default-training"],
    tiers: [
      {
        name: "Free / Premium",
        trainsOnInputs: "depends",
        notes: "Avoid on confidential legal or healthcare drafts.",
      },
      {
        name: "Business / Enterprise",
        trainsOnInputs: "no",
        notes: "Better for company-wide rollout.",
      },
    ],
    evidence: [
      {
        url: "https://www.grammarly.com/security",
        title: "Grammarly security",
        kind: "vendor-policy",
        dated: "2026-08-01",
      },
      {
        url: "https://aileakage.com/ai-tool-risk-directory/",
        title: "Grammarly plan-tier ratings",
        kind: "research",
        dated: "2026-05-30",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "jasper",
    name: "Jasper",
    category: "writing",
    website: "https://www.jasper.ai",
    summary:
      "Marketing copy platform. Useful for content teams; less differentiated on raw model quality than frontier chat tools.",
    scores: { reputation: 70, approval: 72, capability: 74, icpSafe: 72 },
    pros: [
      "Built for marketing workflows and brand voice",
      "Business packaging buyers understand",
      "Templates reduce blank-page time",
    ],
    cons: [
      "Generic AI-marketing stigma with sophisticated ICPs",
      "Output often needs heavy editing",
      "Competition from ChatGPT/Claude is intense",
    ],
    vetoTags: [],
    tiers: [
      {
        name: "Creator / Pro",
        trainsOnInputs: "depends",
        notes: "Fine for public marketing drafts.",
      },
      {
        name: "Business",
        trainsOnInputs: "no",
        notes: "Prefer for shared brand kits and teams.",
      },
    ],
    evidence: [
      {
        url: "https://www.jasper.ai/security",
        title: "Jasper safety and security",
        kind: "vendor-policy",
        dated: "2026-11-22",
      },
      {
        url: "https://www.jasper.ai",
        title: "Jasper product",
        kind: "vendor-policy",
        dated: "2026-11-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "hubspot-breeze",
    name: "HubSpot Breeze",
    category: "crm",
    website: "https://www.hubspot.com/products/artificial-intelligence",
    summary:
      "AI inside HubSpot CRM. Procurement-friendly for SMB/mid-market GTM teams already on HubSpot.",
    scores: { reputation: 78, approval: 77, capability: 74, icpSafe: 80 },
    pros: [
      "Lives inside an already-trusted CRM brand",
      "Lower new-vendor risk for HubSpot shops",
      "Useful for content, CRM assist, and routing",
    ],
    cons: [
      "Documentation on AI training can feel incomplete to legal",
      "Quality uneven across Breeze surfaces",
      "Locks you further into HubSpot",
    ],
    vetoTags: ["opaque-data-policy"],
    tiers: [
      {
        name: "HubSpot AI features",
        trainsOnInputs: "depends",
        notes: "Review DPA and AI terms for your portal tier.",
      },
    ],
    evidence: [
      {
        url: "https://legal.hubspot.com/security",
        title: "HubSpot security / DPA context",
        kind: "vendor-policy",
        dated: "2026-08-01",
      },
      {
        url: "https://shadowaipolicy.com/ai-tools/",
        title: "HubSpot AI limited verdict",
        kind: "research",
        dated: "2026-07-29",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "salesforce-einstein",
    name: "Salesforce Einstein",
    category: "crm",
    website: "https://www.salesforce.com/artificial-intelligence/",
    summary:
      "Salesforce platform AI. Strong enterprise brand fit when the CRM is already Salesforce.",
    scores: { reputation: 80, approval: 74, capability: 80, icpSafe: 86 },
    pros: [
      "Enterprise buyers already trust Salesforce procurement",
      "Admin and trust-layer messaging",
      "Fits regulated sales motions when configured well",
    ],
    cons: [
      "Complexity and cost",
      "Implementation quality varies wildly",
      "Not a fit if you are not on Salesforce",
    ],
    vetoTags: [],
    tiers: [
      {
        name: "Einstein / Agentforce features",
        trainsOnInputs: "no",
        notes: "Confirm org settings and data residency with Salesforce.",
      },
    ],
    evidence: [
      {
        url: "https://www.salesforce.com/company/privacy/",
        title: "Salesforce privacy",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
      {
        url: "https://shadowaipolicy.com/ai-tools/",
        title: "Einstein approved-style verdict",
        kind: "research",
        dated: "2026-07-29",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "elevenlabs",
    name: "ElevenLabs",
    category: "productivity",
    website: "https://elevenlabs.io",
    summary:
      "Voice synthesis leader. Creative power is high; deepfake and consent optics require careful ICP handling.",
    scores: { reputation: 60, approval: 84, capability: 92, icpSafe: 48 },
    pros: [
      "Best-in-class voice quality for many use cases",
      "Enterprise/custom DPA path exists",
      "Strong for product demos and accessibility",
    ],
    cons: [
      "Voice cloning stigma with cautious buyers",
      "Free/Starter tiers weaker on data posture",
      "Customer-facing voice clones need explicit consent stories",
    ],
    vetoTags: ["high-controversy", "consumer-default-training"],
    tiers: [
      {
        name: "Free / Starter / Creator",
        trainsOnInputs: "depends",
        notes: "Avoid cloning real people without written consent.",
      },
      {
        name: "Pro / Scale / Enterprise",
        trainsOnInputs: "depends",
        notes: "Enterprise DPA improves posture; brand risk remains.",
      },
    ],
    evidence: [
      {
        url: "https://elevenlabs.io/safety",
        title: "ElevenLabs safety",
        kind: "vendor-policy",
        dated: "2026-08-01",
      },
      {
        url: "https://aileakage.com/ai-tool-risk-directory/",
        title: "ElevenLabs tier risk ratings",
        kind: "research",
        dated: "2026-05-30",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "canva-magic",
    name: "Canva Magic Studio",
    category: "image",
    website: "https://www.canva.com/magic/",
    summary:
      "Design AI for non-designers. Teams/Business/Enterprise with Canva Shield is the ICP-safer path.",
    scores: { reputation: 76, approval: 85, capability: 78, icpSafe: 74 },
    pros: [
      "Huge adoption among marketing and ops teams",
      "Canva Shield / Business improves controls",
      "Fast social and deck production",
    ],
    cons: [
      "Free/Pro weaker for confidential brand assets",
      "Design sameness risk if overused",
      "Not a substitute for brand systems work",
    ],
    vetoTags: ["consumer-default-training"],
    tiers: [
      {
        name: "Free / Pro",
        trainsOnInputs: "depends",
        notes: "Keep unreleased product visuals off free tiers.",
      },
      {
        name: "Teams / Business / Enterprise",
        trainsOnInputs: "no",
        notes: "Prefer Canva Shield messaging for brand-sensitive orgs.",
      },
    ],
    evidence: [
      {
        url: "https://www.canva.com/security/",
        title: "Canva security",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
      {
        url: "https://aileakage.com/ai-tool-risk-directory/",
        title: "Canva Magic Studio tier ratings",
        kind: "research",
        dated: "2026-05-30",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "slack-ai",
    name: "Slack AI",
    category: "productivity",
    website: "https://slack.com/features/ai",
    summary:
      "Summaries and search inside Slack. Strong fit when Slack is already the system of record for work chat.",
    scores: { reputation: 82, approval: 78, capability: 72, icpSafe: 84 },
    pros: [
      "Salesforce/Slack enterprise trust surface",
      "Reduces new-vendor sprawl",
      "Useful channel summaries for busy teams",
    ],
    cons: [
      "Workspace content sensitivity still applies",
      "Feature depth thinner than specialist tools",
      "Pricing layered on Slack plans",
    ],
    vetoTags: [],
    tiers: [
      {
        name: "Slack AI add-on",
        trainsOnInputs: "no",
        notes: "Confirm plan and data residency with Slack admin.",
      },
    ],
    evidence: [
      {
        url: "https://slack.com/trust",
        title: "Slack trust center",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
      {
        url: "https://shadowaipolicy.com/ai-tools/",
        title: "Slack AI approved-style verdict",
        kind: "research",
        dated: "2026-07-29",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "zoom-ai-companion",
    name: "Zoom AI Companion",
    category: "meetings",
    website: "https://www.zoom.com/en/products/ai-companion/",
    summary:
      "Meeting AI inside Zoom. Convenient for Zoom-native orgs; still requires participant trust process.",
    scores: { reputation: 74, approval: 75, capability: 74, icpSafe: 72 },
    pros: [
      "No new meeting bot brand in the lobby",
      "Enterprise packaging familiar to IT",
      "Summaries reduce follow-up drag",
    ],
    cons: [
      "Recording/summary consent still required",
      "Feature quality varies by meeting type",
      "Not a full CRM coaching suite",
    ],
    vetoTags: [],
    tiers: [
      {
        name: "AI Companion",
        trainsOnInputs: "no",
        notes: "Confirm account settings and retention with Zoom admin.",
      },
    ],
    evidence: [
      {
        url: "https://www.zoom.com/en/trust/",
        title: "Zoom trust",
        kind: "vendor-policy",
        dated: "2026-09-01",
      },
      {
        url: "https://shadowaipolicy.com/ai-tools/",
        title: "Zoom AI Companion limited verdict",
        kind: "research",
        dated: "2026-07-29",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "tabnine",
    name: "Tabnine",
    category: "coding",
    website: "https://www.tabnine.com",
    summary:
      "Code assistant with a privacy-forward enterprise pitch, including private deployment options.",
    scores: { reputation: 72, approval: 70, capability: 76, icpSafe: 84 },
    pros: [
      "Privacy and air-gapped story for cautious engineering orgs",
      "Enterprise controls for regulated codebases",
      "Less hype baggage than consumer coding agents",
    ],
    cons: [
      "Capability often trails Cursor/Copilot for agent workflows",
      "Smaller community mindshare",
      "Requires deliberate rollout",
    ],
    vetoTags: [],
    tiers: [
      {
        name: "Dev / Pro",
        trainsOnInputs: "depends",
        notes: "Check SaaS vs private deployment for your policy.",
      },
      {
        name: "Enterprise private deployment",
        trainsOnInputs: "no",
        notes: "Strongest ICP-safe coding option in this seed set.",
      },
    ],
    evidence: [
      {
        url: "https://www.tabnine.com/security/",
        title: "Tabnine security",
        kind: "vendor-policy",
        dated: "2026-08-01",
      },
      {
        url: "https://ailist.airiskmanagement.ca/",
        title: "Tabnine appears on enterprise risk lists",
        kind: "research",
        dated: "2026-11-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "heygen",
    name: "HeyGen",
    category: "image",
    website: "https://www.heygen.com",
    summary:
      "AI avatar video. High leverage for content teams; deepfake optics demand clear consent and brand rules.",
    scores: { reputation: 58, approval: 78, capability: 84, icpSafe: 46 },
    pros: [
      "Fast avatar video for explainers and localization",
      "Useful for product education at scale",
      "Enterprise packaging available",
    ],
    cons: [
      "Synthetic person brand risk with skeptical ICPs",
      "Consent and likeness policy must be airtight",
      "Can look gimmicky in premium brand contexts",
    ],
    vetoTags: ["high-controversy"],
    tiers: [
      {
        name: "Creator plans",
        trainsOnInputs: "depends",
        notes: "Do not clone employees or customers without written consent.",
      },
      {
        name: "Enterprise",
        trainsOnInputs: "depends",
        notes: "Better controls; brand policy still required.",
      },
    ],
    evidence: [
      {
        url: "https://www.heygen.com/security",
        title: "HeyGen security",
        kind: "vendor-policy",
        dated: "2026-07-01",
      },
      {
        url: "https://ailist.airiskmanagement.ca/",
        title: "HeyGen on Shadow AI risk lists",
        kind: "research",
        dated: "2026-11-01",
      },
    ],
    lastReviewed: "2026-11-21",
  },
  {
    slug: "read-ai",
    name: "Read.ai",
    category: "meetings",
    website: "https://www.read.ai",
    summary:
      "Meeting and email intelligence with high workplace exposure. Useful, but treat as sensitive for ICP optics.",
    scores: { reputation: 60, approval: 74, capability: 76, icpSafe: 52 },
    pros: [
      "Meeting coaching signals for managers",
      "Enterprise plan available",
      "Cross-surface summaries",
    ],
    cons: [
      "High exposure on shadow-AI style lists",
      "Always-on meeting intelligence worries privacy-sensitive buyers",
      "Needs clear internal policy before rollout",
    ],
    vetoTags: ["weak-enterprise-controls"],
    tiers: [
      {
        name: "Standard",
        trainsOnInputs: "depends",
        notes: "Disclose recording/analysis to participants.",
      },
      {
        name: "Enterprise",
        trainsOnInputs: "no",
        notes: "Prefer for company-wide deployment.",
      },
    ],
    evidence: [
      {
        url: "https://ailist.airiskmanagement.ca/top",
        title: "Read.ai high exposure listing",
        kind: "research",
        dated: "2026-11-01",
      },
      {
        url: "https://trust.read.ai/",
        title: "Read AI Trust Center",
        kind: "vendor-policy",
        dated: "2026-11-22",
      },
    ],
    lastReviewed: "2026-11-21",
  },
] as const;

const withDefaults = [...rawTools, ...extraTools].map((tool) => ({
  kind: "assistant" as const,
  fitTags: [] as string[],
  ...tool,
}));

export const tools: Tool[] = ToolsArraySchema.parse(withDefaults);

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getCategories(): Tool["category"][] {
  return [...new Set(tools.map((t) => t.category))];
}
