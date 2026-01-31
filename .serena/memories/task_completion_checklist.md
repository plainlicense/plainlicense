# Plain License - Task Completion Checklist

When completing a task in this project, follow this checklist:

## 1. Code Quality Checks
```bash
# Run all checks before considering task complete
make check

# If checks fail, auto-fix what's possible
make fix

# Verify fixes worked
make check
```

## 2. Build Verification
```bash
# Ensure project builds successfully
make build

# For comprehensive verification
make all  # Runs fix + build
```

## 3. Local Testing
```bash
# Start development server to manually verify changes
mkdocs serve
# View at http://127.0.0.1:8000
```

## 4. Specific Type Checks
Depending on what you modified:

### TypeScript Changes
```bash
make check-ts      # Type checking + linting
bun tsc --noEmit   # Type check only
```

### Python Changes
```bash
make check-py      # Ruff checks
```

### CSS/Style Changes
```bash
make check-css     # Stylelint checks
```

### Content/Markdown Changes
```bash
make check-md      # Markdownlint checks
```

### HTML/Template Changes
```bash
make check-html    # LintHTML checks
```

## 5. Documentation Updates
If you changed functionality:
- Update relevant documentation in `docs/`
- Update CLAUDE.md if it affects AI code assistant guidance
- Update README.md for user-facing changes

## 6. License Package Updates
If you modified license content:
- Update package version in `packages/[license]/package.json`
- Update CHANGELOG for the package
- Verify frontmatter metadata is correct
- Test both plain and original versions

## 7. Git Workflow
```bash
# Use interactive conventional commits
make cm

# DO NOT manually commit without running make cm
# This ensures proper formatting and conventional commit format
```

## 8. Pre-Commit Validation
The project uses git hooks that will:
- Format staged TypeScript files with Biome
- Validate commit message format
- Run pre-commit checks

These run automatically when using `make cm`.

## 9. CI/CD Compatibility
Before pushing:
```bash
# Run the same checks CI will run
make ci      # For main branch
make ci-dev  # For dev branch
```

## 10. Final Verification
- [ ] All `make check` passes
- [ ] `make build` succeeds
- [ ] Local server (`mkdocs serve`) displays changes correctly
- [ ] No console errors in browser
- [ ] Changes work across different viewports (mobile, tablet, desktop)
- [ ] All new/modified code follows project conventions
- [ ] Commit message follows conventional commits format

## Common Issues & Solutions

### Build Failures
- Check for TypeScript errors: `bun tsc --noEmit`
- Verify all dependencies installed: `make sync`
- Clear cache: `rm -rf .cache`

### Linting Failures
- Auto-fix: `make fix`
- Check specific type: `make check-ts`, `make check-py`, etc.
- Review tool-specific config files

### Content Not Updating
- Clear MkDocs cache: `rm -rf .cache`
- Rebuild assets: `bun run build`
- Restart dev server: `mkdocs serve`

### Git Hook Issues
- Reinstall hooks: Run setup script portions related to git hooks
- Check hook permissions: `chmod +x .git/hooks/*`