import { docsSchema } from '@astrojs/starlight/schema'
import { defineCollection, z } from 'astro:content'
import { blogSchema } from 'starlight-blog/schema'
import { LicenseSchema } from './licenseXmlSchema'

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

// License collection schema
const licensesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // === Required Fields ===
    plain_name: z.string().min(1).max(100),
    spdx_id: z.string().regex(/^[A-Za-z0-9.-]+$|^plain-[a-z0-9-]+$/),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string().min(1).max(300),
    changelog: z.string().optional(),
    license_type: z.enum(['permissive', 'copyleft', 'source-available', 'public-domain', 'proprietary']),

    status: z.enum(['draft', 'published']).default('draft'),

    // === Readability Metrics ===
    plain_gunning_fog: z.number().optional(),
    shame_words_count: z.number().optional(),

    // === Optional Fields ===
    // these pertain to the original license that the plain language version is based on, not the plain language version itself, until osi/fsf knows we exist and approves our plain language versions as well
    is_osi_approved: z.boolean().optional(),
    is_fsf_approved: z.boolean().optional(),
    original_version: z.string().optional(),
    // version of the original license that the plain language version is based on (e.g. '2.0' for Apache-2.0)
    original_version_name: z.string().optional(),
    original_version_version: z.string().regex(/^\d+(\.\d+)?(\.\d+)?$/).optional(),
    // not all commonly used licenses have a single official version, MIT is a prime example
    has_official_original: z.boolean().optional(),
    original_organization: z.string().optional(),
    fair_code: z.boolean().optional().default(false),
    summary: z.string().optional(),
    use_cases: z.array(z.string()).optional(),
    restrictions: z.object({
      commercial_use: z.boolean().optional(),
      attribution_required: z.boolean().optional(),
      share_alike: z.boolean().optional(),
    }).optional(),
    canonical_url: z.string().url().optional(),
    created_date: z.string().optional(),
    last_modified: z.string().optional(),
    authors: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    og_image: z.string().optional(),
    has_mapping: z.boolean().optional().default(false),
    mapping_version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
    show_original_comparison: z.boolean().optional().default(true),
    show_shame_counter: z.boolean().optional().default(true),
    featured: z.boolean().optional().default(false),

    // auto-populated fields (not required in frontmatter, but will be added during build)
    original_gunning_fog: z.number().optional(),
    spdx_details: spdxDetailsSchema.optional(),
    spdx_license: LicenseSchema.optional(),
    choose_a_license_details: chooseALicenseDetailsSchema.optional(),

  }).refine(
    (data) => {
      // If fair_code is true, license_type must be source-available
      if (data.fair_code && data.license_type !== 'source-available') {
        return false;
      }
      return true;
    },
    {
      message: "fair_code licenses must have license_type 'source-available'",
    }
  )
});


// Template Block collection schema
const templateBlocksCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    blockId: z.string().regex(/^[a-z0-9-]+$/),
    category: z.enum(['warranty', 'permission', 'condition', 'disclaimer', 'notice']),
    description: z.string().optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    blockTitle: z.string().optional(),
  }),
});

// Export collections
export const collections = {
  'licenses': licensesCollection,
  'template-blocks': templateBlocksCollection,
  'docs': defineCollection({ schema: docsSchema({ extend: (context) => blogSchema(context) }) }),
};
