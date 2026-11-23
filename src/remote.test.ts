import { describe, expect, it } from "vitest";
import { apiRequest, callRemote } from "./remote";
import { DATA_NOTICE } from "./untrusted";

type Seen = { url: string; init: RequestInit };

function fakeFetch(status: number, body: unknown, seen: Seen[] = []) {
  return (async (url: URL | string, init?: RequestInit) => {
    seen.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

describe("remote client", () => {
  it("maps each tool to its REST route", () => {
    expect(apiRequest("search_tools", { query: "chat", excludeVetoes: ["china-hosted", "lawsuit-active"], limit: 5 })).toEqual({
      method: "GET",
      path: "/tools",
      query: { query: "chat", excludeVetoes: "china-hosted,lawsuit-active", limit: "5" },
    });
    expect(apiRequest("get_tool_profile", { slug: "chat gpt", profile: { industry: "legal", hardVetos: ["china-hosted"] } })).toEqual({
      method: "GET",
      path: "/tools/chat%20gpt",
      query: { industry: "legal", hardVetos: "china-hosted" },
    });
    expect(apiRequest("compare_tools", { slugs: ["a", "b"] })).toEqual({ method: "POST", path: "/compare", body: { slugs: ["a", "b"] } });
    expect(apiRequest("get_index_entry", { id: "hf:meta/llama 3" }).path).toBe("/index/entry/hf%3Ameta%2Fllama%203");
    expect(apiRequest("get_index_summary", {}).path).toBe("/index/summary");
  });

  it("sends the key as a Bearer token and returns the data with the notice", async () => {
    const seen: Seen[] = [];
    const r = await callRemote("search_tools", { query: "x" }, { apiKey: "tf_test", apiBase: "https://api.example.test/", fetch: fakeFetch(200, { notice: DATA_NOTICE, data: { total: 0 } }, seen) });
    expect(seen[0].url).toBe("https://api.example.test/api/v1/reviews/tools?query=x");
    expect((seen[0].init.headers as Record<string, string>).authorization).toBe("Bearer tf_test");
    expect("isError" in r).toBe(false);
    expect(r.content[0].text).toBe(DATA_NOTICE);
    expect(JSON.parse(r.content[1].text)).toEqual({ total: 0 });
  });

  it("returns a not-found answer as data, like the local server", async () => {
    const r = await callRemote("get_tool_profile", { slug: "nope" }, { apiKey: "k", fetch: fakeFetch(404, { notice: DATA_NOTICE, data: { error: "No tool" } }) });
    expect("isError" in r).toBe(false);
    expect(JSON.parse(r.content[1].text)).toEqual({ error: "No tool" });
  });

  it("explains a missing key, an empty balance and the rate limit", async () => {
    for (const [status, word] of [[401, "key"], [402, "no calls left"], [429, "Too many"]] as const) {
      const r = await callRemote("search_tools", {}, { fetch: fakeFetch(status, { error: "x" }) });
      expect(r).toMatchObject({ isError: true });
      expect(r.content[0].text).toContain(word);
    }
  });

  it("never throws when the API cannot be reached", async () => {
    const down = (async () => { throw new Error("offline"); }) as typeof fetch;
    const r = await callRemote("get_methodology", {}, { fetch: down });
    expect(r).toMatchObject({ isError: true });
  });
});
