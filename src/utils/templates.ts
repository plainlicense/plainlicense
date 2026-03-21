import { getEntry } from "astro:content";

const COMPONENT_RE = /\{\{component:[a-z-]+.*?\}\}/g;
const TEMPLATE_RE = /\{\{(?:component|block):[^}]*\}\}/g;
const HR = "-".repeat(3);

/** Build a separator for appending original license text */
export function buildOriginalTextSeparator(): string {
  return `\n\n${HR}\n\n# Original License Text\n`;
}

/** Strip {{component:...}} placeholders */
export function stripComponentPlaceholders(text: string): string {
  return text.replace(COMPONENT_RE, "");
}

/** Strip both {{component:...}} and {{block:...}} placeholders */
export function stripTemplatePlaceholders(text: string): string {
  return text.replace(TEMPLATE_RE, "");
}

/**
 * Injects template blocks into license content.
 * Replaces placeholders like {{block:id}} with the actual template block content.
 * Note: Most block injection is handled directly in [...slug].astro.
 */
export async function injectTemplateBlocks(
  content: string,
  blockIds: string[],
): Promise<string> {
  for (const blockId of blockIds) {
    const block = await getEntry("template-blocks", blockId);
    if (block) {
      const placeholder = `{{block:${blockId}}}`;
      if (content.includes(placeholder)) {
        content = content.replaceAll(placeholder, block.body);
      }
    }
  }
  return content;
}
