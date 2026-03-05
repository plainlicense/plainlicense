# Phase 14: Testing & Quality Assurance (CRITICAL ADDITION)

**Purpose**: Validate all user stories meet acceptance criteria and success criteria with automated testing

**Rationale**: Tests are CRITICAL for validating 15 success criteria, preventing regressions in complex features (mapping system, export generation, versioning), and ensuring production quality. Without tests, the project ships with unknown quality and high regression risk.

**Estimated Effort**: 60-80 hours (25-30% of total project)

---

## Test Infrastructure Setup

- [ ] T199 [P] Setup Vitest test framework with coverage reporting (@vitest/coverage-v8)
- [ ] T200 [P] Setup Playwright test framework for E2E browser testing
- [ ] T201 [P] Configure test CI pipeline in GitHub Actions (.github/workflows/test.yml)
- [ ] T202 [P] Setup test database/fixtures for integration tests
- [ ] T203 [P] Configure code coverage thresholds (80% minimum for critical paths)
- [ ] T204 [P] Setup visual regression testing infrastructure (Percy, Chromatic, or Playwright screenshots)

---

## User Story 1 Tests - Content Editor Creates License Content

**Focus**: CMS workflow, template blocks, readability metrics, content validation

- [ ] T205 [P] [US1] Unit test: SHA-256 hash generation with normalization edge cases (tests/unit/hash.test.ts)
- [ ] T206 [P] [US1] Unit test: Gunning Fog readability calculation accuracy (tests/unit/readability.test.ts)
- [ ] T207 [P] [US1] Unit test: Shame words counter against known test cases (tests/unit/shame-counter.test.ts)
- [ ] T208 [US1] Integration test: Astro Content Collections validation with Zod schemas (tests/integration/content-validation.test.ts)
- [ ] T209 [US1] Integration test: Template block injection in license content (tests/integration/template-blocks.test.ts)
- [ ] T210 [US1] Integration test: Draft/published status workflow (tests/integration/publishing-workflow.test.ts)
- [ ] T211 [US1] E2E test: Complete CMS workflow - create license → save → preview (tests/e2e/cms-create-license.spec.ts)
- [ ] T212 [US1] E2E test: Template block insertion from centralized library (tests/e2e/template-blocks.spec.ts)
- [ ] T213 [US1] E2E test: Version metadata tracking and changelog generation (tests/e2e/version-tracking.spec.ts)

---

## User Story 2 Tests - Visitor Understands and Downloads License

**Focus**: Export generation, download functionality, clipboard operations, performance

- [ ] T214 [P] [US2] Unit test: Markdown GFM export format correctness (tests/unit/exports/markdown-gfm.test.ts)
- [ ] T215 [P] [US2] Unit test: CommonMark export format correctness (tests/unit/exports/markdown-commonmark.test.ts)
- [ ] T216 [P] [US2] Unit test: Plaintext export format correctness (tests/unit/exports/plaintext.test.ts)
- [ ] T217 [P] [US2] Unit test: SPDX XML export validation against official schema (tests/unit/exports/spdx-xml.test.ts)
- [ ] T218 [P] [US2] Unit test: Embed HTML export escaping and sanitization (tests/unit/exports/embed-html.test.ts)
- [ ] T219 [US2] Integration test: Typst PDF generation with golden file comparison (tests/integration/pdf-generation.test.ts)
- [ ] T220 [US2] Integration test: Export orchestrator coordinates all 6 formats (tests/integration/export-orchestrator.test.ts)
- [ ] T221 [US2] Integration test: Version metadata included in all export formats (tests/integration/export-metadata.test.ts)
- [ ] T222 [US2] E2E test: Download all 6 formats and verify content integrity (tests/e2e/download-all-formats.spec.ts)
- [ ] T223 [US2] E2E test: Copy-to-clipboard functionality with visual feedback (tests/e2e/clipboard-copy.spec.ts)
- [ ] T224 [US2] E2E test: OpenGraph social media card generation (tests/e2e/social-cards.spec.ts)
- [ ] T225 [US2] Performance test: Clipboard copy operation <50ms (tests/performance/clipboard-speed.test.ts)
- [ ] T226 [US2] Performance test: Page load <2s for 95th percentile (tests/performance/page-load.test.ts)
- [ ] T227 [US2] Validation test: All export formats match golden files for MIT, MPL-2.0, Apache-2.0 (tests/validation/export-golden-files.test.ts)

---

## User Story 3 Tests - Editor Maps Plain Language to Original

**Focus**: Mapping creation, hash validation, semantic tags, JSON schema compliance

- [ ] T228 [P] [US3] Unit test: Mapping JSON schema validation - valid and invalid cases (tests/unit/mapping-schema.test.ts)
- [ ] T229 [P] [US3] Unit test: Confidence scoring calculation per mapping type (tests/unit/confidence-scoring.test.ts)
- [ ] T230 [P] [US3] Unit test: SHA-256 hash normalization rules (whitespace, markdown) (tests/unit/hash-normalization.test.ts)
- [ ] T231 [US3] Integration test: Create mapping → edit content → verify hash change detection (tests/integration/mapping-invalidation.test.ts)
- [ ] T232 [US3] Integration test: Semantic tag validation and tag-level grouping (tests/integration/semantic-tags.test.ts)
- [ ] T233 [US3] Integration test: One-to-one, one-to-many, many-to-one mapping types (tests/integration/mapping-types.test.ts)
- [ ] T234 [US3] E2E test: Complete mapping workflow - select clauses → save → verify persistence (tests/e2e/mapping-editor.spec.ts)
- [ ] T235 [US3] E2E test: Mapping preservation when plain language content edited (tests/e2e/mapping-preservation.spec.ts)
- [ ] T236 [US3] Validation test: Mapping completeness requirements (<5% unmapped plain, <10% unmapped original) (tests/validation/mapping-completeness.test.ts)

---

## User Story 4 Tests - Visitor Compares Plain Language to Original

**Focus**: Comparison mode, highlighting performance, visual interactions, session persistence

- [ ] T237 [P] [US4] Integration test: Load mapping data from JSON and render highlights (tests/integration/comparison-rendering.test.ts)
- [ ] T238 [P] [US4] Integration test: CSS Custom Highlight API integration (tests/integration/highlight-api.test.ts)
- [ ] T239 [US4] Performance test: Hover highlighting response time <100ms (tests/performance/highlight-latency.test.ts)
- [ ] T240 [US4] E2E test: Enable comparison mode → hover sections → verify visual highlighting (tests/e2e/comparison-mode.spec.ts)
- [ ] T241 [US4] E2E test: Detailed side-by-side modal for clicked sections (tests/e2e/comparison-modal.spec.ts)
- [ ] T242 [US4] E2E test: Session preference persistence across page navigation (tests/e2e/comparison-preference.spec.ts)
- [ ] T243 [US4] E2E test: Graceful fallback for licenses without mappings (tests/e2e/comparison-no-mappings.spec.ts)

---

## User Story 5 Tests - Content Manager Versions and Publishes

**Focus**: Versioning workflow, semantic-release, conventional commits, changelog generation

- [ ] T244 [P] [US5] Unit test: Conventional commit message parsing (fix, feat, BREAKING CHANGE) (tests/unit/conventional-commits.test.ts)
- [ ] T245 [P] [US5] Unit test: Semantic version bump rules (patch, minor, major) (tests/unit/version-bumping.test.ts)
- [ ] T246 [US5] Integration test: Semantic-release version bump workflow (tests/integration/semantic-release.test.ts)
- [ ] T247 [US5] Integration test: Changelog generation from commit messages (tests/integration/changelog-generation.test.ts)
- [ ] T248 [US5] Integration test: Git tag creation with correct format (license-vX.Y.Z) (tests/integration/git-tagging.test.ts)
- [ ] T249 [US5] Integration test: GitHub release creation with export attachments (tests/integration/github-releases.test.ts)
- [ ] T250 [US5] E2E test: Publish license → verify new version created → verify GitHub release (tests/e2e/version-publishing.spec.ts)
- [ ] T251 [US5] E2E test: Version history display and historical version access (tests/e2e/version-history.spec.ts)

---

## User Story 6 Tests - Editor Uses Reactive Components

**Focus**: Component parsing, rendering, static export conversion

- [ ] T252 [P] [US6] Unit test: Component placeholder parser ({{faq}}, {{table}}, {{tree}}) (tests/unit/component-parser.test.ts)
- [ ] T253 [P] [US6] Unit test: Component configuration options parsing (tests/unit/component-config.test.ts)
- [ ] T254 [US6] Integration test: FAQ component rendering to interactive HTML (tests/integration/faq-component.test.ts)
- [ ] T255 [US6] Integration test: Comparison table component rendering (tests/integration/table-component.test.ts)
- [ ] T256 [US6] Integration test: Decision tree component rendering (tests/integration/tree-component.test.ts)
- [ ] T257 [US6] Integration test: Component static export to PDF format (tests/integration/component-pdf-export.test.ts)
- [ ] T258 [US6] E2E test: Insert component in CMS → preview → verify rendering (tests/e2e/component-insertion.spec.ts)
- [ ] T259 [US6] E2E test: Component library browser interface (tests/e2e/component-library.spec.ts)

---

## User Story 7 Tests - Visitor Reads Blog Content

**Focus**: Blog collection validation, post rendering, navigation

- [ ] T260 [P] [US7] Integration test: Blog post collection validation against Zod schema (tests/integration/blog-validation.test.ts)
- [ ] T261 [P] [US7] Integration test: Related licenses widget rendering (tests/integration/related-licenses.test.ts)
- [ ] T262 [US7] E2E test: Create blog post → publish → verify listing page (tests/e2e/blog-create.spec.ts)
- [ ] T263 [US7] E2E test: Blog post detail page with rich content rendering (tests/e2e/blog-detail.spec.ts)
- [ ] T264 [US7] E2E test: Blog pagination and navigation (tests/e2e/blog-pagination.spec.ts)

---

## Success Criteria Validation Tests

**Focus**: Automated validation of all 15 success criteria with measurable outcomes

- [ ] T265 [SC-001] Test: Editor workflow completes in <30 minutes (timed E2E test with realistic content) (tests/success-criteria/sc-001-editor-time.test.ts)
- [ ] T266 [SC-002] Test: Page load <2s for 95% of visitors (Lighthouse CI with multiple pages) (tests/success-criteria/sc-002-page-load.test.ts)
- [ ] T267 [SC-003] Test: Download success rate 98% (reliability testing with network conditions) (tests/success-criteria/sc-003-download-reliability.test.ts)
- [ ] T268 [SC-004] Test: Comparison highlighting <100ms (performance testing with timing assertions) (tests/success-criteria/sc-004-highlight-speed.test.ts)
- [ ] T269 [SC-005] Test: Export generation 100% success for all published licenses (tests/success-criteria/sc-005-export-success.test.ts)
- [ ] T270 [SC-006] Test: PDF quality matches professional legal documents (visual regression + typography validation) (tests/success-criteria/sc-006-pdf-quality.test.ts)
- [ ] T271 [SC-007] Test: Mapping creation workflow <5 minutes for 10 connections (timed integration test) (tests/success-criteria/sc-007-mapping-time.test.ts)
- [ ] T272 [SC-008] Test: Version history access <3 seconds (performance testing) (tests/success-criteria/sc-008-history-speed.test.ts)
- [ ] T273 [SC-009] Test: Template blocks reduce duplicate content by 60% (statistical analysis of content reuse) (tests/success-criteria/sc-009-template-reuse.test.ts)
- [ ] T274 [SC-010] Test: WCAG 2.1 AA accessibility compliance (axe-core automated testing) (tests/success-criteria/sc-010-accessibility.test.ts)
- [ ] T275 [SC-011] Test: OpenGraph image generation and social media display (visual validation) (tests/success-criteria/sc-011-social-cards.test.ts)
- [ ] T276 [SC-012] Test: Blog post creation time reduced by 50% vs current system (baseline comparison) (tests/success-criteria/sc-012-blog-efficiency.test.ts)
- [ ] T277 [SC-013] Test: Reactive components render correctly in web and static formats (cross-format validation) (tests/success-criteria/sc-013-component-rendering.test.ts)
- [ ] T278 [SC-014] Test: Session preference persistence across navigation (E2E state testing) (tests/success-criteria/sc-014-session-state.test.ts)
- [ ] T279 [SC-015] Test: Concurrent editing without data loss (multi-user simulation) (tests/success-criteria/sc-015-concurrent-editing.test.ts)

---

## Regression & Quality Assurance

**Focus**: Golden files, visual regression, continuous quality monitoring

- [ ] T280 [P] Create golden file test suite for all export formats (MIT, MPL-2.0, Apache-2.0 baseline) (tests/golden/)
- [ ] T281 [P] Setup visual regression testing for UI components (Percy/Chromatic or Playwright screenshots) (tests/visual/)
- [ ] T282 [P] Configure automated accessibility testing in CI (axe-core + Lighthouse) (.github/workflows/accessibility.yml)
- [ ] T283 [P] Create cross-browser compatibility test matrix (Chrome, Firefox, Safari, Edge) (tests/e2e/browsers.config.ts)
- [ ] T284 Setup mutation testing for critical business logic (Stryker or equivalent) (tests/mutation/)
- [ ] T285 Configure test coverage reporting and badge (Codecov, Coveralls) (.github/workflows/coverage.yml)
- [ ] T286 Create smoke test suite for deployment validation (tests/smoke/)

---

## Load & Performance Testing

**Focus**: Scalability validation, build performance, concurrent users

- [ ] T287 [P] Load test: Simulate 1,000 concurrent visitors and measure response times (tests/load/concurrent-visitors.test.ts)
- [ ] T288 [P] Build performance test: Measure build time for 10, 50, 100 licenses (tests/performance/build-scaling.test.ts)
- [ ] T289 [P] Export generation benchmark: Time per format per license (tests/performance/export-benchmarks.test.ts)
- [ ] T290 Stress test: Maximum licenses before build timeout (identify scalability limit) (tests/load/build-limits.test.ts)
- [ ] T291 Network performance test: Page load under various network conditions (3G, 4G, throttled) (tests/performance/network-conditions.test.ts)

---

## Security Testing

**Focus**: Authentication security, input sanitization, dependency vulnerabilities

- [ ] T292 [P] Security audit: OAuth flow (PKCE, CSRF protection, token expiration) (tests/security/oauth-flow.test.ts)
- [ ] T293 [P] Security audit: CMS input sanitization (XSS prevention, markdown injection) (tests/security/input-sanitization.test.ts)
- [ ] T294 [P] Security audit: Content Security Policy headers validation (tests/security/csp-headers.test.ts)
- [ ] T295 Security test: GitHub API token storage and transmission security (tests/security/token-security.test.ts)
- [ ] T296 Security test: Export file path traversal protection (tests/security/path-traversal.test.ts)
- [ ] T297 Dependency vulnerability scan: npm audit and Snyk integration (automated in CI)
- [ ] T298 Security headers test: HSTS, X-Frame-Options, X-Content-Type-Options (tests/security/security-headers.test.ts)

---

## Test Environment & CI/CD Integration

**Focus**: Local development testing, CI pipeline, deployment validation

- [ ] T299 [P] Document local test environment setup (README-TESTING.md)
- [ ] T300 [P] Create test data fixtures and factories for all entities (tests/fixtures/)
- [ ] T301 Configure GitHub Actions matrix testing (Node.js versions, OS platforms) (.github/workflows/test.yml)
- [ ] T302 Setup preview deployment testing (run E2E tests against Cloudflare Pages preview URLs) (.github/workflows/preview-test.yml)
- [ ] T303 Configure test result reporting and annotations in PRs (tests/reporters/)
- [ ] T304 Create test performance dashboard (track test execution time trends) (tests/performance-dashboard/)
- [ ] T305 Setup synthetic monitoring for production (Pingdom, Uptime Robot, or Checkly) (tests/synthetic/)

---

## Migration & Data Validation Testing

**Focus**: Content migration validation, data integrity, rollback testing

- [ ] T306 [P] Migration test: Validate existing license content migration to new schema (tests/migration/content-migration.test.ts)
- [ ] T307 [P] Migration test: Verify frontmatter compatibility and Zod schema validation (tests/migration/frontmatter-validation.test.ts)
- [ ] T308 Data integrity test: Compare migrated exports with original MkDocs output (tests/migration/export-comparison.test.ts)
- [ ] T309 Rollback test: Verify ability to revert to current system if migration fails (tests/migration/rollback-validation.test.ts)

---

## Test Task Summary

**Total Test Tasks**: 111 (T199-T309)

**Task Distribution**:
- **Infrastructure Setup**: 6 tasks (T199-T204)
- **User Story 1 (Content Editor)**: 9 tasks (T205-T213)
- **User Story 2 (Visitor Downloads)**: 14 tasks (T214-T227)
- **User Story 3 (Editor Maps)**: 9 tasks (T228-T236)
- **User Story 4 (Visitor Compares)**: 7 tasks (T237-T243)
- **User Story 5 (Versioning)**: 8 tasks (T244-T251)
- **User Story 6 (Reactive Components)**: 8 tasks (T252-T259)
- **User Story 7 (Blog)**: 5 tasks (T260-T264)
- **Success Criteria Validation**: 15 tasks (T265-T279)
- **Regression & QA**: 7 tasks (T280-T286)
- **Load & Performance**: 5 tasks (T287-T291)
- **Security Testing**: 7 tasks (T292-T298)
- **Test Environment**: 7 tasks (T299-T305)
- **Migration Testing**: 4 tasks (T306-T309)

**Estimated Effort**: 70-90 hours (25-30% of total project)

**Parallel Opportunities**: 45+ tasks marked [P] can run in parallel

**Critical Path**: Infrastructure (T199-T204) → User Story Tests → Success Criteria Validation

---

## Test Coverage Targets

**Minimum Coverage Requirements**:
- **Unit Tests**: 80% line coverage for critical business logic
- **Integration Tests**: 70% coverage for component interactions
- **E2E Tests**: 90% coverage for user acceptance scenarios
- **Success Criteria**: 100% coverage (all 15 criteria must have automated validation)

**Critical Paths Requiring 100% Coverage**:
- SHA-256 hash generation and normalization
- Export format generation (all 6 formats)
- Mapping validation and confidence scoring
- Version bumping and changelog generation
- OAuth authentication flow

---

## Testing Best Practices

1. **Test Naming Convention**: `[TestType]_[FeatureName]_[Scenario]_[ExpectedOutcome]`
   - Example: `Integration_ExportOrchestrator_GenerateAllFormats_ReturnsAllSixFormats`

2. **Golden File Management**:
   - Store in `tests/golden/{format}/{license}/`
   - Update with `npm run test:update-golden`
   - Review changes in PR diffs

3. **Flaky Test Prevention**:
   - Avoid hard-coded timeouts (use waitFor with conditions)
   - Mock external dependencies (GitHub API, Claude Code API)
   - Use test isolation (clean database/fixtures between tests)

4. **Performance Test Stability**:
   - Run on dedicated CI runners (not shared infrastructure)
   - Use percentile measurements (p50, p95, p99) not averages
   - Allow 10% variance for flaky threshold

5. **CI/CD Integration**:
   - Fail fast on unit test failures
   - Run E2E tests in parallel where possible
   - Cache dependencies and build artifacts
   - Report coverage trends over time

---

## Acceptance Criteria for Phase 14

✅ All 111 test tasks completed
✅ 80%+ code coverage achieved for critical paths
✅ All 15 success criteria have automated validation tests
✅ Zero known flaky tests in CI pipeline
✅ Test execution time <10 minutes for full suite
✅ Visual regression baseline established for all UI components
✅ Security testing passes with zero high/critical vulnerabilities
✅ Load testing confirms system handles 1,000 concurrent users
✅ Migration testing validates content integrity and rollback capability
