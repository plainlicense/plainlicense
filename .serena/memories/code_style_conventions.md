# Plain License - Code Style & Conventions

## Tool Configuration
The project uses a sophisticated multi-tool approach for code quality:

### TypeScript
- **Biome**: Primary tool for TS linting and formatting
- Config: `biome.jsonc` (web) and `src/build/biome.jsonc` (build scripts)
- Standards: Modern TypeScript with strict type checking
- Naming: camelCase for variables/functions, PascalCase for classes/types

### Python
- **Ruff**: All-in-one linter and formatter
- Config: `ruff.toml`
- Version: Python 3.12+
- Naming: snake_case for functions/variables, PascalCase for classes
- Uses unsafe fixes when auto-fixing

### CSS/SCSS
- **Stylelint**: CSS linting
- **Prettier**: CSS formatting
- Config: `.stylelintrc` for linting
- Modern CSS with PostCSS processing
- SCSS for stylesheets

### Markdown
- **Markdownlint**: Markdown linting
- **Prettier**: Markdown formatting
- Config: `.markdownlint.yml`
- Prose wrap: always (80 chars for .md/.html)

### HTML/Jinja
- **LintHTML**: HTML linting
- **Prettier with Jinja template plugin**: Formatting
- Config: `.linthtmlrc.yaml`

### Shell Scripts
- **Shellcheck**: Shell linting
- **shfmt + Prettier**: Shell formatting
- Config: `.shellcheckrc`

### General Config Files (JSON, YAML, TOML)
- **Prettier**: Primary formatter
- **Biome**: Secondary formatter

### Spell Checking
- **Typos**: Fast, accurate spell checker across all file types
- Config: `_typos.toml`

## Execution Order
Multiple tools process the same files, so order matters:
1. **Format last**: Always format after linting to ensure config compliance
2. **TypeScript**: Biome handles everything
3. **CSS**: Stylelint → Prettier → Biome
4. **Markdown**: Markdownlint → Prettier → Biome
5. **HTML**: LintHTML → Prettier
6. **Python**: Ruff (check + format)
7. **Shell**: Shellcheck → shfmt → Prettier
8. **Other**: Prettier → Biome

## Project-Specific Conventions

### Plain Language Guidelines
- Avoid complex legal terms (see shame_words list in mkdocs.yml)
- Target 8th-grade reading level
- Use active voice
- Address readers as "you"
- Simple, everyday words

### License Package Structure
Each license in `packages/` is independent:
- Individual versioning via Lerna
- Plain language version + original text
- Frontmatter metadata
- Changelog

### Content Organization
- License content: `packages/[license-name]/`
- Documentation: `docs/`
- Build assets: `src/assets/`
- Python hooks: `overrides/hooks/`
- Theme customization: `overrides/`

### Commit Conventions
- Use Conventional Commits format
- Commitizen for interactive commits
- Types: new, fix, refactor, admin, subs, stable, bot, chore
- Scopes: content, ui, infra, deps, blog, scripts