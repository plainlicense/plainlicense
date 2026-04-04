import type {
  InferCollectionOutput,
  licensesCollection,
  templateBlocksCollection,
} from "~cfg";

// ─── Inferred from CMS field definitions (single source of truth) ───

export type LicenseT = InferCollectionOutput<typeof licensesCollection>;
export type TemplateBlockT = InferCollectionOutput<
  typeof templateBlocksCollection
>;

export type OriginalLicenseT = NonNullable<LicenseT["original"]>;
export type PermissionTagT = NonNullable<
  OriginalLicenseT["permissions"]
>[number];
export type ConditionTagT = NonNullable<OriginalLicenseT["conditions"]>[number];
export type LimitationTagT = NonNullable<
  OriginalLicenseT["limitations"]
>[number];

export type LicenseFamilyT = LicenseT["license_family"];
export type LicenseTypeT = "license" | "dedication";

// ─── Entry wrappers (match Astro's getCollection return shape) ───

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
