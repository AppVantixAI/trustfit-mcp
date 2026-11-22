import { z } from "zod";
import type { VetoTag } from "./schema";

export const CompanyProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  companyName: z.string().min(1),
  domain: z.string().min(1),
  websiteUrl: z.string().url(),
  brand: z.object({
    tagline: z.string(),
    voice: z.string(),
    positioning: z.string(),
  }),
  products: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    }),
  ),
  icp: z.object({
    industry: z.string(),
    buyerType: z.enum(["consumer", "smb", "enterprise", "regulated"]),
    useSurface: z.enum(["internal", "customer-facing", "mixed"]),
    brandSensitivity: z.enum(["low", "medium", "high"]),
    hardVetos: z.array(z.string()),
    summary: z.string(),
    buyerNotes: z.array(z.string()),
  }),
  source: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    fetchedAt: z.string(),
    method: z.enum(["heuristic", "manual"]),
    estimate: z.literal(true),
  }),
  createdAt: z.string(),
});

export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;

export const COMPANY_STORAGE_KEY = "trustfit-company-v1";
export const SESSION_STORAGE_KEY = "trustfit-session-v1";

export type SessionUser = {
  id: string;
  email: string;
  companyName: string;
};

export function normalizeDomain(input: string): string {
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/^www\./, "");
  value = value.split(/[/?#]/)[0] ?? value;
  return value;
}

export function websiteFromDomain(domain: string): string {
  return `https://${normalizeDomain(domain)}`;
}

export function toMatchVetos(tags: string[]): VetoTag[] {
  const allowed = new Set([
    "training-on-inputs",
    "china-hosted",
    "lawsuit-active",
    "weak-enterprise-controls",
    "consumer-default-training",
    "high-controversy",
    "opaque-data-policy",
  ]);
  return tags.filter((t) => allowed.has(t)) as VetoTag[];
}
