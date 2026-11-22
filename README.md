# TrustFit MCP server

A read-only MCP server that lets an AI assistant search, rank, compare and vet AI tools for a company. Every score comes with the public evidence behind it and the date it was checked. It is the engine behind [TrustFit](https://trustfit-iota.vercel.app).

It makes no network calls while serving. Scores, reviews and datasets are local files.

Some results quote text TrustFit did not write, such as headlines and model names. The server strips hidden and direction-changing characters from every string, caps very long ones, and tells the reading model that this text is data, not instructions (`src/untrusted.ts`).

## Tools

| Tool | What it does |
|---|---|
| `search_tools` | Find reviewed tools and the wider index by name, category or task |
| `get_tool_profile` | One tool's scores, plan-by-plan answer on training with your inputs, deal-breakers and evidence |
| `rank_for_company` | Rank the reviewed tools for a company's customers and deal-breakers |
| `compare_tools` | Two to five tools side by side |
| `search_index`, `get_index_entry`, `get_index_summary` | The wider catalog of tools and models with public facts only, never scored. Empty until you run `scripts/ingest-index.ts` |
| `get_methodology` | How scores are built, and what they do not claim |

## Run it

```bash
npm ci
npm start          # stdio server
npm test
npm run typecheck
```

Add it to Claude Code:

```bash
claude mcp add trustfit -- npx --prefix /ABSOLUTE/PATH/TO/trustfit-mcp tsx /ABSOLUTE/PATH/TO/trustfit-mcp/src/server.ts
```

Any MCP client that runs a stdio server works the same way.

## The skill

`skill/SKILL.md` tells a model how to use the tools and how to word results: never call a tool "safe", "certified" or "approved", and always show how strong the evidence is and when it was checked.

## What is in this repo

- `src/`: the MCP server, its signals and tests.
- `shared/`: the scoring code and the 40 reviews, shared with the TrustFit website.
- `scripts/`: ingest scripts that fetch each dataset into `data/snapshots/`.
- `data/snapshots/`: datasets. The ones with a licence that allows redistribution ship here. The others ship as empty files with the right shape; run the ingest script to fill them for your own use, under that source's terms.

## Data sources and licences

Scores start as editorial estimates written from public evidence. Open datasets are layered on top, each with its source and date on every signal, and several of them are shown but never scored.

| File | In this repo | Source | Licence | URL |
|---|---|---|---|---|
| `aiid.json` | included | AI Incident Database (Responsible AI Collaborative), weekly snapshot | CC BY-SA 4.0 (share-alike applies to this file) | https://incidentdatabase.ai/ |
| `arena.json` | included | LMArena text leaderboard (style control), overall category | CC BY 4.0 | https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset |
| `breaches.json` | included | Have I Been Pwned breach catalogue | CC BY 4.0 (stated in the HIBP API documentation, read 2026-11-22). Attribution with a link to haveibeenpwned.com is required wherever the data is shown. | https://haveibeenpwned.com/ |
| `dockets.json` | empty, run the ingest script | CourtListener (Free Law Project) RECAP archive of US federal dockets | NOT VERIFIED. Court records are public; confirm the API terms before redistributing. | https://www.courtlistener.com/ |
| `fmti.json` | included | Stanford CRFM Foundation Model Transparency Index, December 2025 edition | CC BY 4.0 | https://github.com/stanford-crfm/fmti |
| `hn.json` | empty, run the ingest script | Hacker News (via the HN Search API by Algolia) | NOT VERIFIED. No data license is stated. Only the story title, links, date and counts are stored. | https://hn.algolia.com/ |
| `index.json` | empty, run the ingest script | TrustFit broad index (facts only, not reviewed, not scored) | Mixed per source; see each entry's sources. Contains CC BY 4.0 (LMArena) and CC0 (Wikidata) data and public metadata from OpenRouter and Hugging Face. | https://trustfit-iota.vercel.app |
| `kev.json` | included | CISA Known Exploited Vulnerabilities catalog | US Government work, public | https://www.cisa.gov/known-exploited-vulnerabilities-catalog |
| `news.json` | empty, run the ingest script | GDELT Project DOC 2.0 API (global news index) | NOT VERIFIED in this run. GDELT describes its data as free for any use with a citation and a link. Headlines belong to their publishers: only the title, link, outlet and date are stored, and every item links out. | https://www.gdeltproject.org/ |
| `sec.json` | included | SEC EDGAR company filings | US government work, public domain. | https://www.sec.gov/edgar |
| `tosdr.json` | empty, run the ingest script | Terms of Service; Didn't Read (tosdr.org) service ratings | NOT VERIFIED. The site describes its work as open data but states no data license we could find; code repos are AGPL-3.0. Only derived facts are stored. Confirm before redistributing. | https://tosdr.org/ |
| `wayback.json` | empty, run the ingest script | Internet Archive Wayback Machine CDX index | NOT VERIFIED for systematic commercial reuse. Only counts and dates are stored; pages are not copied. | https://web.archive.org/ |
| `wikidata.json` | included | Wikidata | CC0 | https://www.wikidata.org/ |

Weights and thresholds in `src/signals.ts` are design choices. They have not been validated against ground truth.

Refresh data:

```bash
npx tsx scripts/ingest.ts             # open datasets
npx tsx scripts/ingest-web.ts all     # ToS;DR, Wikidata and Wayback (slow and polite)
npx tsx scripts/ingest-record.ts all  # news and public records
npx tsx scripts/ingest-index.ts       # the broad catalog index
npx tsx scripts/check-evidence.ts     # re-check every evidence link in the reviews
```

Copy `env.example` to `.env.local` first. The SEC asks for a contact in the user agent, and CourtListener needs a free token.

## Corrections

Spot a wrong fact or an outdated review? Open an issue with the source. Corrections are free, and no one can pay for a score or a position.

## Licence

MIT for the code and the reviews (see `LICENSE`). Each dataset keeps its own licence, listed above.
