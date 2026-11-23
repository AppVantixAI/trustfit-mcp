/**
 * Runs the open-data ingests in scripts/sources/. Each source writes one
 * data/snapshots/<id>.json with the shared meta block (scripts/lib/open-data.ts).
 *
 *   npx tsx scripts/ingest-open.ts            all sources
 *   npx tsx scripts/ingest-open.ts nvd ghsa   only these
 *
 * Sources run one after another; a failure is reported and the rest still run.
 * None of these feeds a score: they are shown as dated, sourced facts (src/facts.ts).
 */
export {};

const SOURCES: Record<string, () => Promise<{ run: () => Promise<void> }>> = {
  "epoch-models": () => import("./sources/epoch-models"),
  "epoch-eci": () => import("./sources/epoch-eci"),
  "models-dev": () => import("./sources/models-dev"),
  litellm: () => import("./sources/litellm"),
  ghsa: () => import("./sources/ghsa"),
  nvd: () => import("./sources/nvd"),
  gleif: () => import("./sources/gleif"),
  fedramp: () => import("./sources/fedramp"),
  diodb: () => import("./sources/diodb"),
  "security-txt": () => import("./sources/security-txt"),
  statuspage: () => import("./sources/statuspage"),
  "ai-commitments": () => import("./sources/ai-commitments"),
};

const asked = process.argv.slice(2).filter((a) => a !== "all");
const unknown = asked.filter((a) => !SOURCES[a]);
if (unknown.length) {
  console.error(`unknown source: ${unknown.join(", ")}. Known: ${Object.keys(SOURCES).join(", ")}`);
  process.exit(2);
}
const failed: string[] = [];
for (const id of asked.length ? asked : Object.keys(SOURCES)) {
  const t = Date.now();
  try {
    await (await SOURCES[id]()).run();
    console.log(`  ${id} done in ${Math.round((Date.now() - t) / 1000)} s`);
  } catch (e) {
    failed.push(id);
    console.error(`  ${id} FAILED: ${e instanceof Error ? e.message : e}`);
  }
}
if (failed.length) {
  console.error(`failed: ${failed.join(", ")}`);
  process.exit(1);
}
