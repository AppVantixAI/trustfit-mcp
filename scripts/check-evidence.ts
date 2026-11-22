/**
 * Checks that every evidence URL in the catalog still resolves, and records a
 * hash of the page text so a later run can detect that a policy changed.
 * One request per URL, sequential, identified user agent. Public pages only.
 * Run: npx tsx scripts/check-evidence.ts
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tools } from "@/content/tools";

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/evidence-check.json");
type Rec = { slug: string; url: string; status: number | string; finalUrl?: string; hash?: string; checkedAt: string; changed?: boolean };
const prev: Rec[] = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : [];
const today = new Date().toISOString().slice(0, 10);
const out: Rec[] = [];

for (const t of tools) {
  for (const e of t.evidence) {
    let rec: Rec = { slug: t.slug, url: e.url, status: "error", checkedAt: today };
    try {
      const r = await fetch(e.url, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "trustfit-evidence-check/0.1 (+https://trustfit-iota.vercel.app)" } });
      const text = r.ok ? (await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
      rec = { ...rec, status: r.status, finalUrl: r.url !== e.url ? r.url : undefined, hash: text ? createHash("sha256").update(text).digest("hex").slice(0, 16) : undefined };
    } catch (err) {
      rec.status = (err as Error).name === "TimeoutError" ? "timeout" : "error";
    }
    const before = prev.find((p) => p.url === e.url);
    if (before?.hash && rec.hash) rec.changed = before.hash !== rec.hash;
    out.push(rec);
    await new Promise((r) => setTimeout(r, 400));
  }
}
writeFileSync(FILE, JSON.stringify(out, null, 2) + "\n");
const by = out.reduce<Record<string, number>>((a, r) => ((a[String(r.status)] = (a[String(r.status)] || 0) + 1), a), {});
console.log(out.length, "urls", JSON.stringify(by));
for (const r of out) if (r.status !== 200) console.log(r.status, r.slug, r.url);
for (const r of out) if (r.finalUrl) console.log("redirect", r.slug, r.url, "->", r.finalUrl);
