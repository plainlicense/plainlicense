# Plain License Site Review
**Date:** 2026-03-19  
**Reviewer:** GitHub Copilot Agent  
**Server:** Astro dev (port 4400)  
**Viewports tested:** Desktop 1280×900, Mobile 390×844 (iPhone 14 equivalent)

---

## Summary

The new Plain License site has a strong structural foundation. The seven-zone license anatomy is implemented and coherent. The dark design is visually clean and consistent on the pages that work. However, two critical bugs were found and fixed during this review, and a further set of significant correctness, UX, and cross-page consistency issues require attention before this site should be considered production-ready.

**Bugs fixed during this review:**
- `VersionHistory.astro`: `license_type` → `license_family` (undefined variable; caused a compile error)
- `VersionHistory.astro`: TypeScript inline type annotation in `.map()` callback inside Astro template (caused "Syntax error 'h'" compile crash, blocking ALL pages)
- `licenses/index.astro`: `l.data.license_type` → `l.data.license_family` (wrong field name; caused all licenses to be lost when grouping by category)

---

## Issues by Priority

### 🔴 P1 — Breaking / Critical Correctness

#### 1. Blog listing links are broken (404)
**Page:** `/blog/`  
**Description:** The blog listing page links to `/blog/welcome.md/` (note the `.md` extension in the URL). This returns a 404. The correct URL is `/blog/welcome/` (confirmed 200). This means every blog post link on the listing page is dead.  
**Root cause:** The blog post file is `content/blog/posts/welcome.md`. `starlight-blog` is using the full filename including the `.md` extension as the slug.  
**Fix:** Rename the blog post files to remove the `.md` extension (e.g., `welcome` directory with `index.md`), or configure `starlight-blog` to strip extensions from slugs. The simplest fix is to move `content/blog/posts/welcome.md` → `content/blog/posts/welcome/index.md`.

---

#### 2. Copyright block shown on public-domain dedication pages
**Page:** `/licenses/public-domain/unlicense/`  
**Description:** `ZoneIdentity.astro` unconditionally renders a "Copyright notice — replace the bracketed text with your own details" block on EVERY license page. For the Unlicense (a public domain dedication with `is_dedication: true`), this is factually wrong and contradictory. The entire purpose of the Unlicense is to surrender copyright. Showing a "Copyright © [Year] [Copyright holder name]" template invites users to add a copyright notice they do not need and should not add.  
**Fix:** In `ZoneIdentity.astro`, wrap the `copyright-block` div in `{!is_dedication && (...)}`.

---

#### 3. `liability` and `warranty` ChAL tags appear in "What you cannot do" (Zone 5)
**Pages:** `/licenses/public-domain/unlicense/`, `/licenses/source-available/elastic-2.0/`, `/licenses/copyleft/mpl-2.0/`  
**Description:** ChAL `limitations` tags `liability` and `warranty` map to "No liability" and "No warranty" in `LIMITATION_MAP`. `LicenseLayout.astro` passes all limitations to `ZoneRestrictions` (Zone 5). As a result, these appear as user restrictions: "You cannot do: No liability" and "You cannot do: No warranty". These are licensor protections (disclaimers), not restrictions on user actions. They belong in Zone 6 (Standard protections), which already renders warranty/liability content via `family.protections`. The content is duplicated in the wrong zone.  
**Spec reference:** Zone 5 = restrictions on user actions (trademark, patent, competing use). Zone 6 = standard protections (warranty, liability).  
**Fix:** In `LicenseLayout.astro` (or `ZoneRestrictions.astro`), filter out `liability` and `warranty` tags from the `limitations` array before passing them to `ZoneRestrictions`. Only `trademark-use` and `patent-use` should appear in Zone 5.

---

### 🟠 P2 — Significant UX / Design Problems

#### 4. "Enable Interactive Comparison" shown for unmapped licenses with no feedback
**Pages:** `/licenses/public-domain/unlicense/`, `/licenses/copyleft/mpl-2.0/`  
**Description:** The comparison toggle button appears on ALL license pages, even when no mapping file exists. For Unlicense and MPL-2.0 (console: "No mapping found for Unlicense"), pressing the button silently does nothing useful — the `.comparison-active` CSS class is applied but nothing appears in the original column because the mapping data is empty. Users will click the button, see no change, and be confused.  
**Spec reference:** "Given a license has no mappings yet, When a visitor tries to enable comparison, Then they see a message explaining the feature is not available for this license."  
**Fix:** `ComparisonToggle.astro` (or `licenses/[...slug].astro`) should receive a `hasMapping` prop. If false, either hide the button or show a disabled button with a tooltip ("Side-by-side comparison coming soon for this license").

---

#### 5. Duplicate H1 tags on FAQ and About pages
**Pages:** `/faq/`, `/about/`  
**Description:** `PageLayout.astro` renders `<h1>{frontmatter.title}</h1>` in the page header. The MDX content for both pages also begins with an H1 (`# FAQ`, `# You deserve to understand`). This results in two H1 elements per page — a WCAG Level A failure (SC 2.4.6) and an SEO problem.  
**Fix:** Remove the H1 from the MDX content files and let the page title come only from `PageLayout.astro`. Alternatively, change `PageLayout.astro` to use an `<h2>` for the display title when an MDX H1 is expected.

---

#### 6. Blog page uses Starlight layout; all other pages use BaseLayout
**Page:** `/blog/`  
**Description:** The blog page renders with the full Starlight chrome (Starlight header with logo image, theme toggle, search button, sidebar, navigation labelled "Main"). Every other custom page (homepage, licenses, licenses listing, FAQ, About) uses `BaseLayout` (plain header with "PL" badge, hamburger, footer). This creates a jarring inconsistency — the blog looks like a completely different site.  
The blog also has a Footer override that links to `/about` and `/blog` (without trailing slashes), while `BaseLayout` consistently uses trailing slashes.  
**Fix:** Either (a) integrate the blog into the `BaseLayout` design by overriding Starlight's header/footer with custom components (already done for Starlight pages via `Header.astro` override, but that override is not being applied to the blog), or (b) add the custom BaseLayout-style header above the Starlight content area for the blog route.

---

#### 7. "Shame Words" metric displayed with no explanation
**Pages:** All license pages (At a Glance section)  
**Description:** The `LicenseSummary` component shows "Shame Words: 1" (or 12 for MPL-2.0) with no tooltip, definition, or context. Users have no idea what a "shame word" is. This metric is internal quality tooling — it is not user-facing vocabulary. Displaying it raw adds confusion rather than value.  
**Fix:** Either (a) remove from user-facing display and keep in build reports only, or (b) replace "Shame Words" with a user-friendly label like "Legal jargon remaining" with a tooltip: "Count of complex legal terms our editors are working to simplify."

---

#### 8. Readability score lacks context and is unexpectedly high
**Pages:** All license pages (At a Glance section)  
**Description:** The Gunning Fog readability score is displayed as a bare number (e.g., "14.81" for MIT). Users cannot interpret what this means. More importantly, a Gunning Fog score of 14.81 indicates college-level writing — well above the spec target of 8th-grade (score ≈ 8). MIT is supposed to be one of the simpler licenses.  
The spec requires a readability comparison between the plain version and the original. Only the plain version score is shown.  
**Fix:** (a) Add the original license readability score for comparison. (b) Show a human-readable label (e.g., "College level" for 14+, "High school" for 12-13, "8th grade" for 8). (c) If the score exceeds target, flag it visually.

---

### 🟡 P3 — Polish / Minor Issues

#### 9. Mobile hamburger menu does not include the GitHub link
**Viewport:** Mobile (390px)  
**Description:** The desktop nav shows: Home, Licenses, FAQ, About, Blog, GitHub. The mobile hamburger nav shows: Home, Licenses, FAQ, About, Blog — no GitHub link. While less critical on mobile, this creates inconsistency.  
**Fix:** Add the GitHub link to the mobile nav in `BaseLayout.astro`.

---

#### 10. Footer navigation is minimal and missing key links
**All pages (BaseLayout footer):**  
**Description:** The footer only shows About, Blog, GitHub. It is missing Licenses and FAQ — the two most important destinations on the site. Users who scroll to the bottom cannot easily navigate to the licenses catalog.  
**Fix:** Add Licenses and FAQ to the footer navigation.

---

#### 11. License ordering inconsistent between homepage and listing page
**Pages:** `/` (homepage "All Licenses" section) vs. `/licenses/`  
**Description:** The homepage "All Licenses" list shows: MIT, Unlicense, Elastic-2.0, MPL. The `/licenses/` listing page shows the canonical order: Permissive (MIT), Copyleft (MPL), Source Available (Elastic), Public Domain (Unlicense). The homepage ordering appears arbitrary rather than matching the canonical category order.  
**Fix:** Sort the homepage "All Licenses" list using the same category priority as `/licenses/index.astro`.

---

#### 12. Version History changelog content is auto-generated boilerplate
**All license pages (Version History section):**  
**Description:** Every version shows "Automatic update from workspace metadata" as its changelog. This tells users nothing about what changed. The changelog should describe what actually changed between versions.  
**Fix:** Update `*.versions.json` files with meaningful changelog entries. For new licenses, an initial entry like "Initial release of Plain MIT License v0.2.1" is better than the auto-generated string. Add changelog authoring to the license publishing checklist.

---

#### 13. Version History section duplicates download links already in Download section
**All license pages:**  
**Description:** The Download License section already offers all formats (GFM, CommonMark, Plaintext, PDF, SPDX XML) with clear card UI. The Version History section ALSO shows downloads (PDF, TXT, MD) inline with each version. This creates redundancy and visual clutter. For the current version (the only version most users care about), it's duplicated three links away from the full set.  
**Fix:** Remove the per-version download links from `VersionHistory.astro`. Users who need older versions can be directed to a changelog page or GitHub tag. Keep only the version number, date, and changelog description.

---

#### 14. Embed HTML export not shown in Download Options
**All license pages (Download section):**  
**Description:** All export formats include an `*-embed.html` file (confirmed: `MIT-embed.html` exists at `/exports/mit/v0.2.1/MIT-embed.html`). The blog post even highlights "embed them as HTML widgets" as a new feature. But `DownloadOptions.astro` does not include the embed format in the download grid. Users cannot discover or access this format.  
**Fix:** Add the embed HTML format to the `formats` array in `DownloadOptions.astro`.

---

#### 15. `{{component:faq id="mit-faq"}}` placeholder not processed in MIT mapping anchors
**Page:** `/licenses/permissive/mit/`  
**Description:** The MIT license body contains `{{component:faq id="mit-faq"}}` on line 82. The `renderMarkdownWithDivs()` function in `licenses/[...slug].astro` strips `{{component:...}}` directives from `fullProcessedBody` (for clipboard/export), but the regex only does so in that context — not in the `plainBody` passed to the mapping anchors div. The raw placeholder string appears in the DOM (inside the hidden `.mapping-anchors` div) and is visible in the accessibility tree.  
**Fix:** Apply the component-strip regex to `plainBody` before passing it to `renderMarkdownWithDivs()` for the mapping anchors. Alternatively, strip `{{component:...}}` and `{{block:...}}` placeholders from the `plainBody` used for mapping anchors, as those placeholders serve no purpose in an `aria-hidden` div.

---

#### 16. Comparison toggle persists across navigation via localStorage
**All license pages:**  
**Description:** The comparison toggle saves its state to `localStorage`. If a user enables comparison on one license, it remains enabled when they navigate to another license — including those without mappings (issue #4). This could be surprising behavior when a user browses multiple licenses.  
**Consideration:** This is a deliberate design choice (reducing friction for users who prefer comparison mode). However, combined with issue #4 (no feedback for unmapped licenses), the persistence can cause confusion. Address after fixing #4.

---

#### 17. `key` prop used in Astro template `.map()` callbacks
**Files:** `DownloadOptions.astro` (line 37), `LicenseLayout.astro` equivalent  
**Description:** The `key={format.ext}` prop in Astro `.map()` templates is a React/Preact concept. In Astro, it is ignored and passed as a regular HTML attribute. While harmless, it signals that the component was written with React mental model. It adds unnecessary noise to the rendered HTML.  
**Fix:** Remove `key={}` props from Astro template `.map()` callbacks.

---

#### 18. MPL-2.0 has 12 "Shame Words" — significantly above target
**Page:** `/licenses/copyleft/mpl-2.0/`  
**Description:** The MPL-2.0 At a Glance shows "Shame Words: 12". This is far above MIT's 1 and suggests the plain MPL text still contains significant legal jargon. While this is a content quality issue (not a technical bug), it should be tracked and addressed before the site is considered production-ready for MPL.

---

## Design & UX Observations (Not Issues, But Considerations)

### Homepage
- The hero section is clean and effective. "Licenses you can actually understand" is a strong headline.  
- "Featured Licenses" shows only MIT with a large blank space to its right. This needs a second featured license, or the section should resize to fill the space gracefully.  
- "Browse Licenses" CTA is properly prominent with the green accent. "Learn more" secondary button is appropriately de-emphasized.

### License pages (desktop)
- The seven-zone architecture works well. Above-fold content is appropriately prioritized.  
- The "Less commonly needed" fold separator is visually clear and well-implemented.  
- Permission cards in a 4-column grid are scannable and well-labeled with icons.  
- The source-available exception (Zone 5 above fold) is correctly implemented for Elastic-2.0.  
- The important notice callout for source-available (orange warning block) is appropriately prominent.  
- The "How to give credit" section (Zone 4) on MIT is thorough and helpful with the tabbed examples.

### License pages (mobile, 390px)
- The page structure is readable on mobile. Text wraps cleanly.  
- Permission cards stack to single column appropriately.  
- The mobile hamburger navigation opens and closes correctly.  
- The comparison feature is not usable on mobile without the modal (which requires JS interaction with mapped sections). The toggle button should perhaps be hidden on mobile for unmapped licenses.

### Comparison feature (desktop, MIT)
- When enabled, the original MIT license text appears in a right column alongside the plain version.  
- The visual transition to two-column layout works.  
- The button toggles between "Enable" and "Disable" with `aria-pressed` correctly set.  
- Mapping hover highlights were not fully tested but the initialization is confirmed via console log.

### Download section
- The grid of download formats is clean and functional.  
- All download URLs resolve to real files with correct MIME types (verified: PDF, GFM).  
- The "Copy to Clipboard" button functionality is implemented with proper status announcement.

---

## Spec Compliance Summary

| Spec Requirement | Status | Notes |
|---|---|---|
| Seven-zone anatomy | ✅ Implemented | Zone ordering correct |
| Source-available Zone 5 above fold | ✅ Implemented | Elastic-2.0 correct |
| Source-available [!IMPORTANT] callout | ✅ Implemented | |
| Zone 4 (attribution) only when needed | ✅ Implemented | MIT shows, Unlicense/MPL don't |
| Zone 5 collapsed by default (non-SA) | ✅ Implemented | |
| Zone 6 + Zone 7 collapsed | ✅ Implemented | |
| Public domain: Zone 3 suppressed | ✅ Implemented | Unlicense has no conditions |
| Public domain: copyright block suppressed | ❌ Not implemented | See issue #2 |
| Zone 5: only real restrictions | ❌ Partial | warranty/liability wrongly in Zone 5 (issue #3) |
| TL;DR bullets (2–4) | ✅ Implemented | All licenses have it |
| Export formats: GFM, CM, Plaintext, PDF, SPDX XML | ✅ Generated | All files present |
| Export format: Embed HTML | ⚠️ Generated but not linked | Issue #14 |
| Comparison: no feedback for unmapped | ❌ Not implemented | Issue #4 |
| Readability comparison (plain vs. original) | ❌ Partial | Only plain score shown (issue #8) |
| Blog accessible | ❌ Broken links | Issue #1 |
| FAQ/About accessible | ⚠️ Works but has duplicate H1 | Issue #5 |

---

## Recommended Fix Priority

| # | Fix | Effort | Impact |
|---|---|---|---|
| 1 | Blog post links broken (`.md` in URL) | Low | Critical — blog unusable |
| 2 | Copyright block on public-domain pages | Low | High — factually wrong |
| 3 | warranty/liability in Zone 5 | Low | High — wrong classification |
| 4 | Comparison toggle for unmapped licenses | Medium | High — confusing UX |
| 5 | Duplicate H1 on FAQ/About | Low | Medium — accessibility/SEO |
| 6 | Blog visual inconsistency (Starlight vs BaseLayout) | High | Medium — trust/coherence |
| 7 | Shame Words label clarity | Low | Medium — confusing metric |
| 8 | Readability score context | Medium | Medium — missing comparison |
| 14 | Add embed format to Downloads | Low | Low — missing feature |
| 9–13 | Minor polish items | Low | Low — quality of life |
