# Concept Mapping System Redesign

> **Status**: Draft
> **Created**: 2026-04-05
> **Scope**: Replaces the current section-level mapping system with concept-level, original-anchored mappings

## Problem Statement

The current mapping system is too coarse (3 section-level mappings for MIT), couples tightly to markdown structure via `<div>` wrappers, breaks silently when content changes, and produces a clunky interaction that doesn't communicate the relationship between plain and original license text effectively.

## Design Principles

1. **The original is the anchor.** Original license text is frozen. Annotate it once per license; it never needs updating.
2. **Concept-level granularity.** Map individual phrases and concepts, not sections. "the rights to use" maps to "Use it".
3. **No markdown pollution.** License content files stay clean for CMS users. All interactive markup is injected at build/render time.
4. **Hierarchy is derived, not declared.** Parent/child relationships emerge from positional containment in the original text.
5. **Filler is educational.** Legal noise words are explicitly marked so users can see what adds nothing.

## Data Model

### Mapping File Structure

Location: `content/mappings/{SPDX}-mapping.json`

```jsonc
{
  "license_id": "MIT",
  "version": "1.0.0",
  "last_updated": "2026-04-05T00:00:00Z",
  "generation_method": "ai-generated",
  "human_reviewed": false,
  "concepts": [
    {
      "id": "grant-free",
      "original": "Permission is hereby granted, free of charge",
      "plain": ["We give you permission to", "for free"]
    },
    {
      "id": "grant-anyone",
      "original": "to any person obtaining a copy of this software and associated documentation files (the \"Software\")",
      "plain": ["Everyone else can do these things too"]
    },
    {
      "id": "grant-scope",
      "original": "to deal in the Software without restriction, including without limitation the rights to",
      "plain": ["We give you permission to"]
    },
    {
      "id": "right-use",
      "original": "use",
      "plain": ["Use it"]
    },
    {
      "id": "right-copy",
      "original": "copy",
      "plain": ["Copy it"]
    },
    {
      "id": "right-modify",
      "original": "modify",
      "plain": ["Change it"]
    },
    {
      "id": "right-merge",
      "original": "merge",
      "plain": ["Mix or put it together with other works"]
    },
    {
      "id": "right-publish",
      "original": "publish",
      "plain": ["Share it"]
    },
    {
      "id": "right-distribute",
      "original": "distribute",
      "plain": ["Share it"]
    },
    {
      "id": "right-sublicense",
      "original": "sublicense",
      "plain": ["Share it"]
    },
    {
      "id": "right-sell",
      "original": "sell copies of the Software",
      "plain": ["Sell it"]
    },
    {
      "id": "grant-downstream",
      "original": "and to permit persons to whom the Software is furnished to do so",
      "plain": ["Everyone else can do these things too, as long as they follow these rules"]
    },
    {
      "id": "conditions-intro",
      "original": "subject to the following conditions:",
      "plain": ["as long as they follow these rules", "if you follow these two rules"]
    },
    {
      "id": "condition-copyright",
      "original": "The above copyright notice",
      "plain": ["You must keep our copyright notice"]
    },
    {
      "id": "condition-license",
      "original": "and this permission notice shall be included in all copies or substantial portions of the Software",
      "plain": ["You must also keep this notice with all versions of the work"]
    },
    {
      "id": "warranty-asis",
      "original": "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED",
      "plain": ["We give you the work as it is, with no promises or guarantees", "You get the work exactly how it is"]
    },
    {
      "id": "warranty-scope",
      "original": "INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT",
      "plain": ["We don't promise you can use the work for any specific tasks, or that it won't break any rules"]
    },
    {
      "id": "liability",
      "original": "IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE",
      "plain": ["We are not responsible for any problems or damages that happen because of the work", "You use it at your own risk"]
    },
    {
      "id": "filler-hereby",
      "type": "filler",
      "original": "hereby"
    },
    {
      "id": "filler-without-limitation",
      "type": "filler",
      "original": "without restriction, including without limitation"
    },
    {
      "id": "filler-express-implied",
      "type": "filler",
      "original": "EXPRESS OR IMPLIED"
    },
    {
      "id": "filler-including-but-not",
      "type": "filler",
      "original": "INCLUDING BUT NOT LIMITED TO"
    },
    {
      "id": "filler-whether-in-action",
      "type": "filler",
      "original": "WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE"
    },
    {
      "id": "filler-arising-from",
      "type": "filler",
      "original": "ARISING FROM, OUT OF OR IN CONNECTION WITH"
    }
  ]
}
```

### Concept Types

Concepts have no explicit `type` field unless they are filler. The build step classifies:

- **Leaf**: Has `plain` references, positionally does not contain other concepts
- **Parent**: Has `plain` references, positionally contains other concepts
- **Filler**: Has `"type": "filler"`, no `plain` field. Displayed with a standard tooltip.

### Overlap Rules

A concept's `original` text may overlap with another concept's `original` text. This is expected and valid. Example: `"grant-scope"` contains the text range where `"right-use"`, `"right-copy"`, etc. appear. The build step detects this via positional containment.

A concept and a filler entry may also overlap. When filler text falls inside a concept's range, the filler styling takes precedence on those specific words (they are both "mapped to a concept" and "identified as filler"). This communicates: "this phrase is part of the permissions grant, but the phrase itself is meaningless padding."

## Build Pipeline

### Step 1: Position Resolution (Sequential Matching)

Process the original license text left-to-right. For each concept (ordered by first occurrence), find its `original` string in the remaining unscanned text. This is Aho-Corasick-style sequential matching:

```
scan_position = 0
for each concept in document order:
    find concept.original starting from scan_position
    record (start, end) character offsets
    advance scan_position past the match
```

This resolves ambiguity (e.g., "copy" appearing multiple times) by matching in document order.

**Edge case**: If a concept's `original` text genuinely cannot be found, log a build warning and exclude it from the UI.

### Step 2: Hierarchy Derivation

After all positions are resolved:

```
for each concept A:
    for each concept B (where B != A):
        if A.range fully contains B.range:
            B.parent = A
```

Result: a tree of concepts. Hovering a parent highlights the parent and all descendants.

### Step 3: Plain-Side Matching

For each concept's `plain` array, find each string in the rendered plain license text. Record character offsets.

- **Match found**: concept is fully active in the UI
- **Match not found**: build warning listing the concept ID and the missing plain text. Concept still shows on the original side (underlined) but has no teleprompter content.

### Step 4: Output

Generate a resolved mapping file at `public/mappings/{SPDX}-mapping.resolved.json` containing:

```jsonc
{
  "license_id": "MIT",
  "original_concepts": [
    {
      "id": "grant-free",
      "start": 0,
      "end": 45,
      "parent": null,
      "plain_matches": [
        { "text": "We give you permission to", "start": 0, "end": 25 },
        { "text": "for free", "start": 180, "end": 188 }
      ]
    }
    // ...
  ],
  "filler": [
    { "id": "filler-hereby", "start": 14, "end": 20 }
  ],
  "warnings": []
}
```

This resolved file is what the client fetches. It contains only positional data — no text content duplication.

## UI Design

### Compare Tab (Desktop, >= 1024px)

The comparison feature moves from an overlay toggle to a dedicated tab alongside the existing "Full Text" / "Summary" tabs.

```
┌─────────────────────────────────────────────────────────────┐
│  [Summary]  [Full Text]  [Compare]                          │
├─────────────────────────────────┬───────────────────────────┤
│  Original License Text          │  Plain Equivalent         │
│                                 │  (sticky)                 │
│  Mapped concepts: underlined    │                           │
│  in --cat-color                 │  "Hover underlined text   │
│                                 │   to see the plain        │
│  Filler: dimmed, reddish tint,  │   language version"       │
│  tooltip on hover               │                           │
│                                 │  ─────────────────────    │
│  Unmapped text: no styling      │  [updates on hover to     │
│                                 │   show plain equivalent]  │
│                                 │                           │
└─────────────────────────────────┴───────────────────────────┘
```

#### Default State

- Original text visible with persistent underlines on all mapped concepts
- Filler words dimmed with reddish tint
- Teleprompter box shows: "Hover underlined text to see the plain language version"

#### On Hover/Focus

- Hovered concept's underline thickens / accent brightens
- All non-relevant original text fades to near-invisible (~0.15 opacity)
- If concept is a parent, all child concept underlines also brighten
- Teleprompter box updates to show the corresponding plain text excerpt(s)
- After first 2-3 interactions, the instruction text stops showing (the user gets it)

#### On Filler Hover

- Tooltip appears: "Legal filler -- adds no meaning"
- No teleprompter update (filler has no plain equivalent)

#### Keyboard Navigation

- Tab through concepts in document order
- Focus triggers the same highlight + teleprompter behavior as hover
- Escape clears active highlight

### Compare Tab (Mobile, < 1024px)

- Single column: original text with underlines and filler styling
- Tap a concept: modal slides up showing the plain equivalent text
- Tap filler: tooltip appears with filler message
- Modal has a close button and closes on backdrop tap

### Transitions & Animation

- Fade transitions: 200-250ms ease for opacity changes
- Teleprompter content: crossfade (old content fades out, new fades in)
- No scroll-jacking — if plain text needs scrolling in the teleprompter, it scrolls naturally within the sticky box

## What Gets Removed

1. All `<div id="plain-*">` / `<div id="original-*">` wrappers from license markdown files
2. `ComparisonToggle.astro` component
3. The current `MappingViewer.ts` overlay/dim system (replaced entirely)
4. The hash-based validation in `validate-mappings.ts` (replaced by text matching)
5. The `has_mapping` / `mapping_version` frontmatter fields (replaced by presence of mapping file)
6. The current mapping JSON schema with clause-level `hash`/`content` structure
7. CSS classes: `mapping-source`, `mapping-target`, `mapping-cutout`, `mapping-dim`

## What Gets Added

1. `ConceptMapper.ts` — build-time position resolver and hierarchy deriver
2. `CompareTab.astro` — the new comparison tab component
3. `ConceptViewer.ts` — client-side interaction logic (hover, focus, teleprompter)
4. `compare-tab.css` — styles for underlines, filler, fade, teleprompter
5. Updated build step in `validate-mappings.ts` (or replacement) that produces `.resolved.json`
6. New mapping JSON files in the flat concept format

## Mapping Generation (LLM Workflow)

### Prompt Strategy

The LLM receives:
- The original license text
- The plain license text
- Instructions: "Identify every meaningful phrase in the original. For each, provide an ID and the corresponding text in the plain version. Mark phrases that are pure legal filler with `type: filler`. Do not worry about hierarchy — just list concepts flat in document order."

### Validation

After LLM generation:
1. Build step runs position resolution — any concept that can't be found is flagged
2. Plain-side matching runs — any broken plain reference is flagged
3. Human reviews the mapping, fixes flags, merges

### Maintenance

When plain license text changes:
1. Build detects broken plain-side matches
2. CI reports which concepts lost their plain anchor
3. Human (or LLM) updates the `plain` arrays in the mapping file
4. Original-side concepts never need updating

## Migration Path

1. Implement the new build pipeline and UI components
2. Create MIT mapping in the new format (example above serves as starting point)
3. Validate the new system end-to-end with MIT
4. Remove old mapping infrastructure (`<div>` wrappers, old components, old CSS)
5. Generate mappings for other licenses as desired

## Resolved Decisions

1. **Filler overlap with concepts**: Both visible. Filler words inside a concept range get the filler styling (dim + reddish tint) which overrides the concept underline on those specific words, but the concept's underline remains on the non-filler words. The filler is visually distinct while the concept boundary is still apparent.
2. **Teleprompter box height**: Fixed height with internal scroll. Keeps layout stable regardless of how much plain text a concept maps to. `max-height: calc(100vh - 12rem)` or similar, with `overflow-y: auto`.
3. **Coverage stats**: Purely visual. No metrics displayed — the underlines and unstyled gaps speak for themselves.
4. **Print styling**: Deferred to a later iteration. Compare tab hidden in print for now (consistent with current behavior).
