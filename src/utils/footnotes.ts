/**
 * Transforms markdown footnote syntax ([^N] references + [^N]: definitions)
 * into interactive tooltip HTML matching the Footnote.astro component output.
 *
 * Works as a post-processor on HTML that was rendered by `marked.parse()`,
 * since marked v17 doesn't support footnotes natively.
 */

/**
 * Extract footnote definitions from raw markdown BEFORE it's parsed,
 * then transform the references in the parsed HTML output.
 *
 * Usage:
 *   const { cleaned, definitions } = extractFootnoteDefinitions(rawMarkdown);
 *   const html = marked.parse(cleaned);
 *   const final = injectFootnoteTooltips(html, definitions);
 */

/** Extract `[^id]: text` definitions from raw markdown, return cleaned markdown + map */
export function extractFootnoteDefinitions(md: string): {
  cleaned: string;
  definitions: Map<string, string>;
} {
  const definitions = new Map<string, string>();

  // Match footnote definitions: `[^id]: content` potentially spanning multiple lines
  // A continuation line is indented (2+ spaces or tab) and not another definition
  const defPattern = /^\[\^([^\]]+)\]:\s*(.+)$/gm;
  const lines = md.split("\n");
  const cleanedLines: string[] = [];
  let currentId: string | null = null;
  let currentText = "";

  for (const line of lines) {
    const defMatch = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
    if (defMatch) {
      // Save previous definition if any
      if (currentId !== null) {
        definitions.set(currentId, currentText.trim());
      }
      currentId = defMatch[1];
      currentText = defMatch[2];
      continue;
    }

    // Check for continuation line (indented, and we're inside a definition)
    if (currentId !== null && /^(?:  |\t)/.test(line)) {
      currentText += " " + line.trim();
      continue;
    }

    // End of definition block
    if (currentId !== null) {
      definitions.set(currentId, currentText.trim());
      currentId = null;
      currentText = "";
    }

    cleanedLines.push(line);
  }

  // Save final definition if file ends with one
  if (currentId !== null) {
    definitions.set(currentId, currentText.trim());
  }

  return { cleaned: cleanedLines.join("\n"), definitions };
}

/** Convert markdown links in footnote text to HTML anchor tags */
function renderInlineLinks(text: string): string {
  return text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
}

/** Convert markdown emphasis in footnote text to HTML */
function renderInlineEmphasis(text: string): string {
  // Bold first (** or __), then italic (* or _)
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>");
}

/**
 * Replace `[^id]` references in HTML with tooltip markup.
 * The HTML was produced by marked.parse(), so references appear as literal
 * `[^id]` text (since marked doesn't handle them).
 */
export function injectFootnoteTooltips(
  html: string,
  definitions: Map<string, string>,
): string {
  if (definitions.size === 0) return html;

  let counter = 0;
  return html.replace(/\[\^([^\]]+)\]/g, (match, id) => {
    const text = definitions.get(id);
    if (!text) return match; // Unknown reference, leave as-is

    counter++;
    const uid = `fn-${id}-${counter}`;
    const rendered = renderInlineEmphasis(renderInlineLinks(text));

    return (
      `<span class="fn-wrap">` +
      `<button class="fn-marker" type="button" aria-expanded="false" aria-describedby="${uid}">*</button>` +
      `<span class="fn-tooltip" id="${uid}" role="tooltip" aria-hidden="true">${rendered}</span>` +
      `</span>`
    );
  });
}

/**
 * All-in-one: extract definitions from raw markdown, return cleaned markdown
 * and a function to post-process the rendered HTML.
 */
export function prepareFootnotes(md: string): {
  cleaned: string;
  postProcess: (html: string) => string;
} {
  const { cleaned, definitions } = extractFootnoteDefinitions(md);
  return {
    cleaned,
    postProcess: (html: string) => injectFootnoteTooltips(html, definitions),
  };
}
