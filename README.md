[![Plain Unlicense](https://img.shields.io/badge/Plain-Unlicense-15db95?style=flat-square&labelColor=0d19a3&cacheSeconds=86400&link=https%3A%2F%2Fplainlicense.org%2Flicenses%2Fpublic-domain%2Funlicense%2F)](https://plainlicense.org/licenses/public-domain/unlicense/)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Deployed on Cloudflare](https://img.shields.io/badge/Deployed%20on-Cloudflare-F48120?style=flat-square&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)

# Plain License

> **Licenses you can actually read.**
> Visit us at **[plainlicense.org](https://plainlicense.org)**.

**Plain License** rewrites popular software and creative licenses in clear, everyday language. Our goal: anyone — with no legal background — can read a license and understand exactly what it allows, requires, and forbids. We keep the legal intent intact while cutting through the legalese.

---

## Available Licenses

| License | Category | URL |
|---|---|---|
| [MIT](https://plainlicense.org/licenses/permissive/mit/) | Permissive | `/licenses/permissive/mit` |
| [MPL 2.0](https://plainlicense.org/licenses/copyleft/mpl-2.0/) | Copyleft | `/licenses/copyleft/mpl-2.0` |
| [Elastic 2.0](https://plainlicense.org/licenses/source-available/elastic-2.0/) | Source Available | `/licenses/source-available/elastic-2.0` |
| [Unlicense](https://plainlicense.org/licenses/public-domain/unlicense/) | Public Domain | `/licenses/public-domain/unlicense` |

More licenses are on the way — contributions welcome!

---

## Tech Stack

- **[Astro 6](https://astro.build)** — static-first site framework, statically generated and deployed to Cloudflare Pages
- **[Starlight](https://starlight.astro.build)** — Astro documentation theme
- **[Preact](https://preactjs.com)** — interactive UI components (decision tree, comparison table)
- **[Bun](https://bun.sh)** — package manager and workspace tooling
- **[Cloudflare Pages](https://pages.cloudflare.com)** — hosting and edge deployment
- **[Biome](https://biomejs.dev)** — linting and formatting for TypeScript/JavaScript

---

## Getting Started

### Prerequisites

- [mise](https://mise.jdx.dev/) — manages tool versions and dev tasks
- [Bun](https://bun.sh/) — installed automatically by mise

### Setup

```bash
git clone https://github.com/plainlicense/plainlicense.git
cd plainlicense
mise run setup   # installs dependencies, sets up git hooks and symlinks
```

### Development

```bash
mise run dev          # start the Astro dev server
mise run build        # production build (site + exports + OG images + versions)
mise run lint         # run all linters (Biome, shellcheck, Astro check)
mise run fmt          # run all formatters (Biome, shfmt, markdownlint)
mise run test --unit  # run unit tests (Vitest, single pass)
mise run test --e2e   # run end-to-end tests (Playwright)
mise run test-cov     # run unit tests with coverage (80% thresholds)
```

Run a single test file:

```bash
bunx vitest run tests/unit/your-file.test.ts
bunx playwright test tests/e2e/your-test.spec.ts
```

---

## Project Structure

```
plainlicense/
├── content/
│   ├── licenses/{category}/{spdx-id}.md   # license content + YAML frontmatter
│   ├── blog/                               # blog posts
│   └── mappings/                           # term mappings (original ↔ plain)
├── packages/{spdx-id}/                     # per-license workspace packages (versioning)
├── src/
│   ├── build/                              # post-build scripts (exports, OG images, versions)
│   ├── components/
│   │   ├── overrides/                      # Starlight layout overrides
│   │   ├── reactive/                       # Preact interactive components
│   │   └── license/                        # license-specific Astro components
│   ├── pages/                              # Astro page routes
│   └── utils/                              # shared utilities
├── tests/
│   ├── unit/                               # Vitest unit tests
│   └── e2e/                                # Playwright end-to-end tests
├── astro.config.mjs                        # Astro configuration + auto-routing
├── mise.toml                               # task runner + tool versions
└── biome.jsonc                             # linter/formatter config
```

License categories: `permissive`, `copyleft`, `source-available`, `public-domain`.

URL routing is **automatically generated** at build time. Adding `content/licenses/{category}/{spdx-id}.md` creates:
- `/licenses/{spdx-id}` → `/licenses/{category}/{spdx-id}`
- `/{spdx-id}` → `/licenses/{category}/{spdx-id}`

---

## Contributing

We welcome contributions — new plain-language licenses, improvements to existing ones, bug fixes, and documentation.

- **[Contributing guide](https://plainlicense.org/helping/code/)** — how to contribute code
- **[Adding a license](./ADDING_A_LICENSE.md)** — step-by-step guide for adding a new license
- **[License template](./LICENSE_TEMPLATE.md)** — template for writing a new plain-language license

### Commit Format

Commits follow a custom format with **mandatory** type and scope:

```
{type}({scope}): {description}
```

Common types: `new` (new license/feature), `fix`, `refactor`, `chore`  
License scopes: SPDX ID in lowercase (e.g., `mit`, `mpl-2.0`)  
Dev scopes: `content`, `ui`, `infra`, `deps`, `scripts`, `blog`

Use `mise run commit "<message>"` to stage, format, and commit in one step.

---

## Plain Language Standards

All license writing targets an **8th-grade reading level**. Key conventions:

- Address readers as **"you"**; refer to licensors as **"we, the authors"**
- Prefer **"the work"** over "software" or "code"
- Prefer **"share"** over "distribute"; **"change"** over "modify"; **"give"** over "grant"
- Use **"source materials"** instead of "source code" (covers all creative works)
- Headers use empowering framing: *"You are Free to..."*

---

## ⚠️ Disclaimer

Plain License rewrites are provided **as-is**. They are not legal advice. Please consult a lawyer before choosing a license for your project. [The author, @bashandbone](https://github.com/bashandbone/), is not a lawyer — just someone who wants licenses to be readable.
