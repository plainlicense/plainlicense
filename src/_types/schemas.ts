import { z } from "astro/zod";

// Choosealicense.com tag enums (data layer — display tags live in tagMappings.ts)
export const permissionTagSchema = z.enum([
  "commercial-use",
  "distribution",
  "modifications",
  "patent-use",
  "private-use",
  "revokable",
]);

export const conditionTagSchema = z.enum([
  "disclose-source",
  "document-changes",
  "include-copyright",
  "include-copyright--source",
  "network-use-disclose",
  "same-license",
  "same-license--file",
  "same-license--library",
]);

export const limitationTagSchema = z.enum([
  "liability",
  "patent-use",
  "trademark-use",
  "warranty",
]);

export const chooseALicenseDetailsSchema = z.object({
  title: z.string(),
  spdx_id: z.string().regex(/^[A-Za-z0-9.-]+$/),
  description: z.string(),
  how: z.string(),
  conditions: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  using: z.array(z.record(z.string(), z.url())).max(3).optional(),
  hidden: z.boolean().default(false),
  nickname: z.string().optional(),
  featured: z.boolean().default(false),
  note: z.string().optional(),
  redirect_from: z.array(z.string()).optional(),
});

export const spdxDetailsSchema = z.object({
  reference: z.url(),
  isDeprecatedLicenseId: z.boolean().default(false),
  detailsUrl: z.url(),
  referenceNumber: z.number().optional(),
  name: z.string(),
  licenseId: z.string(),
  isOsiApproved: z.boolean().default(false),
  seeAlso: z.array(z.url()).optional(),
});

export const originalLicenseSchema = z.object({
  name: z.string(),
  spdx_id: z
    .string()
    .regex(/^[A-Za-z0-9.-]+$/)
    .optional(),
  version: z.string().optional(),
  version_display: z.string().optional(),
  organization: z.string().optional(),
  has_official_source: z.boolean().default(false),
  canonical_url: z.url().optional(),
  link_in_original: z.boolean().default(false),
  is_deprecated: z.boolean().default(false),
  is_osi_approved: z.boolean().optional(),
  is_fsf_approved: z.boolean().optional(),
  permissions: z.array(permissionTagSchema).optional(),
  conditions: z.array(conditionTagSchema).optional(),
  limitations: z.array(limitationTagSchema).optional(),
  gunning_fog: z.number().optional(),
  choose_a_license_details: chooseALicenseDetailsSchema.optional(),
});

// License collection schema
export const licenseSchema = z
  .object({
    // === Identity ===
    plain_name: z.string().min(1).max(100),
    spdx_id: z.string().regex(/^[A-Za-z0-9.-]+$|^Plain-[A-Za-z0-9.-]+$/),
    plain_id: z
      .string()
      .regex(/^Plain-[A-Za-z0-9.-]+$/)
      .optional(),
    plain_version: z.string().regex(/^\d+\.\d+\.\d+$/),
    license_family: z.enum([
      "public-domain",
      "permissive",
      "copyleft",
      "source-available",
      "proprietary",
    ]),
    is_dedication: z.boolean().default(false),
    status: z.enum(["draft", "published"]).default("draft"),

    // === Description ===
    title: z.string(),
    description: z.string().min(1).max(300),
    tldr: z.array(z.string().max(200)).min(2).max(4),

    // === Content flags ===
    attribution_required: z.boolean().default(false),
    fair_code: z.boolean().default(false),

    // === License-specific how-to additions (family default is a component) ===
    extra_how: z.string().optional(),

    // === Clause mapping ===
    has_mapping: z.boolean().default(false),
    mapping_version: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/)
      .optional(),

    // === Readability metrics (computed at build time) ===
    plain_gunning_fog: z.number().optional(),
    shame_words_count: z.number().optional(),

    // === Display controls ===
    show_original_comparison: z.boolean().default(true),
    show_shame_counter: z.boolean().default(true),
    featured: z.boolean().default(false),

    // === SEO / metadata ===
    meta_description: z.string().max(160).optional(),
    og_image: z.string().optional(),
    authors: z.array(z.string()).optional(),
    changelog: z.string().optional(),
    uuid: z.uuid(),

    // === Original license (omit for PlainLicense originals) ===
    original: originalLicenseSchema.optional(),

    // === Auto-populated build-time fields (do not author in frontmatter) ===
    choose_a_license_details: chooseALicenseDetailsSchema.optional(),
  })
  .refine(
    (data) => !(data.fair_code && data.license_family !== "source-available"),
    {
      message:
        "fair_code must be false unless license_family is 'source-available'",
    },
  )
  .refine(
    (data) => !(data.is_dedication && data.license_family !== "public-domain"),
    {
      message:
        "is_dedication must be false unless license_family is 'public-domain'",
    },
  )
  .refine((data) => !(data.has_mapping && !data.mapping_version), {
    message: "mapping_version is required when has_mapping is true",
  })
  .refine(
    (data) =>
      !(data.original?.has_official_source && !data.original?.canonical_url),
    {
      message:
        "original.canonical_url is required when original.has_official_source is true",
    },
  );

// Template Block collection schema
export const templateBlockSchema = z.object({
  title: z.string(),
  block_id: z.string().regex(/^[a-z0-9-]+$/),
  category: z.enum([
    "warranty",
    "permission",
    "condition",
    "disclaimer",
    "notice",
  ]),
  families: z
    .array(
      z.enum([
        "public-domain",
        "permissive",
        "copyleft",
        "source-available",
        "proprietary",
      ]),
    )
    .optional(),
  description: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  block_title: z.string().optional(),
});

export const socialMediaSchema = z.object({
  github: z.url().optional(),
  twitter: z.url().optional(),
  linkedin: z.url().optional(),
  bluesky: z.url().optional(),
});

export const authorSchema = z.object({
  name: z.string(),
  url: z.url().optional(),
  social_links: socialMediaSchema.optional(),
  title: z.string().optional(),
  avatar: z.string().optional(),
  about: z.string().optional(),
  email: z.email().optional(),
  uuid: z.uuid(),
});

export const blogCategorySchema = z.enum([
  "announcements",
  "guides",
  "updates",
  "community",
  "license-talk",
]);

export const blogSeriesSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  uuid: z.uuid(),
  index: z.number(),
});

export const blogPostSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // authors is an array of author names or UUIDs (resolved to author profiles at build time)
  authors: z.array(z.string()).optional(),
  category: blogCategorySchema,
  series: blogSeriesSchema.optional(),

  featured: z.boolean().default(false),
  creation_date: z.string().refine((date) => !Number.isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  publication_date: z
    .string()
    .optional()
    .refine((date) => date && !Number.isNaN(Date.parse(date)), {
      message: "Invalid date format",
    }),
  last_updated: z.string().refine((date) => !Number.isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  og_image: z.string().optional(),
  related_licenses: z.array(z.uuid()).optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  uuid: z.uuid(),
  body: z.string(),
});
