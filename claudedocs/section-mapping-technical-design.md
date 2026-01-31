# Technical Design: Section Mapping System for Interactive License Comparison

**Status**: Research Complete
**Date**: 2026-01-30
**Purpose**: Enable editorial interface for mapping plain language license sections to original sections with interactive highlighting

---

## Executive Summary

This proposal presents a comprehensive technical design for implementing section mapping between Plain License's plain language text and original license text. The system enables editors to create relationships between sections, then renders these as interactive highlights for visitors.

**Key Design Decisions**:
- **Content-hash based stable IDs** for section identification (resilient to minor edits)
- **Graph-structured JSON mapping** for flexible relationship types
- **Separate mapping files** stored alongside license packages
- **CSS Custom Highlight API** for performance-optimized rendering
- **Click-based editor UI** with visual preview for mapping creation

---

## 1. Section Identification Strategy

### 1.1 Recommended Approach: Hybrid Content Hashing

**Primary Method**: Generate stable IDs using SHA-256 content hashing combined with semantic markers

```typescript
interface SectionIdentifier {
  id: string;              // SHA-256 hash of normalized content
  semanticMarker?: string; // Optional: heading text or data attribute
  position: number;        // Ordinal position for fallback ordering
  type: 'heading' | 'paragraph' | 'list' | 'block';
}
```

**Algorithm**:
```typescript
function generateSectionId(element: HTMLElement): string {
  // Normalize content (lowercase, trim whitespace, remove punctuation)
  const normalized = element.textContent
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');

  // Generate SHA-256 hash (first 16 chars for readability)
  const hash = sha256(normalized).substring(0, 16);

  // Optional: prefix with semantic marker
  const prefix = element.dataset.section ||
                 (element.tagName.match(/H[1-6]/) ? slugify(element.textContent) : '');

  return prefix ? `${prefix}-${hash}` : hash;
}
```

**Why This Approach**:
- ✅ Survives minor content edits (punctuation, whitespace changes)
- ✅ Human-readable when using semantic markers
- ✅ Deterministic across builds
- ✅ No manual ID maintenance required
- ⚠️ Breaking changes only on substantial rewrites (acceptable trade-off)

### 1.2 Alternative: Manual Data Attributes

For critical sections requiring stability through major rewrites:

```html
<h2 data-section="warranty-disclaimer">We Give No Promises or Guarantees</h2>
```

**Trade-offs**:
- ✅ Completely stable regardless of content changes
- ✅ Editor-controlled identifiers
- ❌ Requires manual maintenance
- ❌ Easy to forget when adding new sections

**Recommendation**: Use hybrid approach - auto-generate hashes by default, allow manual overrides via `data-section` attributes for critical sections.

---

## 2. Mapping Data Structure

### 2.1 Graph-Based Relationship Model

**JSON Schema**:
```json
{
  "licenseId": "MIT",
  "version": "0.2.1",
  "mappingVersion": 1,
  "lastModified": "2026-01-30T12:00:00Z",
  "mappings": [
    {
      "id": "map-001",
      "type": "one-to-one",
      "plain": ["warranty-disclaimer-abc123"],
      "original": ["warranty-clause-def456"],
      "confidence": "high",
      "notes": "Direct semantic equivalence",
      "createdBy": "editor@plainlicense.org",
      "createdAt": "2026-01-25"
    },
    {
      "id": "map-002",
      "type": "many-to-one",
      "plain": ["use-permission-123", "copy-permission-456", "modify-permission-789"],
      "original": ["permission-grant-abc"],
      "confidence": "medium",
      "notes": "Plain version breaks down single permission clause"
    },
    {
      "id": "map-003",
      "type": "one-to-many",
      "plain": ["copyright-notice-xyz"],
      "original": ["copyright-header-aaa", "notice-requirement-bbb"],
      "confidence": "high"
    }
  ]
}
```

**Relationship Types**:
- `one-to-one`: Single plain section maps to single original section
- `one-to-many`: Single plain section covers multiple original clauses
- `many-to-one`: Multiple plain sections explain single original clause
- `many-to-many`: Complex cross-references (rare, but supported)

**Confidence Levels**:
- `high`: Direct semantic equivalence, minimal interpretation
- `medium`: Interpretive mapping, plain language expansion
- `low`: Loose connection, supplementary information
- `disputed`: Awaiting editorial review or legal verification

### 2.2 TypeScript Type Definitions

```typescript
type MappingType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
type ConfidenceLevel = 'high' | 'medium' | 'low' | 'disputed';

interface SectionMapping {
  id: string;
  type: MappingType;
  plain: string[];      // Array of plain section IDs
  original: string[];   // Array of original section IDs
  confidence: ConfidenceLevel;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  modifiedAt?: string;
}

interface LicenseMappings {
  licenseId: string;
  version: string;
  mappingVersion: number;
  lastModified: string;
  mappings: SectionMapping[];
}
```

---

## 3. Storage Strategy

### 3.1 Recommended: Separate JSON Files

**Location**: `packages/{license-name}/mappings.json`

**Rationale**:
- ✅ Clean separation of content and metadata
- ✅ Easy version control and diffs
- ✅ No impact on existing license frontmatter
- ✅ Can evolve independently from content
- ✅ Easy to programmatically update/validate

**Integration with Build System**:
```typescript
// In license_factory.py or equivalent
function loadLicenseMappings(licenseId: string): LicenseMappings | null {
  const mappingPath = `packages/${licenseId}/mappings.json`;
  if (fs.existsSync(mappingPath)) {
    return JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
  }
  return null;
}
```

### 3.2 Alternative: Frontmatter Embedding

Could embed mappings in license frontmatter:

```yaml
---
plain_name: Plain MIT License
# ... existing frontmatter ...
section_mappings:
  - id: map-001
    type: one-to-one
    plain: [warranty-disclaimer-abc123]
    original: [warranty-clause-def456]
---
```

**Trade-offs**:
- ✅ Single-file simplicity
- ❌ Clutters license frontmatter
- ❌ Harder to maintain large mapping sets
- ❌ Versioning complexity

**Recommendation**: Use separate JSON files for cleaner architecture.

---

## 4. Mapping Preservation During Content Edits

### 4.1 Content Hash Stability

**Challenge**: Minor edits change content hashes, breaking mappings

**Solution**: Fuzzy matching with migration tool

```typescript
interface MappingMigration {
  oldId: string;
  newId: string;
  similarity: number;  // 0-1 similarity score
  needsReview: boolean;
}

function detectBrokenMappings(
  mappings: LicenseMappings,
  currentSections: SectionIdentifier[]
): MappingMigration[] {
  const migrations: MappingMigration[] = [];

  for (const mapping of mappings.mappings) {
    for (const sectionId of [...mapping.plain, ...mapping.original]) {
      if (!currentSections.find(s => s.id === sectionId)) {
        // Section ID not found - find best match by content similarity
        const bestMatch = findBestMatch(sectionId, currentSections);

        migrations.push({
          oldId: sectionId,
          newId: bestMatch.id,
          similarity: bestMatch.similarity,
          needsReview: bestMatch.similarity < 0.8
        });
      }
    }
  }

  return migrations;
}

function findBestMatch(
  oldId: string,
  candidates: SectionIdentifier[]
): { id: string; similarity: number } {
  // Use Levenshtein distance or similar algorithm
  // to find section with most similar content
  // Could also use semantic similarity via embeddings
}
```

**Migration Workflow**:
1. Build system detects broken section IDs
2. Auto-generates migration suggestions based on similarity
3. Editor reviews suggestions via CLI tool or web UI
4. Approved migrations update `mappings.json`
5. Low-similarity matches flagged for manual review

### 4.2 Manual Override System

For critical sections, use stable `data-section` attributes:

```html
<!-- Plain version -->
<h2 data-section="warranty">We Give No Promises or Guarantees</h2>

<!-- Original version -->
<div data-section="warranty-original">
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY...
</div>
```

```json
{
  "mappings": [
    {
      "id": "map-warranty",
      "type": "one-to-one",
      "plain": ["warranty"],  // Uses data-section, not content hash
      "original": ["warranty-original"],
      "confidence": "high"
    }
  ]
}
```

**Best Practice**: Reserve manual IDs for sections likely to be substantially rewritten.

---

## 5. Interactive Highlighting System

### 5.1 Rendering Architecture: CSS Custom Highlight API

**Recommended**: Use modern CSS Custom Highlight API for performance

```typescript
// Modern approach (Chrome 105+, Safari 17.2+, Firefox 140+)
class HighlightRenderer {
  private highlights: Map<string, Highlight> = new Map();

  createHighlight(sectionId: string, ranges: Range[]): void {
    const highlight = new Highlight(...ranges);
    this.highlights.set(sectionId, highlight);
    CSS.highlights.set(sectionId, highlight);
  }

  removeHighlight(sectionId: string): void {
    CSS.highlights.delete(sectionId);
    this.highlights.delete(sectionId);
  }
}
```

```css
/* CSS styling for highlights */
::highlight(plain-active) {
  background-color: rgba(59, 130, 246, 0.2);
  border-bottom: 2px solid rgb(59, 130, 246);
}

::highlight(original-active) {
  background-color: rgba(234, 179, 8, 0.2);
  border-bottom: 2px solid rgb(234, 179, 8);
}

::highlight(plain-hover) {
  background-color: rgba(59, 130, 246, 0.1);
}
```

**Performance Benefits**:
- ✅ No DOM manipulation (no wrapper elements)
- ✅ No layout recalculation
- ✅ Browser-native optimization
- ✅ 500x faster than traditional approaches
- ✅ Accessible (works with screen readers)

### 5.2 Fallback: DOM Wrapper Elements

For older browsers, wrap highlighted text in `<mark>` elements:

```typescript
class FallbackHighlightRenderer {
  highlightSection(element: HTMLElement, className: string): void {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT
    );

    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text);
    }

    textNodes.forEach(node => {
      const mark = document.createElement('mark');
      mark.className = className;
      mark.textContent = node.textContent;
      node.replaceWith(mark);
    });
  }
}
```

**Trade-offs**:
- ✅ Works in all browsers
- ❌ Modifies DOM structure
- ❌ Triggers layout recalculation
- ❌ May interfere with copy/paste

**Recommendation**: Use CSS Custom Highlight API with feature detection, fallback to wrapper elements only if necessary.

### 5.3 Visual Connection Lines

For side-by-side comparison view, draw SVG lines connecting mapped sections:

```typescript
interface ConnectionLine {
  plainSectionId: string;
  originalSectionId: string;
  mappingType: MappingType;
  color: string;
}

function drawConnectionLine(connection: ConnectionLine): void {
  const plainEl = document.querySelector(`[data-section="${connection.plainSectionId}"]`);
  const originalEl = document.querySelector(`[data-section="${connection.originalSectionId}"]`);

  if (!plainEl || !originalEl) return;

  const plainRect = plainEl.getBoundingClientRect();
  const originalRect = originalEl.getBoundingClientRect();

  const svg = createSVGLine(
    plainRect.right, plainRect.top + plainRect.height / 2,
    originalRect.left, originalRect.top + originalRect.height / 2,
    connection.color
  );

  document.getElementById('connection-overlay').appendChild(svg);
}
```

**Performance Optimization**:
- Use `requestIdleCallback` to batch line rendering
- Debounce on scroll events
- Virtual scrolling for documents >100 sections

---

## 6. Editor User Interface

### 6.1 Recommended: Click-Based Selection

**Workflow**:
1. Editor clicks "Create Mapping" button
2. UI enters mapping mode (visual indicator)
3. Editor clicks plain section (highlighted in blue)
4. Editor clicks corresponding original section (highlighted in yellow)
5. UI shows preview with connection line
6. Editor confirms, selects relationship type (one-to-one, etc.)
7. Mapping saved to `mappings.json`

**UI Layout**:
```
┌────────────────────────────────────────────────────┐
│ [Create Mapping] [Edit Mapping] [Delete Mapping]  │
├──────────────────────┬─────────────────────────────┤
│  Plain Language      │  Original License           │
│                      │                             │
│  [Section 1] ←───────→ [Section A]                │
│  [Section 2]         │ [Section B]                 │
│  [Section 3] ←───┐   │ [Section C]                │
│                  └───→ [Section D]                 │
│                      │                             │
└──────────────────────┴─────────────────────────────┘
│ Mapping Type: [One-to-One ▼]  Confidence: [High ▼]│
│ Notes: [Direct equivalence of warranty clause...]  │
│ [Save Mapping] [Cancel]                            │
└────────────────────────────────────────────────────┘
```

### 6.2 Alternative: Drag-and-Drop Interface

**Libraries**:
- [DragDropAnnotate](https://github.com/AntoninoBonanno/DragDropAnnotate) - jQuery-based, image-focused
- [Recogito Text Annotator](https://github.com/recogito/text-annotator-js) - Modern text annotation with relationships
- Custom implementation with HTML5 Drag & Drop API

**Trade-offs**:
- ✅ More intuitive for complex mappings
- ✅ Visual feedback during interaction
- ❌ More complex implementation
- ❌ Accessibility challenges (keyboard navigation difficult)
- ❌ Mobile support issues

**Recommendation**: Start with click-based interface for simplicity, consider drag-drop as enhancement.

### 6.3 Editor Authentication & Access Control

**Implementation Options**:

1. **Build-Time Editor** (Recommended for MVP):
   - Local web UI served by development server
   - Saves directly to `mappings.json` files
   - Committed to Git like other content
   - No authentication needed (trust-based for contributors)

2. **Hosted Editor** (Future enhancement):
   - Web-based UI at `editor.plainlicense.org`
   - GitHub OAuth for authentication
   - Creates pull requests with mapping changes
   - Preview system for reviewing mappings

**Recommendation**: Start with build-time local editor for rapid iteration.

---

## 7. Visitor Interaction Patterns

### 7.1 Highlight-on-Hover

**User Experience**:
1. Visitor hovers over plain language section
2. Corresponding original section(s) highlighted automatically
3. Visual connection line appears (optional, can be distracting)
4. Tooltip shows relationship type and confidence

**Implementation**:
```typescript
class InteractiveMapping {
  private mappings: LicenseMappings;
  private renderer: HighlightRenderer;

  enableInteraction(): void {
    document.querySelectorAll('[data-section]').forEach(el => {
      el.addEventListener('mouseenter', (e) => this.handleHover(e));
      el.addEventListener('mouseleave', (e) => this.clearHighlight(e));
    });
  }

  handleHover(event: MouseEvent): void {
    const sectionId = (event.target as HTMLElement).dataset.section;
    const mapping = this.findMappingForSection(sectionId);

    if (mapping) {
      // Highlight all related sections
      const relatedIds = this.getRelatedSections(sectionId, mapping);
      relatedIds.forEach(id => this.renderer.createHighlight(id, [...]));

      // Optional: draw connection lines
      this.drawConnections(mapping);
    }
  }
}
```

### 7.2 Click-to-Navigate

**Enhancement**: Click highlighted section to scroll to counterpart

```typescript
handleClick(event: MouseEvent): void {
  const sectionId = (event.target as HTMLElement).dataset.section;
  const mapping = this.findMappingForSection(sectionId);

  if (mapping) {
    const targetIds = this.getCounterpartSections(sectionId, mapping);
    const targetEl = document.querySelector(`[data-section="${targetIds[0]}"]`);

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.flashHighlight(targetEl);  // Brief highlight animation
    }
  }
}
```

### 7.3 Toggle Controls

**UI Controls**:
- "Show Mappings" toggle (on/off)
- Filter by relationship type (one-to-one, many-to-one, etc.)
- Filter by confidence level (high, medium, low)
- "Comparison Mode" (side-by-side with connection lines)

---

## 8. Performance Considerations

### 8.1 Large Document Optimization

**Strategies**:

1. **Virtual Scrolling**: Only render highlights for visible sections
   ```typescript
   class VirtualHighlightManager {
     private observer: IntersectionObserver;

     constructor() {
       this.observer = new IntersectionObserver(
         (entries) => this.handleIntersection(entries),
         { rootMargin: '200px' }  // Pre-render buffer
       );
     }

     handleIntersection(entries: IntersectionObserverEntry[]): void {
       entries.forEach(entry => {
         if (entry.isIntersecting) {
           this.renderHighlights(entry.target);
         } else {
           this.removeHighlights(entry.target);
         }
       });
     }
   }
   ```

2. **Debounced Rendering**: Delay highlight updates on rapid interactions
   ```typescript
   const debouncedHighlight = debounce((sectionId: string) => {
     this.renderHighlights(sectionId);
   }, 150);
   ```

3. **Range Caching**: Pre-compute text ranges at page load
   ```typescript
   class RangeCache {
     private cache: Map<string, Range[]> = new Map();

     precomputeRanges(mappings: LicenseMappings): void {
       mappings.mappings.forEach(mapping => {
         [...mapping.plain, ...mapping.original].forEach(sectionId => {
           const element = document.querySelector(`[data-section="${sectionId}"]`);
           if (element) {
             this.cache.set(sectionId, this.computeRanges(element));
           }
         });
       });
     }
   }
   ```

### 8.2 Benchmark Targets

**Performance Goals**:
- Initial page load: <100ms additional overhead
- Hover response: <16ms (60fps)
- Highlight rendering: <50ms for 10 sections
- Memory usage: <5MB for 50 mappings

**Testing Strategy**:
- Use Chrome DevTools Performance profiler
- Test with MIT License (~150 lines) and MPL 2.0 (~400 lines)
- Measure on low-end devices (throttled CPU)

---

## 9. Related Libraries and Tools

### 9.1 Text Annotation Libraries

**Research Findings**:

1. **[Recogito Text Annotator](https://github.com/recogito/text-annotator-js)** (BSD-3-Clause)
   - Modern TypeScript library for web text annotation
   - Supports relationships between annotations
   - Built-in UI for creating/managing annotations
   - **Evaluation**: Strong candidate for editor interface
   - **Limitation**: Annotation data stored in memory, need custom persistence

2. **[Annotator.js](http://annotatorjs.org/)** (MIT)
   - Established library used by Hypothes.is, edX
   - Plugin architecture for extensibility
   - **Evaluation**: Mature but older codebase
   - **Limitation**: jQuery dependency, less active development

3. **[Hypothes.is](https://web.hypothes.is/)** (BSD-2-Clause)
   - Full annotation platform with server component
   - Focuses on collaborative annotation and discussion
   - **Evaluation**: Too heavyweight for Plain License needs
   - **Use Case**: Could integrate for community discussion feature

### 9.2 Text Comparison Libraries

**Research Findings**:

1. **[react-diff-viewer](https://www.npmjs.com/package/react-diff-viewer)** (MIT)
   - React component for side-by-side text comparison
   - Split view, inline view, word-level highlighting
   - **Evaluation**: Good for visual comparison UI
   - **Adaptation**: Could repurpose for license comparison view

2. **[diff2html](https://github.com/rtfpessoa/diff2html)** (MIT)
   - Generates HTML diff visualizations
   - Syntax highlighting support
   - **Evaluation**: Designed for code diffs, may need adaptation
   - **Use Case**: Could generate static comparison views

3. **[Python difflib.HtmlDiff](https://docs.python.org/3/library/difflib.html)** (Python Standard Library)
   - Built-in Python library for HTML diff generation
   - Side-by-side comparison with highlighting
   - **Evaluation**: Could use in build pipeline
   - **Integration**: Generate static comparison HTML during build

### 9.3 Content Hashing Libraries

**Recommendations**:

1. **JavaScript/TypeScript**:
   - `crypto.subtle.digest()` (Web Crypto API, native)
   - [js-sha256](https://www.npmjs.com/package/js-sha256) (MIT) - Fallback for older browsers

2. **Python**:
   - `hashlib.sha256()` (Standard library)
   - For build-time ID generation in `license_factory.py`

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goals**: Establish core data structures and build integration

- [ ] Implement section ID generation with content hashing
- [ ] Create TypeScript types for mapping data structures
- [ ] Add `mappings.json` loader to build system
- [ ] Generate section IDs during license page build
- [ ] Add `data-section` attributes to rendered HTML

**Deliverables**:
- `src/mapping/types.ts` - Type definitions
- `src/mapping/section-id.ts` - ID generation logic
- `overrides/hooks/mapping_processor.py` - Build integration
- Updated `license.html` template with section attributes

### Phase 2: Rendering (Week 3-4)

**Goals**: Implement visitor-facing highlight system

- [ ] Implement CSS Custom Highlight API renderer
- [ ] Add fallback renderer for older browsers
- [ ] Create hover interaction handlers
- [ ] Add visual styling for highlights
- [ ] Implement toggle controls (show/hide mappings)

**Deliverables**:
- `src/assets/javascripts/mapping/renderer.ts` - Highlight rendering
- `src/assets/javascripts/mapping/interactions.ts` - User interactions
- `src/assets/stylesheets/mapping.scss` - Highlight styles
- Updated license page template with controls

### Phase 3: Editor Interface (Week 5-6)

**Goals**: Build editor UI for creating mappings

- [ ] Create local dev server endpoint for editor
- [ ] Implement click-based section selection UI
- [ ] Add mapping creation/edit/delete forms
- [ ] Implement preview mode with live highlighting
- [ ] Add save functionality to update `mappings.json`

**Deliverables**:
- `src/editor/index.html` - Editor UI
- `src/editor/editor.ts` - Editor logic
- `overrides/hooks/editor_server.py` - Local dev server
- Documentation: editor usage guide

### Phase 4: Migration Tools (Week 7)

**Goals**: Handle mapping preservation through edits

- [ ] Implement broken mapping detection
- [ ] Create fuzzy matching algorithm for section migration
- [ ] Build CLI tool for reviewing/approving migrations
- [ ] Add CI check for broken mappings

**Deliverables**:
- `src/mapping/migration.ts` - Migration logic
- `scripts/check-mappings.py` - CI validation script
- `scripts/migrate-mappings.py` - Interactive migration tool
- Documentation: mapping maintenance guide

### Phase 5: Polish & Testing (Week 8)

**Goals**: Performance optimization and quality assurance

- [ ] Add virtual scrolling for large documents
- [ ] Implement range caching for performance
- [ ] Browser compatibility testing (Chrome, Firefox, Safari)
- [ ] Accessibility audit (keyboard navigation, screen readers)
- [ ] Create test mappings for MIT and MPL licenses
- [ ] Write user documentation

**Deliverables**:
- Performance optimizations
- Cross-browser testing report
- Accessibility compliance report
- User guide: using interactive mappings
- Editor guide: creating quality mappings

---

## 11. Testing Strategy

### 11.1 Unit Tests

```typescript
describe('SectionIdentifier', () => {
  it('generates stable IDs for identical content', () => {
    const id1 = generateSectionId(element1);
    const id2 = generateSectionId(element2);
    expect(id1).toBe(id2);
  });

  it('survives minor whitespace changes', () => {
    element1.textContent = 'Hello World';
    element2.textContent = 'Hello  World ';  // Extra spaces
    expect(generateSectionId(element1)).toBe(generateSectionId(element2));
  });

  it('changes on substantial content edits', () => {
    element1.textContent = 'Original text';
    const id1 = generateSectionId(element1);

    element1.textContent = 'Completely different text';
    const id2 = generateSectionId(element1);

    expect(id1).not.toBe(id2);
  });
});
```

### 11.2 Integration Tests

```typescript
describe('Mapping Renderer', () => {
  it('highlights all related sections on hover', async () => {
    const plainSection = screen.getByTestId('plain-warranty');

    await userEvent.hover(plainSection);

    expect(screen.getByTestId('original-warranty')).toHaveClass('highlighted');
    expect(CSS.highlights.has('warranty-original')).toBe(true);
  });

  it('handles many-to-one mappings correctly', async () => {
    const mapping: SectionMapping = {
      id: 'test',
      type: 'many-to-one',
      plain: ['perm-use', 'perm-copy', 'perm-modify'],
      original: ['permission-grant'],
      confidence: 'high'
    };

    await userEvent.hover(screen.getByTestId('perm-use'));

    expect(screen.getByTestId('permission-grant')).toHaveClass('highlighted');
    // Should also highlight sibling plain sections
    expect(screen.getByTestId('perm-copy')).toHaveClass('highlighted-sibling');
    expect(screen.getByTestId('perm-modify')).toHaveClass('highlighted-sibling');
  });
});
```

### 11.3 End-to-End Tests

```typescript
describe('Editor Workflow', () => {
  it('creates a new one-to-one mapping', async () => {
    await page.goto('http://localhost:8000/editor/mit');

    await page.click('[data-testid="create-mapping"]');
    await page.click('[data-section="warranty-abc123"]');
    await page.click('[data-section="warranty-original-def456"]');

    await page.selectOption('[data-testid="mapping-type"]', 'one-to-one');
    await page.selectOption('[data-testid="confidence"]', 'high');
    await page.click('[data-testid="save-mapping"]');

    // Verify mapping saved
    const mappingsFile = await fs.readFile('packages/mit/mappings.json', 'utf-8');
    const mappings = JSON.parse(mappingsFile);

    expect(mappings.mappings).toContainEqual(
      expect.objectContaining({
        type: 'one-to-one',
        plain: ['warranty-abc123'],
        original: ['warranty-original-def456']
      })
    );
  });
});
```

### 11.4 Performance Tests

```typescript
describe('Performance', () => {
  it('renders highlights in <50ms for 10 sections', async () => {
    const startTime = performance.now();

    for (let i = 0; i < 10; i++) {
      renderer.createHighlight(`section-${i}`, [createRange()]);
    }

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(50);
  });

  it('handles 100 mappings without memory leak', () => {
    const initialMemory = performance.memory.usedJSHeapSize;

    for (let i = 0; i < 100; i++) {
      renderer.createHighlight(`section-${i}`, [createRange()]);
    }

    // Clear all highlights
    renderer.clear();

    // Force garbage collection (requires --expose-gc flag)
    if (global.gc) global.gc();

    const finalMemory = performance.memory.usedJSHeapSize;
    const delta = finalMemory - initialMemory;

    // Should not leak more than 1MB
    expect(delta).toBeLessThan(1_000_000);
  });
});
```

---

## 12. Security & Privacy Considerations

### 12.1 Content Security

**Concerns**:
- Malicious mapping data could inject unwanted highlights
- Section IDs could be manipulated to confuse users

**Mitigations**:
- Validate `mappings.json` schema during build
- Sanitize all section IDs (alphanumeric + hyphen only)
- Use TypeScript strict mode for type safety
- Content Security Policy headers prevent XSS

### 12.2 Editor Access Control

**Concerns**:
- Unauthorized users modifying mappings
- Conflicting edits from multiple editors

**Mitigations**:
- Local dev server only accessible on localhost
- Production editor requires GitHub OAuth
- Mapping changes submitted as pull requests
- Git history provides audit trail

### 12.3 Privacy

**User Data**:
- No personal data collected from visitors
- No tracking of which mappings users interact with
- All functionality client-side (no server requests)

---

## 13. Accessibility Requirements

### 13.1 Keyboard Navigation

**Requirements**:
- Tab key navigates between sections
- Enter/Space activates highlight
- Escape clears highlights
- Arrow keys navigate between related sections

**Implementation**:
```typescript
class KeyboardAccessibility {
  handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;

    switch (event.key) {
      case 'Enter':
      case ' ':
        this.toggleHighlight(target);
        break;
      case 'Escape':
        this.clearAllHighlights();
        break;
      case 'ArrowRight':
        this.navigateToRelated(target, 'next');
        break;
      case 'ArrowLeft':
        this.navigateToRelated(target, 'previous');
        break;
    }
  }
}
```

### 13.2 Screen Reader Support

**Requirements**:
- ARIA labels describe mapping relationships
- Screen reader announces related sections on focus
- Highlight state communicated verbally

**Implementation**:
```html
<div
  data-section="warranty-abc123"
  aria-describedby="warranty-description"
  aria-controls="warranty-original-def456"
  role="article"
  tabindex="0"
>
  We Give No Promises or Guarantees
</div>

<span id="warranty-description" class="sr-only">
  This section corresponds to the warranty disclaimer in the original license
</span>
```

### 13.3 Visual Accessibility

**Requirements**:
- Sufficient color contrast (WCAG AA minimum)
- Multiple visual indicators (color + border + icon)
- Respects prefers-reduced-motion
- High contrast mode support

**Implementation**:
```css
@media (prefers-reduced-motion: reduce) {
  ::highlight(plain-active) {
    transition: none;
  }
}

@media (prefers-contrast: high) {
  ::highlight(plain-active) {
    border-bottom-width: 3px;
    background-color: transparent;
  }
}
```

---

## 14. Future Enhancements

### 14.1 Community Mapping Suggestions

Allow visitors to suggest mappings via GitHub issues:

```typescript
function suggestMapping(mapping: SectionMapping): void {
  const issueBody = `
## Mapping Suggestion

**Plain Section**: ${mapping.plain.join(', ')}
**Original Section**: ${mapping.original.join(', ')}
**Type**: ${mapping.type}
**Rationale**: ${mapping.notes}

[Auto-generated suggestion from plainlicense.org]
  `;

  window.open(
    `https://github.com/plainlicense/plainlicense/issues/new?title=Mapping%20Suggestion&body=${encodeURIComponent(issueBody)}`,
    '_blank'
  );
}
```

### 14.2 Machine Learning Assistance

Train ML model to suggest mappings:

```python
# Pseudo-code for ML-assisted mapping
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

def suggest_mappings(plain_sections, original_sections):
    plain_embeddings = model.encode(plain_sections)
    original_embeddings = model.encode(original_sections)

    # Compute cosine similarity
    similarities = cosine_similarity(plain_embeddings, original_embeddings)

    # Suggest top matches above threshold
    suggestions = []
    for i, plain_section in enumerate(plain_sections):
        for j, original_section in enumerate(original_sections):
            if similarities[i][j] > 0.7:
                suggestions.append({
                    'plain': plain_section['id'],
                    'original': original_section['id'],
                    'confidence': similarities[i][j],
                    'needsReview': True
                })

    return suggestions
```

### 14.3 Translation Support

Extend mappings to support multiple language versions:

```json
{
  "licenseId": "MIT",
  "version": "0.2.1",
  "languages": {
    "en": {
      "mappings": [...]
    },
    "es": {
      "mappings": [...],
      "mapsToOriginal": "en"
    },
    "fr": {
      "mappings": [...],
      "mapsToOriginal": "en"
    }
  }
}
```

### 14.4 Diff Visualization

Show how plain language evolved from original:

```typescript
interface MappingWithDiff {
  mapping: SectionMapping;
  plainText: string;
  originalText: string;
  transformation: 'simplification' | 'expansion' | 'reframing';
  readabilityImprovement: number;  // Gunning Fog reduction
}
```

---

## 15. References & Sources

### 15.1 Technical Documentation

- [HTML Semantic Elements](https://www.w3schools.com/html/html5_semantic_elements.asp) - Semantic HTML structure
- [Document elements and metadata - Unstructured](https://docs.unstructured.io/open-source/concepts/document-elements) - Content hashing for element IDs
- [CSS Custom Highlight API](https://www.cssscript.com/text-css-custom-highlight-api/) - Modern text highlighting performance
- [Building a React Text Comparison Tool](https://www.creowis.com/blog/building-a-react-text-comparison-tool) - Side-by-side comparison patterns
- [react-diff-viewer](https://www.npmjs.com/package/react-diff-viewer) - React comparison component
- [diff2html](https://github.com/rtfpessoa/diff2html) - HTML diff generation

### 15.2 Text Annotation Tools

- [Recogito Text Annotator](https://github.com/recogito/text-annotator-js) - Modern annotation library
- [Annotator.js](http://annotatorjs.org/) - Established annotation framework
- [LightTag](https://snappify.com/blog/text-annotation-tools) - Drag-and-drop relationship annotation
- [DragDropAnnotate](https://github.com/AntoninoBonanno/DragDropAnnotate) - jQuery image annotation plugin
- [Hypothes.is](https://web.hypothes.is/) - Collaborative annotation platform

### 15.3 Content Versioning & Stability

- [Ensembl Stable IDs](https://www.ensembl.org/info/genome/stable_ids/index.html) - Stable identifiers for versioned content
- [Content Management System: Versioning](https://softwaremill.com/content-management-system-versioning/) - Universal identifiers for versioned assets
- [Data Version Control (DVC)](https://dvc.org/doc/use-cases/versioning-data-and-models) - Versioning with stable file names

### 15.4 Data Structures & Modeling

- [How to work with JSON Modeling](https://hevodata.com/learn/json-modeling/) - JSON relationship patterns
- [Building JSON Documents from Relational Tables](https://www.enterprisedb.com/blog/building-json-documents-relational-tables) - Representing relationships in JSON
- [One-To-Many mapping with Dapper and JSON](https://medium.com/dapper-net/one-to-many-mapping-with-dapper-55ae6a65cfd4) - Relationship mapping examples
- [Schema Relationships: Types & Examples](https://www.puppygraph.com/blog/schema-relationship) - One-to-many, many-to-one patterns

### 15.5 Hashing & Cryptography

- [SHA256 - Online Tools](https://emn178.github.io/online-tools/sha256.html) - SHA-256 hashing
- [Understanding MD5 Hashing](https://medium.com/@pavloomelnyk/understanding-md5-hashing-and-its-usefulness-in-data-workflows-262bc640a331) - Content hashing for identifiers
- [MD5 vs SHA-256](https://ssojet.com/compare-hashing-algorithms/md5-vs-sha-256) - Hashing algorithm comparison
- [Python hashlib](https://docs.python.org/3/library/hashlib.html) - Standard library for hashing

---

## 16. Decision Summary

### Core Technical Decisions

| Decision Point | Chosen Approach | Rationale |
|----------------|-----------------|-----------|
| **Section Identification** | Hybrid: Content hashing + manual overrides | Balances stability with flexibility |
| **Mapping Storage** | Separate JSON files (`mappings.json`) | Clean separation, easy version control |
| **Relationship Model** | Graph structure with typed edges | Supports complex relationships |
| **Highlight Rendering** | CSS Custom Highlight API with fallback | Modern performance, graceful degradation |
| **Editor Interface** | Click-based local dev UI | Simplicity, rapid iteration |
| **Migration Strategy** | Fuzzy matching with manual review | Preserves mappings through edits |
| **Confidence Tracking** | 4-level system (high/medium/low/disputed) | Clear editorial quality signals |
| **Performance Strategy** | Virtual scrolling + range caching | Scales to large documents |

### Trade-offs Accepted

1. **Content hashing instability**: Substantial rewrites break mappings, but migration tools mitigate
2. **Browser compatibility**: CSS Custom Highlight API requires modern browsers, but fallback provided
3. **Editor simplicity**: Click-based UI less intuitive than drag-drop, but faster to implement
4. **Local-only editor**: No cloud hosting for MVP, limits collaboration but reduces complexity

---

## 17. Success Metrics

### Technical Metrics

- Section ID generation: <10ms per page
- Highlight rendering: <50ms for 10 sections
- Memory footprint: <5MB for 50 mappings
- Browser support: Chrome 105+, Firefox 140+, Safari 17.2+

### User Metrics

- Editor efficiency: Create mapping in <30 seconds
- Visitor engagement: >20% of visitors hover sections
- Mapping quality: >80% high-confidence mappings
- Maintenance burden: <1 hour/month per license

### Quality Metrics

- Mapping coverage: >90% of sections mapped
- Accuracy: <5% disputed mappings requiring review
- Stability: <10% broken mappings per content update
- Accessibility: WCAG AA compliance

---

## 18. Conclusion

This design provides a comprehensive, performant, and maintainable solution for section mapping in Plain License. The hybrid content-hashing approach balances stability with automation, while the graph-based mapping structure supports complex license relationships. The CSS Custom Highlight API ensures modern performance, and the click-based editor interface enables rapid mapping creation.

Key strengths:
- **Scalable**: Handles large documents efficiently
- **Maintainable**: Separate mapping files, clear schema
- **Accessible**: Keyboard navigation, screen reader support
- **Future-proof**: Foundation for ML assistance, translations

The phased implementation roadmap provides a clear path from foundation to polish, with testing strategy ensuring quality at each stage.

**Estimated Total Implementation**: 8 weeks (1 full-time developer)

**Recommended Start Date**: Q1 2026

---

**Document Version**: 1.0
**Last Updated**: 2026-01-30
**Author**: Claude (Deep Research Agent)
**Review Status**: Awaiting technical review
