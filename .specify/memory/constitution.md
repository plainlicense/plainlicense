<!--
Sync Impact Report:
Version: 1.0.0 → 1.0.1 (PATCH - correct stale MkDocs/Python references)
Modified Principles: None (content principles I–V unchanged)
Added Sections: None
Removed Sections: None
Changed in Documentation Standards:
  - Shame Words Detection: removed mkdocs.yml reference; shame_words_count is now
    a frontmatter field in each license .md file; canonical shame words list
    location is TODO (not yet confirmed in Astro codebase)
  - License Language Standards: replaced "Lerna" with "Bun workspaces +
    semantic-release-monorepo"; replaced "NPM packages" with "Bun workspace packages"
Changed in Build Pipeline Validation:
  - Removed Python hooks section (overrides/hooks/, license_factory.py,
    shame_counter.py, socialmedia.py) — these no longer exist
  - Replaced with actual Astro/TypeScript build pipeline
  - Corrected entry point references
Changed in Runtime Guidance:
  - Noted that CLAUDE.md is a symlink to AGENTS.md
Templates Status:
  ✅ plan-template.md - Constitution Check placeholder compatible; no updates needed
  ✅ spec-template.md - No constitution-specific references; no updates needed
  ✅ tasks-template.md - Generic structure; no updates needed
  ✅ agent-file-template.md - No stale references found; no updates needed
  ⚠️ No command files exist in .specify/templates/commands/
Follow-up TODOs:
  - TODO(SHAME_WORDS_LIST): Confirm canonical location of shame words list in the
    new Astro codebase (was mkdocs.yml extra.shame_words; not yet confirmed)
-->

# Plain License Constitution

## Core Principles

### I. Plain Language First

**Every piece of content MUST prioritize clarity and accessibility over legal convention.**

- Target 8th-grade reading level using tools like Hemingway Editor
- Use simple, everyday words (avoid "relinquish" → use "give up")
- Break long sentences into shorter ones (active voice preferred)
- Address readers directly with "you"
- Replace complex legal terms from the shame words list with plain alternatives

**Rationale**: Legal documents have historically excluded non-lawyers from understanding their
rights. Plain License exists to democratize access to legal understanding, making licenses a
tool for empowerment rather than confusion.

### II. Voice Consistency

**All content MUST maintain the Plain License voice across all materials.**

Voice characteristics:
- **Rebellious yet Professional**: Challenge legal complexity while staying credible
- **Empowering**: Give people control through understanding
- **Inclusive**: Write for everyone, avoid jargon and idioms
- **Friendly**: Conversational, like talking to a friend
- **Transparent**: Open about processes and decisions

Tone requirements:
- Approachable and supportive
- Confident without being condescending
- Empathetic to the difficulty of legal language
- Consistent terminology throughout all documents

**Rationale**: A consistent voice builds trust and makes the project's mission clear.
Inconsistency undermines credibility and accessibility.

### III. Universal Applicability

**Licenses MUST apply to all creative works, not just software.**

- Use "source materials" instead of "source code" universally
- Include examples for different creative mediums (software, documents, art, music)
- Frame licenses as applying to "creative works" generally
- Avoid software-specific jargon that limits broader understanding

**Rationale**: Creativity spans all mediums. Limiting licenses to software-specific language
excludes artists, writers, musicians, and other creators from understanding their rights.

### IV. Cross-License Consistency

**Similar concepts MUST use identical language patterns across all licenses.**

Standardized terminology:
- "you" (not "licensee, recipient")
- "we, the authors" (not "licensor, provider, owner")
- "the work" (not "licensed work, software, creation")
- "source materials" (not "source code, source form")
- Distinguish "contributors" vs "authors" when both exist

Standardized patterns:
- Headers: Use empowering "You are Free to..." format
- Permissions: "use, copy, change, distribute, [sell]"
- Warranty language: "We offer the work 'as is' with no warranties.
  We are not responsible for any damages or issues"

**Rationale**: Consistency across licenses enables users to build mental models and transfer
understanding between different license types, reducing cognitive load.

### V. Documentation Quality

**All documentation MUST follow structured standards for readability and comprehension.**

Structure requirements:
- Use headings and subheadings for organization
- Include bullet points for key information
- Add white space to break up text
- Use tables to summarize and differentiate information
- Include visual elements (bold, italics) for emphasis
- Add callout boxes for important notes
- Focus on ideas over structure — don't follow the original format

Quality standards:
- Explain technical terms if they must be used
- Group related information together
- Avoid regional expressions and idioms
- Test with readability tools
- Maintain shame words detection system

**Rationale**: Structure and formatting are as important as word choice for accessibility.
Poor formatting creates barriers even when individual words are simple.

## Documentation Standards

### Shame Words Detection

The project maintains a "shame words" list of complex legal terms that MUST be replaced with
plain language alternatives. Each license file tracks its shame words count via the
`shame_words_count` frontmatter field (defined in `src/content/config.ts`).

TODO(SHAME_WORDS_LIST): Confirm the canonical location of the shame words definition list
in the current codebase.

Process:
1. Automated counting tracked in license frontmatter (`shame_words_count`)
2. Manual review for context-appropriate replacements
3. Continuous updating of the shame words list
4. Documentation of alternatives for common terms

**Enforcement**: Pull requests adding new license content MUST include an accurate
`shame_words_count` value and minimize it. Exceptions require written justification.

### License Language Standards

Each license package MUST:
- Provide a plain language version as the primary content in `content/licenses/{category}/{spdx-id}.md`
- Include a complete YAML frontmatter block conforming to the schema in `src/content/config.ts`
- Include a changelog via the package's semantic-release configuration
- Follow independent versioning through Bun workspaces + semantic-release-monorepo
- Maintain a corresponding package in `packages/{spdx-id}/` that is independently releasable

Source-available licenses SHOULD:
- Be presented as "Fair Code" licenses following the faircode.io philosophy
- Emphasize the balance between openness and sustainability
- Link to https://faircode.io/ for community alignment

## Content Quality Assurance

### Review Process

All content changes MUST pass:
1. **Readability Check**: Verify 8th-grade reading level
2. **Voice Consistency**: Ensure adherence to Plain License voice
3. **Terminology Audit**: Check for consistent preferred terms across all licenses
4. **Cross-License Consistency**: Verify similar concepts use identical language patterns
5. **Universal Applicability**: Ensure language works for all creative works
6. **Structure Review**: Validate proper headings, bullets, tables
7. **Shame Words Scan**: Replace complex legal terms with plain alternatives
8. **Visual Enhancement**: Add formatting, tables, or callouts where helpful

### Build Pipeline Validation

The site is built with Astro 5 + Starlight, deployed to Cloudflare Pages. The full build
runs: `bunx astro build`, followed by three post-build TypeScript scripts:

- `src/build/generate-exports.ts` — produces downloadable license files (MD, PDF, TXT)
  into `public/exports/{spdx-id}/v{version}/`
- `src/build/generate-og-images.ts` — generates Open Graph social share images
- `src/build/generate-versions.ts` — writes version metadata consumed by the site

URL routing for licenses is auto-generated at build time from `content/licenses/` directory
structure (via `getLicenseRedirects()` in `astro.config.mts`). No manual routing configuration
is required when adding a new license file.

**Enforcement**: Build failures MUST be resolved before merge. Type errors reported by
`bunx astro check` or Biome linting failures block merging.

## Governance

### Amendment Process

1. **Proposal**: Document proposed changes with rationale
2. **Discussion**: Review impact on existing content and processes
3. **Approval**: Require maintainer review and approval
4. **Migration**: Update all affected templates and documentation
5. **Version**: Increment constitution version per semantic versioning

### Versioning Policy

Constitution versions follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Backward incompatible governance/principle removals or redefinitions
- **MINOR**: New principle/section added or materially expanded guidance
- **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements or corrections

### Compliance Review

All pull requests and reviews MUST:
- Verify compliance with constitution principles
- Justify any deviations from standards
- Update affected documentation and templates
- Maintain cross-artifact consistency

The constitution supersedes all other practices. When conflicts arise between this
constitution and other documentation, the constitution takes precedence.

### Runtime Guidance

Development guidance for AI assistants is maintained in `AGENTS.md`. `CLAUDE.md` is a
symlink to `AGENTS.md`, created automatically by `mise run setup`. Always edit `AGENTS.md`
directly. This file provides:
- Project overview and architecture
- Development commands and workflows
- Voice guidelines and writing standards
- Terminology requirements
- Review process details

**Version**: 1.0.1 | **Ratified**: 2026-01-30 | **Last Amended**: 2026-03-08
