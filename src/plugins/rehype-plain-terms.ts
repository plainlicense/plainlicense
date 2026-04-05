/**
 * rehype-plain-terms — wraps plain-language terms in <abbr> tags site-wide.
 *
 * Walks the HTML AST produced by Astro/Starlight and annotates every
 * occurrence of a global term with an <abbr> tooltip. Multi-word terms
 * ("the work", "source materials") are matched first to avoid partial hits.
 *
 * Skipped contexts:
 *   - <code>, <pre>  (code blocks)
 *   - <abbr>         (already annotated)
 *   - [data-no-terms] (manual opt-out)
 *   - Original License Text section (after the <hr> + heading boundary)
 */

import type { Element, Root, Text } from "hast";
import type { PlainTerm } from "../data/plainTerms.js";
import { PLAIN_TERMS } from "../data/plainTerms.js";

/** Element tag names whose descendants should never be annotated. */
const SKIP_TAGS = new Set(["code", "pre", "abbr", "script", "style"]);

/** Build a single regex that matches any global term, longest first. */
function buildTermPattern(terms: readonly PlainTerm[]): RegExp {
  const escaped = terms.map((t) =>
    t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  // Terms are already sorted longest-first in PLAIN_TERMS
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
}

const TERM_REGEX = buildTermPattern(PLAIN_TERMS);

/** Lookup map: lowercased term → PlainTerm */
const TERM_MAP = new Map(PLAIN_TERMS.map((t) => [t.term.toLowerCase(), t]));

function isElement(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as { type?: string }).type === "element"
  );
}

function isText(node: unknown): node is Text {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as { type?: string }).type === "text"
  );
}

/** Check if an element should be skipped. */
function shouldSkip(node: Element): boolean {
  if (SKIP_TAGS.has(node.tagName)) return true;
  const props = node.properties ?? {};
  if (props.dataNoTerms != null) return true;
  return false;
}

/**
 * Process a text node: split on term matches and return a mixed array
 * of text nodes and <abbr> elements.
 */
function annotateText(textNode: Text): (Text | Element)[] {
  const text = textNode.value;
  const result: (Text | Element)[] = [];
  let lastIndex = 0;

  // Reset the regex for each text node
  TERM_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null = TERM_REGEX.exec(text);
  while (match !== null) {
    const matchedText = match[0];
    const termDef = TERM_MAP.get(matchedText.toLowerCase());
    if (!termDef) {
      match = TERM_REGEX.exec(text);
      continue;
    }

    // Add any text before this match
    if (match.index > lastIndex) {
      result.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    // Create <abbr> element
    result.push({
      type: "element",
      tagName: "abbr",
      properties: {
        title: termDef.hover,
        tabIndex: 0,
        className: ["plain-term"],
      },
      children: [{ type: "text", value: matchedText }],
    });

    lastIndex = match.index + matchedText.length;
    match = TERM_REGEX.exec(text);
  }

  // If no matches at all, return unchanged
  if (lastIndex === 0) return [textNode];

  // Add trailing text
  if (lastIndex < text.length) {
    result.push({ type: "text", value: text.slice(lastIndex) });
  }

  return result;
}

/** Recursively walk the tree, annotating text nodes in eligible elements. */
function walk(node: Element, inSkipZone: boolean): void {
  if (shouldSkip(node)) return;

  // Detect the Original License Text boundary: an <h1> with that text
  // means everything after it in this parent should be skipped.
  let skipFromIndex = -1;
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (
        isElement(child) &&
        /^h[1-6]$/.test(child.tagName) &&
        child.children.length === 1 &&
        isText(child.children[0]) &&
        child.children[0].value.trim() === "Original License Text"
      ) {
        skipFromIndex = i;
        break;
      }
    }
  }

  const newChildren: typeof node.children = [];
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const inOriginal = inSkipZone || (skipFromIndex >= 0 && i >= skipFromIndex);

    if (isText(child) && !inOriginal) {
      newChildren.push(...annotateText(child));
    } else if (isElement(child)) {
      if (!inOriginal) {
        walk(child, false);
      }
      newChildren.push(child);
    } else {
      newChildren.push(child);
    }
  }
  node.children = newChildren;
}

export default function rehypePlainTerms() {
  return (tree: Root) => {
    for (const child of tree.children) {
      if (isElement(child)) {
        walk(child, false);
      }
    }
  };
}
