/**
 * Builds data/snapshots/aiid.json from the AI Incident Database weekly snapshot.
 * The snapshot is a 123 MB archive, so it is not fetched automatically:
 *
 *   1. Download a backup-*.tar.bz2 from https://incidentdatabase.ai/research/snapshots/
 *   2. tar -xjf backup-*.tar.bz2 mongodump_full_snapshot/incidents.csv mongodump_full_snapshot/license.txt
 *   3. npx tsx scripts/ingest-aiid.ts <dir containing incidents.csv> [archive-file-for-hash]
 *
 * Only incident ids, dates and entity slugs are kept (no titles, descriptions or
 * report text), and each id links back to incidentdatabase.ai. The database is
 * CC BY-SA 4.0, so the output file inherits that license (share-alike).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ENTITIES } from "../src/entities";

const dir = process.argv[2];
if (!dir) throw new Error("usage: ingest-aiid.ts <dir with incidents.csv> [archive]");
const csvBuf = readFileSync(path.join(dir, "incidents.csv"));
const license = readFileSync(path.join(dir, "license.txt"), "utf8").trim();
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const [head, ...body] = parseCsv(csvBuf.toString("utf8"));
const col = (n: string) => head.indexOf(n);
const iId = col("incident_id"), iDate = col("date"), iDev = col("Alleged developer of AI system"), iDep = col("Alleged deployer of AI system");
if ([iId, iDate, iDev, iDep].some((i) => i < 0)) throw new Error("unexpected incidents.csv columns: " + head.join("|"));

const incidents = body.filter((r) => r.length > iDep).map((r) => ({
  id: Number(r[iId]),
  date: r[iDate],
  dev: JSON.parse(r[iDev] || "[]") as string[],
  dep: JSON.parse(r[iDep] || "[]") as string[],
}));
const latest = incidents.map((i) => i.date).sort().pop()!;
const cut = new Date(latest);
cut.setUTCFullYear(cut.getUTCFullYear() - 2);
const cutoff = cut.toISOString().slice(0, 10);

const bySlug: Record<string, unknown> = {};
for (const [slug, e] of Object.entries(ENTITIES)) {
  if (!e.aiid) continue;
  const asDev = incidents.filter((i) => i.dev.some((d) => e.aiid!.includes(d)));
  const asDep = incidents.filter((i) => i.dep.some((d) => e.aiid!.includes(d)));
  bySlug[slug] = {
    entities: e.aiid,
    vendorWide: Boolean(e.aiidVendorWide),
    developerIncidents: asDev.length,
    deployerIncidents: asDep.length,
    developerIncidentsLast24Months: asDev.filter((i) => i.date >= cutoff).length,
    latestDeveloperIncident: asDev.map((i) => i.date).sort().pop() ?? "",
    developerIncidentIds: asDev.map((i) => i.id).sort((a, b) => b - a),
  };
}

const archive = process.argv[3] ? sha(readFileSync(process.argv[3])) : undefined;
writeFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/snapshots/aiid.json"),
  JSON.stringify(
    {
      meta: {
        source: "AI Incident Database (Responsible AI Collaborative), weekly snapshot",
        url: "https://incidentdatabase.ai/",
        license: "CC BY-SA 4.0 (share-alike applies to this file)",
        licenseText: license,
        retrievedAt: new Date().toISOString().slice(0, 10),
        incidentsInSnapshot: incidents.length,
        latestIncidentDate: latest,
        last24MonthsCutoff: cutoff,
        incidentsCsvSha256: sha(csvBuf),
        archiveSha256: archive,
        note: "Reported incidents that name the developer. Allegations, not verified findings, and not normalized by usage: widely used products appear more often. Context, not a score.",
      },
      bySlug,
    },
    null,
    2,
  ) + "\n",
);
console.log(incidents.length, "incidents; latest", latest, "; mapped", Object.keys(bySlug).length, "tools");
