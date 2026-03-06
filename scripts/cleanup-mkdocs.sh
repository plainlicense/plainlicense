#!/usr/bin/env bash
# ============================================================================
# cleanup-mkdocs.sh — Remove old MkDocs site files from the repository
# ============================================================================
#
# BACKGROUND
# ----------
# Plain License is migrating from a MkDocs + Material Theme site (deployed
# via GitHub Pages) to an Astro + Starlight site (deployed via Cloudflare
# Pages).  This script removes every file and directory that belongs
# exclusively to the old MkDocs site and has no role in the new Astro build.
#
# Content has already been migrated:
#   - License markdown → content/licenses/
#   - General pages    → src/pages/ (as .mdx)
#   - Blog posts       → content/blog/
#
# USAGE
# -----
#   bash scripts/cleanup-mkdocs.sh [--dry-run]
#
#   --dry-run  Print what would be deleted without actually deleting anything.
#
# SAFETY
# ------
# * Run from the repository root.
# * Commit or stash all your current changes first.
# * This script is IRREVERSIBLE for untracked files; git-tracked files can be
#   recovered with `git checkout`.
# * Review the "UNCERTAIN FILES" section at the bottom before running; those
#   files are NOT deleted here and may need manual review.
# ============================================================================

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# Dry-run support
# ---------------------------------------------------------------------------
DRY_RUN=0
for arg in "$@"; do
    [[ "$arg" == "--dry-run" ]] && DRY_RUN=1
done

rm_file() {
    local target="$1"
    local reason="$2"
    if [[ -e "$target" || -L "$target" ]]; then
        if [[ $DRY_RUN -eq 1 ]]; then
            echo "[DRY-RUN] Would remove file:      $target"
            echo "          Reason: $reason"
        else
            echo "Removing file: $target"
            echo "  Reason: $reason"
            rm -f "$target"
        fi
    fi
}

rm_dir() {
    local target="$1"
    local reason="$2"
    if [[ -d "$target" ]]; then
        if [[ $DRY_RUN -eq 1 ]]; then
            echo "[DRY-RUN] Would remove directory:  $target"
            echo "          Reason: $reason"
        else
            echo "Removing directory: $target"
            echo "  Reason: $reason"
            rm -rf "$target"
        fi
    fi
}

rm_submodule() {
    local target="$1"
    local reason="$2"
    if git submodule status "$target" &>/dev/null || [[ -d "$target/.git" ]] || grep -q "path = $target" .gitmodules 2>/dev/null; then
        if [[ $DRY_RUN -eq 1 ]]; then
            echo "[DRY-RUN] Would deinit & remove submodule: $target"
            echo "          Reason: $reason"
        else
            echo "Removing submodule: $target"
            echo "  Reason: $reason"
            git submodule deinit -f "$target" 2>/dev/null || true
            git rm -f "$target" 2>/dev/null || rm -rf "$target"
            rm -rf ".git/modules/$target"
        fi
    fi
}

[[ $DRY_RUN -eq 1 ]] && echo "=== DRY RUN — no files will be deleted ==="
echo ""

# ============================================================================
# 1. MkDocs CONFIGURATION FILES
# ============================================================================
echo "--- MkDocs configuration files ---"

rm_file "mkdocs.yml" \
    "Root MkDocs configuration. Defines nav, plugins, theme, hooks and extensions
     for the Material-based site. Replaced by astro.config.mjs for the Astro site."

rm_file "embed_mkdocs_config.yml" \
    "Secondary MkDocs config for generating embeddable license widgets.
     The Astro build produces exportable formats via src/build/generate-exports.ts."

# ============================================================================
# 2. MkDocs CONTENT DIRECTORY
# ============================================================================
echo ""
echo "--- MkDocs content directory (docs/) ---"

rm_dir "docs" \
    "The mkdocs docs_dir containing all Markdown source pages:
     about/, blog/, faq/, helping/, licenses/, index.md, shame.md, etc.
     Content has been migrated:
       Licenses  → content/licenses/  (for Astro collections)
       Pages     → src/pages/         (as .mdx with Starlight layout)
       Blog      → content/blog/
     Remaining artefacts (favicons, manifest, CNAME, .nojekyll) are either
     duplicated in public/ or are GitHub Pages-specific and no longer needed."

# ============================================================================
# 3. MkDocs MATERIAL THEME OVERRIDES
# ============================================================================
echo ""
echo "--- MkDocs Material theme overrides (overrides/) ---"

rm_dir "overrides" \
    "Custom MkDocs Material theme directory containing:
       main.html / license.html / embedded_license.html
           Jinja2 page templates; replaced by Astro .astro layouts.
       partials/
           Jinja2 partial templates (copyright, license_tags, license_toc).
       .icons/
           SVG icon set (nounproject) imported via mkdocs.yml icon mapping.
           Icons are available in src/assets/ for the Astro site.
       hooks/
           Python hooks invoked by MkDocs at build time:
             license_factory.py — assembles license pages from frontmatter
             shame_counter.py   — counts complex legal terms
             socialmedia.py     — generates social-card images
             fix_html.py        — post-render HTML fixes
             env_settings.py    — extends the Jinja environment
             update_site_license.py — updates site license from packages/
             hook_logger.py     — shared logging for all hooks
             _utils.py          — shared utilities for hooks
             factory/           — factory sub-package for license assembly
           All replaced by Astro build scripts in src/build/.
       buildmeta.json
           Cache-busted asset paths generated by the old esbuild pipeline
           (referenced by main.html Jinja template). No longer meaningful."

# ============================================================================
# 4. MkDocs MARKDOWN INCLUDES
# ============================================================================
echo ""
echo "--- MkDocs markdown includes (includes/) ---"

rm_dir "includes" \
    "Contains abbreviations.md used by the MkDocs pymdownx.snippets extension
     to inject tooltip abbreviations site-wide. This mechanism does not exist
     in Astro/Starlight. Abbreviation tooltips should be re-implemented
     as an Astro component or remark/rehype plugin if needed."

# ============================================================================
# 5. EXTERNAL SUBMODULE — mkdocs-material
# ============================================================================
echo ""
echo "--- External submodule: external/mkdocs-material ---"

rm_submodule "external/mkdocs-material" \
    "The MkDocs Material theme source cloned as a git submodule.
     It was needed because:
       - The old TypeScript build imported Material's JS bundle directly.
       - The old CSS bundle template referenced Material's hashed CSS files.
       - tsconfig.json had path aliases pointing into this directory.
     None of these apply to the Astro/Starlight site.
     NOTE: After running this script, also remove the [submodule
     \"external/mkdocs-material\"] stanza from .gitmodules manually if
     git rm did not do so automatically."

# ============================================================================
# 6. OLD ESBUILD BUILD SYSTEM (outputs to docs/, references mkdocs-material)
# ============================================================================
echo ""
echo "--- Old esbuild build system (src/build/index.ts and related) ---"

rm_file "src/build/index.ts" \
    "Main esbuild orchestrator for the old MkDocs site.
     Compiled and bundled src/assets/javascripts/ and src/assets/stylesheets/
     into docs/assets/ with content-hashed filenames. Wrote buildmeta.json.
     Replaced by 'astro build' + the new src/build/generate-*.ts scripts."

rm_file "src/build/config/index.ts" \
    "esbuild project configuration. Hard-coded outdir: 'docs' and entry points
     src/assets/javascripts/index.ts and src/assets/stylesheets/bundle.css.
     Referenced external/mkdocs-material stylesheets for hash replacement.
     Only used by the deleted src/build/index.ts."

rm_file "src/build/config/replacers.ts" \
    "CSS hash-replacement config used by the ReplacersPlugin esbuild plugin.
     Mapped {{ main-hash }} and {{ palette-hash }} placeholders in
     _bundle_template.css to the actual mkdocs-material hashed CSS filenames.
     Only used by the deleted src/build/config/index.ts."

rm_dir "src/build/localPlugins" \
    "esbuild plugin directory containing:
       replacersPlugin.ts — swaps mkdocs-material CSS hash placeholders.
       index.ts           — barrel export.
     Only referenced from the deleted src/build/config files."

rm_file "src/build/types.ts" \
    "TypeScript type definitions for the old esbuild build system
     (Project, EsBuildOutputs, ImageIndex, HeroVideo, etc.).
     Only used by the deleted src/build/index.ts and src/build/config/index.ts."

rm_file "src/build/migrate.ts" \
    "One-time migration script that converted docs/licenses/ Markdown files
     (MkDocs frontmatter schema) into the new content/licenses/ schema.
     Migration has been completed; the script is no longer needed."

rm_file "src/build/migrate-pages.ts" \
    "One-time migration script that converted docs/about/, docs/faq/,
     docs/helping/ Markdown into Astro MDX pages under src/pages/.
     Migration has been completed; the script is no longer needed."

# ============================================================================
# 7. MkDocs MATERIAL JAVASCRIPT FRONTEND (src/assets/javascripts/)
# ============================================================================
echo ""
echo "--- MkDocs Material JavaScript frontend (src/assets/javascripts/) ---"

rm_dir "src/assets/javascripts" \
    "TypeScript modules built for the MkDocs Material theme frontend.
     They import directly from the Material bundle
     ('import * as bundle from \"@/bundle\"') and use Material-specific
     browser APIs (watchViewportAt, watchElementSize, getComponentElement, …)
     exposed through tsconfig.json path aliases pointing into
     external/mkdocs-material.  Nothing in the Astro site imports these files.
     Specific sub-modules and their purpose:
       feedback/feedback.ts        — Material feedback widget integration.
       licenses/init.ts            — Tab and license-section initialisation.
       licenses/tabManager.ts      — Material tab component manager.
       utils/conditionChecks.ts    — Route/hash condition helpers.
       utils/eventHandlers.ts      — RxJS-based navigation/viewport observers.
       utils/fetchWorker.ts        — Fetch helper using a Material web worker.
       utils/helpers.ts            — DOM utilities wrapping Material APIs.
       utils/log.ts                — Logging wrapper.
       utils/types.ts              — Shared TS types.
       globals.d.ts                — Global type augmentations (customWindow).
       gsap.d.ts                   — GSAP ambient declarations.
       tablesort.d.ts              — Tablesort ambient declarations."

# ============================================================================
# 8. MkDocs MATERIAL-SPECIFIC CSS
# ============================================================================
echo ""
echo "--- MkDocs Material-specific CSS files ---"

rm_file "src/assets/stylesheets/_bundle_template.css" \
    "The CSS bundle entry-point template for the old esbuild pipeline.
     Imports mkdocs-material palette and main CSS using hash placeholders
     ('{{ palette-hash }}' / '{{ main-hash }}') that the ReplacersPlugin
     filled in at build time. Also imports license.css, tags.css, hero.css.
     Not imported anywhere in the Astro build."

rm_file "src/assets/stylesheets/tags.css" \
    "Styles the MkDocs Material tag index page. Uses Material-specific
     selectors: .md-typeset h2 > .md-tag, .md-typeset .md-tag::before.
     These selectors have no meaning in Starlight. Tag display in the
     new site is handled differently."

rm_file "src/assets/stylesheets/license.css" \
    "License-page CSS written for MkDocs Material.
     Uses [data-md-color-scheme=\"default/slate\"], --md-admonition-icon,
     .md-typeset, --md-default-fg-color, and other Material-specific
     CSS custom properties and selectors.
     The Astro site uses src/assets/stylesheets/custom.css instead."

# ============================================================================
# 9. GITHUB ACTIONS WORKFLOW — mkdocs deploy
# ============================================================================
echo ""
echo "--- GitHub Actions workflow for MkDocs deployment ---"

rm_file ".github/workflows/deploy.yml" \
    "GitHub Actions workflow that deployed the site to GitHub Pages via
     'mkdocs gh-deploy'. The new site is deployed to Cloudflare Pages
     automatically on push to main; this workflow is obsolete."

# ============================================================================
# 10. MKDOCS-FORMATTED LICENSE EXPORT FILES (assets/*/mkdocs-markdown-*.md)
# ============================================================================
echo ""
echo "--- MkDocs-formatted license Markdown exports ---"

rm_file "assets/elastic-2.0/0.1.0/mkdocs-markdown-elastic-2.0-0.1.0.md" \
    "MkDocs-specific Markdown export for Elastic License 2.0 generated by the
     old license_factory.py hook. Uses pymdownx admonitions and Material tab
     syntax. The Astro build generates format-specific exports via
     src/build/generate-exports.ts → public/exports/."

rm_file "assets/mit/0.1.0/mkdocs-markdown-mit-0.1.0.md" \
    "MkDocs-specific Markdown export for MIT License. Same rationale as above."

rm_file "assets/mpl-2.0/0.1.0/mkdocs-markdown-mpl-2.0-0.1.0.md" \
    "MkDocs-specific Markdown export for Mozilla Public License 2.0.
     Same rationale as above."

rm_file "assets/unlicense/0.1.0/mkdocs-markdown-unlicense-0.1.0.md" \
    "MkDocs-specific Markdown export for the Unlicense.
     Same rationale as above."

# ============================================================================
# 11. TSCONFIG FOR OLD BUILD SYSTEM
# ============================================================================
echo ""
echo "--- TypeScript config for old esbuild build system ---"

rm_file "tsconfig.build.json" \
    "tsconfig dedicated to the old esbuild build system (src/build/index.ts).
     Its 'files' entry points only to src/build/index.ts (now deleted) and
     its rootDir is src/build/.  The Astro build uses tsconfig.json directly."

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
if [[ $DRY_RUN -eq 1 ]]; then
    echo "=== DRY RUN COMPLETE — no files were changed ==="
else
    echo "=== CLEANUP COMPLETE ==="
fi

cat <<'EOF'

============================================================================
FILES NOT DELETED — REQUIRE MANUAL REVIEW
============================================================================

The following files have ties to the old MkDocs site but also have possible
relevance to the new Astro site or require targeted edits rather than simple
deletion.  They are NOT removed by this script.

1.  tsconfig.json
    Contains path aliases (_/*, @/*, ~/*)  pointing into
    external/mkdocs-material that are only used by the deleted
    src/assets/javascripts/*.  After deleting this submodule and those JS
    files, clean up the `paths`, `include`, and `exclude` arrays
    in tsconfig.json to remove all references to external/mkdocs-material.

2.  pyproject.toml  (and uv.lock)
    Lists MkDocs and its plugins as Python dependencies:
      mkdocs, mkdocs-material[imaging], mkdocs-git-authors-plugin,
      mkdocs-git-revision-date-localized-plugin, mkdocs-markdown-filter,
      mkdocs-rss-plugin, mkdocs-static-i18n, mkdocs-macros-plugin,
      mkdocs-minify-plugin, pymdown-extensions, pyyaml_env_tag, ez-yaml.
    These should be removed.  Other deps (PyGithub, pydantic, nltk, etc.)
    are still used by Python utilities in bin/.  Removing the MkDocs deps
    requires editing pyproject.toml and re-running `uv sync`.

3.  Makefile
    Contains `serve: mkdocs serve`, `MKDOCS := mkdocs gh-deploy …`, and
    `deploy:` target that references GitHub Pages.  Update or remove these
    targets; the new deploy is handled by Cloudflare Pages on push to main.

4.  src/cacheWorker.ts
    Listed as an esbuild entry point in the deleted src/build/config/index.ts
    (outdir: docs).  However, the file itself is a ServiceWorker that caches
    fonts and SVG logos — functionality relevant to the new Astro site too.
    Evaluate whether to integrate it with Astro's own service-worker support
    or replace it.

5.  src/assets/stylesheets/main.css
    Not clearly MkDocs-specific (no --md-* variables, no .md-typeset
    selectors).  Contains CSS custom property resets and .highlight-match
    styles.  NOT imported by astro.config.mjs customCss; may be unused.
    Verify whether any Astro component imports it before deleting.

6.  src/assets/stylesheets/bodyfont.css  /  src/assets/stylesheets/colors.css
    Both are imported by custom.css (the Astro/Starlight stylesheet).
    colors.css defines --md-text-font etc. with --md-* naming inherited from
    Material Design conventions but they are used as general brand tokens in
    the new site.  Keep both files, but consider renaming the --md-* variables
    to a non-Material prefix (e.g. --pl-*) in a follow-up.

7.  src/assets/fonts/  (woff/woff2 files)
    Referenced by src/cacheWorker.ts and src/assets/stylesheets/bodyfont.css.
    Keep — they serve the new Astro site's self-hosted font stack.

8.  src/assets/images/  (logo_named.svg, logo_only_color_transp.svg)
    Referenced in astro.config.mjs (Starlight logo) and src/cacheWorker.ts.
    Keep — they are active assets for the new site.

9.  bin/convert_to_blocks.py
    Converts MkDocs pymdownx admonition syntax to the newer Blocks API.
    Used during migration; migration appears complete.  Safe to delete but
    keep as documentation of the migration if desired.

10. .github/workflows/build.yml
    Still calls `bun run build` which chains through `make build` → circular
    reference (Makefile build target calls `bun run build`).  Needs updating
    to call `astro build` directly or via a corrected Makefile target.
    Not deleted here as it may still be partially functional.

11. .gitmodules
    After removing external/mkdocs-material with `git submodule deinit` +
    `git rm`, verify that the [submodule "external/mkdocs-material"] stanza
    has been removed from .gitmodules.  The other submodules
    (external/choosealicense.com, external/license-list-data,
    external/license-list-XML) may still be useful reference data for the
    new site's license content.

EOF
