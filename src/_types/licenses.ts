import type { z } from "astro/zod";
import type {
  chooseALicenseDetailsSchema,
  conditionTagSchema,
  licenseSchema,
  limitationTagSchema,
  permissionTagSchema,
  spdxDetailsSchema,
  templateBlockSchema,
} from "./schemas";

export type PermissionTagT = z.infer<typeof permissionTagSchema>;
export type ConditionTagT = z.infer<typeof conditionTagSchema>;
export type LimitationTagT = z.infer<typeof limitationTagSchema>;
export type ChooseALicenseDetailsT = z.infer<
  typeof chooseALicenseDetailsSchema
>;
export type SpdxDetailsT = z.infer<typeof spdxDetailsSchema>;
export type LicenseT = z.infer<typeof licenseSchema>;
export type TemplateBlockT = z.infer<typeof templateBlockSchema>;

export type LicenseFamilyT =
  | "public-domain"
  | "permissive"
  | "copyleft"
  | "source-available"
  | "proprietary";

// License unless it's public domain, then it's a dedication
export type LicenseTypeT = "license" | "dedication";

export type LicenseEntryT = {
  id: string;
  slug: string;
  body: string;
  data: LicenseT;
};

export type TemplateBlockEntryT = {
  id: string;
  slug: string;
  body: string;
  data: TemplateBlockT;
};
