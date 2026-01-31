# Plain License Project Overview

## Purpose
Plain License is a documentation website that provides plain-language versions of popular licenses for creative works. The project aims to make legal licenses accessible to non-lawyers and applicable to all types of creative work, not just software.

## Architecture
- **Static Site**: Built using MkDocs Material with extensive customization
- **Monorepo Structure**: Uses Lerna for managing independent license packages
- **Build System**: Custom TypeScript-based build pipeline with asset optimization
- **Content Processing**: Python hooks process license content during build

## Key Characteristics
- Plain language focus: Replaces complex legal terms with simple alternatives
- Universal applicability: Not just software, but all creative works
- Community-driven: Open source with public domain dedication
- Multi-format output: Markdown, plaintext, and reader versions

## Tech Stack
- **Build**: Bun runtime, TypeScript, esbuild
- **Site Generator**: MkDocs with Material theme
- **Frontend**: TypeScript modules with RxJS, GSAP for animations
- **Styling**: SCSS/CSS with PostCSS processing
- **Python**: Python 3.12+ for hooks and content processing
- **Package Management**: Lerna for license packages, Bun for JS, uv for Python

## Repository Structure
- `packages/`: Individual license packages (MIT, MPL-2.0, Unlicense, Elastic-2.0)
- `src/`: Source assets and build scripts
- `overrides/`: MkDocs theme customizations and Python hooks
- `external/`: Git submodules (choosealicense.com, mkdocs-material)
- `docs/`: Generated static site output