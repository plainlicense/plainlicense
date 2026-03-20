import { glob } from 'astro/loaders'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { defineCollection, z } from 'astro:content'
import { blogSchema } from 'starlight-blog/schema'
import { LicenseSchema } from './content/licenseXmlSchema'

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
})

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
  'commercial-use', 'distribution', 'modifications', 'patent-use', 'private-use', 'revokable',
]);

const ConditionTag = z.enum([
  'disclose-source', 'document-changes', 'include-copyright', 'include-copyright--source',
  'network-use-disclose', 'same-license', 'same-license--file', 'same-license--library',
]);

const LimitationTag = z.enum([
  'liability', 'patent-use', 'trademark-use', 'warranty',
]);

// Original license subschema (present for adaptations, omit for PlainLicense originals)
const OriginalLicenseSchema = z.object({
  name: z.string(),
  spdx_id: z.string().regex(/^[A-Za-z0-9.-]+$/).optional(),
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
  loader: glob({ pattern: '**/*.md', base: './content/licenses' }),
  schema: z.object({
    // === Identity ===
    plain_name: z.string().min(1).max(100),
    spdx_id: z.string().regex(/^[A-Za-z0-9.-]+$|^Plain-[A-Za-z0-9.-]+$/),
    plain_id: z.string().regex(/^Plain-[A-Za-z0-9.-]+$/).optional(),
    plain_version: z.string().regex(/^\d+\.\d+\.\d+$/),
    license_family: z.enum(['public-domain', 'permissive', 'copyleft', 'source-available', 'proprietary']),
    is_dedication: z.boolean().default(false),
    status: z.enum(['draft', 'published']).default('draft'),

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
    mapping_version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),

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

    // === Original license (omit for PlainLicense originals) ===
    original: OriginalLicenseSchema.optional(),

    // === Auto-populated build-time fields (do not author in frontmatter) ===
    spdx_details: spdxDetailsSchema.optional(),
    spdx_license: LicenseSchema.optional(),
    choose_a_license_details: chooseALicenseDetailsSchema.optional(),

  }).refine(
    (data) => !(data.fair_code && data.license_family !== 'source-available'),
    { message: "fair_code must be false unless license_family is 'source-available'" }
  ).refine(
    (data) => !(data.is_dedication && data.license_family !== 'public-domain'),
    { message: "is_dedication must be false unless license_family is 'public-domain'" }
  ).refine(
    (data) => !(data.has_mapping && !data.mapping_version),
    { message: "mapping_version is required when has_mapping is true" }
  ).refine(
    (data) => !(data.original?.has_official_source && !data.original?.canonical_url),
    { message: "original.canonical_url is required when original.has_official_source is true" }
  )
});


// Template Block collection schema
const templateBlocksCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/template-blocks' }),
  schema: z.object({
    title: z.string(),
    block_id: z.string().regex(/^[a-z0-9-]+$/),
    category: z.enum(['warranty', 'permission', 'condition', 'disclaimer', 'notice']),
    families: z.array(z.enum([
      'public-domain', 'permissive', 'copyleft', 'source-available', 'proprietary',
    ])).optional(),
    description: z.string().optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    block_title: z.string().optional(),
  }),
});

// Export collections
export const collections = {
  'licenses': licensesCollection,
  'template-blocks': templateBlocksCollection,
  'docs': defineCollection({
    loader: docsLoader(),
    schema: docsSchema({ extend: (context) => blogSchema(context) }),
  }),
};
