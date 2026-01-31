# Section Mapping Editor: Requirements & Options Brainstorm

**Feature**: 001-cms-license-platform
**Component**: Section Mapping Editor UX
**Date**: 2026-01-30
**Purpose**: Brainstorming document for dedicated session on section mapping editor design

---

## Problem Statement

**Core Challenge**: Enable editors to create visual mappings between plain language sections and original license sections without requiring technical knowledge (JSON editing, Git workflow expertise).

**Why This Matters**:
- **User Feature** (FR-014-018): Visitors can click a section in plain language version to see corresponding original section(s), and vice versa
- **Educational Value**: Helps readers understand how plain language translates legal terms
- **Trust Building**: Transparency about what changed between versions
- **Editor Workflow**: Non-technical editors need to create these mappings when writing licenses

---

## Requirements

### Functional Requirements

**FR-MAP-001**: Editor can visually select a section in plain language version
- Click or highlight a section heading or paragraph
- Clear visual indication of selection (highlight, outline, etc.)
- Works with multiple selection modes (single section, range, non-contiguous)

**FR-MAP-002**: Editor can visually select corresponding section(s) in original version
- Side-by-side or split-pane view of plain vs original
- Same selection UX as plain language side
- Support for one-to-one, one-to-many, many-to-one, many-to-many mappings

**FR-MAP-003**: Editor can create mapping between selected sections
- Button/action to "Link these sections"
- Mapping type auto-detected (one-to-one, one-to-many, etc.)
- Option to add notes/explanation for the mapping

**FR-MAP-004**: Editor can preview how mapping will appear to users
- See highlighting/linking behavior before publishing
- Test click interactions (click plain → highlight original, and vice versa)
- Mobile and desktop preview

**FR-MAP-005**: Editor can validate mappings
- Detect broken mappings (content changed but mapping didn't update)
- Fuzzy matching to suggest fixes when content changes
- Warning when SHA-256 hash mismatch detected

**FR-MAP-006**: Editor can save mappings to repository
- Generate `mappings.json` file with correct schema
- Commit to Git repository (or prepare for commit)
- No manual JSON editing required

### Non-Functional Requirements

**NFR-MAP-001**: Non-technical user can complete mapping in <30 minutes (SC-001 alignment)
- Simple, intuitive UX (no technical jargon)
- Visual feedback for all actions
- Undo/redo support

**NFR-MAP-002**: Works with existing Git-based workflow
- Integrates with Sveltia CMS OR standalone tool
- Respects Git version control (no database dependency)
- Can be used locally (developer setup) and potentially in browser

**NFR-MAP-003**: Performance acceptable for long licenses
- Handles licenses with 20+ sections without lag
- Smooth scrolling and highlighting
- <50ms response time for section highlighting (from research v1)

---

## Current State

**Storage Format** (from data-model.md):
```json
{
  "license_id": "MIT",
  "version": "1.2.0",
  "last_updated": "2026-01-20T14:22:00Z",
  "mappings": [
    {
      "id": "map-1",
      "type": "one-to-one",
      "plain_section": {
        "id": "intro",
        "hash": "sha256:abc123...",
        "title": "You Can Do Anything with The Work"
      },
      "original_section": {
        "id": "grant",
        "hash": "sha256:def456...",
        "title": "Permission Grant"
      },
      "confidence": 0.95,
      "notes": "Direct translation of permission grant",
      "created_at": "2024-03-15T10:30:00Z"
    }
  ]
}
```

**License Content Format** (section IDs in frontmatter):
```yaml
sections:
  plain:
    - id: intro
      title: You Can Do Anything with The Work
    - id: copyright-req
      title: You Must Include Copyright Notice
  original:
    - id: grant
      title: Permission Grant
    - id: conditions
      title: Conditions
```

**Section Identification** (from research v1):
- **Primary**: SHA-256 hash of normalized section content (automatic)
- **Override**: Manual `id` attribute in markdown (`{#intro}`)
- **Purpose**: Detect when mappings break due to content changes

---

## Brainstormed Options

### Option 1: Local Dev Server Tool (Standalone Web App)

**Architecture**:
```
┌─────────────────────────────────────────────────┐
│  Local Development Server (Astro/React/Svelte)  │
│  http://localhost:3000/admin/section-mapper    │
└─────────────────────────────────────────────────┘
                    │
                    ├─ Reads: content/licenses/{license}/index.md
                    ├─ Parses: YAML frontmatter + Markdown sections
                    ├─ Displays: Side-by-side plain vs original
                    ├─ Writes: content/licenses/{license}/mappings.json
                    └─ Commits: Git (optional - editor can commit manually)
```

**User Workflow**:
1. Editor runs `bun run section-mapper` (or similar command)
2. Opens browser to `http://localhost:3000/admin/section-mapper`
3. Selects license from dropdown (MIT, MPL-2.0, etc.)
4. Tool loads plain and original sections side-by-side
5. Editor clicks section in plain version → highlights
6. Editor clicks corresponding section(s) in original → highlights
7. Editor clicks "Link Sections" button → creates mapping
8. Repeat for all sections
9. Editor clicks "Preview" to test highlighting behavior
10. Editor clicks "Save" → writes `mappings.json`
11. Editor commits file via Git (or tool auto-commits)

**UX Components**:
- **Split-pane layout**: Plain language (left) | Original (right)
- **Click-to-select**: Section outlines on hover, highlight on click
- **Visual indicators**: Connected sections show link icon or color coding
- **Mapping list sidebar**: Shows all created mappings, allows edit/delete
- **Live preview mode**: Click sections to see user-facing highlighting
- **Fuzzy match suggestions**: "This plain section might map to these original sections"

**Technology Stack**:
- **Frontend**: React/Vue/Svelte (pick one based on team preference)
- **Backend**: Astro dev server or simple Node.js Express server
- **Markdown Parsing**: remark/rehype for section extraction
- **Content Hashing**: Crypto API for SHA-256 generation
- **File I/O**: Node.js `fs` module for reading/writing mappings.json

**Pros**:
- ✅ Full framework capabilities (React/Vue/Svelte) = rich UX
- ✅ Can use complex UI libraries (drag-and-drop, visual connectors)
- ✅ No CMS integration complexity (standalone tool)
- ✅ Easy to iterate on UX without CMS constraints
- ✅ Works with any editor workflow (not tied to Sveltia CMS)

**Cons**:
- ❌ Separate from main CMS workflow (editors use two tools)
- ❌ Requires local development environment (Node/Bun setup)
- ❌ Not accessible to pure "no-code" editors (need terminal access)
- ❌ More moving parts (dev server, file watchers, etc.)

**Estimated Development Time**: 20-30 hours
- 8-10 hours: Core UI (split-pane, section selection, mapping creation)
- 6-8 hours: Markdown parsing, section extraction, hash generation
- 4-6 hours: Preview mode, validation, fuzzy matching
- 2-4 hours: File I/O, Git integration (optional), error handling

---

### Option 2: Sveltia CMS Custom Widget

**Architecture**:
```
┌──────────────────────────────────────────┐
│  Sveltia CMS Custom Widget              │
│  Embedded in /admin interface            │
└──────────────────────────────────────────┘
         │
         ├─ Access: Via Sveltia CMS "Section Mapping" field type
         ├─ Data Source: Current license content (from CMS state)
         ├─ Output: Updates mappings.json field in frontmatter
         └─ Save: Sveltia CMS handles Git commit
```

**User Workflow**:
1. Editor opens license in Sveltia CMS (e.g., MIT license)
2. Scrolls to "Section Mapping" field (custom widget)
3. Widget loads plain and original sections from license content
4. Editor uses same click-to-link UX as Option 1
5. Widget updates `mappings.json` field in frontmatter (or separate file)
6. Editor clicks "Save" in CMS → Sveltia commits to Git

**UX Components**:
- **Embedded split-pane**: Fits within CMS form layout
- **Modal overlay**: Full-screen mapping interface (triggered by "Edit Mappings" button)
- **CMS-native controls**: Follows Sveltia CMS design patterns
- **Validation messages**: Inline errors/warnings in CMS UI

**Technology Stack**:
- **Widget Framework**: Sveltia CMS widget API (Svelte-based)
- **Constraints**: Limited to CMS widget capabilities (no full framework freedom)
- **Data Flow**: CMS state → Widget → CMS field update → Git commit

**Pros**:
- ✅ Single interface for all content editing (no separate tool)
- ✅ CMS handles Git workflow automatically
- ✅ Editors already in CMS, no context switching
- ✅ Consistent UX with rest of content editing

**Cons**:
- ❌ Limited by CMS widget API capabilities
- ❌ Complex custom development (Sveltia CMS widget system learning curve)
- ❌ Harder to build rich UX (drag-and-drop, visual connectors) in widget
- ❌ Coupled to Sveltia CMS (if we switch CMSs, tool needs rewrite)
- ❌ Potentially cramped UI (fitting complex interface in CMS form)

**Estimated Development Time**: 30-40 hours
- 12-15 hours: Learn Sveltia CMS widget API, setup widget scaffolding
- 8-10 hours: Core mapping UI within widget constraints
- 6-8 hours: Data flow (CMS state → widget → field update)
- 4-7 hours: Preview, validation, error handling

---

### Option 3: Manual JSON Editing (v1.0 MVP)

**Architecture**:
```
Editor → Text Editor (VS Code) → mappings.json → Git commit
```

**User Workflow**:
1. Editor opens `content/licenses/mit/mappings.json` in text editor
2. Manually adds mapping objects following schema:
   ```json
   {
     "id": "map-1",
     "type": "one-to-one",
     "plain_section": {
       "id": "intro",
       "hash": "sha256:...",
       "title": "You Can Do Anything with The Work"
     },
     "original_section": {
       "id": "grant",
       "hash": "sha256:...",
       "title": "Permission Grant"
     },
     "confidence": 0.95,
     "notes": "Direct translation"
   }
   ```
3. Uses CLI tool to generate SHA-256 hashes: `bun run hash-section --file=index.md --section=intro`
4. Commits file to Git

**UX Components**:
- **JSON schema validation**: VS Code extension for schema validation
- **CLI hash generator**: Simple script to generate section hashes
- **Documentation**: Clear guide with examples

**Technology Stack**:
- **No custom UI**: Uses existing text editors
- **CLI Tool**: Simple Bun/Node script for hash generation
- **Schema**: JSON schema for validation in editors

**Pros**:
- ✅ Ship immediately (no custom development time)
- ✅ Learn requirements before building complex UI
- ✅ Flexible (works with any editor/workflow)
- ✅ Good for technical early adopters

**Cons**:
- ❌ Non-technical editors can't use (violates SC-001)
- ❌ Error-prone (typos, incorrect JSON syntax, wrong hashes)
- ❌ No preview mode (can't test highlighting)
- ❌ Tedious for large licenses (20+ mappings = lots of JSON)
- ❌ Not a long-term solution

**Estimated Development Time**: 4-6 hours
- 2-3 hours: CLI hash generation tool
- 1-2 hours: JSON schema creation
- 1 hour: Documentation with examples

---

### Option 4: Browser-Based Web App (No Local Setup Required)

**Architecture**:
```
┌─────────────────────────────────────────────────┐
│  Hosted Web App (e.g., mapper.plainlicense.org) │
│  No backend - pure client-side JavaScript       │
└─────────────────────────────────────────────────┘
         │
         ├─ Input: Editor uploads license markdown file
         ├─ Processing: Browser parses, extracts sections
         ├─ UI: Same side-by-side mapping interface
         ├─ Output: Downloads mappings.json file
         └─ Editor commits downloaded file to Git
```

**User Workflow**:
1. Editor navigates to `https://mapper.plainlicense.org`
2. Uploads license markdown file (`index.md`)
3. Tool parses file, extracts plain and original sections
4. Editor creates mappings using visual interface
5. Editor clicks "Download" → gets `mappings.json` file
6. Editor uploads `mappings.json` to repository via Sveltia CMS or Git

**UX Components**:
- **File upload**: Drag-and-drop markdown file
- **Same mapping UI**: As Option 1 (split-pane, click-to-link)
- **Download button**: Exports `mappings.json`
- **No save to Git**: Editor manually commits file

**Technology Stack**:
- **Frontend Only**: Pure JavaScript (React/Vue/Svelte SPA)
- **Hosting**: Cloudflare Pages (free, static site)
- **No Backend**: All processing client-side (privacy-friendly)
- **Markdown Parsing**: Browser-compatible markdown parser (marked.js, remark)

**Pros**:
- ✅ No local setup required (works in browser immediately)
- ✅ No backend infrastructure (free Cloudflare Pages hosting)
- ✅ Privacy-friendly (no data leaves user's browser)
- ✅ Works on any device with browser (desktop, tablet)
- ✅ Easy to share (send URL to collaborators)

**Cons**:
- ❌ Still separate from CMS (context switching)
- ❌ Manual file upload/download (not seamless)
- ❌ Editor must still commit file to Git (extra step)
- ❌ No automatic validation with repository state

**Estimated Development Time**: 15-25 hours
- 6-8 hours: Core mapping UI (same as Option 1, but simpler)
- 4-6 hours: File upload, markdown parsing, section extraction
- 3-5 hours: Download generation, client-side processing
- 2-4 hours: Hosting setup, documentation

---

### Option 5: Hybrid - AI-Assisted Manual + Visual Preview

**Architecture**:
```
Step 1: AI suggests mappings (GPT-4, Claude API)
Step 2: Editor reviews suggestions in simple UI
Step 3: Editor approves/edits/rejects
Step 4: Tool generates mappings.json
```

**User Workflow**:
1. Editor provides plain and original license text to AI
2. AI analyzes and suggests likely mappings:
   ```
   "I think plain section 'You Can Do Anything' maps to
   original section 'Permission Grant' (95% confidence)"
   ```
3. Editor reviews suggestions in simple interface:
   - ✓ Approve (keep mapping)
   - ✗ Reject (remove mapping)
   - ✎ Edit (adjust section IDs or notes)
4. Editor clicks "Generate" → creates `mappings.json`

**UX Components**:
- **AI Suggestion List**: Shows proposed mappings with confidence scores
- **Preview Pane**: Highlights sections to verify AI suggestions
- **Approve/Reject Controls**: Simple checkboxes or buttons
- **Edit Mode**: Allows tweaking section IDs or notes

**Technology Stack**:
- **AI**: OpenAI GPT-4 or Anthropic Claude API (paid service)
- **Frontend**: Simple web interface (React/Vue)
- **Backend**: API endpoint to call AI service (or client-side if API keys acceptable)

**Pros**:
- ✅ Fastest editor workflow (AI does heavy lifting)
- ✅ Non-technical friendly (approve/reject is simple)
- ✅ Learns from corrections (AI improves with feedback)
- ✅ Can suggest mappings for new licenses instantly

**Cons**:
- ❌ Requires paid AI API (cost per mapping session)
- ❌ AI suggestions may be wrong (editor must verify carefully)
- ❌ Privacy concerns (license text sent to AI service)
- ❌ Dependency on external service (AI API downtime)
- ❌ Still separate from CMS workflow

**Estimated Development Time**: 12-18 hours
- 4-6 hours: AI prompt engineering, API integration
- 4-6 hours: Review UI with approve/reject controls
- 2-4 hours: Preview pane for validation
- 2 hours: mappings.json generation

**Ongoing Costs**: ~$0.10-0.50 per license mapping (AI API calls)

---

### Option 6: VS Code Extension (Editor-Native Tool)

**Architecture**:
```
┌──────────────────────────────────────────┐
│  VS Code Extension                       │
│  Sidebar panel with mapping interface    │
└──────────────────────────────────────────┘
         │
         ├─ Reads: Open license file in editor
         ├─ UI: VS Code webview panel
         ├─ Writes: mappings.json in same directory
         └─ Git: Editor commits via VS Code Git integration
```

**User Workflow**:
1. Editor opens `content/licenses/mit/index.md` in VS Code
2. Opens "Section Mapper" panel from sidebar
3. Extension parses open file, shows plain vs original sections
4. Editor creates mappings using panel UI
5. Extension writes `mappings.json` to same directory
6. Editor commits file via VS Code Git panel

**UX Components**:
- **VS Code Webview**: Embedded web UI in sidebar panel
- **File Integration**: Reads current open file automatically
- **Sync with Editor**: Clicking mapping highlights sections in main editor
- **Git Integration**: Uses VS Code's Git UI for commits

**Technology Stack**:
- **VS Code Extension API**: TypeScript, webview API
- **Webview UI**: HTML/CSS/JS (React/Vue/Svelte possible)
- **File I/O**: VS Code workspace file system API

**Pros**:
- ✅ Integrated with editor workflow (developers already use VS Code)
- ✅ No separate browser/server needed
- ✅ Can leverage VS Code features (Git, file watching, etc.)
- ✅ Good for technical users comfortable with VS Code

**Cons**:
- ❌ Only works in VS Code (not universal)
- ❌ Still technical (non-technical editors may not use VS Code)
- ❌ Extension development learning curve
- ❌ Limited by VS Code extension API constraints

**Estimated Development Time**: 20-30 hours
- 8-10 hours: VS Code extension scaffolding, API learning
- 6-8 hours: Webview UI for mapping interface
- 4-6 hours: File parsing, section extraction, hash generation
- 2-4 hours: Git integration, error handling

---

## Comparison Matrix

| Option | Non-Technical Friendly | Dev Time | Setup Complexity | CMS Integration | Maintenance |
|--------|------------------------|----------|------------------|-----------------|-------------|
| **1. Local Dev Server** | ⚠️ Medium (requires terminal) | 20-30h | Medium (local setup) | ❌ Separate | Medium |
| **2. Sveltia Widget** | ✅ High (in CMS) | 30-40h | Low (no setup) | ✅ Native | High (CMS-coupled) |
| **3. Manual JSON** | ❌ Low (technical only) | 4-6h | Low (text editor) | ❌ None | Low |
| **4. Browser Web App** | ✅ High (just browser) | 15-25h | None (URL only) | ⚠️ Manual upload | Low |
| **5. AI-Assisted** | ✅ High (approve/reject) | 12-18h | Low (web interface) | ❌ Separate | Medium + API costs |
| **6. VS Code Extension** | ⚠️ Medium (VS Code users) | 20-30h | Medium (install ext) | ❌ Separate | Medium |

---

## Recommendation Strategy

**For v1.0 (Ship Fast)**:
- Start with **Option 3: Manual JSON Editing**
  - Get feature working immediately (4-6 hours)
  - Learn from real usage patterns
  - Gather requirements for better tool

**For v2.0 (Non-Technical Friendly)**:
- Build **Option 4: Browser Web App** OR **Option 1: Local Dev Server**
  - Option 4 if "no setup" is critical
  - Option 1 if richer UX and local integration preferred
  - Both avoid CMS coupling (tool outlives CMS choice)

**Future Exploration**:
- **Option 5: AI-Assisted** as enhancement (speed up mapping creation)
- **Option 2: Sveltia Widget** if team commits long-term to Sveltia CMS

**Avoid**:
- Option 6 (VS Code Extension) - too narrow user base, technical barrier

---

## Open Questions for Brainstorming Session

1. **User Priority**: Is "no local setup" (Option 4) more important than "richest UX" (Option 1)?

2. **Integration Philosophy**: Should mapping tool be:
   - Integrated with CMS (tightly coupled, seamless workflow)?
   - Standalone (flexible, survives CMS changes)?

3. **v1.0 Acceptable UX**: Can we launch with manual JSON editing (Option 3) initially?
   - Or must v1.0 have visual editor to meet SC-001 (non-technical <30 min)?

4. **AI Assistance**: Is AI-suggested mappings (Option 5) worth the API cost and privacy trade-off?
   - Would hybrid "AI suggests, editor approves" reduce editing time significantly?

5. **Preview Mode Priority**: How important is live preview (see highlighting before publish)?
   - Critical for v1.0?
   - Or acceptable to ship without preview initially?

6. **Validation Strategy**: How should we handle broken mappings when content changes?
   - Fuzzy matching + editor review?
   - Block publish until mappings updated?
   - Warning only?

7. **Mobile Support**: Should editors be able to create mappings on tablets?
   - If yes, Option 4 (browser app) is better
   - If desktop-only, Option 1 (local server) has more freedom

8. **Team Technical Skills**: What's the team's comfort level with:
   - Running local dev servers? (affects Option 1)
   - VS Code extensions? (affects Option 6)
   - Web development? (affects all options)

---

## Next Steps After Brainstorming

1. **Make Decision**: Choose primary option based on brainstorming discussion
2. **Spike/POC**: Build 2-4 hour prototype to validate UX approach
3. **Refine Requirements**: Based on POC feedback, finalize requirements
4. **Full Implementation**: Build chosen option
5. **User Testing**: Test with non-technical editor to validate SC-001 compliance

---

## Additional Resources

**From Current Research**:
- Section Mapping Technical Implementation (research v1 - Task 7): SHA-256 hashing, CSS Custom Highlight API
- Data Model: mappings.json schema and section identification strategy
- Success Criteria SC-001: Non-technical user can publish license <30 minutes

**Relevant Features**:
- FR-014: Click plain language section to highlight original section
- FR-015: Click original section to highlight plain language section
- FR-016: Visual indication of corresponding sections
- FR-017: Section highlighting performance <50ms
- FR-018: Support for one-to-many and many-to-one mappings
