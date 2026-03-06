import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

// License collection schema
const licensesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // === Required Fields ===
    title: z.string().min(1).max(100),
    spdx_id: z.string().regex(/^[A-Za-z0-9.-]+$|^custom-[a-z0-9-]+$/),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    original_version: z.string(),
    description: z.string().min(1).max(300),
    changelog: z.string().optional(),
    license_type: z.enum(['permissive', 'copyleft', 'source-available', 'public-domain']),
    is_osi_approved: z.boolean(),
    is_fsf_approved: z.boolean(),
    status: z.enum(['draft', 'published']).default('draft'),

    // === Readability Metrics ===
    plain_gunning_fog: z.number().optional(),
    shame_words_count: z.number().optional(),

    // === Optional Fields ===
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
    author: z.string().optional(),
    meta_description: z.string().optional(),
    og_image: z.string().optional(),
    has_mapping: z.boolean().optional().default(false),
    mapping_version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
    show_original_comparison: z.boolean().optional().default(true),
    show_shame_counter: z.boolean().optional().default(true),
    featured: z.boolean().optional().default(false),
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
  ),
});

// Blog collection schema
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    author: z.string(),
    description: z.string().min(1).max(300),
    status: z.enum(['draft', 'published']).default('draft'),
    tags: z.array(z.string()).optional(),
    category: z.enum(['announcements', 'tutorials', 'updates']).optional(),
    featured: z.boolean().optional().default(false),
    og_image: z.string().optional(),
    related_licenses: z.array(z.string()).optional(),
  }),
});

// Template Block collection schema
const templateBlocksCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['warranty', 'permission', 'condition']),
    description: z.string().optional(),
  }),
});

// Export collections
export const collections = {
  'licenses': licensesCollection,
  'blog': blogCollection,
  'template-blocks': templateBlocksCollection,
  'docs': defineCollection({ schema: docsSchema() }),
};
