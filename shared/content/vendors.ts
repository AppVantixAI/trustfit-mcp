/**
 * Who is behind each reviewed tool, and how to look that company up in public
 * record sources. Hand-curated. A field is left out when we are not sure of it:
 * a wrong company name would attach someone else's lawsuit or breach to a vendor.
 *
 * vendorWide means the company is much bigger than this one product, so its
 * records (breaches, filings, dockets) describe the company, not the product.
 */
export type VendorInfo = {
  /** Common company name, shown to readers. */
  vendor: string;
  vendorWide?: boolean;
  /**
   * One word or one quoted phrase for the GDELT news search. Several vendors are
   * asked for in one call, joined with OR, so this cannot hold AND logic. It only
   * has to find candidate articles: the title rule below decides what is kept.
   * No dots and no two-letter words on their own: GDELT rejects the whole query.
   */
  newsTerm: string;
  /** Hacker News title search. */
  hnQuery: string;
  /** A headline is kept only when its title matches this. */
  title: RegExp;
  /** Stricter title test for Hacker News, where the search is on the title alone. */
  hnTitle?: RegExp;
  /** A headline is dropped when its title matches this. */
  exclude?: RegExp;
  /** US stock ticker, for SEC EDGAR. Only for listed companies. */
  ticker?: string;
  /** Text the SEC company title must contain, to catch a wrong ticker match. */
  secName?: string;
  /** Party name for a federal docket search (CourtListener). */
  courtParty?: string;
  /** Domains to match in the Have I Been Pwned breach catalogue. */
  breachDomains?: string[];
};

export const VENDORS: Record<string, VendorInfo> = {
  chatgpt: { vendor: "OpenAI", newsTerm: 'ChatGPT', hnQuery: "ChatGPT", title: /chatgpt|openai/i, courtParty: "OpenAI", breachDomains: ["openai.com", "chatgpt.com"] },
  claude: { vendor: "Anthropic", newsTerm: 'Anthropic', hnQuery: "Claude", title: /\bclaude\b|anthropic/i, exclude: /monet|debussy|van damme|shannon|claude giroux/i, courtParty: "Anthropic", breachDomains: ["anthropic.com", "claude.ai"] },
  gemini: { vendor: "Google", vendorWide: true, newsTerm: '"Google Gemini"', hnQuery: "Gemini", title: /gemini/i, exclude: /protocol|gemini:\/\/|crypto|exchange|winklevoss|nasa|spacecraft|horoscope|zodiac/i, ticker: "GOOGL", secName: "Alphabet", courtParty: "Google LLC", breachDomains: ["google.com"] },
  "microsoft-copilot": { vendor: "Microsoft", vendorWide: true, newsTerm: '"Microsoft Copilot"', hnQuery: "Microsoft Copilot", title: /copilot/i, exclude: /github/i, ticker: "MSFT", secName: "MICROSOFT", courtParty: "Microsoft Corporation", breachDomains: ["microsoft.com"] },
  perplexity: { vendor: "Perplexity AI", newsTerm: '"Perplexity AI"', hnQuery: "Perplexity", title: /perplexity/i, courtParty: "Perplexity AI", breachDomains: ["perplexity.ai"] },
  "github-copilot": { vendor: "GitHub (Microsoft)", vendorWide: true, newsTerm: '"GitHub Copilot"', hnQuery: "GitHub Copilot", title: /copilot/i, ticker: "MSFT", secName: "MICROSOFT", courtParty: "GitHub, Inc.", breachDomains: ["github.com"] },
  cursor: { vendor: "Anysphere", newsTerm: 'Anysphere', hnQuery: "Cursor", title: /\bcursor\b|anysphere/i, exclude: /css|mouse|pointer|sql|database|text cursor|blinking|cursor for\b/i, courtParty: "Anysphere", breachDomains: ["cursor.com", "cursor.sh"] },
  deepseek: { vendor: "DeepSeek", newsTerm: 'DeepSeek', hnQuery: "DeepSeek", title: /deepseek/i, courtParty: "DeepSeek", breachDomains: ["deepseek.com"] },
  midjourney: { vendor: "Midjourney", newsTerm: 'Midjourney', hnQuery: "Midjourney", title: /midjourney/i, courtParty: "Midjourney", breachDomains: ["midjourney.com"] },
  "adobe-firefly": { vendor: "Adobe", vendorWide: true, newsTerm: '"Adobe Firefly"', hnQuery: "Adobe Firefly", title: /firefly|adobe/i, ticker: "ADBE", secName: "ADOBE", courtParty: "Adobe Inc.", breachDomains: ["adobe.com"] },
  otter: { vendor: "Otter.ai", newsTerm: '"Otter AI"', hnQuery: "Otter.ai", title: /otter\.?\s?ai\b/i, courtParty: "Otter.ai", breachDomains: ["otter.ai"] },
  fireflies: { vendor: "Fireflies.ai", newsTerm: '"Fireflies AI"', hnQuery: "Fireflies.ai", title: /fireflies\.?\s?ai\b/i, courtParty: "Fireflies.AI", breachDomains: ["fireflies.ai"] },
  granola: { vendor: "Granola", newsTerm: '"Granola AI"', hnQuery: "Granola", title: /\bgranola\b/i, exclude: /recipe|oat|cereal|breakfast|snack/i, breachDomains: ["granola.ai", "granola.so"] },
  descript: { vendor: "Descript", newsTerm: 'Descript', hnQuery: "Descript", title: /\bdescript\b/i, courtParty: "Descript", breachDomains: ["descript.com"] },
  "notion-ai": { vendor: "Notion Labs", vendorWide: true, newsTerm: '"Notion AI"', hnQuery: "Notion", title: /\bnotion\b/i, hnTitle: /\bNotion\b/, courtParty: "Notion Labs", breachDomains: ["notion.so", "notion.com"] },
  grammarly: { vendor: "Grammarly", newsTerm: 'Grammarly', hnQuery: "Grammarly", title: /grammarly/i, courtParty: "Grammarly", breachDomains: ["grammarly.com"] },
  jasper: { vendor: "Jasper AI", newsTerm: '"Jasper AI"', hnQuery: "Jasper AI", title: /jasper/i, courtParty: "Jasper AI", breachDomains: ["jasper.ai"] },
  "hubspot-breeze": { vendor: "HubSpot", vendorWide: true, newsTerm: 'HubSpot', hnQuery: "HubSpot", title: /hubspot/i, ticker: "HUBS", secName: "HUBSPOT", courtParty: "HubSpot, Inc.", breachDomains: ["hubspot.com"] },
  "salesforce-einstein": { vendor: "Salesforce", vendorWide: true, newsTerm: 'Agentforce', hnQuery: "Salesforce", title: /salesforce|agentforce/i, ticker: "CRM", secName: "Salesforce", courtParty: "Salesforce, Inc.", breachDomains: ["salesforce.com"] },
  elevenlabs: { vendor: "ElevenLabs", newsTerm: 'ElevenLabs', hnQuery: "ElevenLabs", title: /elevenlabs|eleven labs/i, courtParty: "ElevenLabs", breachDomains: ["elevenlabs.io"] },
  "canva-magic": { vendor: "Canva", vendorWide: true, newsTerm: 'Canva', hnQuery: "Canva", title: /\bcanva\b/i, courtParty: "Canva", breachDomains: ["canva.com"] },
  "slack-ai": { vendor: "Slack (Salesforce)", vendorWide: true, newsTerm: '"Slack AI"', hnQuery: "Slack AI", title: /\bslack\b/i, hnTitle: /slack ai\b|slack'?s ai\b/i, ticker: "CRM", secName: "Salesforce", courtParty: "Slack Technologies", breachDomains: ["slack.com"] },
  "zoom-ai-companion": { vendor: "Zoom", vendorWide: true, newsTerm: '"Zoom AI"', hnQuery: "Zoom AI", title: /\bzoom\b/i, hnTitle: /zoom'?s? ai\b|ai companion/i, ticker: "ZM", secName: "Zoom", courtParty: "Zoom Video Communications", breachDomains: ["zoom.us", "zoom.com"] },
  tabnine: { vendor: "Tabnine", newsTerm: 'Tabnine', hnQuery: "Tabnine", title: /tabnine/i, courtParty: "Tabnine", breachDomains: ["tabnine.com"] },
  heygen: { vendor: "HeyGen", newsTerm: 'HeyGen', hnQuery: "HeyGen", title: /heygen/i, courtParty: "HeyGen", breachDomains: ["heygen.com"] },
  "read-ai": { vendor: "Read AI", newsTerm: '"Read AI"', hnQuery: "Read.ai", title: /read\.ai\b|\bRead AI\b/, courtParty: "Read AI", breachDomains: ["read.ai"] },
  "zapier-central": { vendor: "Zapier", vendorWide: true, newsTerm: 'Zapier', hnQuery: "Zapier", title: /zapier/i, courtParty: "Zapier", breachDomains: ["zapier.com"] },
  "make-ai": { vendor: "Make (Celonis)", vendorWide: true, newsTerm: 'Celonis', hnQuery: "Make.com", title: /make\.com|celonis|integromat/i, breachDomains: ["make.com", "integromat.com"] },
  "n8n-ai": { vendor: "n8n", vendorWide: true, newsTerm: 'n8n', hnQuery: "n8n", title: /\bn8n\b/i, courtParty: "n8n", breachDomains: ["n8n.io"] },
  "intercom-fin": { vendor: "Intercom", vendorWide: true, newsTerm: '"Intercom Fin"', hnQuery: "Intercom", title: /\bintercom\b/i, exclude: /doorbell|apartment|building intercom/i, courtParty: "Intercom, Inc.", breachDomains: ["intercom.com", "intercom.io"] },
  "zendesk-ai": { vendor: "Zendesk", vendorWide: true, newsTerm: 'Zendesk', hnQuery: "Zendesk", title: /zendesk/i, courtParty: "Zendesk, Inc.", breachDomains: ["zendesk.com"] },
  "gong-ai": { vendor: "Gong", newsTerm: '"Gong AI"', hnQuery: "Gong.io", title: /\bgong\b/i, exclude: /falun|dinner gong|gong show|gong li|gong yoo/i, courtParty: "Gong.io", breachDomains: ["gong.io"] },
  "copy-ai": { vendor: "Copy.ai", newsTerm: '"Copy AI"', hnQuery: "Copy.ai", title: /copy\.ai\b/i, courtParty: "Copy.ai", breachDomains: ["copy.ai"] },
  synthflow: { vendor: "Synthflow AI", newsTerm: 'Synthflow', hnQuery: "Synthflow", title: /synthflow/i, breachDomains: ["synthflow.ai"] },
  vapi: { vendor: "Vapi", newsTerm: '"Vapi AI"', hnQuery: "Vapi", title: /\bvapi\b/i, exclude: /valsad|gujarat|daman/i, breachDomains: ["vapi.ai"] },
  "retool-ai": { vendor: "Retool", vendorWide: true, newsTerm: 'Retool', hnQuery: "Retool", title: /\bretool\b/i, exclude: /retools?\s+(its|their|the|factory|plant)/i, courtParty: "Retool", breachDomains: ["retool.com"] },
  lindy: { vendor: "Lindy", newsTerm: '"Lindy AI"', hnQuery: "Lindy AI", title: /\blindy\b/i, exclude: /lindy effect|lindy hop|lindy'?s|lindy west|lindy ruff/i, breachDomains: ["lindy.ai"] },
  "relevance-ai": { vendor: "Relevance AI", newsTerm: '"Relevance AI"', hnQuery: "Relevance AI", title: /\bRelevance AI\b/, breachDomains: ["relevanceai.com"] },
  "figma-ai": { vendor: "Figma", vendorWide: true, newsTerm: 'Figma', hnQuery: "Figma", title: /\bfigma\b/i, ticker: "FIG", secName: "Figma", courtParty: "Figma, Inc.", breachDomains: ["figma.com"] },
  "amplitude-ai": { vendor: "Amplitude", vendorWide: true, newsTerm: '"Amplitude Analytics"', hnQuery: "Amplitude analytics", title: /\bamplitude\b/i, ticker: "AMPL", secName: "Amplitude", courtParty: "Amplitude, Inc.", breachDomains: ["amplitude.com"] },
};
