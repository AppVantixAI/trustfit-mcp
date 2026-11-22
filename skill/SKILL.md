---
name: trustfit
description: Use when a company is choosing, approving or vetting an AI tool (ChatGPT, Claude, Copilot, meeting bots, coding assistants and similar) and needs to know which tools fit its industry, buyers, brand and data rules. Ranks and compares tools with sourced, dated evidence through the TrustFit MCP server.
---

# TrustFit: AI tool fit and reputation

Use the `trustfit` MCP tools. Do not answer from memory about vendor data terms; they change.

## Method

1. Get the company context first: industry, buyer type (consumer, smb, enterprise, regulated), whether the tool is internal or customer-facing, brand sensitivity (low, medium, high), and any hard vetos (for example no China-hosted vendors, no training on inputs). Ask once if missing; do not guess regulated or high-sensitivity.
2. `rank_for_company` with that profile, optionally narrowed by `category`.
3. `get_tool_profile` for the top two or three, passing the same profile. Read `tiers` (does the plan train on inputs), `evidence` (dated sources) and `evidenceCoverage`.
4. `compare_tools` when the user is deciding between named tools.
5. Call `get_methodology` before explaining how a score is built.

## Rules for the answer

- Report the verdict (Fits, Fits with conditions, Hold) with its reasons, and always state the evidence confidence and `lastReviewed` date.
- A vetoed tool is not "bad": say which company filter excluded it.
- Scores are editorial estimates from public evidence. Never call a tool "safe", "certified" or "compliant", and never present a score as legal advice. Include the `disclaimer` text when giving a recommendation.
- Low evidence coverage means "unknown", not "fine". Say what to ask the vendor, using the `guidance.questions` list.
- Vendor claims and independently verified facts are different things; keep them apart.
- If a tool is not in the catalog, say so. Do not invent a profile.
