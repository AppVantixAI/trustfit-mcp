/**
 * Lookup from (organization, model key) to broad-index entry ids, so a
 * model-level dataset row lands on the index entries for the same model by the
 * same developer. Both the organization and the normalized model key must match.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { modelKey, orgForIndexEntry } from "../../src/orgs";
import { SNAPSHOTS } from "./open-data";

export type IndexEntryLite = { id: string; kind: string; name: string; vendor: string | null; reviewedSlug: string | null };

export function loadIndex(): IndexEntryLite[] {
  const raw = JSON.parse(readFileSync(path.join(SNAPSHOTS, "index.json"), "utf8")) as { entries: IndexEntryLite[] };
  return raw.entries;
}

export type IndexMap = { lookup: (org: string | undefined, model: string) => string[]; size: number };

export function buildIndexMap(entries: IndexEntryLite[]): IndexMap {
  const m = new Map<string, Set<string>>();
  for (const e of entries) {
    if (e.kind !== "model") continue;
    const org = orgForIndexEntry(e);
    if (!org) continue;
    const idTail = e.id.slice(e.id.indexOf(":") + 1);
    for (const k of new Set([modelKey(idTail), modelKey(e.name)])) {
      if (!k) continue;
      const key = `${org}|${k}`;
      if (!m.has(key)) m.set(key, new Set());
      m.get(key)!.add(e.id);
    }
  }
  return {
    size: m.size,
    lookup: (org, model) => (org ? [...(m.get(`${org}|${modelKey(model)}`) ?? [])] : []),
  };
}
