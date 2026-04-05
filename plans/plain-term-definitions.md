# Plain Term Definitions System

> **Status**: Draft
> **Created**: 2026-04-05
> **Scope**: Site-wide term annotation with format-aware rendering (web tooltips, export footnotes/glossaries)
> **Related**: `concept-mapping-redesign.md` (complementary — concept mapping covers original↔plain clause relationships; this covers plain term↔legal meaning relationships)

## Problem Statement

Plain License replaces legal jargon with everyday words ("share" for "distribute", "change" for "modify", etc.). But these plain terms gloss over legal concepts that readers may still need to understand. "Share" *includes* distributing, redistributing, and making available — and readers should be able to discover that without leaving the plain text.

Currently, some licenses (MPL, Elastic) include hand-written definition sections. Others (MIT, Unlicense) have none. The vocabulary is inconsistent across licenses and site pages, and there is no systematic way to surface legal context behind plain terms.

## Design Principles

1. **Global vocabulary, not per-license.** The core plain terms ("share", "change", "give", "use", "the work", "source materials", "authors", "rules", "restrictions", "promises") have the same meaning everywhere. Define once, apply everywhere.
2. **Per-license extensions only for unique terms.** "Contributor" (MPL), "Your Company" (Elastic), "managed service" (Elastic) get per-license definitions. These are the only terms that warrant a visible definition section on the license page.
3. **Format-aware rendering.** The same term data produces different output per format: `<abbr>` on web, footnotes in GFM/PDF (first instance only), definition list in plaintext.
4. **No markdown pollution.** License content files stay clean. Term annotation is injected at build/render time — authors never write `<abbr>` tags manually.
5. **Every instance on web, first instance in exports.** The dotted underline is subtle enough to decorate every occurrence on the web. Footnotes in exports are limited to first use to avoid clutter.

## Data Model

### Global Terms

Location: `src/data/plainTerms.ts`

```typescript
export interface PlainTerm {
  /** The plain-language term as written in licenses */
  term: string;
  /** Regex pattern for matching in text — anchored to word boundaries */
  pattern: RegExp;
  /** Short text for <abbr title="..."> and tooltip display */
  hover: string;
  /** Longer text for footnotes and glossary entries */
  footnote: string;
  /** The legal terms this replaces (informational, for style guide reference) */
  replaces: string[];
}

export const PLAIN_TERMS: PlainTerm[] = [
  {
    term: "share",
    pattern: /\bshare\b/gi,
    hover: "includes distributing and making available to others",
    footnote:
      '"Share" means distribute, redistribute, or otherwise make the work available to others, as described in the original license.',
    replaces: ["distribute", "redistribute", "convey"],
  },
  {
    term: "change",
    pattern: /\bchange\b/gi,
    hover: "includes modifying, altering, or creating derivative works",
    footnote:
      '"Change" means modify, alter, or create derivative works, as described in the original license.',
    replaces: ["modify", "alter", "amend"],
  },
  {
    term: "give",
    pattern: /\bgive\b/gi,
    hover: "includes granting rights or permissions",
    footnote:
      '"Give" means grant or convey rights, as described in the original license.',
    replaces: ["grant", "convey"],
  },
  {
    term: "use",
    pattern: /\buse\b/gi,
    hover: "includes running, copying, and exercising rights under this license",
    footnote:
      '"Use" means run, copy, and exercise the rights given to you under this license.',
    replaces: ["utilize", "exploit", "exercise"],
  },
  {
    term: "the work",
    pattern: /\bthe work\b/gi,
    hover: "the creative work covered by this license",
    footnote:
      '"The work" means the creative work (software, documents, art, music, or other materials) covered by this license.',
    replaces: ["licensed work", "software", "the Software", "covered work"],
  },
  {
    term: "source materials",
    pattern: /\bsource materials\b/gi,
    hover: "the editable, human-readable form of the work",
    footnote:
      '"Source materials" means the editable, human-readable form of the work — what others call "source code" or "source form."',
    replaces: ["source code", "source form"],
  },
  {
    term: "authors",
    pattern: /\bauthors\b/gi,
    hover: "the copyright holders who license the work to you",
    footnote:
      '"Authors" means the copyright holders who created or own the work and license it to you.',
    replaces: ["licensor", "copyright holders", "provider", "owner"],
  },
  {
    term: "rules",
    pattern: /\brules\b/gi,
    hover: "the obligations you must follow under this license",
    footnote:
      '"Rules" means the conditions, terms, and obligations you must follow under this license.',
    replaces: ["conditions", "limitations", "terms"],
  },
  {
    term: "restrictions",
    pattern: /\brestrictions\b/gi,
    hover: "the things this license does not allow",
    footnote:
      '"Restrictions" means the activities or uses this license does not permit.',
    replaces: [],
  },
  {
    term: "promises",
    pattern: /\bpromises\b/gi,
    hover: "legal warranties and guarantees",
    footnote:
      '"Promises" refers to legal warranties and guarantees about the work.',
    replaces: ["warranties", "guarantees"],
  },
];
```

### Per-License Extended Terms

Location: license frontmatter

```yaml
# content/licenses/copyleft/mpl-2.0.md
defined_terms:
  - term: contributor
    hover: "anyone who adds to or changes the work under this license"
    footnote: >-
      A "contributor" is any person or organization that creates the work
      or adds changes to it under this license.
    show_definition: true

  - term: larger work
    hover: "a project that includes this work alongside other code"
    footnote: >-
      A "larger work" is a project that combines this work with other
      code not covered by this license.
    show_definition: true
```

```yaml
# content/licenses/source-available/elastic-2.0.md
defined_terms:
  - term: managed service
    hover: "a hosted service where others use the work's features directly"
    footnote: >-
      A "managed service" means offering the work to others as a hosted
      service, where they use its features without installing it themselves.
    show_definition: true

  - term: your company
    hover: "you and any organization you control or that controls you"
    footnote: >-
      "Your company" means you plus any legal entity that controls you,
      that you control, or that shares common control with you.
    show_definition: true
```

Terms with `show_definition: true` get both the hover treatment AND a visible "Definitions" section rendered on the license page. This replaces the current hand-written definition sections in MPL and Elastic.

## Rendering

### Web: `<abbr>` with dotted underline

A **rehype plugin** runs after Astro renders markdown to HTML. It walks text nodes in prose elements (paragraphs, list items, table cells) and wraps matched terms in `<abbr>` tags.

```html
<!-- Input (rendered HTML from markdown) -->
<p>You can share the work with anyone.</p>

<!-- Output (after rehype plugin) -->
<p>You can <abbr title="includes distributing and making available to others"
  tabindex="0" class="plain-term">share</abbr>
  <abbr title="the creative work covered by this license"
  tabindex="0" class="plain-term">the work</abbr> with anyone.</p>
```

**Skipped contexts** (no wrapping applied):
- Code blocks (`<code>`, `<pre>`)
- Existing `<abbr>` elements
- Elements with `data-no-terms` attribute (manual opt-out)
- The "Original License Text" section (detected by heading)
- Frontmatter (not in the HTML AST anyway)

**Matching rules:**
- Multi-word terms ("the work", "source materials") are matched first to avoid partial matches
- All matches are case-insensitive
- Every instance is wrapped (no first-only limiting on web)

**CSS:**

```css
abbr.plain-term {
  text-decoration: underline dotted var(--sl-color-gray-4);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
  cursor: help;
}

abbr.plain-term:hover,
abbr.plain-term:focus-visible {
  text-decoration-color: var(--sl-color-accent);
  outline: none;
}
```

**Accessibility:**
- `tabindex="0"` makes terms keyboard-focusable
- `title` provides the hover text (also read by screen readers)
- Dotted underline is a universally understood "more info available" affordance

### License Definition Sections

For licenses with `defined_terms` where `show_definition: true`, a `TermDefinitions.astro` component renders a visible section:

```html
<section class="term-definitions">
  <h2>Terms We Use</h2>
  <dl>
    <dt><abbr title="anyone who adds to or changes the work under this license"
      tabindex="0" class="plain-term">contributor</abbr></dt>
    <dd>Any person or organization that creates the work or adds changes
      to it under this license.</dd>
  </dl>
</section>
```

This section appears in the "Less commonly needed" fold area of the license layout, replacing hand-written definition sections. Only rendered when the license has extended terms.

### GFM Markdown Export

Transform in `src/build/generate-exports.ts`:

1. Scan the plain section for term matches
2. At the **first** occurrence of each term, insert a GFM footnote marker: `share[^share]`
3. Append footnote definitions at the end of the document
4. For licenses with extended terms, also append those as footnotes

```markdown
You can share[^share] the work[^the-work] with anyone.

[^share]: "Share" means distribute, redistribute, or otherwise make
  the work available to others, as described in the original license.
[^the-work]: "The work" means the creative work (software, documents,
  art, music, or other materials) covered by this license.
```

### PDF Export

Same footnote strategy as GFM. The PDF generator already processes markdown; footnotes render naturally as bottom-of-page notes.

### Plaintext Export

Footnote markers don't work in plaintext. Instead, append a definition section:

```
---
Terms We Use

  "share" — distribute, redistribute, or otherwise make the work
  available to others, as described in the original license.

  "the work" — the creative work (software, documents, art, music,
  or other materials) covered by this license.
---
```

### Embedded HTML Export

Same as web rendering — `<abbr>` tags with inline styles (since the embed is self-contained with inlined CSS).

## Implementation Plan

### Phase 1: Data Layer
1. Create `src/data/plainTerms.ts` with global term definitions
2. Add `defined_terms` to the content schema in `src/content/config.ts`
3. Add `defined_terms` frontmatter to MPL and Elastic licenses

### Phase 2: Web Rendering
4. Create rehype plugin `src/plugins/rehype-plain-terms.ts`
5. Register plugin in `astro.config.mts`
6. Add `.plain-term` CSS to the global stylesheet
7. Create `TermDefinitions.astro` component for license-specific extended terms
8. Integrate `TermDefinitions` into `LicenseLayout.astro`
9. Remove hand-written definition sections from MPL and Elastic plain text (replaced by auto-generated)

### Phase 3: Export Rendering
10. Add term annotation transform to `src/build/generate-exports.ts`
11. GFM format: first-instance footnotes + footnote definitions
12. PDF format: same footnote strategy (processed by PDF generator)
13. Plaintext format: appended definition section
14. Embedded HTML format: `<abbr>` tags with inlined styles

### Phase 4: Cleanup & Validation
15. Build-time validation: warn if a global term appears in plain text but isn't matched by the plugin (regex gap)
16. Build-time validation: warn if a `defined_terms` entry has `show_definition: true` but the term never appears in the license text
17. Update shame words documentation to reference the term system
18. Update voice guide to reference the term system as the mechanism behind the preferred words table

## Interaction with Concept Mapping

The concept mapping system (`concept-mapping-redesign.md`) and the term definitions system are complementary:

- **Concept mapping** answers: "Which part of the original license does this plain sentence come from?"
- **Term definitions** answer: "What does this plain word mean in legal terms?"

They operate on different scopes:
- Concept mapping is **per-license** and only applies to the Compare tab
- Term definitions are **global** and apply site-wide to all content

They share no data structures, but both inject HTML annotations into rendered content. The rehype plugin for terms runs on all pages; the concept mapping system only runs on the Compare tab's original text panel.

A term inside a concept-mapped passage gets both treatments: the `<abbr>` dotted underline for the term, and the concept mapping underline for the clause. CSS should ensure these are visually distinguishable (term underline is dotted + gray; concept mapping underline is solid + accent color).

## Open Questions

1. **Term collision with concept mapping visuals** — Need to confirm the dual-underline styling works in the Compare tab. May need to suppress term annotations inside the Compare tab's original text panel (those words are already being explained by the concept mapping system).
2. **Performance** — The rehype plugin runs on every page. With ~10 global terms and simple regex matching, this should be negligible, but worth measuring on a full build.
3. **Future: user-controlled depth** — Could add a toggle: "Show term explanations" on/off, stored in localStorage. Not in scope for v1 but worth keeping the CSS class-based approach to make this easy later.
