/**
 * TrustFit MCP server, thin client. The reviews and scores are served by the
 * TrustFit API under TrustFit's terms; this process only forwards tool calls.
 *
 *   TRUSTFIT_API_KEY   your key from the TrustFit account page (required)
 *   TRUSTFIT_API_BASE  API origin, default https://trustfit-iota.vercel.app
 *
 * Or skip the install: point your assistant at the hosted endpoint
 * (TRUSTFIT_API_BASE + /mcp) with the header "Authorization: Bearer <key>".
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { callRemote } from "./remote";
import { registerTools, SERVER_INFO, SERVER_INSTRUCTIONS } from "./tool-defs";

const opts = { apiKey: process.env.TRUSTFIT_API_KEY?.trim(), apiBase: process.env.TRUSTFIT_API_BASE?.trim() };
if (!opts.apiKey) console.error("TRUSTFIT_API_KEY is not set; every call except get_methodology will be refused.");

const server = new McpServer(SERVER_INFO, { instructions: SERVER_INSTRUCTIONS });
registerTools(server, (name, args) => callRemote(name, args, opts));

await server.connect(new StdioServerTransport());
