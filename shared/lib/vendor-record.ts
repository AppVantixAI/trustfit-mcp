/**
 * The public record for one reviewed tool: headlines, incidents, breaches, filings,
 * dockets and open-data grades. Facts with a source and a date. Nothing here feeds
 * the TrustFit score, and nothing here is a finding by TrustFit.
 */
import newsSnap from "../../data/snapshots/news.json";
import hnSnap from "../../data/snapshots/hn.json";
import breachSnap from "../../data/snapshots/breaches.json";
import secSnap from "../../data/snapshots/sec.json";
import docketSnap from "../../data/snapshots/dockets.json";
import aiidSnap from "../../data/snapshots/aiid.json";
import kevSnap from "../../data/snapshots/kev.json";
import { VENDORS } from "@/content/vendors";
import type { Headline, Story } from "@/lib/news-match";

type Kept<T> = { items: T[]; checkedAt: string; status: string };
type Meta = { source: string; url: string; license: string; retrievedAt: string; note: string; status?: string };

export type Breach = { name: string; domain: string; breachDate: string; addedDate: string; accounts: number; dataClasses: string[]; verified: boolean; link: string };
type BreachRecord = { checkedAt: string; domainsChecked: string[]; vendorWide: boolean; items: Breach[] };
export type Filing = { form: string; filed: string; link: string };
type SecRecord = { checkedAt: string; ticker: string; company: string; cyberIncidentFilings: Filing[]; latestAnnualReport: Filing | null; allFilings: string };
export type Docket = { caseName: string; court: string; filed: string; docketNumber: string; link: string };
type DocketRecord = { checkedAt: string; searchedName: string; vendorWide: boolean; totalMatching: number; items: Docket[]; search: string };
type AiidRecord = { vendorWide: boolean; developerIncidents: number; developerIncidentsLast24Months: number; latestDeveloperIncident: string; developerIncidentIds: number[] };
type KevRecord = { cves: string[]; latestAdded: string };

const by = <T>(snap: { bySlug: unknown }, slug: string) => (snap.bySlug as Record<string, T>)[slug];
const collected = (m: Meta) => !m.status || m.status.startsWith("collected");

export type RecordRow = {
  id: "incidents" | "exploited" | "breaches" | "sec" | "dockets";
  label: string;
  /** One plain sentence: what the source shows for this vendor. */
  finding: string;
  /** "clear" = looked and found nothing, "found" = entries exist, "unknown" = not looked up. */
  state: "clear" | "found" | "unknown";
  items: { text: string; date: string; url: string }[];
  more?: { text: string; url: string };
  source: string;
  sourceUrl: string;
  checkedAt: string;
  caveat: string;
};

export type NewsBlock = { headlines: Headline[]; headlinesCheckedAt: string; stories: Story[]; storiesCheckedAt: string };

export function snapshotNews(slug: string): NewsBlock {
  const n = by<Kept<Headline>>(newsSnap, slug);
  const h = by<Kept<Story>>(hnSnap, slug);
  return {
    headlines: n?.items ?? [],
    headlinesCheckedAt: n?.checkedAt ?? "",
    stories: h?.items ?? [],
    storiesCheckedAt: h?.checkedAt ?? "",
  };
}

const n = (x: number) => x.toLocaleString("en-US");
const plural = (x: number, one: string, many: string) => `${n(x)} ${x === 1 ? one : many}`;

export function recordRows(slug: string): RecordRow[] {
  const v = VENDORS[slug];
  if (!v) return [];
  const who = v.vendorWide ? `${v.vendor} (the whole company, not only this product)` : v.vendor;
  const rows: RecordRow[] = [];

  const ai = by<AiidRecord>(aiidSnap, slug);
  const aiMeta = aiidSnap.meta as unknown as Meta & { latestIncidentDate: string };
  rows.push({
    id: "incidents",
    label: "Reported AI incidents",
    state: ai ? (ai.developerIncidents > 0 ? "found" : "clear") : "unknown",
    finding: ai
      ? `${plural(ai.developerIncidents, "report names", "reports name")} ${who} as the developer, ${n(ai.developerIncidentsLast24Months)} of them in the 24 months to ${aiMeta.latestIncidentDate}.`
      : "This vendor is not matched to an entry in the incident database, so we cannot say either way.",
    items: (ai?.developerIncidentIds ?? []).slice(0, 3).map((id) => ({ text: `Incident ${id}`, date: "", url: `https://incidentdatabase.ai/cite/${id}` })),
    source: "AI Incident Database",
    sourceUrl: "https://incidentdatabase.ai/",
    checkedAt: aiMeta.retrievedAt,
    caveat: "Reports are allegations collected from the press. Big vendors collect more reports because more people use them.",
  });

  const k = by<KevRecord>(kevSnap, slug);
  const kMeta = kevSnap.meta as unknown as Meta;
  if (k) {
    rows.push({
      id: "exploited",
      label: "Vulnerabilities exploited in the wild",
      state: "found",
      finding: `${plural(k.cves.length, "vulnerability in this product is", "vulnerabilities in this product are")} in the US government's exploited list. Latest added ${k.latestAdded}.`,
      items: k.cves.map((c) => ({ text: c, date: "", url: `https://nvd.nist.gov/vuln/detail/${c}` })),
      source: "CISA Known Exploited Vulnerabilities",
      sourceUrl: kMeta.url,
      checkedAt: kMeta.retrievedAt,
      caveat: "The list says a flaw was used in attacks. It does not say whether your version is patched.",
    });
  }

  const b = by<BreachRecord>(breachSnap, slug);
  if (b) {
    rows.push({
      id: "breaches",
      label: "Data breaches",
      state: b.items.length ? "found" : "clear",
      finding: b.items.length
        ? `${plural(b.items.length, "breach", "breaches")} of ${b.domainsChecked.join(", ")} in the catalogue${b.vendorWide ? ", for the company's wider service and not this AI product alone" : ""}.`
        : `No breach of ${b.domainsChecked.join(" or ")} is in the catalogue.`,
      items: b.items.map((x) => ({ text: `${x.name}: ${n(x.accounts)} accounts (${x.dataClasses.slice(0, 3).join(", ").toLowerCase()})`, date: x.breachDate, url: x.link })),
      source: "Have I Been Pwned",
      sourceUrl: "https://haveibeenpwned.com/",
      checkedAt: b.checkedAt,
      caveat: "Only breaches whose data reached Have I Been Pwned are listed. Read the date: an old breach can be long fixed.",
    });
  }

  const sMeta = secSnap.meta as unknown as Meta;
  const s = by<SecRecord>(secSnap, slug);
  if (v.ticker) {
    const ok = collected(sMeta) && s;
    rows.push({
      id: "sec",
      label: "Cyber incident filings",
      state: ok ? (s.cyberIncidentFilings.length ? "found" : "clear") : "unknown",
      finding: ok
        ? s.cyberIncidentFilings.length
          ? `${s.company} has filed ${plural(s.cyberIncidentFilings.length, "material cyber incident report", "material cyber incident reports")} with the SEC.`
          : `${s.company} has no material cyber incident report in its recent SEC filings.`
        : `${v.vendor} is listed in the US (${v.ticker}), but its filings have not been collected yet.`,
      items: ok ? s.cyberIncidentFilings.map((f) => ({ text: `Form ${f.form}, Item 1.05`, date: f.filed, url: f.link })) : [],
      more: ok && s.latestAnnualReport ? { text: `Latest annual report (${s.latestAnnualReport.form}, ${s.latestAnnualReport.filed}): see Legal Proceedings`, url: s.latestAnnualReport.link } : undefined,
      source: "SEC EDGAR",
      sourceUrl: ok ? s.allFilings : "https://www.sec.gov/edgar",
      checkedAt: ok ? s.checkedAt : "",
      caveat: "Covers the whole listed company. Item 1.05 has been required since December 2023.",
    });
  }

  const dMeta = docketSnap.meta as unknown as Meta;
  const d = by<DocketRecord>(docketSnap, slug);
  if (v.courtParty) {
    const ok = collected(dMeta) && d;
    rows.push({
      id: "dockets",
      label: "US federal court cases",
      state: ok ? (d.totalMatching ? "found" : "clear") : "unknown",
      finding: ok
        ? d.totalMatching
          ? `${plural(d.totalMatching, "federal case has", "federal cases have")} "${d.searchedName}" in the case name.`
          : `No federal case with "${d.searchedName}" in the case name was found.`
        : "Court records have not been collected yet.",
      items: ok ? d.items.map((x) => ({ text: `${x.caseName} (${x.court}${x.docketNumber ? `, ${x.docketNumber}` : ""})`, date: x.filed, url: x.link })) : [],
      more: ok && d.totalMatching > d.items.length ? { text: `All ${n(d.totalMatching)} matching cases`, url: d.search } : undefined,
      source: "CourtListener",
      sourceUrl: "https://www.courtlistener.com/",
      checkedAt: ok ? d.checkedAt : "",
      caveat: "A filed case is an allegation, not a finding. The vendor may be the one suing. A similar name can be a different company. State courts are not covered.",
    });
  }
  return rows;
}

/** Sources behind the record, for the methodology page and the MCP server. */
export function recordSources() {
  // The news import saves after every group of tools, so its file can exist with
  // few or no tools in it. Say how many were reached, not only the run date.
  const newsChecked = Object.keys(newsSnap.bySlug as Record<string, unknown>).length;
  return [newsSnap.meta, hnSnap.meta, breachSnap.meta, secSnap.meta, docketSnap.meta].map((m, i) => {
    const x = m as unknown as Meta;
    const status = i === 0 && newsChecked === 0 ? "not collected: the news service did not answer" : (x.status ?? "collected");
    const coverage = i === 0 && newsChecked > 0 ? `${newsChecked} of ${Object.keys(VENDORS).length} tools checked` : "";
    return { source: x.source, url: x.url, license: x.license, retrievedAt: x.retrievedAt, status, coverage, note: x.note };
  });
}
