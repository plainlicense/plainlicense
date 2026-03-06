import { getEntry, type CollectionEntry } from 'astro:content';

/**
 * Injects template blocks into license content.
 * Replaces placeholders like {{template:id}} with the actual template block content.
 */
export async function injectTemplateBlocks(license: CollectionEntry<'licenses'>): Promise<string> {
  let content = license.body;
  const blockIds = license.data.template_blocks || [];

  for (const blockId of blockIds) {
    const block = await getEntry('template-blocks', blockId);
    if (block) {
      // Find where to inject or replace placeholders
      // Example: look for {{template:blockId}} or append at the end if not specified
      const placeholder = `{{template:${blockId}}}`;
      if (content.includes(placeholder)) {
        content = content.replace(placeholder, block.body);
      } else {
        // Fallback: append at the end with a separator if it's a critical block like warranty
        if (block.data.category === 'warranty') {
          content += `\n\n---\n\n## Warranty Disclaimer\n\n${block.body}`;
        }
      }
    }
  }

  return content;
}
