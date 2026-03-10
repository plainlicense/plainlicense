# Plain License - Essential Commands

## Development Workflow
```bash
# Start development server with hot reload
mkdocs serve
# OR
make serve

# Full build pipeline (assets, JS, CSS, site)
bun run build
# OR
make build

# Build static site only
mkdocs build
```

## Code Quality
```bash
# Run ALL checks (TypeScript, Python, CSS, Markdown, HTML)
make check
# OR
bun run check

# Auto-fix ALL issues
make fix
# OR
bun run fix

# Format ALL code
make format
# OR
bun run format

# Complete workflow: fix + build
make all
# OR
bun run runall
```

## Specific File Type Commands
```bash
# TypeScript
make check-ts       # Check TypeScript
make fix-ts         # Fix TypeScript issues
make format-ts      # Format TypeScript

# Python
make check-py       # Ruff check
make fix-py         # Ruff fix with unsafe fixes
make format-py      # Ruff format

# CSS
make check-css      # Stylelint check
make fix-css        # Fix CSS issues
make format-css     # Format CSS

# Markdown
make check-md       # Markdownlint check
make fix-md         # Fix Markdown issues
make format-md      # Format Markdown

# HTML
make check-html     # LintHTML check
make fix-html       # Fix HTML issues
make format-html    # Format HTML

# Shell scripts
make check-sh       # Shellcheck
make fix-sh         # Fix shell scripts
make format-sh      # Format shell scripts
```

## Package Management
```bash
# Update all dependencies (JS + Python + pre-commit)
make upgrade
# OR
bun run upgrade

# Update JS dependencies only
bun update

# Update Python dependencies only
uv sync --all-extras --upgrade

# Sync dependencies and tools
make sync
```

## Git & Commits
```bash
# Commit with conventional commits (interactive)
make cm
# OR
bun run cm
```

## Project Setup
```bash
# Initial setup (submodules, tools, deps, hooks)
make setup
# OR
bun run setup
```

## Release & Deploy
```bash
# Deploy to GitHub Pages
make deploy

# Semantic release (CI)
make release          # Main branch
make release-dev      # Dev branch

# Semantic release (local)
make release-no-ci
make release-dev-no-ci

# Dry run
make release-dry-run
```

## CI/CD
```bash
# Run CI pipeline
make ci              # sync + check + build

# Run dev CI pipeline
make ci-dev          # sync + fix + check + build
```