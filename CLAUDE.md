# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plain License is a documentation website that provides plain-language versions of popular software licenses. Built as a static site using MkDocs Material with extensive customization, the project aims to make legal licenses accessible to non-lawyers.

## Development Commands

### Build and Development

- `bun run build` - Full build pipeline (assets, JavaScript, CSS, site generation)
- `mkdocs serve` - Start development server with hot reload
- `mkdocs build` - Build static site to `docs/` directory

### Code Quality

- `bun run check` - Run all linting and type checking
- `bun run fix` - Auto-fix all style issues
- `bun run check:build` - TypeScript compilation check
- `bun run check:style:ts` - ESLint for TypeScript
- `bun run check:style:css` - Stylelint for CSS
- `bun run check:style:python` - Ruff for Python
- `bun run check:style:markdown` - Markdownlint for documentation

### Package Management

- `bun upgrade && bun update` - Update JavaScript dependencies
- `uv sync --all-extras --upgrade` - Update Python dependencies
- `pre-commit autoupdate` - Update pre-commit hooks

## Architecture

### Monorepo Structure

- **packages/**: Individual license packages (MIT, MPL-2.0, etc.) with independent versioning
- **src/**: Source assets and build scripts
- **overrides/**: MkDocs theme customizations and Python hooks
- **external/**: Git submodules (choosealicense.com, mkdocs-material)

### Build Pipeline

The custom build system (`src/build/index.ts`) handles:

- Asset optimization (images, videos, fonts)
- TypeScript compilation with esbuild
- CSS processing and bundling
- Hash-based cache busting
- Multi-format video generation for hero sections

### Content Processing

Python hooks in `overrides/hooks/` process license content:

- `license_factory.py`: Assembles licenses from frontmatter and templates
- `shame_counter.py`: Counts complex legal terms
- `socialmedia.py`: Generates social media cards

### Frontend Technologies

- **TypeScript modules**: Observable-based architecture with RxJS
- **GSAP**: Advanced animations and scroll effects
- **Responsive design**: Mobile-first with breakpoint-specific assets

### License Package Structure

Each license in `packages/` is an independent NPM package containing:

- Plain language version
- Original license text
- Metadata and changelog
- Individual versioning via Lerna

## Key Files

- `mkdocs.yml`: Site configuration, navigation, and plugin settings
- `src/build/index.ts`: Main build orchestrator
- `overrides/hooks/`: Python content processing hooks
- `src/assets/javascripts/`: TypeScript modules for interactivity
- `lerna.json`: Monorepo package management configuration

## Testing and Deployment

No automated tests currently exist. Quality assurance relies on:

- TypeScript compilation
- Linting (ESLint, Stylelint, Ruff)
- Manual testing with `mkdocs serve`

Deployment uses semantic-release with branch strategy:

- `main`: Production releases
- `dev`: Pre-release versions with `-rc` suffix

## Documentation Linting and Plain Language Standards

### Plain Language Voice Guidelines

When reviewing or editing documentation, enforce the Plain License voice characteristics:

**Voice Identity**:

- **Rebellious yet Professional**: Challenge legal complexity while staying credible
- **Empowering**: Give people control through understanding
- **Clear**: Value direct, simple communication
- **Inclusive**: Write for everyone, avoid jargon and idioms
- **Community-Focused**: Building a movement for clarity

**Tone**:

- **Friendly**: Conversational, like talking to a friend
- **Approachable**: Avoid legal jargon and complex terms
- **Supportive**: Encourage questions and help-seeking
- **Confident**: Present information clearly with authority
- **Empathetic**: Understand that legal documents are hard for everyone
- **Transparent**: Open about processes and decisions

### Writing Standards Checklist

**Language Requirements**:

- Use simple, everyday words (avoid "relinquish" → use "give up")
- Break long sentences into shorter ones
- Use active voice ("You can use" not "Can be used by you")
- Address readers directly with "you"
- Be consistent with terminology throughout documents
- Target 8th-grade reading level

**License-Specific Terminology**:

- "you" (not "licensee, recipient")
- "we, authors" (not "licensor, provider, owner")
- "the work" (not "licensed work, software, creation, covered work")
- "contributors" vs "authors" distinction when both exist

**Structure and Formatting**:

- Use headings and subheadings for organization
- Include bullet points for key information
- Add white space to break up text
- Use tables to summarize and differentiate information
- Include visual elements (bold, italics) for emphasis
- Add callout boxes for important notes

**Content Quality**:

- Focus on ideas over structure - don't follow original format
- Explain technical terms if they must be used
- Avoid jargon, idioms, and regional expressions
- Group related information together
- Test readability with tools like Hemingway Editor

### Shame Words Detection

The project maintains a "shame words" list in `mkdocs.yml` under `extra.shame_words` - complex legal terms that should be replaced with plain language alternatives. When linting, flag these words and suggest the mapped alternatives:

Examples:

- "absence" → "lack"
- "alter" → "change"
- "apparatus" → "tool"
- "compliance" → "following the rules"
- "entity" → "person or organization"
- "jurisdiction" → "area of law, place where the law applies, court"

### Documentation Review Process

1. **Readability Check**: Ensure 8th-grade reading level
2. **Voice Consistency**: Verify adherence to Plain License voice
3. **Terminology Audit**: Check for consistent use of preferred terms
4. **Structure Review**: Ensure proper use of headings, bullets, tables
5. **Shame Words Scan**: Replace complex legal terms with plain alternatives
6. **Visual Enhancement**: Add formatting, tables, or callouts where helpful
