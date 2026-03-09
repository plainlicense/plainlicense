# MIT License Mapping Attempt

## Manual Mapping Creation Exercise

**Date**: 2026-01-30
**License**: MIT
**Purpose**: Validate mapping workflow and data model by actually creating mappings

---

## Section Identification

### Plain Language Version Sections

1.  **Copyright Notice** (Line 31)
   - `Copyright Notice: (c) {{ year }} [copyright holders]`
   - **Proposed ID**: `plain-copyright`

2.  **You Can Do Anything with The Work** (Lines 33-44)
   - Heading + permission list + context
   - **Proposed ID**: `plain-permissions`

3.  **If You Give Us Credit and Keep This Notice** (Lines 46-58)
   - Heading + two requirements + annotation
   - **Proposed ID**: `plain-conditions`

4.  **We Give No Promises or Guarantees** (Lines 60-67)
   - Heading + "as is" explanation + disclaimer
   - **Proposed ID**: `plain-warranty-disclaimer`

### Original License Version Sections

1.  **Title** (Line 69)
   - `# The MIT License (MIT)`
   - **Proposed ID**: `original-title`

2.  **Copyright** (Line 71)
   - `Copyright (c) {{ year }} <copyright holders>`
   - **Proposed ID**: `original-copyright`

3.  **Permission Grant** (Lines 73-79)
   - "Permission is hereby granted... subject to the following conditions:"
   - **Proposed ID**: `original-permission-grant`

4.  **Conditions** (Lines 81-82)
   - "The above copyright notice... included in all copies..."
   - **Proposed ID**: `original-conditions`

5.  **Warranty Disclaimer** (Lines 84-91)
   - "THE SOFTWARE IS PROVIDED 'AS IS'... OTHER DEALINGS IN THE SOFTWARE."
   - **Proposed ID**: `original-warranty-disclaimer`

---

## Mapping Analysis

### Mapping 1: Copyright Notices

- **Plain**: `plain-copyright` - "Copyright Notice: (c) {{ year }} [copyright holders]"
- **Original**: `original-copyright` - "Copyright (c) {{ year }} <copyright holders>"
- **Type**: `one-to-one`
- **Confidence**: 0.99
- **Notes**: Direct correspondence, nearly identical text
- **Challenge**: None

### Mapping 2: Permissions

- **Plain**: `plain-permissions` - "You Can Do Anything with The Work"
- **Original**: `original-permission-grant` - "Permission is hereby granted..."
- **Type**: `one-to-one`
- **Confidence**: 0.95
- **Notes**: Plain version expands "deal in the Software without restriction" into explicit bullet list (Use, Copy, Change, Share, Sell, Mix). Also adds explanatory context not in original ("for free", "for any reason", "Everyone else can do these things too").
- **Challenge**: ⚠️ **EXPANSION ISSUE** - Plain version adds significant explanatory content not literally in original. Is this still a "mapping" or is it "derived from + educational expansion"?

### Mapping 3: Conditions/Requirements

- **Plain**: `plain-conditions` - "If You Give Us Credit and Keep This Notice"
- **Original**: `original-conditions` - "The above copyright notice... shall be included..."
- **Type**: `one-to-one`
- **Confidence**: 0.90
- **Notes**: Plain version breaks down into two explicit rules and provides 4 alternative ways to satisfy requirement #2. Original just says "shall be included in all copies or substantial portions". Plain adds SPDX identifier option and linking options not in original.
- **Challenge**: ⚠️ **EXPANSION + INTERPRETATION ISSUE** - Plain version interprets "included in all copies" as allowing multiple methods (physical inclusion, linking, SPDX). This is a reasonable legal interpretation but not explicit in original.

### Mapping 4: Warranty Disclaimer

- **Plain**: `plain-warranty-disclaimer` - "We Give No Promises or Guarantees"
- **Original**: `original-warranty-disclaimer` - "THE SOFTWARE IS PROVIDED 'AS IS'..."
- **Type**: `one-to-one`
- **Confidence**: 0.95
- **Notes**: Plain version translates dense legal language into plain explanations. "AS IS" → "as it is, including anything broken". "WITHOUT WARRANTY OF ANY KIND" → "No Guarantees: We are not promising it will work well...". "NOT BE LIABLE" → "We are not responsible for any problems or damages".
- **Challenge**: None - This is pure translation/simplification

### Mapping 5: Original Title

- **Plain**: None (no corresponding section)
- **Original**: `original-title` - "# The MIT License (MIT)"
- **Type**: `unmapped-original`
- **Confidence**: N/A
- **Notes**: Original license has a title heading that doesn't appear in plain version. Plain version uses frontmatter (`plain_name: Plain MIT License`) instead.
- **Challenge**: ⚠️ **STRUCTURAL DIFFERENCE** - How do we handle sections that exist in one version but not the other?

---

## Challenges Discovered

### 1. ⚠️ **Expansion vs Translation**

The plain version doesn't just translate - it **expands and explains**. For example:

- Original: "deal in the Software without restriction"
- Plain: 6-item bullet list + "for free" + "for any reason" + "Everyone else can do these things too"

**Question**: Should we map these, or mark them as "derived from + educational expansion"?

### 2. ⚠️ **Legal Interpretation as Content**

The plain version interprets legal requirements and adds options not explicit in original:

- Original: "shall be included in all copies or substantial portions"
- Plain: 4 specific methods including SPDX identifiers and linking

**Question**: Is this mapping to original intent or adding new content? Affects confidence scores.

### 3. ⚠️ **Unmapped Sections**

- Original has title heading → Plain doesn't (uses frontmatter)
- Should we track "unmapped" sections?
- Do we need a mapping type for "structural difference, not semantic"?

### 4. ⚠️ **Granularity Ambiguity**

For the permissions section:

-   Should we map the **entire section** (heading + bullets + context)?
-   Or map **individual bullets** to specific phrases in original?
    - Plain "Use it" ← Original "use"
    - Plain "Copy it" ← Original "copy"
    - Plain "Change it" ← Original "modify"
    - Plain "Share it" ← Original "distribute, sublicense"
    - Plain "Sell it" ← Original "sell"
    - Plain "Mix or put it together" ← Original (not explicitly stated, inferred from "copies of the Software")

**Question**: Section-level or clause-level granularity?

### 5. ⚠️ **Content Hashing Complexity**

To generate SHA-256 hashes, I need to:

- Normalize whitespace
- Strip markdown formatting?
- Include annotations `<div class="annotate">`?
- Include template variables `{{ year }}`?

**Question**: What exactly gets hashed for section identification?

---

## Proposed Data Model Issues

### Issue 1: Need "Mapping Type" Taxonomy

The schema shows `"type": "one-to-one"` but I encountered:

- `one-to-one` (direct correspondence)
- `one-to-many` (one plain section → multiple original sections)
- `derived-from` (plain expands/interprets original intent)
- `unmapped` (exists in one version only)

### Issue 2: Confidence Scoring Criteria

What makes a mapping 0.95 vs 0.80 vs 0.50?

- Pure translation: 0.95-0.99
- Translation + minor expansion: 0.85-0.90
- Interpretation + expansion: 0.70-0.80
- Loose correspondence: 0.50-0.65

Need documented rubric.

### Issue 3: Section ID Strategy

I used descriptive IDs like `plain-permissions`, but:

- Should IDs be semantic (`plain-permissions`) or positional (`plain-section-2`)?
- What if section order changes?
- Auto-generated IDs from headings or manual assignment?

---

## Time Tracking

**Actual time spent**: ~25 minutes

- 10 min: Careful reading and section identification
- 10 min: Mapping analysis and correspondence
- 5 min: Challenge documentation

**Estimated time for non-technical user with manual JSON**:

- Reading and understanding: 15-20 min
- Creating JSON structure: 20-30 min
- Generating hashes: 5-10 min (if we provide CLI tool)
- **Total**: 40-60 minutes for MIT (simple license)

**For complex license like MPL-2.0**: Likely 2-3 hours

---

## Recommendations Based on Exercise

### 1. Define Mapping Philosophy First

Before building tools, we need to decide:

- **Pure translation only**: Only map direct correspondences
- **Include expansions**: Map even when plain adds explanatory content
- **Hybrid**: Different mapping types for different relationships

### 2. Section Granularity Decision

-   **Section-level** (recommended): Map heading blocks
    - Simpler for editors
    - Good enough for user navigation
-   **Clause-level**: Map individual sentences/bullets
    - More precise but much more work
    - Might be overkill

### 3. Unmapped Content Handling

Need to support:

- Sections that exist in original but not in plain
- Sections that exist in plain but not in original
- This is **normal** for "reimagining" approach

### 4. Hashing Specification

Need clear rules:

- Normalize whitespace (yes/no?)
- Strip markdown (yes/no?)
- Include annotations (yes/no?)
- Handle template variables (replace with placeholder?)

### 5. Editor Workflow Insight

The hard part isn't creating the JSON - it's **analyzing the correspondence**.

- A visual tool helps with **clicking to link**
- But doesn't solve **deciding what corresponds**
- AI assistance could help suggest correspondences for editor review

---

## Next Steps

1. **Validate this mapping** with you - Did I get the correspondences right?
2. **Create actual JSON** with SHA-256 hashes using CLI tool
3. **Test on more complex license** (MPL-2.0) to find additional edge cases
4. **Refine data model** based on real-world complexity
