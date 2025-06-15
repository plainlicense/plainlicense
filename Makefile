# Use bash for better shell features
SHELL := /bin/bash

# Variables for common commands
BUN := bun run --bun
BIOME := $(BUN) biome
PRETTIER := $(BUN) prettier
MDLINT := $(BUN) markdownlint-cli2
MKDOCS := mkdocs gh-deploy --clean -m "Deploying Plain License" --remote-branch gh-pages --config-file mkdocs.yml
SHELLCHECK := $(BUN) shellcheck
SHFMT := shfmt
SLINT := $(BUN) stylelint
CZ := $(BUN) git-cz


#! =========== FILES GROUPS ============
#* Scripts and Code
BUILD_TS := bin/*.ts commitlint.config.ts src/build/**/*.ts
PYTHON_FILES := bin/*.py overrides/hooks/*.py
SHELL_FILES := .devcontainer/** bin/**/*.bash bin/**/*.sh bin/**/*.zsh overrides/**/*.sh
WEB_TS := src/assets/javascripts/**/*.ts src/assets/javascripts/**/*.tsx

#* Assets and Config
CSS_FILES := src/assets/stylesheets/**/*.css
HTML_FILES := assets/**/*.html overrides/**/*.html
MD_FILES := *.md *.md *LICENSE .github/**/*.md .github/**/*.md .roo/**/*.md .vscode/**/*.md assets/**/*.md bin/**/*.md docs/**/*.md includes.md overrides/**/*.md packages/**/*.md packages/changelogs/*.md
CONFIG_FILE_TYPES := *.conf *.config *.env *.json *.jsonc *.md *.toml *.txt *.yaml *.yml .*config .*rc .claude/* .github/**/*.json .github/**/*.jsonc .github/**/*.toml .github/**/*.yaml .github/**/*.yml .json5 .quokka .roo/*.json .roo/*.yaml .roo/*.yml .vscode/*.json .vscode/*.jsonc overrides/**/*.json overrides/**/*.jsonc overrides/**/*.yaml overrides/**/*.yml packages/**/*.json packages/**/*.jsonc packages/**/*.toml packages/**/*.yaml packages/**/*.yml src/**/*.json src/**/*.jsonc src/**/*.toml src/**/*.yaml src/**/*.yml

# Config files
BIOME_BUILD_CONFIG := src/build/biome.jsonc
BIOME_CONFIG := biome.jsonc
COMMITLINT_CONFIG := commitlint.config.ts
HTML_CONFIG := .linthtmlrc.yaml
MD_CONFIG := .markdownlint.yml
PRETTIER_CONFIG := package.json
RUFF_CONFIG := ruff.toml
SHELLCHECK_CONFIG := .shellcheckrc
STYLELINT_CONFIG := .stylelintrc
TYPOS_CONFIG := _typos.toml

#* Repeatedly Used CLI Flags
BIOME_FLAGS := --max-diagnostics 100 --files-ignore-unknown=true
PRETTIER_FLAGS := --config $(PRETTIER_CONFIG) -u --ignore-path ./.prettierignore --cache
MDLINT_FLAGS := --config $(MD_CONFIG)
RUFF_FLAGS := --config $(RUFF_CONFIG) --respect-gitignore
SHELL_CHECK_FLAGS := -x -S error
SHFMT_FLAGS := -i 4
STYLELINT_FLAGS := --config $(STYLELINT_CONFIG) --cache --ignore-path .stylelintignore
TYPOS_FLAGS := --config $(TYPOS_CONFIG) -j 6

# Couple more commands that made more sense here
HTMLINT := $(BUN) linthtml --config $(HTML_CONFIG)
RUFF := ruff $(RUFF_FLAGS)
TYPOS := typos $(TYPOS_FLAGS)

#! =========== TOOLING ROLES ===========
#* 1. **Command Exec**. Use `bun run --bun` to ensure all commands are run in the Bun environment. Because speed.
#* 2. **Typescript**. Use `biome` for TypeScript linting and formatting.
#* 3. **CSS**. `stylelint` and `prettier` for CSS linting and formatting.
#* 4. **Markdown**. `markdownlint-cli2` and `prettier` for Markdown linting and formatting.
#* 5. **HTML/Jinja**. `linthtml` for HTML linting and `prettier/prettier-jinja-template` for Jinja template formatting.
#* 6. **Python**. `ruff` for Python linting and formatting.
#* 7. **Shell**. `shellcheck` for shell script linting. `shfmt` and `prettier` for shell script formatting.
#* 8. **Everything else**. `prettier` for general formatting tasks (i.e. yaml, toml).
#* 9. **Spell check**. `typos` for spell checking. (SO MUCH BETTER THAN ANYTHING ELSE... goodbye [most] false positives)

#! =========== EXECUTION ORDER ===========
#? Multiple file types are reviewed by multiple tools, so the order of execution is important for consist results.
#* Here's the logic behind the command execution order:
#
#* 1. **Format**. *Always format last* to ensure all files are in the correct format and any linting changes are formatted to config.
#* 2. **Typescript**. Biome is the primary tool for TypeScript linting and formatting. The prettier config does not include typescript files.
#* 3. **CSS**. Stylelint -> Prettier -> Biome. You'll see similar patterns with other types. This is because Biome does not yet have full capabilities on other types -- when it does it will replace the others.
#* 4. **Markdown**. Markdownlint -> Prettier -> Biome.
#* 5. **HTML**. Linthtml -> Prettier.
#* 6. **Python**. Ruff.
#* 6. **Shell**. Shellcheck -> Shfmt -> Prettier.
#* 7. **Everything else**. Prettier -> Biome.

#? Why do we use CLI flags to point to default config file locations?
#? Because I've had some issues with tools not picking up the config files.
#? And... paranoia.

#todo: SETUP CMD

#! =========== DEV COMMANDS ===========
.PHONY: cm serve setup help

# Show available commands
help:
	@echo "Available commands:"
	@echo ""
	@echo "🔧 Development:"
	@echo "  cm           - Commit changes with conventional commits"
	@echo "  serve        - Start mkdocs development server"
	@echo "  setup        - Initial project setup"
	@echo ""
	@echo "✨ Code Quality:"
	@echo "  format       - Format all files"
	@echo "  check        - Check all files for issues"
	@echo "  fix          - Fix all auto-fixable issues"
	@echo ""
	@echo "🎯 Specific File Types:"
	@echo "  format-{css,ts,md,html,py,sh,other}"
	@echo "  check-{build,css,ts,md,html,sh,py,other}"
	@echo "  fix-{css,ts,md,html,sh,py,other}"
	@echo ""
	@echo "🔄 Project Management:"
	@echo "  sync         - Sync dependencies and tools"
	@echo "  build        - Build the project"
	@echo "  deploy       - Deploy to GitHub Pages"
	@echo "  all          - Run fix + build"
	@echo ""
	@echo "📦 Dependencies:"
	@echo "  upgrade      - Upgrade all dependencies and tools"
	@echo "  upgrade-libs - Upgrade project dependencies"
	@echo "  upgrade-tools - Upgrade development tools"
	@echo ""
	@echo "🚀 Release:"
	@echo "  release      - Release to main branch (CI)"
	@echo "  release-no-ci - Release to main branch (local)"
	@echo "  release-dev  - Release to dev branch (CI)"
	@echo "  release-dry-run - Dry run release"
	@echo ""
	@echo "🏗️ CI/CD:"
	@echo "  ci           - Run CI pipeline"
	@echo "  ci-dev       - Run dev CI pipeline"

# Commit -- we can't use `commit` because it conflicts with git hook tools (pre-commit)
cm:
	git add .
	$(BIOME) check $(BIOME_FLAGS) --write --staged $(WEB_TS)
	$(BIOME) check $(BIOME_FLAGS) --write --staged --config $(BUILD_TS)
	$(BUN) git-cz --all

serve:
	mkdocs serve

setup:
	git submodule update --init --recursive
	chmod +x bin/*
	bin/install-mise.sh
	eval $$(<mise activate)
	mise trust -y
	mise install -y
	mise reshim
	uv venv --allow-existing --seed --refresh --config-file pyproject.toml .venv
	source .venv/bin/activate
	uv pip install -r pyproject.toml
	mise sync python -y
	uv sync --all-extras
	bun install .
	mise sync node -y
	mise reshim
	rm -f .git/hooks/pre-commit || true
	rm -f .git/hooks/prepare-commit-msg || true
	rm -f .git/hooks/commit-msg || true
	wget -O .git/hooks/prepare-commit-msg "https://raw.githubusercontent.com/commitizen-tools/commitizen/master/hooks/prepare-commit-msg.py"
	chmod +x .git/hooks/prepare-commit-msg
	wget -O .git/hooks/post-commit "https://raw.githubusercontent.com/commitizen-tools/commitizen/master/hooks/post-commit.py"
	chmod +x .git/hooks/post-commit
	$(BUN) install

#! =========== FORMAT COMMANDS ===========
.PHONY: format format-css format-ts format-md format-html format-py format-sh format-other

# Format commands
format: format-css format-ts format-md format-html format-py format-sh format-other

format-css:
	$(SLINT) $(STYLELINT_FLAGS) --fix $(CSS_FILES)
	$(TYPOS) --write-changes $(CSS_FILES)
	$(PRETTIER) $(PRETTIER_FLAGS) --write $(CSS_FILES)

format-ts:
	$(TYPOS) --write-changes $(WEB_TS) $(BUILD_TS)
	$(BIOME) format $(BIOME_FLAGS) --write --staged $(WEB_TS)
	$(BIOME) format $(BIOME_FLAGS) --write --staged --config $(BUILD_TS)

format-md:
	$(MDLINT) $(MDLINT_FLAGS) --write $(MD_FILES)
	$(TYPOS) --write-changes $(MD_FILES)
	$(PRETTIER) $(PRETTIER_FLAGS) --write $(MD_FILES)

format-html:
	$(HTMLINT) $(HTML_FILES)
	$(TYPOS) --write-changes $(HTML_FILES)
	$(PRETTIER) --write $(HTML_FILES)

format-py:
	$(TYPOS) --write-changes $(PYTHON_FILES)
	$(RUFF) format $(RUFF_FLAGS) $(PYTHON_FILES)

format-sh:
	$(SHFMT) $(SHFMT_FLAGS) $(SHELL_FILES)
	$(TYPOS) --write-changes $(SHELL_FILES)
	$(PRETTIER) $(PRETTIER_FLAGS) --write $(SHELL_FILES)

format-other:
	$(PRETTIER) $(PRETTIER_FLAGS) --write $(CONFIG_FILE_TYPES)
	$(TYPOS) --write-changes $(CONFIG_FILE_TYPES)
	$(BIOME) format $(BIOME_FLAGS) --write --staged $(CONFIG_FILE_TYPES)


#! =========== CHECK COMMANDS ===========
.PHONY: check check-build check-css check-ts check-md check-html check-sh check-py check-other

# Check commands
check: check-build check-css check-ts check-md check-html check-sh check-py check-other

check-build:
	$(TYPOS) --diff -- $(BUILD_TS)
	$(BUN) tsc --noEmit -p tsconfig.build.json
	$(BIOME) check --config-path $(BIOME_BUILD_CONFIG) $(BUILD_TS)

check-css:
	$(TYPOS) --diff $(CSS_FILES)
	$(SLINT) $(STYLELINT_FLAGS) $(CSS_FILES)
	$(PRETTIER) $(PRETTIER_FLAGS) --check $(CSS_FILES)

check-ts:
	$(TYPOS) --diff $(WEB_TS)
	$(BUN) tsc --noEmit -p tsconfig.json
	$(BIOME) check $(BIOME_FLAGS) --config-path $(BIOME_CONFIG) $(WEB_TS)

check-md:
	$(TYPOS) --diff $(MD_FILES)
	$(MDLINT) $(MDLINT_FLAGS) $(MD_FILES)
	$(PRETTIER) $(PRETTIER_FLAGS) --check $(MD_FILES)

check-html:
	$(TYPOS) --diff $(HTML_FILES)
	$(HTMLINT) $(HTML_FILES)
	$(PRETTIER) $(PRETTIER_FLAGS) --check $(HTML_FILES)

check-sh:
	$(TYPOS) --diff $(SHELL_FILES)
	$(SHELLCHECK) $(SHELL_CHECK_FLAGS) $(SHELL_FILES)

check-py:
	$(TYPOS) --diff $(PYTHON_FILES)
	$(RUFF) check $(RUFF_FLAGS) $(PYTHON_FILES)

check-other:
	$(TYPOS) --diff $(CONFIG_FILE_TYPES)
	$(PRETTIER) $(PRETTIER_FLAGS) --check $(CONFIG_FILE_TYPES)
	$(BIOME) check $(BIOME_FLAGS) --config-path $(BIOME_CONFIG) $(CONFIG_FILE_TYPES)

#! =========== FIX COMMANDS ===========
.PHONY: fix fix-css fix-ts fix-md fix-html fix-sh fix-py fix-other

fix: fix-css fix-ts fix-md fix-html fix-sh fix-py fix-other

fix-css:
	$(TYPOS) --write-changes $(CSS_FILES)
	$(SLINT) $(STYLELINT_FLAGS) --fix $(CSS_FILES)
	$(PRETTIER) $(PRETTIER_FLAGS) --write $(CSS_FILES)
	$(BIOME) check $(BIOME_FLAGS) --config-path $(BIOME_CONFIG) --write --staged $(CSS_FILES)

fix-ts:
	$(TYPOS) --write-changes $(WEB_TS)
	$(BIOME) check $(BIOME_FLAGS) --config-path $(BIOME_CONFIG) --write --staged $(WEB_TS)

fix-md:
	$(TYPOS) --write-changes $(MD_FILES)
	$(MDLINT) $(MDLINT_FLAGS) --fix $(MD_FILES)
	$(PRETTIER) $(PRETTIER_FLAGS) --write $(MD_FILES)
	$(BIOME) check $(BIOME_FLAGS) --config-path $(BIOME_CONFIG) --write --staged $(MD_FILES)

fix-html:
	$(TYPOS) --write-changes $(HTML_FILES)
	$(HTMLINT) $(HTML_FILES)
	$(PRETTIER) $(PRETTIER_FLAGS) --write $(HTML_FILES)
	$(BIOME) check $(BIOME_FLAGS) --config-path $(BIOME_CONFIG) --write --staged $(HTML_FILES)

fix-sh:
	$(TYPOS) --write-changes $(SHELL_FILES)
	$(SHELLCHECK) $(SHELL_CHECK_FLAGS) --fix $(SHELL_FILES)
	$(SHFMT) $(SHFMT_FLAGS) -w $(SHELL_FILES)
	$(PRETTIER) $(PRETTIER_FLAGS) --write $(SHELL_FILES)
	$(BIOME) check $(BIOME_FLAGS) --config-path $(BIOME_CONFIG) --write --staged $(SHELL_FILES)

fix-py:
# I find these folks are pretty conservative about what's "unsafe"
	$(TYPOS) --write-changes $(PYTHON_FILES)
	$(RUFF) check $(RUFF_FLAGS) --fix --unsafe-fixes $(PYTHON_FILES)
	$(RUFF) format $(RUFF_FLAGS) $(PYTHON_FILES)

fix-other:
	$(TYPOS) --write-changes $(CONFIG_FILE_TYPES)
	$(PRETTIER) $(PRETTIER_FLAGS) --write $(CONFIG_FILE_TYPES)
	$(BIOME) check $(BIOME_FLAGS) --config-path $(BIOME_CONFIG) --write --staged $(CONFIG_FILE_TYPES)


#! ========== PROJECT SYNC ===========
.PHONY: sync

sync:
	git submodule update --init --recursive
	mise sync python -y
	mise sync node -y
	mise reshim
	uv sync --all-extras
	bun install

#! =========== BUILD COMMAND ===========
.PHONY: build

build:
	$(BUN) src/build/index.ts

#! =========== ALL ===========
#* fix includes all checks and formats, so we really just add build
.PHONY: all

all: fix build

#! =========== DEPLOY COMMAND ===========
.PHONY: deploy

deploy:
	$(MKDOCS)

#! =========== UPGRADE COMMANDS ===========
.PHONY: upgrade upgrade-libs upgrade-tools

upgrade: upgrade-libs upgrade-tools

upgrade-libs:
	bun update
	uv sync --all-extras --upgrade

upgrade-tools:
	bun upgrade
	uv pip install --upgrade uv -r pyproject.toml
	uv tool upgrade --all
	mise self-update -y
	mise upgrade -y --bump -j 6
	pre-commit autoupdate -j 4

#! =========== RELEASE COMMANDS ===========
# Release commands
#* Each release command assumes a ci environment. The 'no-ci' suffixed commands are for local development. The plain 'release' command releases to the main branch in a CI environment.
.PHONY: release release-no-ci release-dry-run release-dry-run-dev release-dev-no-ci release-dev

release:
	$(BUN) semantic-release -b main --ci

release-no-ci:
	$(BUN) semantic-release -b main --no-ci

release-dry-run:
	$(BUN) semantic-release -b main --dry-run --ci

release-dry-run-dev:
	$(BUN) semantic-release -b dev --dry-run --no-ci

release-dev-no-ci:
	$(BUN) semantic-release -b dev --no-ci

release-dev:
	$(BUN) semantic-release -b dev --ci

#! =========== CI COMMAND ===========
.PHONY: ci ci-dev

ci:
	make sync
	make check
	make build

ci-dev:
	make sync
	make fix
	make check
	make build
