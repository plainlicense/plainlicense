/**
 * Global plain-language term definitions.
 *
 * These terms are the project's preferred vocabulary. Each maps a plain word
 * to the legal concept(s) it replaces. The data drives:
 *   - Web: <abbr> tooltips via rehype-plain-terms plugin (every instance)
 *   - GFM/PDF exports: footnotes on first instance
 *   - Plaintext exports: appended definition section
 *   - Embedded HTML exports: <abbr> with inlined styles
 */

export interface PlainTerm {
  /** The plain-language term as written in content */
  term: string;
  /** Short text for the <abbr title="..."> tooltip */
  hover: string;
  /** Longer text for footnotes and glossary entries in exports */
  footnote: string;
  /** The legal terms this replaces (informational) */
  replaces: readonly string[];
}

/**
 * Per-license extended term definition (from frontmatter `defined_terms`).
 * Terms with `show_definition: true` render a visible "Terms We Use"
 * section on the license page.
 */
export interface LicenseTermOverride {
  term: string;
  hover: string;
  footnote: string;
  show_definition: boolean;
}

/**
 * Global terms applied site-wide. Ordered longest-first so multi-word
 * terms ("the work", "source materials") match before single words.
 */
export const PLAIN_TERMS: readonly PlainTerm[] = [
  {
    term: "source materials",
    hover: "the editable, human-readable form of the work",
    footnote:
      '"Source materials" are the editable, human-readable form of the work — what others call "source code" or "source form."',
    replaces: ["source code", "source form"],
  },
  {
    term: "the work",
    hover: "the creative work covered by this license",
    footnote:
      '"The work" is the creative work (software, documents, art, music, or other materials) covered by this license.',
    replaces: ["licensed work", "the Software", "covered work"],
  },
  {
    term: "authors",
    hover: "the copyright holders who license the work to you",
    footnote:
      '"Authors" are the copyright holders who created or own the work and license it to you.',
    replaces: [
      "licensor",
      "copyright holder",
      "provider",
      "creator",
      "owner",
      "licensors",
      "copyright holders",
      "providers",
      "creators",
      "owners",
    ],
  },
  {
    term: "restrictions",
    hover: "the things this license does not allow",
    footnote:
      '"Restrictions" are the activities or uses this license does not permit.',
    replaces: [],
  },
  {
    term: "promises",
    hover: "legal warranties and guarantees",
    footnote: '"Promises" are legal warranties and guarantees about the work.',
    replaces: ["warranties", "guarantees", "representations"],
  },
  {
    term: "rules",
    hover: "the obligations you must follow under this license",
    footnote:
      '"Rules" are the conditions, terms, and obligations you must follow under this license.',
    replaces: ["conditions", "limitations", "obligations"],
  },
  {
    term: "share",
    hover: "includes distributing and making available to others",
    footnote:
      '"Share" includes distributing the work to others, making it publicly available, or offering it in a way that allows others to access or obtain it.',
    replaces: ["distribute", "redistribute", "convey", "offer", "publish"],
  },
  {
    term: "change",
    hover: "includes modifying, altering, or creating derivative works",
    footnote:
      '"Change" includes modifying, altering, or creating derivative works, as described in the original license.',
    replaces: [
      "modify",
      "alter",
      "amend",
      "adapt",
      "create derivative",
      "transform",
    ],
  },
  {
    term: "give",
    hover: "includes granting rights or permissions",
    footnote:
      '"Give" includes granting rights or permissions, such as allowing others to use, modify, or distribute the work.',
    replaces: ["grant", "convey"],
  },
  {
    term: "use",
    hover:
      "includes running, copying, and exercising rights under this license",
    footnote:
      '"Use" includes running, copying, and exercising the rights given to you under this license.',
    replaces: ["utilize", "exploit", "exercise"],
  },
  {
    term: "damages",
    hover:
      "harm or loss — financial, data, or any other negative impact — caused by or related to the work",
    footnote:
      '"Damages" are any harm or loss a person or organization suffers as a result of using the work. They include financial loss, data loss, legal consequences, lost profits, physical or emotional harm, or business interruption.',
    replaces: ["liability", "losses"],
  },
];

/**
 * Build a regex matching all terms, longest first.
 * Uses word boundaries so "the work" doesn't match inside "the working".
 */
function buildTermRegex(): RegExp {
  const escaped = PLAIN_TERMS.map((t) =>
    t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
}

const TERM_REGEX = buildTermRegex();
const TERM_MAP = new Map(PLAIN_TERMS.map((t) => [t.term.toLowerCase(), t]));

/**
 * Annotate an HTML string by wrapping plain terms in <abbr> tags.
 * Skips content inside HTML tags and <code>/<pre> blocks.
 * Used for content rendered by `marked` outside Astro's rehype pipeline.
 */
export function annotateHtmlString(html: string): string {
  // Split into segments: HTML tags vs text content.
  // This regex matches any HTML tag (opening, closing, self-closing).
  const TAG_RE = /<[^>]+>/g;
  const parts: string[] = [];
  let lastIdx = 0;
  let inSkip = 0; // depth counter for <code>/<pre>

  let tagMatch: RegExpExecArray | null = TAG_RE.exec(html);
  while (tagMatch !== null) {
    // Process text before this tag
    if (tagMatch.index > lastIdx && inSkip === 0) {
      parts.push(replaceTermsInText(html.slice(lastIdx, tagMatch.index)));
    } else {
      parts.push(html.slice(lastIdx, tagMatch.index));
    }

    const tag = tagMatch[0];
    parts.push(tag);

    // Track skip zones
    if (/<(code|pre|abbr)[\s>]/i.test(tag)) inSkip++;
    if (/<\/(code|pre|abbr)>/i.test(tag)) inSkip = Math.max(0, inSkip - 1);

    lastIdx = tagMatch.index + tag.length;
    tagMatch = TAG_RE.exec(html);
  }

  // Process trailing text
  if (lastIdx < html.length) {
    if (inSkip === 0) {
      parts.push(replaceTermsInText(html.slice(lastIdx)));
    } else {
      parts.push(html.slice(lastIdx));
    }
  }

  return parts.join("");
}

function replaceTermsInText(text: string): string {
  TERM_REGEX.lastIndex = 0;
  return text.replace(TERM_REGEX, (matched) => {
    const def = TERM_MAP.get(matched.toLowerCase());
    if (!def) return matched;
    return `<abbr title="${escapeAttr(def.hover)}" tabindex="0" class="plain-term">${matched}</abbr>`;
  });
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
