#!/usr/bin/env bash
set -euo pipefail
shopt -s globstar nullglob

# Compare license content between HEAD and base branch.
# Fails if content changed but package version did not.

BASE_REF="${1:-origin/main}"
EXIT_CODE=0

for license_file in content/licenses/**/*.md; do
  [ -f "$license_file" ] || continue

  # Get the SPDX ID from frontmatter
  spdx_id=$(grep '^spdx_id:' "$license_file" | head -1 | awk '{print $2}')
  [ -z "$spdx_id" ] && continue

  pkg_dir="packages/${spdx_id,,}"
  pkg_json="${pkg_dir}/package.json"
  [ -f "$pkg_json" ] || continue

  # Check if the license file changed
  if git diff --quiet "$BASE_REF" -- "$license_file" 2>/dev/null; then
    continue  # No content change
  fi

  # Content changed — check if version also changed
  if git diff --quiet "$BASE_REF" -- "$pkg_json" 2>/dev/null; then
    echo "ERROR: $license_file content changed but $pkg_json version was not bumped."
    EXIT_CODE=1
  fi
done

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "All license content changes have corresponding version bumps."
fi

exit $EXIT_CODE
