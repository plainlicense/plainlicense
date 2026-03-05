# Non-Functional Requirements (NFR) - FR-039 to FR-050

**Purpose**: Define performance, availability, accessibility, security, and operational requirements critical to production quality

**Context**: These NFRs were identified as missing from the original specification by the expert review panel. They are CRITICAL for ensuring the system meets production quality standards and success criteria.

---

## Performance Requirements

### FR-039: Page Load Performance
**Category**: Performance
**Priority**: P1 (MVP)
**Success Criteria**: SC-002

**Requirement**: The system MUST deliver license pages with complete at-a-glance summary visible within 2 seconds for 95% of visitors under normal network conditions (4G/broadband).

**Measurement Method**:
- Lighthouse CI performance testing in GitHub Actions (target score: >90)
- Real User Monitoring (RUM) in production via Cloudflare Web Analytics
- Metrics tracked: First Contentful Paint (FCP), Largest Contentful Paint (LCP), Time to Interactive (TTI)

**Acceptance Criteria**:
- LCP < 2.0 seconds (95th percentile)
- FCP < 1.2 seconds (95th percentile)
- Total Blocking Time < 200ms
- Cumulative Layout Shift < 0.1

**Technical Constraints**:
- Asset optimization: Images lazy-loaded, fonts preloaded
- Code splitting: Critical CSS inline, JavaScript deferred
- CDN caching: Static assets cached for 1 year with hash-based invalidation

**Related Tasks**: T226 (performance test), T266 (SC-002 validation)

---

### FR-040: Build Performance
**Category**: Performance
**Priority**: P1 (MVP)
**Success Criteria**: Operational efficiency

**Requirement**: The system MUST complete full site rebuild (Astro build + export generation) in less than 60 seconds for up to 50 licenses on Cloudflare Pages build infrastructure.

**Measurement Method**:
- Build performance monitoring in CI (GitHub Actions timing)
- Build duration dashboard tracking trends over time
- Alert if build time exceeds 60 seconds

**Acceptance Criteria**:
- Build time < 60 seconds for 50 licenses
- Export generation time < 30 seconds (all formats)
- Incremental builds rebuild only changed licenses

**Technical Constraints**:
- Parallel export generation (Promise.all for independent formats)
- Incremental build strategy (detect changed licenses via Git diff)
- Build caching enabled for dependencies and generated artifacts

**Related Tasks**: T051a (incremental exports), T288 (build scaling test)

---

### FR-040a: Build Timeout Safety
**Category**: Performance
**Priority**: P1 (MVP)
**Success Criteria**: Operational safety

**Requirement**: Build MUST timeout and fail after 5 minutes (300 seconds) to prevent runaway processes and resource exhaustion on Cloudflare Pages infrastructure (30-minute hard limit).

**Measurement Method**:
- Build timeout monitoring in CI (GitHub Actions)
- Alert thresholds at multiple levels (warning, error, fatal)
- Build performance dashboard tracking timeout frequency

**Acceptance Criteria**:
- Warning alert at 120 seconds (2 minutes) - Continue build but alert team
- Error alert at 180 seconds (3 minutes) - Fail non-critical exports only
- Fatal timeout at 300 seconds (5 minutes) - Hard kill with detailed error report
- Zero builds exceeding 5-minute threshold in production

**Technical Constraints**:
- Implement timeout at export orchestrator level (T051b)
- Graceful shutdown with partial export cleanup
- Detailed error reporting for timeout investigation
- Alert monitoring team on warning/error thresholds

**Related Tasks**: T051b (export orchestrator with timeout), T288 (build scaling test)

**Rationale**: Prevents infinite loops, resource leaks, or stuck processes from consuming Cloudflare Pages build resources. Early warning thresholds (2min, 3min) enable proactive intervention before hard timeout.

---

### FR-041: Interactive Response Time
**Category**: Performance
**Priority**: P2
**Success Criteria**: SC-004

**Requirement**: Comparison mode highlighting MUST respond to hover interactions within 100 milliseconds (measured from hover event to visual highlight display).

**Measurement Method**:
- Automated performance testing with timing assertions
- User event simulation with high-resolution timers
- Performance budget enforcement in CI

**Acceptance Criteria**:
- Hover → highlight latency < 100ms (95th percentile)
- Smooth 60fps animation for highlight transitions
- No visual jank or layout shifts during highlight

**Technical Constraints**:
- Use CSS Custom Highlight API for native browser performance
- Fallback to optimized DOM manipulation for older browsers
- Virtual scrolling for documents with >100 sections

**Related Tasks**: T239 (highlight latency test), T268 (SC-004 validation)

---

## Availability & Reliability Requirements

### FR-042: System Uptime
**Category**: Availability
**Priority**: P1 (MVP)
**Success Criteria**: Production reliability

**Requirement**: The system MUST maintain 99.9% uptime (monthly basis) as guaranteed by Cloudflare Pages Service Level Agreement.

**Measurement Method**:
- Cloudflare Pages uptime dashboard
- Synthetic monitoring (Pingdom, Uptime Robot, or Checkly)
- Incident tracking and post-mortem documentation

**Acceptance Criteria**:
- Maximum planned downtime: 43.2 minutes per month
- Unplanned downtime: <8.64 minutes per month
- MTTR (Mean Time To Recovery): <15 minutes

**Technical Constraints**:
- Static site architecture (no server-side failures)
- Global CDN distribution (multi-region availability)
- Automated deployment rollback on build failures

**Related Tasks**: T305 (synthetic monitoring)

---

### FR-043: Build Reliability
**Category**: Reliability
**Priority**: P1 (MVP)
**Success Criteria**: SC-005

**Requirement**: Export generation MUST achieve 100% success rate for all published licenses, failing entire build if any format fails to generate.

**Measurement Method**:
- Build error logging and tracking (Sentry or similar)
- Export generation metrics dashboard
- Alert on any export generation failures

**Acceptance Criteria**:
- Zero silent export failures (build MUST fail fast)
- Clear error messages for all export format failures
- Automatic retry with exponential backoff for transient failures

**Technical Constraints**:
- Fail-fast build strategy (abort on first export failure)
- Detailed error logging with stack traces
- Validation of all generated exports against schemas

**Related Tasks**: T051b (fail-fast orchestrator), T269 (SC-005 validation)

---

## Accessibility Requirements

### FR-044: WCAG 2.1 AA Compliance
**Category**: Accessibility
**Priority**: P1 (MVP)
**Success Criteria**: SC-010

**Requirement**: The system MUST comply with WCAG 2.1 Level AA accessibility standards across all pages and interactive components.

**Measurement Method**:
- Automated accessibility testing (axe-core) in CI
- Manual accessibility audit with screen readers (NVDA, JAWS, VoiceOver)
- Lighthouse accessibility score (target: 100)

**Acceptance Criteria**:
- Zero axe-core violations (critical/serious)
- Keyboard navigation support for all interactive elements
- Screen reader compatibility (ARIA labels, semantic HTML)
- Minimum contrast ratio: 4.5:1 for text, 3:1 for UI components
- Focus indicators visible and high-contrast

**Technical Constraints**:
- Starlight theme baseline: WCAG 2.1 AA compliant by default
- Custom components MUST maintain accessibility standards
- Regular accessibility regression testing

**Related Tasks**: T177 (accessibility audit), T274 (SC-010 validation), T282 (automated accessibility testing)

---

### FR-045: Keyboard Navigation
**Category**: Accessibility
**Priority**: P1 (MVP)
**Success Criteria**: SC-010 (subset)

**Requirement**: All interactive features (CMS, comparison mode, downloads, navigation) MUST be fully operable via keyboard without mouse/pointer.

**Measurement Method**:
- Manual keyboard navigation testing
- Automated keyboard trap detection
- Focus order validation

**Acceptance Criteria**:
- Tab key navigates through all interactive elements in logical order
- Enter/Space activates buttons and links
- Escape key closes modals and comparison mode
- No keyboard traps (focus can always move forward/backward)
- Skip links provided for long navigation

**Technical Constraints**:
- Tab index management for custom components
- Focus trap implementation for modals
- ARIA attributes for complex widgets

**Related Tasks**: T177 (accessibility audit)

---

## Security Requirements

### FR-046: Authentication Security
**Category**: Security
**Priority**: P1 (MVP)
**Success Criteria**: Production security

**Requirement**: CMS authentication MUST implement OAuth 2.0 with PKCE (Proof Key for Code Exchange) and enforce secure token storage practices.

**Measurement Method**:
- Security audit of OAuth flow
- Penetration testing of authentication endpoints
- Token expiration and refresh validation

**Acceptance Criteria**:
- OAuth 2.0 Authorization Code Grant with PKCE
- JWT access tokens with 15-minute expiration (RS256 signing)
- Refresh tokens with 7-day expiration (opaque, server-side validation)
- CSRF protection via state parameter
- Secure token storage (httpOnly cookies OR localStorage with XSS mitigation)

**Technical Constraints**:
- Cloudflare Workers OAuth proxy handles token exchange
- Session regeneration after authentication
- Rate limiting: 5 auth attempts per 15 minutes per IP
- Automatic logout after 24 hours of inactivity

**Related Tasks**: T131-T144 (authentication implementation), T292 (OAuth security audit)

---

### FR-047: Content Security Policy
**Category**: Security
**Priority**: P1 (MVP)
**Success Criteria**: Production security

**Requirement**: The system MUST enforce strict Content Security Policy (CSP) headers to prevent XSS, clickjacking, and content injection attacks.

**Measurement Method**:
- CSP header validation in security tests
- CSP violation reporting and monitoring
- Regular security header scanning (SecurityHeaders.com)

**Acceptance Criteria**:
- CSP Level 3 strict policy (nonces for inline scripts)
- X-Frame-Options: DENY (prevent clickjacking)
- X-Content-Type-Options: nosniff
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- Referrer-Policy: strict-origin-when-cross-origin

**Technical Constraints**:
- CSP nonces generated per request for inline scripts
- Trusted external domains whitelisted (GitHub, Cloudflare)
- CSP violation reports logged to monitoring service

**Related Tasks**: T141 (security headers), T294 (CSP validation), T298 (security headers test)

---

### FR-048: Input Sanitization
**Category**: Security
**Priority**: P1 (MVP)
**Success Criteria**: Data integrity

**Requirement**: CMS MUST sanitize all user input to prevent XSS, markdown injection, and path traversal attacks.

**Measurement Method**:
- Automated security testing with OWASP ZAP or similar
- Manual penetration testing of CMS input fields
- Markdown parser security review

**Acceptance Criteria**:
- HTML escaping for all user-provided text fields
- Markdown parser configured to disable raw HTML (GFM strict mode)
- File upload paths validated (no ../ traversal)
- Template block references validated against allowlist

**Technical Constraints**:
- Use trusted markdown parser (remark with security plugins)
- Content validation at multiple layers (client, server, build)
- Zod schema validation for all frontmatter fields

**Related Tasks**: T293 (input sanitization audit)

---

## Monitoring & Observability Requirements

### FR-049: Build Monitoring
**Category**: Observability
**Priority**: P2
**Success Criteria**: Operational visibility

**Requirement**: The system MUST log all export generation attempts with success/failure status and alert team on repeated failures.

**Measurement Method**:
- Build logs aggregation (Cloudflare Pages logs)
- Error tracking (Sentry, Rollbar, or similar)
- Build performance dashboard (Grafana or equivalent)

**Acceptance Criteria**:
- All export generation attempts logged with timestamp, license, format, status
- Errors logged with stack traces and context
- Alert triggered if >3 consecutive build failures
- Build duration tracked and alerted if >60 seconds

**Technical Constraints**:
- Structured logging (JSON format for parsing)
- Log retention: 90 days minimum
- Real-time error notifications (Slack, email)

**Related Tasks**: T217 (error tracking), T218 (performance dashboard)

---

### FR-050: Application Monitoring
**Category**: Observability
**Priority**: P2
**Success Criteria**: Production health visibility

**Requirement**: The system MUST track page load performance, CMS authentication errors, and export download success rates with alerting on anomalies.

**Measurement Method**:
- Real User Monitoring (Cloudflare Web Analytics)
- Error tracking (Sentry client-side integration)
- Custom metrics dashboard (Grafana + Prometheus or similar)

**Acceptance Criteria**:
- Page load times tracked per page (p50, p95, p99)
- JavaScript errors captured with stack traces and user context
- CMS authentication failures logged and alerted
- Export download 404 errors tracked and investigated
- Comparison mode usage metrics tracked

**Technical Constraints**:
- Privacy-respecting analytics (no PII tracking)
- Client-side error boundary for graceful degradation
- Sampling rate: 100% for errors, 10% for performance metrics

**Related Tasks**: T216 (Cloudflare Analytics), T217 (error tracking)

---

## Data Integrity Requirements

### FR-051: Version Control Integrity
**Category**: Data Integrity
**Priority**: P1 (MVP)
**Success Criteria**: Content reliability

**Requirement**: The system MUST retain all version history indefinitely via Git and protect against accidental data loss through branch protection and backup strategies.

**Measurement Method**:
- Git repository backup validation
- Branch protection enforcement checks
- Recovery time objective (RTO) testing

**Acceptance Criteria**:
- Branch protection enabled on main branch (require PR reviews)
- Daily automated backups to separate storage (GitHub automatic backups + manual S3/R2)
- Recovery Point Objective (RPO): <24 hours
- Recovery Time Objective (RTO): <1 hour
- Soft delete for CMS content (30-day retention in "trash")

**Technical Constraints**:
- Git hooks prevent force-pushes to main
- Require at least 1 approving review for PRs
- Automated backup verification (restore test monthly)

**Related Tasks**: T219-T221 (branch protection, backups, soft delete)

---

### FR-052: Content Validation
**Category**: Data Integrity
**Priority**: P1 (MVP)
**Success Criteria**: Content quality

**Requirement**: CMS MUST validate all content against Zod schemas before allowing publish and prevent publishing licenses with >10% invalid section mappings.

**Measurement Method**:
- Pre-publish validation enforcement
- Mapping validation error tracking
- Content quality metrics dashboard

**Acceptance Criteria**:
- All frontmatter fields validated against Zod schemas
- Minimum content length enforced (100 characters for plain language)
- Template block references validated (must exist)
- Mapping completeness warnings for <95% mapped plain clauses
- Publish blocked if >10% invalid mappings

**Technical Constraints**:
- Validation at multiple layers (CMS client-side, Git commit hook, build-time)
- Clear error messages with field-level feedback
- Validation bypass requires explicit admin override with justification

**Related Tasks**: T072a-T072b (mapping validation), T167 (migration validation)

---

## Scalability Requirements

### FR-053: License Volume Scalability
**Category**: Scalability
**Priority**: P3 (Post-MVP)
**Success Criteria**: Future growth

**Requirement**: The system SHOULD support growth from 50 licenses to 500 licenses without degrading build performance beyond 120 seconds or requiring infrastructure changes.

**Measurement Method**:
- Build performance testing with scaled license volumes
- Repository size monitoring
- CI/CD resource usage tracking

**Acceptance Criteria**:
- Build time grows sub-linearly with license count (incremental builds)
- Repository size <100 MB with 500 licenses (excluding Git history)
- GitHub API rate limits <50% utilization with 100 concurrent editors
- CDN bandwidth usage within Cloudflare Pages free tier

**Technical Constraints**:
- Incremental export generation (T051a) REQUIRED for >100 licenses
- Git LFS for large binary assets if repository >100 MB
- Build caching and artifact reuse

**Related Tasks**: T051a (incremental exports), T288 (build scaling test), T290 (stress test)

---

## Resilience Requirements

### FR-054: Circuit Breaker Pattern
**Category**: Resilience
**Priority**: P2 (Important for production)
**Success Criteria**: Graceful degradation

**Requirement**: System MUST implement circuit breaker pattern for external dependencies (GitHub API, OAuth providers, Typst PDF generation) to ensure graceful degradation during service failures.

**Measurement Method**:
- Circuit breaker state monitoring (closed, open, half-open)
- Failure rate tracking for each dependency
- Alert on circuit breaker activations

**Acceptance Criteria**:
- **GitHub API**: Open circuit after 3 failures within 30 seconds
- **OAuth Providers**: Open circuit after 5 failures within 60 seconds
- **Typst PDF Generation**: Timeout after 30 seconds per license, skip PDF export with warning
- Half-open state attempts every 60 seconds
- Full recovery after 3 consecutive successes
- Alert monitoring team when circuit opens

**Technical Constraints**:
- Implement using Cloudflare Workers for OAuth proxy
- Build-time circuit breaker for Typst (fail gracefully, export other formats)
- Fallback behaviors:
  - GitHub API failure → Cache last known state, manual sync
  - OAuth failure → Display maintenance message to editors
  - Typst failure → Export all formats except PDF with "PDF generation failed" notice

**Circuit Breaker States**:
```yaml
Closed (Normal Operation):
  - All requests pass through to dependency
  - Track failure rate within rolling window
  - Open circuit if threshold exceeded

Open (Failure Mode):
  - Immediately fail requests without calling dependency
  - Return fallback response or cached data
  - Attempt half-open after timeout period

Half-Open (Recovery Testing):
  - Allow limited requests through (1-3 test requests)
  - Close circuit if requests succeed
  - Reopen circuit if requests fail
```

**Monitoring Metrics**:
- Circuit breaker state changes per hour
- Average time in open state
- Fallback activation frequency
- Recovery success rate (half-open → closed)

**Related Tasks**: T131-T144 (OAuth proxy implementation), T047 (Typst PDF generation)

**Rationale**: External service failures (GitHub outages, OAuth provider issues, Typst crashes) should not break entire build or prevent editors from working. Circuit breakers enable graceful degradation and automatic recovery.

---

## NFR Summary

**Total Non-Functional Requirements**: 17 (FR-039 to FR-054, including FR-040a)

**Distribution**:
- **Performance**: 4 requirements (FR-039, FR-040, FR-040a, FR-041)
- **Availability & Reliability**: 2 requirements (FR-042 to FR-043)
- **Accessibility**: 2 requirements (FR-044 to FR-045)
- **Security**: 3 requirements (FR-046 to FR-048)
- **Monitoring & Observability**: 2 requirements (FR-049 to FR-050)
- **Data Integrity**: 2 requirements (FR-051 to FR-052)
- **Scalability**: 1 requirement (FR-053)
- **Resilience**: 1 requirement (FR-054)

**Priority Breakdown**:
- **P1 (MVP)**: 14 requirements (must implement before launch) - includes FR-040a
- **P2**: 3 requirements (implement during MVP) - includes FR-054
- **P3 (Post-MVP)**: 1 requirement (optimize for future growth)

**Success Criteria Coverage**:
- **SC-002** (Page load): FR-039
- **SC-004** (Comparison highlighting): FR-041
- **SC-005** (Export success): FR-043
- **SC-010** (Accessibility): FR-044, FR-045

---

## Integration with Existing Specification

**Add to spec.md after FR-038**:

```markdown
### Non-Functional Requirements

#### Performance

- **FR-039**: System MUST deliver license pages within 2 seconds for 95% of visitors (LCP <2s, FCP <1.2s) - SC-002
- **FR-040**: System MUST complete full rebuild in <60 seconds for up to 50 licenses with incremental build support
- **FR-041**: Comparison mode highlighting MUST respond to hover within 100ms - SC-004

#### Availability & Reliability

- **FR-042**: System MUST maintain 99.9% uptime (Cloudflare Pages SLA with synthetic monitoring)
- **FR-043**: Export generation MUST achieve 100% success rate with fail-fast build strategy - SC-005

#### Accessibility

- **FR-044**: System MUST comply with WCAG 2.1 Level AA standards (axe-core validation, Lighthouse 100 score) - SC-010
- **FR-045**: All features MUST be fully operable via keyboard without mouse (tab navigation, no keyboard traps)

#### Security

- **FR-046**: Authentication MUST use OAuth 2.0 with PKCE, 15-min JWT expiration, CSRF protection
- **FR-047**: System MUST enforce strict CSP, HSTS, X-Frame-Options, and security headers
- **FR-048**: CMS MUST sanitize all input (HTML escaping, markdown strict mode, path validation)

#### Monitoring & Observability

- **FR-049**: System MUST log all build attempts with success/failure status and alert on failures
- **FR-050**: System MUST track page load, auth errors, and download metrics with anomaly alerting

#### Data Integrity

- **FR-051**: System MUST retain all version history via Git with branch protection and daily backups
- **FR-052**: CMS MUST validate content against Zod schemas and prevent publishing with >10% invalid mappings

#### Scalability

- **FR-053**: System SHOULD support 500 licenses with <120s build time via incremental generation (future growth)
```

---

## Validation Checklist

Use this checklist to verify all NFRs are properly addressed:

- [ ] **FR-039**: Lighthouse CI configured with performance budgets
- [ ] **FR-039**: Cloudflare Web Analytics tracking LCP, FCP, TTI
- [ ] **FR-040**: Build performance monitoring dashboard created
- [ ] **FR-040**: Incremental export generation implemented (T051a)
- [ ] **FR-041**: Hover latency performance test created (T239)
- [ ] **FR-042**: Synthetic monitoring configured (Pingdom/Uptime Robot)
- [ ] **FR-043**: Fail-fast export orchestrator implemented (T051b)
- [ ] **FR-044**: Axe-core automated testing in CI (T282)
- [ ] **FR-044**: Manual accessibility audit completed (T177)
- [ ] **FR-045**: Keyboard navigation tested for all features
- [ ] **FR-046**: OAuth 2.0 with PKCE flow implemented (T131-T144)
- [ ] **FR-046**: Security audit completed (T292)
- [ ] **FR-047**: CSP headers configured and tested (T294, T298)
- [ ] **FR-048**: Input sanitization audit completed (T293)
- [ ] **FR-049**: Build error tracking configured (T217)
- [ ] **FR-050**: Application monitoring setup (T216, T217)
- [ ] **FR-051**: Branch protection enabled (T219)
- [ ] **FR-051**: Automated backups configured (T220)
- [ ] **FR-052**: Content validation rules implemented (T072a-T072b)
- [ ] **FR-053**: Build scaling test validates 500-license capacity (T288, T290)

---

## Measurement & Reporting

**Weekly NFR Health Dashboard**:

```yaml
Performance:
  - Page Load (LCP): 1.8s (Target: <2s) ✅
  - Build Time: 45s (Target: <60s) ✅
  - Hover Latency: 85ms (Target: <100ms) ✅

Availability:
  - Uptime: 99.95% (Target: 99.9%) ✅
  - Export Success Rate: 100% (Target: 100%) ✅

Accessibility:
  - WCAG Violations: 0 (Target: 0) ✅
  - Lighthouse Score: 98 (Target: 100) ⚠️

Security:
  - Auth Failures: 3 (Target: <10/week) ✅
  - CSP Violations: 0 (Target: 0) ✅
  - Dependency Vulns: 1 low (Target: 0 critical/high) ✅

Monitoring:
  - Build Failures: 0 (Target: 0) ✅
  - JS Errors: 12 (Target: <50/week) ✅
```

**Monthly NFR Review**:
- Review all metrics trends
- Identify NFR violations and remediation
- Adjust thresholds based on actual usage patterns
- Update NFRs as system evolves
