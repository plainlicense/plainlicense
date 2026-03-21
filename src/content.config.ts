import { sveltiaLoader } from "astro-loader-sveltia-cms/loader";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

const chooseALicenseDetailsSchema = z.object({
  title: z.string(),
  spdx_id: z.string().regex(/^[A-Za-z0-9.-]+$/),
  description: z.string(),
  how: z.string(),
  conditions: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  using: z.array(z.record(z.string(), z.string().url())).max(3).optional(),
  hidden: z.boolean().default(false),
  nickname: z.string().optional(),
  featured: z.boolean().default(false),
  note: z.string().optional(),
  redirect_from: z.array(z.string()).optional(),
});

const spdxDetailsSchema = z.object({
  reference: z.string().url(),
  isDeprecatedLicenseId: z.boolean().default(false),
  detailsUrl: z.string().url(),
  referenceNumber: z.number().optional(),
  name: z.string(),
  licenseId: z.string(),
  isOsiApproved: z.boolean().default(false),
  seeAlso: z.array(z.string().url()).optional(),
});

// Choosealicense.com tag enums (data layer — display tags live in tagMappings.ts)
const PermissionTag = z.enum([
  "commercial-use",
  "distribution",
  "modifications",
  "patent-use",
  "private-use",
  "revokable",
]);

const ConditionTag = z.enum([
  "disclose-source",
  "document-changes",
  "include-copyright",
  "include-copyright--source",
  "network-use-disclose",
  "same-license",
  "same-license--file",
  "same-license--library",
]);

const LimitationTag = z.enum([
  "liability",
  "patent-use",
  "trademark-use",
  "warranty",
]);

// Original license subschema (present for adaptations, omit for PlainLicense originals)
const OriginalLicenseSchema = z.object({
  name: z.string(),
  spdx_id: z
    .string()
    .regex(/^[A-Za-z0-9.-]+$/)
    .optional(),
  version: z.string().optional(),
  version_display: z.string().optional(),
  organization: z.string().optional(),
  has_official_source: z.boolean().default(false),
  canonical_url: z.string().url().optional(),
  link_in_original: z.boolean().default(false),
  is_deprecated: z.boolean().default(false),
  is_osi_approved: z.boolean().optional(),
  is_fsf_approved: z.boolean().optional(),
  permissions: z.array(PermissionTag).optional(),
  conditions: z.array(ConditionTag).optional(),
  limitations: z.array(LimitationTag).optional(),
  gunning_fog: z.number().optional(),
  choose_a_license_details: chooseALicenseDetailsSchema.optional(),
});

// License collection schema
const licensesCollection = defineCollection({
  loader: sveltiaLoader("licenses"),
});

// Template Block collection schema
const templateBlocksCollection = defineCollection({
  loader: sveltiaLoader("template-blocks"),
});
const blogPosts = defineCollection({
  loader: sveltiaLoader("blog-posts"),
});

// Export collections
export const collections = {
  licenses: licensesCollection,
  "template-blocks": templateBlocksCollection,
  "blog-posts": blogPosts,
};
