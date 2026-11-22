/**
 * "Before you adopt" guidance for one tool, derived only from data already on
 * the tool record (plan tiers, risk tags, evidence and dates). Nothing here is
 * a vendor-specific claim we have not already sourced: each line is either a
 * restatement of a recorded tier or a standard question prompted by a recorded
 * tag or a gap in the evidence.
 */
import type { Tool, VetoTag } from "./schema";

export type ToolGuidance = {
  checklist: string[];
  questions: string[];
  freshness: string;
  stale: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

const TAG_CHECK: Partial<Record<VetoTag, string>> = {
  "training-on-inputs":
    "Do not paste customer or confidential data until you have the vendor's written confirmation that inputs are not used for training.",
  "consumer-default-training":
    "Make sure staff use the business plan, not personal accounts. Consumer plans can train on inputs by default; opt out wherever the vendor offers it.",
  "weak-enterprise-controls":
    "Limit it to low-sensitivity work until it offers single sign-on, audit logs and admin controls you can confirm.",
  "opaque-data-policy":
    "Treat the data policy as unclear. Get retention and storage terms in writing before real use.",
  "china-hosted":
    "Check whether your contracts, customers or regulators allow data to be processed by a China-hosted or China-owned vendor.",
  "lawsuit-active":
    "Check what indemnity the vendor offers and keep an eye on the litigation before relying on its output in customer-facing work.",
  "high-controversy":
    "Decide in advance what you will tell customers if you are asked why you use it.",
};

const TAG_QUESTION: Partial<Record<VetoTag, string>> = {
  "training-on-inputs":
    "Your policy lets inputs be used for training in some cases. Which plans and settings turn that off, and will you confirm it in the contract?",
  "consumer-default-training":
    "Consumer accounts appear to train by default. How do we make sure employees cannot use personal accounts for company data?",
  "weak-enterprise-controls":
    "Which admin controls do you offer today: single sign-on, audit logs, role permissions, data export and deletion?",
  "opaque-data-policy":
    "Please send a plain description of what data you keep, for how long, and who can see it.",
  "china-hosted":
    "Where exactly is our data processed and stored, and which parent company and jurisdiction apply?",
  "lawsuit-active":
    "What indemnity do you give for claims about generated output, and does ongoing litigation change it?",
  "high-controversy":
    "How do you handle public criticism of your practices, and where do you publish changes to your policies?",
};

function daysSince(iso: string, now: number): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((now - t) / DAY) : Number.POSITIVE_INFINITY;
}

export function toolGuidance(tool: Tool, now: number = Date.now()): ToolGuidance {
  const checklist: string[] = [];
  const questions: string[] = [];

  const safe = tool.tiers.filter((t) => t.trainsOnInputs === "no");
  const risky = tool.tiers.filter((t) => t.trainsOnInputs !== "no");

  if (safe.length) {
    checklist.push(
      `Put company data only on: ${safe.map((t) => t.name).join(", ")}. Recorded policy: ${safe[0].notes}`,
    );
  } else {
    checklist.push(
      "No plan on file is confirmed not to train on inputs. Keep company data out until the vendor confirms in writing.",
    );
  }
  if (risky.length && safe.length) {
    checklist.push(
      `Keep company data off: ${risky.map((t) => `${t.name} (${t.trainsOnInputs === "yes" ? "trains on inputs" : "depends on settings"})`).join(", ")}.`,
    );
  }

  for (const tag of tool.vetoTags) {
    const c = TAG_CHECK[tag];
    if (c) checklist.push(c);
    const q = TAG_QUESTION[tag];
    if (q) questions.push(q);
  }

  const vendorPolicies = tool.evidence.filter((e) => e.kind === "vendor-policy");
  const newestPolicy = vendorPolicies.map((e) => e.dated).sort().pop();
  if (!vendorPolicies.length) {
    questions.push(
      "We found no vendor policy document on file. Please send your current data, privacy and security terms.",
    );
  } else if (newestPolicy && daysSince(newestPolicy, now) > 365) {
    questions.push(
      `The newest vendor policy we hold is dated ${newestPolicy}. Has anything changed since then?`,
    );
  }

  questions.push(
    "Do you train on or keep our inputs and outputs, on every plan we would use? Please confirm in writing.",
    "Where is our data stored and processed, and who are your subprocessors?",
    "Can we sign a data processing agreement and see your current security report?",
  );

  checklist.push(
    "Write down the plan, region and admin settings you chose and the date, so the decision can be reviewed later.",
  );

  const newest = tool.evidence.map((e) => e.dated).sort().pop() ?? null;
  const stale = daysSince(tool.lastReviewed, now) > 180;
  if (stale) {
    checklist.push(
      `Our review of this tool is from ${tool.lastReviewed}. Recheck the vendor's current terms before you sign.`,
    );
  }
  const freshness = `Reviewed ${tool.lastReviewed}${newest ? `, newest source dated ${newest}` : ""}.`;

  return { checklist, questions, freshness, stale };
}
