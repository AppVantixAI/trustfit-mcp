/**
 * Local stdio server: reads reviews from shared/content/tools.ts, which ships
 * empty in this repository. Add your own reviews there to use it.
 * The hosted endpoint (TrustFit API Worker, POST /mcp) and the public thin
 * client (remote-server.ts) expose the same tools with the same results.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DEFAULT_SITE, runTool } from "./handlers";
import { registerTools, SERVER_INFO, SERVER_INSTRUCTIONS, toolResult } from "./tool-defs";

const site = process.env.TRUSTFIT_SITE || DEFAULT_SITE;
const server = new McpServer(SERVER_INFO, { instructions: SERVER_INSTRUCTIONS });
registerTools(server, async (name, args) => toolResult(runTool(name, args, site)));

await server.connect(new StdioServerTransport());
