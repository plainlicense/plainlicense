import { getEntry } from 'astro:content'

/**
 * Injects template blocks into license content.
 * Replaces placeholders like {{block:id}} with the actual template block content.
 * Note: Most block injection is handled directly in [...slug].astro.
 */
export async function injectTemplateBlocks(
  content: string,
  blockIds: string[]
): Promise<string> {
  for (const blockId of blockIds) {
    const block = await getEntry('template-blocks', blockId);
    if (block) {
      const placeholder = `{{block:${blockId}}}`;
      if (content.includes(placeholder)) {
        content = content.replaceAll(placeholder, block.body);
      }
    }
  }
  return content;
}
