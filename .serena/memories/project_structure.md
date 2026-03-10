# Plain License - Project Structure

## Root Directory Layout
```
plainlicense/
├── packages/          # License packages (Lerna monorepo)
│   ├── mit/
│   ├── mpl-2.0/
│   ├── unlicense/
│   ├── elastic-2.0/
│   └── plainlicense/  # Main package
├── src/              # Source files
│   ├── assets/       # Frontend assets
│   │   ├── javascripts/  # TypeScript modules
│   │   ├── stylesheets/  # SCSS/CSS
│   │   ├── images/
│   │   ├── videos/
│   │   └── fonts/
│   └── build/        # Build system (TypeScript)
├── overrides/        # MkDocs Material customizations
│   ├── hooks/        # Python content processing hooks
│   └── *.html        # Jinja2 templates
├── docs/             # Generated static site
├── external/         # Git submodules
│   ├── choosealicense.com/
│   └── mkdocs-material/
├── bin/              # Utility scripts
├── includes/         # Shared markdown content
├── .github/          # GitHub Actions workflows
└── [config files]    # Various tool configs
```

## Key Directories

### packages/
Lerna-managed monorepo for license packages. Each package:
- Has independent versioning
- Contains plain language + original license
- Includes package.json, CHANGELOG.md
- Structured for NPM publishing

### src/assets/
Frontend source code:
- **javascripts/**: TypeScript modules (RxJS-based, Observable pattern)
- **stylesheets/**: SCSS with Material Design integration
- **images/**: SVG, PNG, optimized during build
- **videos/**: Hero section videos (multi-format generation)
- **fonts/**: Web fonts

### src/build/
Custom build system (TypeScript):
- Asset optimization (images, videos, fonts)
- TypeScript compilation with esbuild
- CSS processing and bundling
- Hash-based cache busting
- Manifest generation

### overrides/
MkDocs Material theme customization:
- **hooks/**: Python hooks for content processing
  - `license_factory.py`: Assembles licenses from frontmatter
  - `shame_counter.py`: Counts complex legal terms
  - `socialmedia.py`: Social media card generation
  - `env_settings.py`: Jinja environment configuration
- ***.html**: Jinja2 template overrides
- **images/**: Custom theme assets

### docs/
Generated static site output (DO NOT EDIT MANUALLY):
- Built by MkDocs from source
- Contains processed licenses
- Includes all assets (optimized)
- Ready for deployment

## Configuration Files

### Primary Configs
- `mkdocs.yml`: Site configuration, navigation, plugins
- `package.json`: JS dependencies, scripts
- `pyproject.toml`: Python dependencies, project metadata
- `lerna.json`: Monorepo package management
- `tsconfig.json`: TypeScript configuration

### Quality Tool Configs
- `biome.jsonc`: TypeScript linting/formatting
- `ruff.toml`: Python linting/formatting
- `.stylelintrc`: CSS linting
- `.markdownlint.yml`: Markdown linting
- `.linthtmlrc.yaml`: HTML linting
- `_typos.toml`: Spell checking
- `.shellcheckrc`: Shell script linting

### Build & Deploy
- `.github/workflows/`: CI/CD pipelines
- `Makefile`: Development commands
- `commitlint.config.ts`: Commit message validation

## Important Files

### Content Processing
- `includes/abbreviations.md`: Site-wide abbreviations
- `LICENSE_TEMPLATE.md`: Template for new licenses
- `ADDING_A_LICENSE.md`: Guide for adding licenses

### Development
- `CLAUDE.md`: AI code assistant guidance (THIS FILE)
- `CONTRIBUTING.md`: Contribution guidelines
- `style_guide.md`: Plain language style guide
- `TODO.md`: Project tasks and roadmap

## Build Artifacts (Gitignored)
- `node_modules/`: JS dependencies
- `.venv/`: Python virtual environment
- `.cache/`: Build and tool caches
- `docs/`: Generated site (tracked but regenerated)
- `.history/`: Local history

## Submodules (external/)
- **choosealicense.com**: Original license texts reference
- **mkdocs-material**: Material theme source for customization