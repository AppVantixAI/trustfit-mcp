/**
 * Client for the TrustFit review API. Maps each tool call to its REST route
 * (GET /api/v1/reviews/tools, POST /rank, ...) and turns the answer back into
 * an MCP tool result. Holds no review data.
 */
import { profileFields, toolError, toolResult, type ToolName } from "./tool-defs";

export const DEFAULT_API_BASE = "https://trustfit-iota.vercel.app";
export const API_PREFIX = "/api/v1/reviews";

type Args = Record<string, unknown>;
export type ApiRequest = { method: "GET" | "POST"; path: string; query?: Record<string, string>; body?: Args };

const PROFILE_KEYS = Object.keys(profileFields);

/** Query strings carry arrays as comma lists and everything else as text. */
function toQuery(a: Args): Record<string, string> {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) {
    if (v === undefined || v === null) continue;
    q[k] = Array.isArray(v) ? v.join(",") : String(v);
  }
  return q;
}

/** The REST call behind each tool. The API Worker accepts exactly these. */
export function apiRequest(name: ToolName, a: Args): ApiRequest {
  const seg = (s: unknown) => encodeURIComponent(String(s));
  switch (name) {
    case "search_tools":
      return { method: "GET", path: "/tools", query: toQuery(a) };
    case "get_tool_profile": {
      const profile = (a.profile ?? {}) as Args;
      return { method: "GET", path: `/tools/${seg(a.slug)}`, query: toQuery(Object.fromEntries(PROFILE_KEYS.map((k) => [k, profile[k]]))) };
    }
    case "rank_for_company":
      return { method: "POST", path: "/rank", body: a };
    case "compare_tools":
      return { method: "POST", path: "/compare", body: a };
    case "search_index":
      return { method: "GET", path: "/index", query: toQuery(a) };
    case "get_index_entry":
      return { method: "GET", path: `/index/entry/${seg(a.id)}` };
    case "get_index_summary":
      return { method: "GET", path: "/index/summary" };
    case "get_methodology":
      return { method: "GET", path: "/methodology" };
  }
}

export type RemoteOptions = { apiKey?: string; apiBase?: string; fetch?: typeof fetch };

const FRIENDLY: Record<number, string> = {
  401: "TrustFit API key missing or not valid. Create one on your TrustFit account page and set TRUSTFIT_API_KEY.",
  402: "This TrustFit API key has no calls left. Add a call pack on your TrustFit account page.",
  429: "Too many calls to the TrustFit API in a short time. Wait a minute and try again.",
};

/** Calls the API for one tool and returns an MCP tool result. Never throws. */
export async function callRemote(name: ToolName, args: Args, opts: RemoteOptions) {
  const base = (opts.apiBase || DEFAULT_API_BASE).replace(/\/+$/, "");
  const req = apiRequest(name, args);
  const url = new URL(`${base}${API_PREFIX}${req.path}`);
  for (const [k, v] of Object.entries(req.query ?? {})) url.searchParams.set(k, v);
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.apiKey) headers.authorization = `Bearer ${opts.apiKey}`;
  if (req.body) headers["content-type"] = "application/json";
  try {
    const res = await (opts.fetch ?? fetch)(url, { method: req.method, headers, body: req.body ? JSON.stringify(req.body) : undefined });
    const json = (await res.json().catch(() => null)) as { data?: unknown; error?: string } | null;
    // A missing slug or id is an answer, not a failure: the tool says so, as the local server does.
    if ((res.ok || res.status === 404) && json && "data" in json) return toolResult(json.data);
    return toolError(FRIENDLY[res.status] ?? `TrustFit API error ${res.status}${json?.error ? `: ${json.error}` : ""}.`);
  } catch {
    return toolError(`Could not reach the TrustFit API at ${base}. Check TRUSTFIT_API_BASE and your connection.`);
  }
}
