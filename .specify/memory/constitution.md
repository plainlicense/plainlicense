<!--
Sync Impact Report:
Version: 0.0.0 → 1.0.0 (Initial ratification)
Modified Principles: N/A (initial creation)
Added Sections:
  - Core Principles (5 principles established)
  - Documentation Standards
  - Content Quality Assurance
  - Governance
Templates Status:
  ✅ plan-template.md - Constitution Check section compatible
  ✅ spec-template.md - Requirements alignment verified
  ✅ tasks-template.md - Task categorization aligns with principles
  ⚠️ No command files exist yet in .specify/templates/commands/
Follow-up TODOs: None - all placeholders filled
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

**Rationale**: Legal documents have historically excluded non-lawyers from understanding their rights. Plain License exists to democratize access to legal understanding, making licenses a tool for empowerment rather than confusion.

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

**Rationale**: A consistent voice builds trust and makes the project's mission clear. Inconsistency undermines credibility and accessibility.

### III. Universal Applicability

**Licenses MUST apply to all creative works, not just software.**

- Use "source materials" instead of "source code" universally
- Include examples for different creative mediums (software, documents, art, music)
- Frame licenses as applying to "creative works" generally
- Avoid software-specific jargon that limits broader understanding

**Rationale**: Creativity spans all mediums. Limiting licenses to software-specific language excludes artists, writers, musicians, and other creators from understanding their rights.

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
- Warranty language: "We offer the work 'as is' with no warranties. We are not responsible for any damages or issues"

**Rationale**: Consistency across licenses enables users to build mental models and transfer understanding between different license types, reducing cognitive load.

### V. Documentation Quality

**All documentation MUST follow structured standards for readability and comprehension.**

Structure requirements:
- Use headings and subheadings for organization
- Include bullet points for key information
- Add white space to break up text
- Use tables to summarize and differentiate information
- Include visual elements (bold, italics) for emphasis
- Add callout boxes for important notes
- Focus on ideas over structure - don't follow original format

Quality standards:
- Explain technical terms if they must be used
- Group related information together
- Avoid regional expressions and idioms
- Test with readability tools
- Maintain shame words detection system

**Rationale**: Structure and formatting are as important as word choice for accessibility. Poor formatting creates barriers even when individual words are simple.

## Documentation Standards

### Shame Words Detection

The project maintains a "shame words" list in `mkdocs.yml` under `extra.shame_words`. These are complex legal terms that MUST be replaced with plain language alternatives.

Process:
1. Automated detection during build (`shame_counter.py`)
2. Manual review for context-appropriate replacements
3. Continuous updating of the shame words list
4. Documentation of alternatives for common terms

**Enforcement**: Pull requests adding new content MUST pass shame word checks or provide justification for exceptions.

### License Language Standards

Each license package MUST:
- Provide both plain language and original text versions
- Include metadata and changelog
- Follow independent versioning via Lerna
- Maintain frontmatter with license metadata
- Be independently usable as NPM packages

Source-available licenses SHOULD:
- Be presented as "Fair Code" licenses following faircode.io philosophy
- Emphasize balance between openness and sustainability
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

The build system (`src/build/index.ts`) enforces:
- Asset optimization (images, videos, fonts)
- TypeScript compilation with esbuild
- CSS processing and bundling
- Hash-based cache busting
- Multi-format video generation

Python hooks (`overrides/hooks/`) process:
- `license_factory.py`: Assembles licenses from frontmatter and templates
- `shame_counter.py`: Counts complex legal terms
- `socialmedia.py`: Generates social media cards

**Enforcement**: Build failures for quality violations MUST be resolved before merge.

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
- **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements

### Compliance Review

All pull requests and reviews MUST:
- Verify compliance with constitution principles
- Justify any deviations from standards
- Update affected documentation and templates
- Maintain cross-artifact consistency

The constitution supersedes all other practices. When conflicts arise between this constitution and other documentation, the constitution takes precedence.

### Runtime Guidance

Development guidance for AI assistants is maintained in `CLAUDE.md`. This file provides:
- Project overview and architecture
- Development commands and workflows
- Voice guidelines and writing standards
- Terminology requirements
- Review process details

**Version**: 1.0.0 | **Ratified**: 2026-01-30 | **Last Amended**: 2026-01-30
