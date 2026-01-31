# Research Task 5: Export Generation Strategy (FREE Tier)

**Date**: 2026-01-30
**Status**: Complete
**Objective**: Identify FREE approaches for multi-format license exports (Markdown, PDF, SPDX XML, HTML embeds) without AWS/S3/DigitalOcean costs

---

## Executive Summary

**Recommended Approach**: Build-time generation with GitHub Actions + GitHub Releases storage

**Key Findings**:
- ✅ GitHub Actions offers **unlimited build minutes** for public repositories
- ✅ GitHub Releases provide **free permanent storage** (2 GB per file limit)
- ✅ Pandoc with Typst engine generates PDFs **27x faster** than traditional LaTeX (~356ms per PDF)
- ✅ Complete solution is **$0/month** with no hidden charges
- ✅ Estimated build time impact: **3-10 seconds** for 10 licenses (all formats)

---

## Approach 1: Build-Time Generation (RECOMMENDED)

### How It Works

**Generation Pipeline**:
1. MkDocs build hook triggers export generation (`on_pre_build`)
2. Python script generates all formats in parallel:
   - Markdown GFM/CommonMark: Direct Python conversion
   - Plaintext: Strip markdown formatting
   - PDF: Pandoc with Typst engine
   - SPDX XML: Template-based generation
   - Embed HTML: Minified HTML snippets
3. Outputs stored in `/exports` directory
4. Static site includes exports for direct download
5. GitHub Actions uploads exports to GitHub Releases on version tags

**Tools Stack**:
- **Pandoc** (with Typst engine): Markdown → PDF conversion
- **Python**: Markdown manipulation, SPDX XML generation
- **MkDocs hooks**: Build-time orchestration
- **GitHub Actions**: CI/CD and release automation

### Cost Breakdown

**Total Monthly Cost: $0**

- GitHub Actions (public repos): **Unlimited build minutes FREE** ([source](https://docs.github.com/en/actions/concepts/billing-and-usage))
- GitHub Releases storage: **FREE permanent storage** (2 GB per file limit) ([source](https://github.com/orgs/community/discussions/73875))
- Build compute: **Runs on GitHub's infrastructure**
- Bandwidth: **No charges for release downloads**

### Build Time Impact

**Per-License Generation Time** (estimated):
- Markdown GFM/CommonMark: <50ms (direct Python)
- Plaintext: <20ms (strip formatting)
- PDF (Pandoc + Typst): ~356ms ([benchmark source](https://slhck.info/software/2025/10/25/typst-pdf-generation-xelatex-alternative.html))
- SPDX XML: <100ms (template-based)
- Embed HTML: <30ms (minification)

**Total for 10 Licenses**: ~5-6 seconds (parallel generation)
**Total Build Time Addition**: <10 seconds (including I/O overhead)

### Format Support

✅ **Markdown GFM**: Direct conversion with Python markdown library
✅ **Markdown CommonMark**: Pandoc native support
✅ **Plaintext**: Strip markdown syntax, preserve structure
✅ **PDF**: Pandoc + Typst (27x faster than LaTeX)
✅ **SPDX XML**: Python template with official schema ([source](https://github.com/spdx/license-list-XML))
✅ **Embed HTML**: Minified HTML with copy-to-clipboard functionality

### Storage Strategy

**Primary Distribution**: GitHub Releases
- Permanent storage (no expiration)
- No cost for unlimited downloads
- Version-tagged releases (e.g., `v1.0.0` includes all exports)
- CDN-backed via GitHub's infrastructure

**Secondary Access**: Static Site Direct Downloads
- Exports included in MkDocs `site/` directory
- Served via existing hosting (Netlify/Vercel)
- No additional storage costs

**Workflow**:
```yaml
# On tagged release (v*)
1. Generate all exports
2. Create GitHub Release
3. Attach export files as release assets
4. Users download from Releases page or site links
```

### Pros

- ✅ **Completely FREE**: No recurring costs, no hidden charges
- ✅ **Fast**: Typst-based PDF generation is 27x faster than LaTeX
- ✅ **Simple**: Single build pipeline, no external dependencies
- ✅ **Reliable**: Runs on GitHub's proven infrastructure
- ✅ **Versioned**: Exports tied to specific releases
- ✅ **Permanent**: No expiration of release assets
- ✅ **CDN-backed**: GitHub provides global distribution
- ✅ **No external APIs**: Self-contained solution

### Cons

- ⚠️ **Build time addition**: +5-10 seconds per build (acceptable for CI)
- ⚠️ **Repository size**: Exports stored in Git (mitigated by `.gitignore`)
- ⚠️ **Manual releases**: Requires tagging for GitHub Releases
- ⚠️ **Limited styling**: PDF styling less sophisticated than Playwright

### Implementation Complexity

**Low to Medium**

**Required Changes**:
1. Add Pandoc + Typst to GitHub Actions environment
2. Create MkDocs hook for export generation
3. Add Python export generation script
4. Update GitHub Actions workflow for release uploads
5. Add download links to site navigation

**Estimated Implementation Time**: 4-8 hours

---

## Approach 2: GitHub Actions with Artifact Storage

### How It Works

**Alternative to Releases**:
1. Generate exports in GitHub Actions workflow
2. Upload as workflow artifacts
3. Store artifacts for 90 days (GitHub default)
4. Users download from Actions tab or API

### Cost

**Total Monthly Cost: $0**

- GitHub Actions: Unlimited minutes for public repos
- Artifact storage: **FREE** (90-day retention) ([source](https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts))
- **Note**: Artifacts expire after 90 days (not suitable for permanent distribution)

### Build Time Impact

Same as Approach 1: ~5-10 seconds

### Format Support

Same as Approach 1: All formats supported

### Storage

**GitHub Actions Artifacts**:
- 90-day retention by default
- Not permanent (expires)
- Accessible via GitHub API
- Not ideal for end-user downloads

### Pros

- ✅ Completely free
- ✅ Fast generation
- ✅ Simple implementation

### Cons

- ❌ **Artifacts expire** (90 days default)
- ❌ **Poor user experience** (download from Actions tab)
- ❌ **Not suitable for permanent distribution**
- ❌ API required for automated access

### Recommendation

**NOT RECOMMENDED** due to artifact expiration. Use Approach 1 (GitHub Releases) instead.

---

## Approach 3: Cloudflare Workers Browser Rendering

### How It Works

**On-Demand Generation**:
1. User requests PDF export
2. Cloudflare Worker receives request
3. Browser Rendering generates PDF from HTML
4. PDF streamed back to user (no storage)

### Cost

**Free Tier Limits**:
- **Workers Free Plan**: 10 minutes browser usage/day, 3 concurrent browsers ([source](https://developers.cloudflare.com/browser-rendering/))
- **Workers Paid Plan**: 10 hours/month free, then $0.09/browser hour
- **Estimated Usage**: ~1 second per PDF = **600 PDFs/day free**

**Monthly Cost**:
- If staying within free tier: **$0/month**
- If exceeding (unlikely): ~$0.09/hour browser time

### Build Time Impact

**No build-time impact** (generation is on-demand)

### Format Support

- ✅ **PDF**: Excellent (browser-native rendering)
- ⚠️ **Markdown/Plaintext**: Requires separate implementation
- ⚠️ **SPDX XML**: Requires separate implementation
- ⚠️ **Embed HTML**: Not applicable

**Limitation**: Only practical for PDF generation, not other formats

### Storage

**No storage required** (on-demand generation)

### Pros

- ✅ FREE within generous limits (10 min/day)
- ✅ High-quality PDFs (browser rendering)
- ✅ No storage costs
- ✅ Scalable to demand

### Cons

- ❌ **Only PDF format** (not comprehensive solution)
- ❌ **Usage limits** (10 minutes/day free tier)
- ❌ **Cold start latency** (3-5 seconds)
- ❌ **Complex setup** (Cloudflare Workers infrastructure)
- ❌ **Network dependency** (requires Cloudflare account)

### Recommendation

**NOT RECOMMENDED** as primary approach. Could supplement Approach 1 for on-demand high-quality PDFs if needed, but adds complexity without significant benefit given Typst's speed.

---

## Approach 4: Netlify Functions

### How It Works

**Serverless PDF Generation**:
1. User requests export
2. Netlify Function executes
3. Generate PDF (Playwright, Puppeteer, or Pandoc)
4. Return PDF to user

### Cost

**Free Tier Limits**:
- **125,000 function invocations/month** ([source](https://www.freetiers.com/directory/netlify))
- **100 GB bandwidth/month**
- **300 build minutes/month**

**Monthly Cost**:
- Within free tier: **$0/month**
- Estimated usage: ~10-100 PDFs/day = **300-3,000/month** (well within limits)

### Build Time Impact

**No build-time impact** (on-demand generation)

### Format Support

- ✅ PDF (with Pandoc or headless browser)
- ⚠️ Markdown/Plaintext/SPDX require separate functions
- Complex to implement all formats

### Storage

**No storage required** (on-demand generation)

### Pros

- ✅ FREE within generous limits
- ✅ Netlify native integration
- ✅ No storage costs

### Cons

- ❌ **Complex setup** for all formats
- ❌ **Cold start latency** (~500ms - 2 seconds)
- ❌ **Function size limits** (50 MB with dependencies)
- ❌ **Not ideal for multiple formats**

### Recommendation

**NOT RECOMMENDED** as primary approach. Adds complexity without clear advantages over build-time generation.

---

## PDF Generation Deep Dive

### Problem Statement

PDF generation can be resource-intensive and slow, especially with browser-based solutions (Playwright, Puppeteer). Need FREE, FAST solution.

### Free Solutions Evaluated

#### 1. **Pandoc + Typst (RECOMMENDED)**

**Performance**:
- **356ms per PDF** on average ([benchmark](https://slhck.info/software/2025/10/25/typst-pdf-generation-xelatex-alternative.html))
- **27x faster than XeLaTeX** (traditional LaTeX engine)
- **Consistent performance** across document sizes

**Quality**:
- LaTeX-quality typography
- Professional appearance
- CSS styling support via Typst

**Setup**:
- Single dependency: `pandoc` + `typst`
- Available in GitHub Actions (`apt-get install pandoc typst`)
- No external APIs or services

**Cost**: **FREE** (open-source tools)

#### 2. **Pandoc + XeLaTeX**

**Performance**:
- **~9.6 seconds per PDF** ([benchmark](https://slhck.info/software/2025/10/25/typst-pdf-generation-xelatex-alternative.html))
- 27x slower than Typst
- Not practical for CI/CD builds

**Cost**: **FREE** but slow

**Recommendation**: **NOT RECOMMENDED** due to poor performance

#### 3. **WeasyPrint**

**Performance**:
- Moderate speed (slower than Typst, faster than XeLaTeX)
- HTML/CSS to PDF conversion
- Python-native solution

**Quality**:
- Good HTML rendering
- CSS paged media support
- Professional output

**Setup**:
- Python library: `pip install weasyprint`
- External dependencies: `cairo`, `pango`
- Available in GitHub Actions

**Cost**: **FREE** (open-source)

**Use Case**: Alternative if Typst styling is insufficient

#### 4. **Playwright PDF (Build-Time)**

**Performance**:
- **1-3 seconds per PDF** (includes browser startup)
- High quality (browser-native rendering)
- Resource-intensive

**Feasibility**: **Possible but slow**
- GitHub Actions unlimited minutes (public repos)
- Would add 10-30 seconds to builds (10 licenses)
- Unnecessary given Typst's speed

**Recommendation**: **NOT RECOMMENDED** for build-time generation

#### 5. **Cloudflare Workers Browser Rendering**

**Performance**:
- **1-2 seconds per PDF** (after cold start)
- **3-5 second cold start** latency
- High quality

**Cost**:
- **FREE** (10 min/day = ~600 PDFs/day)
- $0.09/hour beyond free tier

**Use Case**: On-demand generation only (not build-time)

**Recommendation**: **OPTIONAL** supplement for high-quality on-demand PDFs

#### 6. **GitHub Actions with Playwright**

**Performance**:
- Same as Playwright (1-3s per PDF)
- Adds 10-30 seconds to CI builds

**Feasibility**: **FREE** (unlimited minutes for public repos)

**Recommendation**: **NOT NEEDED** given Typst's superior speed

### Final PDF Recommendation

**Primary**: **Pandoc + Typst** (build-time generation)
- Fastest option (356ms per PDF)
- FREE with no limits
- Professional quality
- Simple setup

**Fallback**: **WeasyPrint** (if Typst styling insufficient)
- Python-native
- Good HTML/CSS support
- Moderate speed

**NOT RECOMMENDED**:
- ❌ XeLaTeX (too slow: 9.6s per PDF)
- ❌ Playwright build-time (unnecessary: 1-3s vs 356ms)
- ❌ Cloudflare Workers (complexity, cold starts, single format only)

---

## Format Generation Strategies

### Markdown GFM (GitHub-Flavored)

**Approach**: Direct Python conversion
**Tool**: Python `markdown` library with GFM extensions
**Performance**: <50ms per license
**Output**: `.md` file compatible with GitHub

**Implementation**:
```python
import markdown
from markdown.extensions import fenced_code, tables, nl2br

md = markdown.Markdown(extensions=['fenced_code', 'tables', 'nl2br'])
gfm_output = md.convert(plain_license_content)
```

### Markdown CommonMark

**Approach**: Pandoc conversion
**Tool**: `pandoc --to=commonmark`
**Performance**: ~100ms per license
**Output**: Strict CommonMark `.md`

**Implementation**:
```bash
pandoc input.md --from=markdown --to=commonmark -o output.md
```

### Plaintext

**Approach**: Strip markdown formatting, preserve structure
**Tool**: Custom Python script
**Performance**: <20ms per license
**Output**: `.txt` file with readable plain text

**Implementation**:
```python
import re

def markdown_to_plaintext(md_content):
    # Remove markdown syntax while preserving structure
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', md_content)  # Links
    text = re.sub(r'[*_]{1,2}([^*_]+)[*_]{1,2}', r'\1', text)    # Bold/italic
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)       # Headers
    return text
```

### PDF

**Approach**: Pandoc + Typst engine
**Tool**: `pandoc --pdf-engine=typst`
**Performance**: ~356ms per license ([benchmark](https://slhck.info/software/2025/10/25/typst-pdf-generation-xelatex-alternative.html))
**Output**: Professional PDF with typography

**Implementation**:
```bash
pandoc input.md --pdf-engine=typst --standalone -o output.pdf
```

**Styling**:
```typst
// Custom Typst template for Plain License branding
#set page(
  paper: "us-letter",
  margin: (x: 1.5in, y: 1in),
)
#set text(font: "Inter", size: 11pt)
#set par(justify: true)
```

### SPDX XML

**Approach**: Template-based generation using official schema
**Tool**: Python `xml.etree.ElementTree` with SPDX templates
**Performance**: ~100ms per license
**Output**: Valid SPDX XML conforming to official schema

**Implementation**:
```python
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom.minidom import parseString

def generate_spdx_xml(license_data):
    root = Element('SPDXLicenseCollection', xmlns="http://www.spdx.org/license")
    license_elem = SubElement(root, 'license')
    SubElement(license_elem, 'licenseId').text = license_data['id']
    SubElement(license_elem, 'name').text = license_data['name']
    SubElement(license_elem, 'licenseText').text = license_data['text']
    # ... additional SPDX fields

    xml_str = tostring(root, encoding='unicode')
    pretty_xml = parseString(xml_str).toprettyxml(indent="  ")
    return pretty_xml
```

**Schema**: Based on [SPDX License List XML](https://github.com/spdx/license-list-XML)

### Embed HTML

**Approach**: Minified HTML snippet with copy-to-clipboard
**Tool**: Python `htmlmin`
**Performance**: <30ms per license
**Output**: Self-contained HTML embed code

**Implementation**:
```python
import htmlmin

def generate_embed_html(license_content):
    html = f"""
    <div class="plainlicense-embed" data-license="{license_id}">
      <div class="plainlicense-text">{license_content}</div>
      <button class="plainlicense-copy">Copy License</button>
    </div>
    <script>
    document.querySelector('.plainlicense-copy').onclick = () => {{
      navigator.clipboard.writeText(document.querySelector('.plainlicense-text').innerText);
    }};
    </script>
    """
    return htmlmin.minify(html, remove_comments=True)
```

---

## Storage Strategy Comparison

| Storage Method | Cost | Expiration | User Experience | Distribution |
|---------------|------|------------|-----------------|--------------|
| **GitHub Releases** | FREE | **Never** | ✅ Excellent | Global CDN |
| GitHub Artifacts | FREE | 90 days | ❌ Poor | API only |
| Static Site Files | FREE | Never | ✅ Good | Hosting CDN |
| Cloudflare R2 | FREE (10GB) | Never | ✅ Good | Global CDN |
| S3 | ❌ $0.023/GB | Never | ✅ Good | CloudFront |

**Recommended**: **GitHub Releases** for permanent versioned storage + **Static Site Files** for immediate access

---

## Implementation Roadmap

### Phase 1: Core Export Generation (MVP)

**Tasks**:
1. Create `exports/` directory structure
2. Implement Python export generation script
   - Markdown GFM/CommonMark conversion
   - Plaintext generation
   - SPDX XML templates
3. Add MkDocs `on_pre_build` hook
4. Test local generation

**Time Estimate**: 2-3 hours

**Deliverables**:
- Working export generation for all non-PDF formats
- MkDocs integration
- Local testing validation

### Phase 2: PDF Generation with Typst

**Tasks**:
1. Install Pandoc + Typst in development environment
2. Create custom Typst template for Plain License branding
3. Integrate PDF generation into export script
4. Test PDF quality and performance

**Time Estimate**: 1-2 hours

**Deliverables**:
- Professional PDF generation
- Custom styling
- Performance validation

### Phase 3: GitHub Actions Integration

**Tasks**:
1. Update `.github/workflows/build.yml`:
   - Install Pandoc + Typst
   - Run export generation
   - Upload exports to GitHub Releases (on tags)
2. Test CI/CD pipeline
3. Create release workflow documentation

**Time Estimate**: 2-3 hours

**Deliverables**:
- Automated export generation in CI
- GitHub Releases integration
- Workflow documentation

### Phase 4: Site Integration & User Experience

**Tasks**:
1. Add download links to license pages
2. Create exports landing page
3. Add format descriptions and use cases
4. Implement download tracking (optional)

**Time Estimate**: 1-2 hours

**Deliverables**:
- User-friendly download interface
- Export documentation
- Landing page

### Total Implementation Time: 6-10 hours

---

## Performance Projections

### Build Time Analysis

**Current MkDocs Build**: ~30-60 seconds (estimated)

**Export Generation Addition**:
| Format | Per-License | 10 Licenses | Notes |
|--------|-------------|-------------|-------|
| Markdown GFM | 50ms | 500ms | Python conversion |
| Markdown CommonMark | 100ms | 1s | Pandoc |
| Plaintext | 20ms | 200ms | Python stripping |
| PDF (Typst) | 356ms | 3.6s | Pandoc + Typst |
| SPDX XML | 100ms | 1s | Template-based |
| Embed HTML | 30ms | 300ms | Minification |
| **Total** | ~656ms | **~6.6s** | Parallel execution |

**Total Build Time**: ~36-66 seconds (+10-20% increase)

**GitHub Actions Impact**: Negligible (unlimited minutes for public repos)

### Scalability Analysis

**50 Licenses** (future growth):
- Export generation: ~33 seconds (50 × 656ms)
- Total build time: ~63-93 seconds
- Still within acceptable CI limits (<2 minutes)

**100 Licenses** (ambitious):
- Export generation: ~66 seconds
- Total build time: ~96-126 seconds (~1.5-2 minutes)
- May require optimization (parallel Pandoc processes)

**Optimization Strategy** (if needed):
- Parallel Pandoc execution (4-8 workers)
- Reduce to ~10-15 seconds for 100 licenses
- Caching unchanged exports

---

## Alternative Tools Considered

### WeasyPrint vs Typst

**WeasyPrint**:
- ✅ HTML/CSS native support
- ✅ Good for web-first designs
- ⚠️ Slower than Typst (no direct benchmark)
- ✅ Python-native (easier integration)

**Typst**:
- ✅ **27x faster than XeLaTeX** ([benchmark](https://slhck.info/software/2025/10/25/typst-pdf-generation-xelatex-alternative.html))
- ✅ LaTeX-quality typography
- ✅ Modern, actively developed
- ⚠️ Less CSS-like styling

**Decision**: **Typst** for speed, with WeasyPrint as fallback if styling requirements change

### PrinceXML

- ❌ **Commercial license required** (not free for most uses)
- ✅ Excellent CSS support
- ❌ Not suitable for open-source project

**Decision**: NOT CONSIDERED (licensing incompatibility)

### wkhtmltopdf

- ⚠️ **Deprecated** (no longer maintained)
- ⚠️ Based on outdated Qt WebKit
- ❌ Slower than modern alternatives

**Decision**: NOT RECOMMENDED (deprecated, slow)

---

## Risk Assessment

### Low Risks ✅

1. **Build Time Increase**: +6-10 seconds is acceptable for CI
2. **GitHub Free Tier**: Unlimited for public repos, confirmed stable
3. **Tool Availability**: Pandoc, Typst widely available in package managers
4. **Format Quality**: All formats meet professional standards

### Medium Risks ⚠️

1. **Repository Size Growth**:
   - **Risk**: Exports stored in Git could bloat repo
   - **Mitigation**: Use `.gitignore` for `/exports` directory, only store in build artifacts and releases
   - **Impact**: Minimal (exports are small: ~10-50KB per license per format)

2. **GitHub API Rate Limits** (release uploads):
   - **Risk**: Hitting GitHub API limits during release creation
   - **Mitigation**: Use official GitHub Actions (no rate limits for Actions)
   - **Impact**: Low (Actions have elevated permissions)

3. **Pandoc/Typst Version Compatibility**:
   - **Risk**: Breaking changes in tool versions
   - **Mitigation**: Pin specific versions in GitHub Actions
   - **Impact**: Low (tools are stable)

### Negligible Risks 🟢

1. **Cost Overruns**: None (100% free tier usage)
2. **Storage Limits**: GitHub Releases (2GB per file >> ~50KB per export)
3. **Bandwidth Costs**: None (GitHub provides unlimited bandwidth for public repos)
4. **Performance Issues**: Typst is fast enough even for 100+ licenses

---

## Comparison Matrix

| Approach | Cost | Build Time | Formats | Storage | PDF Method | Complexity | User Experience |
|----------|------|------------|---------|---------|------------|------------|-----------------|
| **Build-Time + Releases** | **$0** | **+6-10s** | **All 6** | **GitHub Releases (FREE)** | **Pandoc+Typst** | **Low-Med** | **Excellent** |
| GitHub Artifacts | $0 | +6-10s | All 6 | GitHub Artifacts (90d) | Pandoc+Typst | Low | Poor (expires) |
| Cloudflare Workers | $0* | 0s | PDF only | None | Browser Render | High | Good (latency) |
| Netlify Functions | $0 | 0s | Complex | None | Pandoc/Browser | High | Good (latency) |
| Playwright Build | $0 | +30-60s | All 6 | GitHub Releases | Playwright | Medium | Excellent |

*Free tier limits apply

---

## Final Recommendation

### Primary Choice: **Build-Time Generation + GitHub Releases**

**Why This Is the Best FREE Solution**:

1. **100% Free, Forever**:
   - GitHub Actions: Unlimited minutes (public repos) ([source](https://docs.github.com/en/actions/concepts/billing-and-usage))
   - GitHub Releases: Permanent free storage ([source](https://github.com/orgs/community/discussions/73875))
   - No hidden costs, no usage limits

2. **Fast & Reliable**:
   - Pandoc + Typst: **27x faster than LaTeX** ([source](https://slhck.info/software/2025/10/25/typst-pdf-generation-xelatex-alternative.html))
   - Total build time: +6-10 seconds (acceptable for CI)
   - Proven GitHub infrastructure

3. **Comprehensive Format Support**:
   - All 6 required formats in single pipeline
   - Professional quality output
   - Consistent generation

4. **Excellent User Experience**:
   - Permanent storage (never expires)
   - CDN-backed downloads (fast global access)
   - Version-tagged releases
   - Direct links from site

5. **Low Complexity**:
   - Single build pipeline
   - No external services
   - No API dependencies
   - Easy to maintain

### Storage Strategy

**Primary**: GitHub Releases (permanent, versioned)
**Secondary**: Static site files (immediate access, deployed with site)

### Performance

**Expected Build Time Impact**: +6-10 seconds (10 licenses, all formats)
**Scalability**: Supports 50-100 licenses without optimization

### Implementation

**Estimated Time**: 6-10 hours
**Complexity**: Low to Medium
**Dependencies**: Pandoc, Typst (both free, widely available)

---

## Next Steps

1. **Prototype Export Script** (2 hours):
   - Create Python script for all non-PDF formats
   - Test locally with existing licenses

2. **Add PDF Generation** (1 hour):
   - Install Pandoc + Typst locally
   - Create custom Typst template
   - Generate sample PDFs

3. **Integrate with MkDocs** (1 hour):
   - Add `on_pre_build` hook
   - Test full build pipeline

4. **GitHub Actions Setup** (2 hours):
   - Update workflow with Pandoc/Typst
   - Configure release upload
   - Test CI pipeline

5. **User Interface** (2 hours):
   - Add download links to site
   - Create exports landing page
   - Document usage

6. **Testing & Validation** (2 hours):
   - Verify all formats
   - Performance benchmarking
   - User experience testing

---

## References

### Documentation

- [GitHub Actions Billing (Public Repos Free)](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [GitHub Releases Storage](https://github.com/orgs/community/discussions/73875)
- [Pandoc User's Guide](https://pandoc.org/MANUAL.html)
- [Typst PDF Generation Performance](https://slhck.info/software/2025/10/25/typst-pdf-generation-xelatex-alternative.html)
- [SPDX License List XML Schema](https://github.com/spdx/license-list-XML)
- [MkDocs Build Hooks](https://github.com/aklajnert/mkdocs-simple-hooks)
- [WeasyPrint Documentation](https://weasyprint.org/)
- [Cloudflare Browser Rendering](https://developers.cloudflare.com/browser-rendering/)

### Benchmarks

- [Pandoc Typst vs XeLaTeX Performance](https://slhck.info/software/2025/10/25/typst-pdf-generation-xelatex-alternative.html) - Typst 27x faster
- [PDF Generation Speed Comparison](https://medium.com/@coders.stop/pdf-generation-from-html-i-tested-puppeteer-playwright-and-wkhtmltopdf-so-you-dont-have-to-d14228d28c4c)
- [Playwright PDF Generation Guide](https://www.browserstack.com/guide/playwright-pdf-html-generation)

### Community Resources

- [GitHub Actions Unlimited Minutes Discussion](https://github.com/orgs/community/discussions/156389)
- [GitHub Releases vs Artifacts](https://github.com/orgs/community/discussions/171247)
- [Markdown to PDF Approaches](https://peterlyons.com/problog/2023/02/markdown-to-pdf-with-weasyprint/)

---

## Appendix: Code Samples

### Export Generation Script (Skeleton)

```python
"""
Export generation script for Plain License
Generates all export formats (Markdown, PDF, SPDX XML, HTML embeds)
"""

import os
import subprocess
from pathlib import Path
import xml.etree.ElementTree as ET
from xml.dom.minidom import parseString
import markdown
import htmlmin
import re

class LicenseExporter:
    def __init__(self, license_dir: Path, output_dir: Path):
        self.license_dir = license_dir
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export_all_formats(self, license_id: str) -> None:
        """Generate all export formats for a license"""
        license_file = self.license_dir / f"{license_id}.md"
        if not license_file.exists():
            raise FileNotFoundError(f"License not found: {license_id}")

        content = license_file.read_text()

        # Generate all formats
        self.export_markdown_gfm(license_id, content)
        self.export_markdown_commonmark(license_id, license_file)
        self.export_plaintext(license_id, content)
        self.export_pdf(license_id, license_file)
        self.export_spdx_xml(license_id, content)
        self.export_embed_html(license_id, content)

    def export_markdown_gfm(self, license_id: str, content: str) -> None:
        """Export as GitHub-Flavored Markdown"""
        output_file = self.output_dir / f"{license_id}.gfm.md"
        # GFM conversion (preserve original markdown for now)
        output_file.write_text(content)

    def export_markdown_commonmark(self, license_id: str, input_file: Path) -> None:
        """Export as CommonMark using Pandoc"""
        output_file = self.output_dir / f"{license_id}.commonmark.md"
        subprocess.run([
            'pandoc',
            str(input_file),
            '--from=markdown',
            '--to=commonmark',
            f'--output={output_file}'
        ], check=True)

    def export_plaintext(self, license_id: str, content: str) -> None:
        """Export as plain text (strip markdown)"""
        output_file = self.output_dir / f"{license_id}.txt"

        # Strip markdown syntax
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', content)  # Links
        text = re.sub(r'[*_]{1,2}([^*_]+)[*_]{1,2}', r'\1', text)  # Bold/italic
        text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)     # Headers

        output_file.write_text(text)

    def export_pdf(self, license_id: str, input_file: Path) -> None:
        """Export as PDF using Pandoc + Typst"""
        output_file = self.output_dir / f"{license_id}.pdf"
        subprocess.run([
            'pandoc',
            str(input_file),
            '--pdf-engine=typst',
            '--standalone',
            f'--output={output_file}'
        ], check=True)

    def export_spdx_xml(self, license_id: str, content: str) -> None:
        """Export as SPDX XML"""
        output_file = self.output_dir / f"{license_id}.spdx.xml"

        # Create SPDX XML structure
        root = ET.Element('SPDXLicenseCollection', xmlns="http://www.spdx.org/license")
        license_elem = ET.SubElement(root, 'license')
        ET.SubElement(license_elem, 'licenseId').text = license_id
        ET.SubElement(license_elem, 'name').text = f"Plain License {license_id}"
        ET.SubElement(license_elem, 'licenseText').text = content

        # Pretty print XML
        xml_str = ET.tostring(root, encoding='unicode')
        pretty_xml = parseString(xml_str).toprettyxml(indent="  ")
        output_file.write_text(pretty_xml)

    def export_embed_html(self, license_id: str, content: str) -> None:
        """Export as embeddable HTML snippet"""
        output_file = self.output_dir / f"{license_id}.embed.html"

        html = f"""
        <div class="plainlicense-embed" data-license="{license_id}">
          <div class="plainlicense-text">{content}</div>
          <button class="plainlicense-copy">Copy License</button>
        </div>
        <script>
        document.querySelector('.plainlicense-copy').onclick = () => {{
          navigator.clipboard.writeText(document.querySelector('.plainlicense-text').innerText);
        }};
        </script>
        """

        minified = htmlmin.minify(html, remove_comments=True)
        output_file.write_text(minified)


def main():
    """Generate exports for all licenses"""
    license_dir = Path("packages")
    output_dir = Path("exports")

    exporter = LicenseExporter(license_dir, output_dir)

    # Get all license packages
    for license_pkg in license_dir.glob("*"):
        if license_pkg.is_dir():
            license_id = license_pkg.name
            print(f"Generating exports for {license_id}...")
            exporter.export_all_formats(license_id)

    print("✅ Export generation complete!")


if __name__ == "__main__":
    main()
```

### MkDocs Hook Integration

```python
"""
MkDocs hook for export generation
Add to overrides/hooks/export_generator.py
"""

import logging
from pathlib import Path
from .export_script import LicenseExporter

log = logging.getLogger("mkdocs.plugins.exports")

def on_pre_build(config):
    """Generate exports before building site"""
    log.info("Generating license exports...")

    license_dir = Path("packages")
    output_dir = Path("exports")

    exporter = LicenseExporter(license_dir, output_dir)

    for license_pkg in license_dir.glob("*"):
        if license_pkg.is_dir():
            license_id = license_pkg.name
            try:
                exporter.export_all_formats(license_id)
                log.info(f"✅ Exported {license_id}")
            except Exception as e:
                log.error(f"❌ Failed to export {license_id}: {e}")

    log.info("Export generation complete!")
```

### GitHub Actions Workflow (Excerpt)

```yaml
name: Build and Release

on:
  push:
    branches: [main, dev]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install Pandoc and Typst
        run: |
          sudo apt-get update
          sudo apt-get install -y pandoc
          curl -fsSL https://typst.app/install.sh | sh
          export PATH="$HOME/.typst/bin:$PATH"

      - name: Install Python dependencies
        run: |
          pip install -r requirements.txt

      - name: Build site (includes export generation)
        run: |
          bun run build

      - name: Upload exports to release (on tag)
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v1
        with:
          files: exports/**/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

**End of Report**

**Summary**: Build-time generation with Pandoc + Typst is the optimal FREE solution, offering fast performance (27x faster than LaTeX), comprehensive format support, and zero ongoing costs using GitHub Actions + Releases.
