/**
 * The TrustFit reviews are not in this repository. Since 2026-11-22 they are
 * served by the TrustFit review API under TrustFit's terms: run src/server.ts
 * with TRUSTFIT_API_KEY, or use the hosted MCP endpoint (see README).
 *
 * The scoring code in shared/lib works on any list in this shape. To run
 * src/local-server.ts on reviews of your own, put them here.
 */
import type { Tool } from "@/lib/schema";

// Your own reviews go here; check them with ToolsArraySchema.parse from @/lib/schema.
export const tools: Tool[] = [];

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getCategories(): Tool["category"][] {
  return [...new Set(tools.map((t) => t.category))];
}
