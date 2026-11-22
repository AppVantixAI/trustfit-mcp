import type { VetoTag } from "./schema";

export type Industry =
  | "general"
  | "saas"
  | "healthcare"
  | "finance"
  | "legal"
  | "consumer"
  | "manufacturing"
  | "education";

export type BuyerType = "consumer" | "smb" | "enterprise" | "regulated";
export type UseSurface = "internal" | "customer-facing";
export type BrandSensitivity = "low" | "medium" | "high";

export type IcpProfile = {
  industry: Industry;
  buyerType: BuyerType;
  useSurface: UseSurface;
  brandSensitivity: BrandSensitivity;
  hardVetos: VetoTag[];
};

export const ICP_STORAGE_KEY = "trustfit-icp-v1";

export const DEFAULT_ICP: IcpProfile = {
  industry: "general",
  buyerType: "smb",
  useSurface: "internal",
  brandSensitivity: "medium",
  hardVetos: [],
};

export const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: "general", label: "General B2B" },
  { value: "saas", label: "SaaS / software" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance" },
  { value: "legal", label: "Legal" },
  { value: "consumer", label: "Consumer brand" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "education", label: "Education" },
];

export const BUYER_OPTIONS: { value: BuyerType; label: string }[] = [
  { value: "consumer", label: "Consumers" },
  { value: "smb", label: "SMB buyers" },
  { value: "enterprise", label: "Enterprise buyers" },
  { value: "regulated", label: "Regulated buyers" },
];

export const USE_SURFACE_OPTIONS: { value: UseSurface; label: string }[] = [
  { value: "internal", label: "Internal only" },
  { value: "customer-facing", label: "Customer-facing" },
];

export const BRAND_OPTIONS: { value: BrandSensitivity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function parseIcp(raw: unknown): IcpProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<IcpProfile>;
  if (!o.industry || !o.buyerType || !o.useSurface || !o.brandSensitivity) {
    return null;
  }
  return {
    industry: o.industry,
    buyerType: o.buyerType,
    useSurface: o.useSurface,
    brandSensitivity: o.brandSensitivity,
    hardVetos: Array.isArray(o.hardVetos) ? (o.hardVetos as VetoTag[]) : [],
  };
}
