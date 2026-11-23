# TrustFit MCP server

Lets an AI assistant search, rank, compare and vet AI tools for a company. Every score comes with the public evidence behind it and the date it was checked. It is the engine behind [TrustFit](https://trustfit-iota.vercel.app).

The reviews and scores are served by the TrustFit review API. This repository holds the MCP server (a thin client of that API), the scoring code and the method. It does not hold the written reviews.

Some results quote text TrustFit did not write, such as headlines and model names. Every string is stripped of hidden and direction-changing characters, very long ones are capped, and each result tells the reading model that this text is data, not instructions (`src/untrusted.ts`). The API does this before it answers and this client does it again.

## Get a key

1. Sign in at https://trustfit-iota.vercel.app/account.
2. Under **API keys**, create a key. It is shown once; copy it then. TrustFit stores only a fingerprint of it.
3. Calls are counted per key. They are free for now. Revoke a key on the same page at any time.

## Option 1: hosted endpoint, nothing to install

Add a remote (Streamable HTTP) MCP server to your assistant:

- URL: `https://trustfit-iota.vercel.app/api/v1/reviews/mcp`
- Header: `Authorization: Bearer <your key>`

Claude Code:

```bash
claude mcp add --transport http trustfit https://trustfit-iota.vercel.app/api/v1/reviews/mcp --header "Authorization: Bearer ${TRUSTFIT_API_KEY}"
```

Set `TRUSTFIT_API_KEY` in your shell profile first, so the key never sits in your shell history.

## Option 2: run this server locally (stdio)

```bash
npm ci
npm start              # stdio server, reads TRUSTFIT_API_KEY and TRUSTFIT_API_BASE from the environment
npm test
npm run typecheck
```

Any MCP client that runs a stdio server works. Give the server `TRUSTFIT_API_KEY` through the client's `env` block for this server (or your shell profile), not on a command line. `TRUSTFIT_API_BASE` is optional and defaults to `https://trustfit-iota.vercel.app`.

## Tools

| Tool | REST route (under `/api/v1/reviews`) | What it does |
|---|---|---|
| `search_tools` | `GET /tools?query=&category=&excludeVetoes=&limit=` | Find reviewed tools by name, category or task |
| `get_tool_profile` | `GET /tools/:slug?industry=&buyerType=&useSurface=&brandSensitivity=&hardVetos=` | One tool's scores, plan-by-plan answer on training with your inputs, deal-breakers and evidence |
| `rank_for_company` | `POST /rank` `{ profile, category?, limit? }` | Rank the reviewed tools for a company's customers and deal-breakers |
| `compare_tools` | `POST /compare` `{ slugs, profile? }` | Two to five tools side by side |
| `search_index` | `GET /index?query=&kind=&vendor=...` | The wider catalog of tools and models, public facts only, never scored |
| `get_index_entry` | `GET /index/entry/:id` | One index entry |
| `get_index_summary` | `GET /index/summary` | What the index covers |
| `get_methodology` | `GET /methodology` (no key needed) | How scores are built, and what they do not claim |

Every REST answer is `{ "notice": "...", "data": ... }`, and every result carries a `url` to its TrustFit page. Errors: `401` missing or unknown key, `402` no calls left (once call packs exist), `429` too many calls, `400` bad arguments, `404` no such tool or entry (the answer still says so in `data`).

## The skill

`skill/SKILL.md` tells a model how to use the tools and how to word results: never call a tool "safe", "certified" or "approved", and always show how strong the evidence is and when it was checked.

## What is in this repo

- `src/server.ts`: the MCP server, a client of the review API. `src/remote.ts` maps each tool to its REST route.
- `src/tool-defs.ts`: the eight tools and their input schemas, the same ones the hosted endpoint uses.
- `src/local-server.ts`, `src/core.ts`, `src/signals.ts`, `src/index-search.ts`: the scoring server that reads local files. `shared/content/tools.ts` ships empty, so it has no reviews to serve unless you add your own.
- `shared/lib/`: the scoring code and schema, shared with the TrustFit website.
- `scripts/`: ingest scripts that fetch each dataset into `data/snapshots/`.
- `data/snapshots/`: datasets with a licence that allows redistribution; the others ship as empty files with the right shape.

## Data sources and licences

Scores start as editorial estimates written from public evidence. Open datasets are layered on top, each with its source and date on every signal, and several of them are shown but never scored. The API uses these sources:

| File | In this repo | Source | Licence | URL |
|---|---|---|---|---|
| `ai-commitments.json` | included | Official signatory lists: EU General-Purpose AI Code of Practice and the Frontier AI Safety Commitments | CC BY 4.0 (European Commission content, Decision 2011/833/EU) and Open Government Licence v3.0 (UK) | https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai |
| `aiid.json` | included | AI Incident Database (Responsible AI Collaborative), weekly snapshot | CC BY-SA 4.0 (share-alike applies to this file) | https://incidentdatabase.ai/ |
| `arena.json` | included | LMArena text leaderboard (style control), overall category | CC BY 4.0 | https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset |
| `breaches.json` | included | Have I Been Pwned breach catalogue | CC BY 4.0 (stated in the HIBP API documentation, read 2026-11-22). Attribution with a link to haveibeenpwned.com is required wherever the data is shown. | https://haveibeenpwned.com/ |
| `diodb.json` | included | disclose.io diodb, the open vulnerability disclosure program database | CC0 1.0 (licence file); the README says CC BY 4.0, so credit is given | https://github.com/disclose/diodb |
| `dockets.json` | empty, run the ingest script | CourtListener (Free Law Project) RECAP archive of US federal dockets | NOT VERIFIED. Court records are public; confirm the API terms before redistributing. | https://www.courtlistener.com/ |
| `epoch-eci.json` | included | Epoch AI Capabilities Index (Epoch AI benchmarking hub) | CC BY 4.0 | https://epoch.ai/benchmarks |
| `epoch-models.json` | included | Epoch AI, Data on AI models | CC BY 4.0 | https://epoch.ai/data/ai-models |
| `fedramp.json` | empty, run the ingest script | FedRAMP Marketplace (US General Services Administration) | NOT VERIFIED. Federal data with no licence statement found; shown with credit and a link, not redistributed. | https://marketplace.fedramp.gov/ |
| `fmti.json` | included | Stanford CRFM Foundation Model Transparency Index, December 2025 edition | CC BY 4.0 | https://github.com/stanford-crfm/fmti |
| `ghsa.json` | included | GitHub Advisory Database (reviewed advisories) | CC BY 4.0 | https://github.com/advisories |
| `gleif.json` | included | GLEIF Global LEI Index | CC0 1.0 | https://www.gleif.org/en/lei-data/gleif-api |
| `hn.json` | empty, run the ingest script | Hacker News (via the HN Search API by Algolia) | NOT VERIFIED. No data license is stated. Only the story title, links, date and counts are stored. | https://hn.algolia.com/ |
| `index.json` | empty, run the ingest script | TrustFit broad index (facts only, not reviewed, not scored) | Mixed per source; see each entry's sources. Contains CC BY 4.0 (LMArena) and CC0 (Wikidata) data and public metadata from OpenRouter and Hugging Face. | https://trustfit-iota.vercel.app |
| `kev.json` | included | CISA Known Exploited Vulnerabilities catalog | US Government work, public | https://www.cisa.gov/known-exploited-vulnerabilities-catalog |
| `litellm.json` | included | LiteLLM model prices and context windows | MIT | https://github.com/BerriAI/litellm |
| `models-dev.json` | included | models.dev open model database | MIT | https://models.dev/ |
| `news.json` | empty, run the ingest script | GDELT Project DOC 2.0 API (global news index) | NOT VERIFIED in this run. GDELT describes its data as free for any use with a citation and a link. Headlines belong to their publishers: only the title, link, outlet and date are stored, and every item links out. | https://www.gdeltproject.org/ |
| `nvd.json` | included | CVE counts derived by TrustFit from the NVD CVE API | US Government work, public domain (NVD terms of use) | https://nvd.nist.gov/developers/vulnerabilities |
| `sec.json` | included | SEC EDGAR company filings | US government work, public domain. | https://www.sec.gov/edgar |
| `security-txt.json` | included | TrustFit check of each vendor's /.well-known/security.txt (RFC 9116) | TrustFit first-party observation, CC BY 4.0. The files themselves belong to each vendor; only field values are stored. | https://www.rfc-editor.org/rfc/rfc9116 |
| `statuspage.json` | empty, run the ingest script | Vendors' public status pages (Statuspage JSON format) | NOT VERIFIED. No licence stated by the vendors or Atlassian; only derived counts and dates are kept, each with a link to the vendor's page. Not redistributed. | https://www.atlassian.com/software/statuspage |
| `tosdr.json` | empty, run the ingest script | Terms of Service; Didn't Read (tosdr.org) service ratings | NOT VERIFIED. The site describes its work as open data but states no data license we could find; code repos are AGPL-3.0. Only derived facts are stored. Confirm before redistributing. | https://tosdr.org/ |
| `wayback.json` | empty, run the ingest script | Internet Archive Wayback Machine CDX index | NOT VERIFIED for systematic commercial reuse. Only counts and dates are stored; pages are not copied. | https://web.archive.org/ |
| `wikidata.json` | included | Wikidata | CC0 | https://www.wikidata.org/ |

Weights and thresholds in `src/signals.ts` are design choices. They have not been validated against ground truth.

## Corrections

Spot a wrong fact or an outdated review? Open an issue with the source. Corrections are free, and no one can pay for a score or a position.

## Licence

- Code: MIT (see `LICENSE`).
- Reviews: not in this repository. They are served by the TrustFit API under TrustFit's terms. Copies of this repository taken before 2026-11-22 carried the reviews under MIT, and copies taken on 2026-11-22 under CC BY 4.0; those copies keep the licence they came with (see `LICENSE-REVIEWS`).
- Each dataset in `data/snapshots` keeps its own licence, listed above.
