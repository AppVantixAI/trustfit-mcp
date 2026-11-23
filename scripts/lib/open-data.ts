/**
 * Shared plumbing for the open-data ingest scripts in scripts/sources/.
 *
 * - One polite fetcher: an identified user agent, at most one request at a time
 *   per host with a minimum gap, a timeout, and retries that honour Retry-After.
 * - One snapshot writer: every file gets the same meta block (see SnapshotMeta),
 *   and the writer refuses a file without a source, url, licence and date.
 * - A reader for mcp/.env.local, for the optional free keys. Values are never logged.
 *
 * Nothing downloaded is executed or evaluated: CSV, JSON, HTML and ZIP are parsed as data.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SNAPSHOTS = path.join(HERE, "../../data/snapshots");

export const USER_AGENT = "TrustFitBot/0.2 (open-data ingest; +https://trustfit-iota.vercel.app)";
export const today = () => new Date().toISOString().slice(0, 10);
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const sha256 = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");

/** True when the module was started directly (npx tsx scripts/sources/x.ts), not imported. */
export const isMain = (metaUrl: string) => process.argv[1] !== undefined && metaUrl === pathToFileURL(path.resolve(process.argv[1])).href;

// ------------------------------------------------------------------ env

let envLoaded = false;
/** Reads mcp/.env.local once into process.env (existing values win). Returns the value or undefined. */
export function env(name: string): string | undefined {
  if (!envLoaded) {
    envLoaded = true;
    const file = path.join(HERE, "../../.env.local");
    if (existsSync(file)) {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
  const v = process.env[name];
  return v ? v : undefined;
}

// ------------------------------------------------------------------ fetch

const lastCall = new Map<string, number>();

export type GetOptions = {
  /** Minimum milliseconds between two requests to the same host. Default 1000. */
  gapMs?: number;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tries?: number;
  /** Statuses returned to the caller instead of retried or thrown (for example 404). */
  accept?: number[];
};

export type Got = { status: number; url: string; body: Uint8Array; contentType: string };

/** GET with a per-host gap, an identified user agent, retries on 429 and 5xx, and Retry-After. */
export async function get(url: string, o: GetOptions = {}): Promise<Got> {
  const host = new URL(url).host;
  const gap = o.gapMs ?? 1000;
  const tries = o.tries ?? 3;
  let lastErr = "";
  for (let i = 0; i < tries; i++) {
    const wait = (lastCall.get(host) ?? 0) + gap - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall.set(host, Date.now());
    try {
      const r = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "*/*", ...o.headers },
        signal: AbortSignal.timeout(o.timeoutMs ?? 60000),
        redirect: "follow",
      });
      const body = new Uint8Array(await r.arrayBuffer());
      if (r.ok || o.accept?.includes(r.status)) return { status: r.status, url: r.url, body, contentType: r.headers.get("content-type") ?? "" };
      lastErr = `${r.status}`;
      if (r.status !== 429 && r.status < 500) break;
      const ra = Number(r.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 120) * 1000 : 2000 * 2 ** i);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      await sleep(2000 * 2 ** i);
    }
  }
  throw new Error(`GET failed (${lastErr}) ${url}`);
}

export const text = (b: Uint8Array) => new TextDecoder().decode(b);
export async function getJson<T>(url: string, o: GetOptions = {}): Promise<T> {
  return JSON.parse(text((await get(url, o)).body)) as T;
}

// ------------------------------------------------------------------ snapshot

/**
 * The meta block every open-data snapshot carries. `redistribute` says whether
 * the licence lets the file ship in the public repo; when false, the export
 * keeps only the meta and an empty body.
 */
export type SnapshotMeta = {
  /** Stable dataset id, the file name without .json. */
  id: string;
  source: string;
  url: string;
  license: string;
  /** Wording the licence or terms ask us to show with the data. */
  attribution: string;
  redistribute: boolean;
  retrievedAt: string;
  /** Date the source says its data was last updated, when it says. */
  sourceUpdatedAt?: string;
  /** Hash of the downloaded file, or of the stored facts for API-derived snapshots. */
  sha256: string;
  /** "collected" or "not collected: why". */
  status: string;
  /** How rows were matched to TrustFit tools, organizations and index entries. */
  matching: string;
  note: string;
  [k: string]: unknown;
};

/**
 * The body is keyed three ways, so every consumer looks things up the same way:
 *   bySlug     one of the 40 reviewed tools (product-level facts)
 *   byOrg      an organization id from src/orgs.ts (company-level facts)
 *   byIndexId  an id from the broad index (model-level facts)
 * A snapshot fills the keys that apply and leaves the others empty.
 */
export type Snapshot<S = unknown, O = unknown, I = unknown> = {
  meta: SnapshotMeta;
  bySlug: Record<string, S>;
  byOrg: Record<string, O>;
  byIndexId: Record<string, I>;
};

export function validateMeta(m: Partial<SnapshotMeta>): string[] {
  const missing = (["id", "source", "url", "license", "attribution", "retrievedAt", "status", "matching"] as const).filter(
    (k) => typeof m[k] !== "string" || !(m[k] as string).trim(),
  );
  if (typeof m.redistribute !== "boolean") missing.push("redistribute" as never);
  if (m.retrievedAt && !/^\d{4}-\d{2}-\d{2}$/.test(m.retrievedAt)) missing.push("retrievedAt (YYYY-MM-DD)" as never);
  return missing;
}

/** Writes data/snapshots/<id>.json with sorted keys in each body map. Throws on an incomplete meta. */
export function writeSnapshot(s: Snapshot) {
  const bad = validateMeta(s.meta);
  if (bad.length) throw new Error(`snapshot ${s.meta.id}: meta missing ${bad.join(", ")}`);
  const sorted = (o: Record<string, unknown>) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  mkdirSync(SNAPSHOTS, { recursive: true });
  const out = { meta: s.meta, bySlug: sorted(s.bySlug), byOrg: sorted(s.byOrg), byIndexId: sorted(s.byIndexId) };
  writeFileSync(path.join(SNAPSHOTS, `${s.meta.id}.json`), JSON.stringify(out, null, 1) + "\n");
  const n = (o: object) => Object.keys(o).length;
  console.log(`${s.meta.id}: ${n(out.bySlug)} tools, ${n(out.byOrg)} organizations, ${n(out.byIndexId)} index entries (${s.meta.status})`);
}

/** Hash of the stored facts, for snapshots built from many API calls. */
export const factsHash = (s: Pick<Snapshot, "bySlug" | "byOrg" | "byIndexId">) => sha256(JSON.stringify([s.bySlug, s.byOrg, s.byIndexId]));

export function readSnapshot<T = Snapshot>(id: string): T | null {
  const f = path.join(SNAPSHOTS, `${id}.json`);
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as T) : null;
}

// ------------------------------------------------------------------ CSV

/** RFC 4180 CSV parser: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(src: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  const s = src.charCodeAt(0) === 0xfeff ? src.slice(1) : src;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...rest] = rows.filter((r) => r.length > 1 || r[0] !== "");
  if (!head) return [];
  return rest.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

// ------------------------------------------------------------------ ZIP

/** Reads one stored or deflated member from a ZIP archive held in memory. Returns null when absent. */
export function unzipEntry(zip: Uint8Array, name: string): Uint8Array | null {
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  // End of central directory: scan back from the end for its signature.
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip archive");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("bad central directory");
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const entry = text(zip.subarray(p + 46, p + 46 + nameLen));
    if (entry === name) {
      const lNameLen = dv.getUint16(local + 26, true);
      const lExtraLen = dv.getUint16(local + 28, true);
      const start = local + 30 + lNameLen + lExtraLen;
      const data = zip.subarray(start, start + csize);
      if (method === 0) return data;
      if (method === 8) return new Uint8Array(inflateRawSync(data, { maxOutputLength: 200 * 1024 * 1024 }));
      throw new Error(`zip method ${method} not supported`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

// ------------------------------------------------------------------ HTML

const BLOCK = /<\/?(?:p|div|li|ul|ol|h[1-6]|br|tr|td|th|table|thead|tbody|section|article|header|footer|nav|main|aside|dd|dt|dl|blockquote|pre|hr|form|option|select|button|figure|figcaption)\b[^>]*>/gi;

/** Visible text of an HTML page, one block per line. Scripts and styles are dropped; inline tags (abbr, a, span) join their text. */
export function htmlText(html: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, "")
    .replace(BLOCK, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (named[e.toLowerCase()] ?? m),
    )
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}
