# Plain License Template Spec
**Version 0.3 — Working Draft**

---

## Guiding principles

1. **Reader priority order.** Sections are ordered by what readers care about, not by legal convention. What you can do comes first. Boilerplate comes last or below the line.
2. **Difference before sameness.** The things that vary between licenses appear prominently. The things that are identical across all licenses (warranty, liability) are collapsed — present but not prominent.
3. **Conditions belong to license families.** Rules within a license family are nearly identical and should be defined once in a family template and referenced, not repeated, in each license.
4. **Rules need reasons.** Every condition states not just what to do but why. One sentence. Always visible, never hidden.
5. **Concrete over abstract.** Where a rule could be misapplied, a yes-example and a no-example make the boundary visible.
6. **Text is the floor, not the target.** The canonical form is the full interactive/iframe experience. All other export formats are degraded representations of that.

---

## Anatomy: the seven zones

Every Plain License is composed of the same seven zones, always in this order. Zones 1–4 are **above the line** (shown by default). Zones 5–7 are **below the line** (collapsed by default, always expandable).

```
┌─────────────────────────────────────────┐
│  ZONE 1   Identity & orientation        │  Always visible
│  ZONE 2   What you can do               │  Always visible
│  ZONE 3   What you must do              │  Always visible (if rules exist)
│  ZONE 4   How to give credit            │  Always visible (if attribution_required)
├─────────────────────────────────────────┤  ← fold line
│  ZONE 5   What you cannot do            │  Collapsed by default
│  ZONE 6   Standard protections          │  Collapsed by default
│  ZONE 7   Legal interpretation          │  Collapsed by default
└─────────────────────────────────────────┘
```

**Exception — Source Available family:** Restrictions are the defining characteristic of source-available licenses, not a secondary concern. For this family, Zone 5 moves above the fold line, between Zones 2 and 3. Zone 1 must include a prominent `[!IMPORTANT]` callout in the TL;DR: "This license has significant commercial restrictions. Read 'What you cannot do' before assuming this is a permissive license."

**Exception — Public Domain / Dedication:** The how-to-apply block (part of Zone 3) is suppressed when `is_dedication` is true. There are no conditions to apply.

In plain text and markdown exports, all zones appear sequentially. Zones 5–7 are visually separated by a horizontal rule and a `— Less commonly needed —` label.

---

## Zone 1: Identity & orientation

**Purpose:** Tell the reader what this license is, what it covers, and who it applies to — in three sentences or fewer.

**Components:**

- **License display name** (from `plain_name` — e.g. "Plain MIT License")
- **Family tag** — derived from `license_family`: Public Domain / Permissive / Copyleft / Source Available / Proprietary
- **One-line plain description** (from `description`)
- **TL;DR block** (from `tldr` array) — 2–4 bullets answering "What do most people need to know right now?"
- **Copyright block** (personalized) — copyright holder name, year(s), optional contact

`description` answers: "What kind of license is this?" It is 1–3 sentences about character and defining properties. Used in card/list views and above the TL;DR.

`tldr` answers: "What are the practical implications for me right now?" It is 2–4 action-oriented bullets written in second person. It is the only place that summarizes across all zones. It should be enough for the majority of readers with a simple, common use case.

**TL;DR format (GFM alert):**

```markdown
> [!NOTE]
> **The short version:**
> - You can use, copy, change, and share this work for any reason, including commercially.
> - You must keep the copyright notice and this license with any copy you share.
> - No warranty is provided. Use at your own risk.
```

For complex licenses (copyleft, source available), the TL;DR may include a "depends what you're doing" qualifier with a link to the decision-tree flow in Zone 3.

---

## Zone 2: What you can do

**Purpose:** State permissions directly, actively, in second person. This is the first substantive section because it answers the question most readers came to ask.

**Format: permission cards**

Each permission is a card. Cards are scannable by default; detail is progressive.

```
Card anatomy:
┌──────────────────────────────────────────┐
│  [ICON]  PERMISSION LABEL                │
│                                          │
│  One sentence. Active voice. "You can…"  │
│                                          │
│  ▸ Example: what this looks like         │  ← collapsed by default
└──────────────────────────────────────────┘
```

Permissions don't require a "why" — they're freedoms, not demands. The example is optional but recommended for any permission where the scope might be unclear (e.g. "Mix it" — what counts as mixing?).

**Markdown degradation:**
```markdown
### ✓ Change it

You can change this work in any way — fix it, improve it, translate it,
or build something new from it.
```

**Standard permission vocabulary** (consistent across all licenses):

| Label | Plain meaning | Covers | ChAL tag |
|---|---|---|---|
| Use it | Run, read, perform, deploy | Any use of the work as-is | — |
| Copy it | Duplicate, archive, backup | Making copies | `distribution` |
| Change it | Modify, fix, translate, build upon | Any alteration | `modifications` |
| Share it | Give to others, publish, post | Giving copies to others | `distribution` |
| Sell it | Commercial use, resale, paid products | Any commercial purpose | `commercial-use` |
| Mix it | Incorporate into other works | Combining with other-licensed work | `modifications` |
| Keep it private | No obligation to publish | No forced disclosure | `private-use` |
| Sub-license it | Give rights to others under different terms | Passing on rights | — |
| Patent use | Use contributor patents | Express patent license | `patent-use` |

"ChAL tag" is the corresponding choosealicense.com tag. The mapping from ChAL tags to display labels is defined in `tagMappings.ts` (see Implementation section), not in frontmatter.

**Grouping:** If a license has more than five permissions, group by theme. Suggested groupings: "Use and copy" / "Change and share" / "Commercial use."

---

## Zone 3: What you must do

**Purpose:** State rules (conditions) as obligations, framed as a checklist. Family-level reuse is most important here — rules within a family are nearly identical and should reference shared blocks rather than repeat prose.

**Format: condition cards**

```
Card anatomy:
┌──────────────────────────────────────────┐
│  [ICON]  RULE LABEL                      │
│                                          │
│  One sentence. "You must…"               │
│                                          │
│  Why: One sentence. Always visible.      │
│                                          │
│  ▸ How to follow this rule               │  ← collapsed by default
│  ▸ Example: following vs. not following  │  ← collapsed by default
└──────────────────────────────────────────┘
```

**The "why" is mandatory in condition cards.** It appears at the card level, always visible, never hidden.

**Standard condition vocabulary:**

| Label | Family | Plain meaning | ChAL tag |
|---|---|---|---|
| Give credit | Permissive, Creative | Name the original creator | `include-copyright` |
| Keep this notice | Permissive | Keep copyright and license text with the work | `include-copyright` |
| Share alike | Copyleft | Share changes under the same rules | `same-license` |
| Share alike (file) | Weak copyleft | Same license for modified files, not whole project | `same-license--file` |
| Share alike (library) | Weak copyleft | Same license for the library, not whole project | `same-license--library` |
| Disclose source | Copyleft | Make source code available | `disclose-source` |
| State changes | Weak copyleft | Say what you changed | `document-changes` |
| Network use counts | Strong copyleft (AGPL) | Remote access triggers share-alike | `network-use-disclose` |

**Family inheritance:** A condition defined at the family level is a shared component or data block. A license references it; it never re-authors it. For a license with a family-level nuance (e.g. MPL-2.0's file-level vs. GPL's project-level copyleft), use an optional `condition_overrides` field — a complete replacement of the family default for that condition, not a patch.

**How-to-apply block:** The standard "how to apply this license to your project" instructions are a family-level component default. They are not a schema field. License-specific additions (e.g. MPL-2.0's file-header boilerplate) are supplied via `extra_how` in frontmatter and appended to the family default. Suppressed entirely when `is_dedication` is true.

**Decision-tree overlay (interactive only):** For licenses with multiple conditions, a short "does this apply to me?" flow filters which conditions are relevant. Maximum three questions. Example for copyleft: "Are you sharing copies?" / "Are you changing the work?" / "Are users accessing it over a network?"

---

## Zone 4: How to give credit

**Purpose:** Convert the attribution rule from an abstract requirement into an actionable tool. Only renders when `attribution_required` is true.

**Components:**

1. **Fill-in template** (personalized where possible):
   ```
   [Work name] © [Year] [Creator name]. Plain MIT License.
   ```

2. **Context-specific examples** (two or three, chosen for the license type):
   - In code: file header comment
   - In a README or document: sentence or footer
   - On a website or app: footer or About page

3. **Explicit "you don't need to" statement:** State what is *not* required — a specific format, prior permission, a particular location. Reduces compliance anxiety.

4. **Copyable checklist** (interactive only): What must be present, as checkboxes.

**Personalization behavior:**
- With copyright holder + year populated: template is pre-filled, examples are concrete.
- Without personalization: template uses `[placeholders]` with instructions to replace them.

---

## Zone 5: What you cannot do

**Purpose:** State restrictions clearly, same card structure as Zone 2 with visual distinction (restriction color/icon).

**Default position:** Collapsed below the fold, except for Source Available licenses where this zone moves above the fold between Zones 2 and 3.

**Standard restriction vocabulary:**

| Label | Plain meaning | ChAL tag |
|---|---|---|
| No trademark use | Don't use the creators' names or marks to endorse your product | `trademark-use` |
| No additional restrictions | You can't add rules that take away what this license gives | — |
| No sublicensing | You can't give others more rights than this license gives you | — |
| No patent claims | You can't sue users of this work for patent infringement | `patent-use` |
| No commercial use | You can't use this work to make money | — |
| No competing use | You can't use this to build a competing product | — |

**Markdown degradation:**
```markdown
> [!WARNING]
> ### You cannot do these things
>
> - **No trademark use.** Don't use the creators' names, logos, or marks
>   to suggest they endorse your product.
```

---

## Zone 6: Standard protections

**Purpose:** Warranty disclaimer and limitation of liability. Present for legal completeness; not prominent because the content is functionally identical across all licenses.

**Canonical plain-language text** (authored once as a family-level template block, referenced in all licenses via `block_id: standard-protections`):

```
### No warranties

The work is provided as-is. The copyright holders make no promises about
whether it will work, whether it is accurate, or whether it is fit for
any particular purpose.

### No liability

The copyright holders are not responsible for any damages or losses that
result from using this work, even if they knew such damage was possible.
```

If a specific license diverges from the standard (rare), a callout note is added at the top of this zone — not a rewrite of the canonical text.

**In the interactive experience:** Collapsed under "Standard protections — the same across all licenses."

**In all text exports:** Appears after a horizontal rule at the end.

---

## Zone 7: Legal interpretation

**Purpose:** Provide the authoritative fallback and severability statement. Always collapsed in the interactive experience. Always present at the end in text exports.

**Canonical text** (rendered by `ZoneInterpretation.astro` from frontmatter fields):

```
The {{ plain_name }} is a plain language version of the {{ original.version_display }}.
We wrote it to make the {{ original.version_display }} more accessible and understandable,
without changing its legal intent.

If precise legal language matters for your situation — for example, if you're in a
dispute or reviewing compliance — refer to the official {{ original.name }}.

If a court finds that any part of this {{ license_kind }} can't be enforced, the rest
of the {{ license_kind }}'s rules still apply.
```

**Template variables and their sources:**

| Variable | Schema field | Example |
|---|---|---|
| `plain_name` | `plain_name` | "Plain MIT License" |
| `original.version_display` | `original.version_display` | "MIT License (1988)" |
| `original.name` | `original.name` | "MIT License" |
| `license_kind` | derived from `is_dedication` | "license" or "dedication" |

For PlainLicense originals (no `original` object), Zone 7 uses a shorter variant that omits the "version of the..." sentence and links only to the PlainLicense repository.

---

## Export format matrix

| Zone | Interactive | GFM markdown | Plain markdown | Plain text |
|---|---|---|---|---|
| 1. Identity & orientation | Full, with alert | `[!NOTE]` alert | Blockquote TL;DR | Indented TL;DR |
| 2. What you can do | Cards, progressive | Table + list | List | List |
| 3. What you must do | Cards, progressive | Numbered list + `<details>` | Numbered list | Numbered list |
| 4. How to give credit | Template + examples + checklist | Code blocks + `- [ ]` tasks | Code blocks | Indented blocks |
| 5. What you cannot do | Collapsed cards (above fold for source-available) | `[!WARNING]` + list | `> Warning` + list | Caps header + list |
| 6. Standard protections | Collapsed | Below `---` | Below `---` | Below `---` |
| 7. Legal interpretation | Collapsed | Below `---` | Below `---` | Below `---` |

**GFM-specific affordances to use:**
- `> [!NOTE]` for TL;DR
- `> [!WARNING]` for restrictions
- `> [!IMPORTANT]` for source-available commercial restriction callout in Zone 1
- `<details><summary>` for collapsed zones 5–7
- `- [ ]` task lists for the Zone 4 compliance checklist

---

## Vocabulary and consistency rules

### Core word choices

| Use | Never use | Notes |
|---|---|---|
| **change** | alter, modify, amend, revise | Covers source modification and derivative works. If a specific license draws a meaningful distinction between these, surface it in the condition card detail — not via different vocabulary. |
| **copy** | reproduce, replicate | |
| **give** | convey, furnish, grant | In the sense of giving rights or a copy to someone |
| **use** | exploit, utilize | |
| **share** | distribute, convey, propagate | Any act of giving the work to someone else |
| **mix**, remix | combine, combination, reuse, adapt | Specifically means incorporating into other works — not general modification |
| **the work** | the software, the code, the material, the content | Used consistently regardless of what kind of work it is |
| **rules** | permissions, conditions, limitations, terms | For individual items — "rules" covers all three legal categories from the reader's perspective |
| **give credit** | attribute, acknowledge | Attribution requirement |
| **keep this notice** | retain all notices, preserve | Obligation to preserve copyright + license |
| **lawyer** | attorney, barrister, solicitor | Most internationally understood plain form |
| **you** | licensee, recipient, user | The person reading and using the license. Don't use "user" — too easily confused with end-user of software |
| **the copyright holders** | licensor, author, grantor | Who owns and licenses the work |

**On "we":** Appropriate in Zone 7, where PlainLicense speaks about the plain language version. In all other zones, use "the copyright holders" to avoid ambiguity about who is speaking.

**On "rules":** The legal taxonomy (permission vs. condition vs. limitation) does not improve reader comprehension and may actively mislead. From the reader's perspective, all items are things they need to understand before acting.

### Tense and voice rules

- **Permissions:** Present tense, second person active. "You can share this work."
- **Conditions:** Present tense, second person active. "You must keep this notice."
- **Restrictions:** Present tense, second person active. "You cannot use the creators' names to endorse your product."
- **No passive voice** in Zones 1–5.
- **Zones 6–7** may use a more formal register — readers expect it there and it's consistent with legal source material.

---

## License families

| Family | Defining characteristic | Current implementations |
|---|---|---|
| **Public Domain** | No rights reserved. No conditions, no restrictions. | Unlicense |
| **Permissive** | Minimal conditions. Do almost anything; keep the notice. | MIT |
| **Copyleft** | Share-alike required. Changes must come back under the same rules. | MPL-2.0 |
| **Source Available** | Source is visible but commercial and competitive use is restricted. | Elastic-2.0 |
| **Proprietary** | All rights reserved; explicit grants only. | *(planned)* |

Each family owns:
- Its standard condition block(s) — authored once, referenced in member licenses
- Its standard protections text (Zone 6) — identical across all family members
- Its TL;DR template — a starting point customized by each license
- Its how-to-apply instructions — suppressed for `is_dedication: true`

---

## Astro / Starlight implementation

### Project structure

```
src/
├── content/
│   └── licenses/
│       ├── public-domain/
│       │   └── unlicense.mdx
│       ├── permissive/
│       │   └── mit.mdx
│       ├── copyleft/
│       │   └── mpl-2.mdx
│       └── source-available/
│           └── elastic-2.mdx
│
├── components/
│   └── license/
│       ├── LicenseLayout.astro
│       ├── zones/
│       │   ├── ZoneIdentity.astro
│       │   ├── ZonePermissions.astro
│       │   ├── ZoneConditions.astro
│       │   ├── ZoneCredit.astro
│       │   ├── ZoneRestrictions.astro
│       │   ├── ZoneProtections.astro
│       │   └── ZoneInterpretation.astro
│       ├── cards/
│       │   ├── PermissionCard.svelte
│       │   ├── ConditionCard.svelte
│       │   └── RestrictionCard.svelte
│       └── export/
│           ├── ExportPanel.svelte       # client:idle Svelte island
│           └── exportFormats.ts         # Pure format rendering functions
│
├── data/
│   ├── license-families/
│   │   ├── permissive.ts
│   │   ├── copyleft.ts
│   │   ├── public-domain.ts
│   │   └── source-available.ts
│   └── tagMappings.ts                   # ChAL tag → display tag mapping
│
└── schemas/
    └── license.ts                       # Zod schema for content collection
```

---

### Content collection schema

```typescript
// src/schemas/license.ts
import { z } from 'astro:content';

// ── Choosealicense.com tag enums ──────────────────────────────────────────────
// These are the data layer. Display tags and icons are derived from these
// at build time via tagMappings.ts — never stored in frontmatter.

const PermissionTag = z.enum([
  'commercial-use',
  'distribution',
  'modifications',
  'patent-use',
  'private-use',
  'revokable',        // PlainLicense addition for proprietary licenses
]);

const ConditionTag = z.enum([
  'disclose-source',
  'document-changes',
  'include-copyright',
  'include-copyright--source',
  'network-use-disclose',
  'same-license',
  'same-license--file',
  'same-license--library',
]);

const LimitationTag = z.enum([
  'liability',
  'patent-use',
  'trademark-use',
  'warranty',
]);

// ── Build-time subschema ──────────────────────────────────────────────────────
// Auto-populated from the choosealicense.com submodule during build.
// Do not author in frontmatter.

const ChooseALicenseSchema = z.object({
  title: z.string(),
  spdx_id: z.string(),
  description: z.string(),
  how: z.string(),
  conditions: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  using: z.array(z.record(z.string(), z.string().url())).max(3).optional(),
  hidden: z.boolean().default(false),
  nickname: z.string().optional(),
  note: z.string().optional(),
});

// ── Original license object ───────────────────────────────────────────────────
// Present when this is an adaptation of an existing license.
// Omit entirely for PlainLicense originals.

const OriginalLicenseSchema = z.object({

  // Full name as listed in SPDX or commonly known.
  name: z.string(),

  // SPDX identifier, if one exists.
  spdx_id: z.string().regex(/^[A-Za-z0-9.-]+$/).optional(),

  // Raw version string. Omit if no versioning (e.g. MIT has none).
  version: z.string().optional(),

  // Full human-readable display string for use in Zone 7 prose.
  // "...a plain version of the {{ original.version_display }}."
  // Examples: "MIT License (1988)", "Mozilla Public License 2.0"
  version_display: z.string().optional(),

  // Organization that created and stewards this license.
  organization: z.string().optional(),

  // True if a single authoritative source exists (MPL, Elastic, Unlicense).
  // False when the canonical URL points to a widely-used reference rather
  // than a true official source (MIT, BSD variants).
  has_official_source: z.boolean().default(false),

  // Most authoritative URL available.
  // has_official_source: true  → steward's official page
  // has_official_source: false → best available reference (e.g. opensource.org)
  canonical_url: z.string().url(),

  // True if the original text itself includes a reference URL at the end.
  // When true, append canonical_url to our displayed original text.
  // Example: Unlicense tacks a reference link onto the end of its own text.
  link_in_original: z.boolean().default(false),

  // True if SPDX marks this license as deprecated.
  is_deprecated: z.boolean().default(false),

  // Approval status of the original license. Does not refer to our plain version.
  is_osi_approved: z.boolean().optional(),
  is_fsf_approved: z.boolean().optional(),

  // Choosealicense.com tags for the original.
  // Precedence rule: manually authored values here always win over
  // auto-populated choose_a_license_details values. The build pipeline
  // uses choose_a_license_details to fill gaps, not to override.
  permissions: z.array(PermissionTag).optional(),
  conditions: z.array(ConditionTag).optional(),
  limitations: z.array(LimitationTag).optional(),

  // Readability of the original license text.
  // Computed at build time. Do not author manually.
  gunning_fog: z.number().optional(),

  // Auto-populated at build time from choosealicense.com submodule.
  // Do not author in frontmatter.
  choose_a_license_details: ChooseALicenseSchema.optional(),

});

// ── Main license schema ───────────────────────────────────────────────────────

export const LicenseCollectionSchema = z.object({

  // ── Identity ───────────────────────────────────────────────────────────────

  // Display name of this plain language version.
  // Convention: "Plain [Original Name]" — no "The", no version number.
  plain_name: z.string().min(1).max(100),

  // SPDX id for this plain version.
  // Adapting an SPDX license: use the original id ("MIT", "MPL-2.0").
  // PlainLicense original: prefix with "Plain-" ("Plain-Public-Work-1.0").
  spdx_id: z.string().regex(/^[A-Za-z0-9.-]+$|^Plain-[A-Za-z0-9.-]+$/),

  // Semver version of this plain language version specifically.
  // Independent of the original license's version.
  plain_version: z.string().regex(/^\d+\.\d+\.\d+$/),

  // License family. Determines:
  //   - Which family-level condition blocks are inherited
  //   - Whether Zone 5 surfaces above the fold (source-available)
  //   - URL path: /licenses/{license_family}/{spdx_id}/
  license_family: z.enum([
    'public-domain',
    'permissive',
    'copyleft',
    'source-available',
    'proprietary',
  ]),

  // True if this is a public domain dedication rather than a license.
  // Affects Zone 7 language ("dedication" vs. "license") and suppresses
  // the how-to-apply block.
  is_dedication: z.boolean().default(false),

  // Workflow status. Only 'published' content appears on the site.
  status: z.enum(['draft', 'published']).default('draft'),

  // ── Description ───────────────────────────────────────────────────────────

  // 1–3 sentences about the license's character and defining properties.
  // Used in card/list views and in Zone 1 above the TL;DR.
  // Answers: "What kind of license is this?"
  description: z.string().min(1).max(300),

  // 2–4 action-oriented bullets for the Zone 1 TL;DR alert.
  // Should be enough for a reader with a simple, common use case.
  // Answers: "What are the practical implications for me right now?"
  // Write in second person: "You can use, copy, change, and share this work..."
  tldr: z.array(z.string().max(200)).min(2).max(4),

  // ── Content flags ─────────────────────────────────────────────────────────

  // Controls whether Zone 4 (How to give credit) renders.
  attribution_required: z.boolean().default(false),

  // True if this is a Fair Code license. Requires license_family: source-available.
  fair_code: z.boolean().default(false),

  // ── How-to instructions ───────────────────────────────────────────────────
  // The standard how-to block is a family-level component default — not a
  // schema field. Use extra_how only for license-specific additions.
  // Example: MPL-2.0's specific file-header boilerplate.
  // Not rendered when is_dedication is true.
  extra_how: z.string().optional(),

  // ── Clause mapping ────────────────────────────────────────────────────────
  // Links sections of our plain version to corresponding original sections.
  // Second-level exploration feature, not primary content.

  has_mapping: z.boolean().default(false),
  mapping_version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),

  // ── Readability metrics ───────────────────────────────────────────────────
  // Computed at build time from the plain license text. Do not author manually.

  plain_gunning_fog: z.number().optional(),
  shame_words_count: z.number().optional(),

  // ── Display controls ──────────────────────────────────────────────────────

  show_original_comparison: z.boolean().default(true),
  show_shame_counter: z.boolean().default(true),
  featured: z.boolean().default(false),

  // ── SEO / metadata ────────────────────────────────────────────────────────

  // Overrides the auto-generated meta description.
  // Auto-generation: first sentence of description + site name.
  meta_description: z.string().max(160).optional(),

  og_image: z.string().optional(),
  authors: z.array(z.string()).optional(),
  changelog: z.string().optional(),

  // ── Original license ──────────────────────────────────────────────────────
  // Present for adaptations. Omit entirely for PlainLicense originals.
  original: OriginalLicenseSchema.optional(),

// ── Validation ────────────────────────────────────────────────────────────────

}).refine(
  (data) => !(data.fair_code && data.license_family !== 'source-available'),
  { message: "fair_code must be false unless license_family is 'source-available'" }
).refine(
  (data) => !(data.is_dedication && data.license_family !== 'public-domain'),
  { message: "is_dedication must be false unless license_family is 'public-domain'" }
).refine(
  (data) => !(data.has_mapping && !data.mapping_version),
  { message: "mapping_version is required when has_mapping is true" }
).refine(
  (data) => !(data.original?.has_official_source && !data.original?.canonical_url),
  { message: "original.canonical_url is required when original.has_official_source is true" }
);

// ── Template block schema ─────────────────────────────────────────────────────
// Family-level shared content: warranty boilerplate, family condition blocks.
// Authored once, referenced by member licenses via block_id.

export const TemplateBlockSchema = z.object({
  title: z.string(),
  block_id: z.string().regex(/^[a-z0-9-]+$/),
  category: z.enum(['warranty', 'permission', 'condition', 'disclaimer', 'notice']),
  // Which families use this block. Omit for blocks that apply to all families.
  families: z.array(z.enum([
    'public-domain',
    'permissive',
    'copyleft',
    'source-available',
    'proprietary',
  ])).optional(),
  description: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  block_title: z.string().optional(),
});
```

---

### Example frontmatter: Plain MIT License

```yaml
plain_name: Plain MIT License
spdx_id: MIT
plain_version: 1.0.0
license_family: permissive
is_dedication: false
status: published

description: >
  A short, permissive license with minimal conditions.
  You can do almost anything with this work, as long as
  you keep the copyright notice with any copy you share.

tldr:
  - You can use, copy, change, and share this work for any reason, including commercially.
  - You must keep the copyright notice and this license with any copy you share.
  - No warranty is provided. Use at your own risk.

attribution_required: true
fair_code: false
has_mapping: false

original:
  name: MIT License
  spdx_id: MIT
  version_display: MIT License (1988)
  has_official_source: false
  canonical_url: https://opensource.org/licenses/MIT
  link_in_original: false
  is_deprecated: false
  is_osi_approved: true
  is_fsf_approved: true
  permissions:
    - commercial-use
    - distribution
    - modifications
    - private-use
  conditions:
    - include-copyright
  limitations:
    - liability
    - warranty
```

---

### Tag mapping layer

Tags are a two-layer system. The choosealicense.com tags (`commercial-use`, `include-copyright`, etc.) are the data, stored in `original.permissions/conditions/limitations`. The PlainLicense display tags (`can-sell`, `give-credit`, etc.) are the presentation — icons, colors, tooltip text. The mapping between layers lives in a static constants file and never touches frontmatter.

```typescript
// src/data/tagMappings.ts

// Maps choosealicense.com tags → PlainLicense display tags.
// Manually authored values in original.permissions/conditions/limitations
// always take precedence over auto-populated choose_a_license_details values.
// The build pipeline uses choose_a_license_details to fill gaps only.

export const PERMISSION_MAP = {
  'commercial-use': 'can-sell',
  'distribution':   'can-share',
  'modifications':  'can-change',
  'private-use':    'can-keep-private',
  'patent-use':     'patent-use',
  'revokable':      'can-revoke',      // PlainLicense addition
} as const;

export const CONDITION_MAP = {
  'disclose-source':           'share-source',
  'document-changes':          'describe-changes',
  'include-copyright':         'give-credit',
  'include-copyright--source': 'give-credit',  // same display, different trigger
  'network-use-disclose':      'share-alike-network',
  'same-license':              'share-alike-strict',
  'same-license--file':        'share-alike-relaxed',
  'same-license--library':     'share-alike-relaxed',
} as const;

export const LIMITATION_MAP = {
  'liability':      'no-liability',
  'warranty':       'no-warranty',
  'trademark-use':  'no-trademark',
  'patent-use':     'no-patent',
} as const;

// Tooltip text for each display tag.
export const TAG_DESCRIPTIONS: Record<string, string> = {
  'can-sell':
    'You can sell this work or use it in a paid product.',
  'can-share':
    'You can share or give copies of this work to anyone.',
  'can-change':
    'You can change this work however you want.',
  'can-keep-private':
    'You have no obligation to publish or share your changes.',
  'can-revoke':
    'The copyright holder can revoke this license from future users.',
  'patent-use':
    'You get an express license to use any contributor patents.',
  'give-credit':
    'You must name the original creator when you share this work.',
  'describe-changes':
    'You must say what you changed when you share a modified version.',
  'share-source':
    'You must make the source code available when you share this work.',
  'share-alike-strict':
    'You must share changes under the same license — for the entire project.',
  'share-alike-relaxed':
    'You must share changes under the same license — for the same file or library.',
  'share-alike-network':
    'Letting users access this work over a network counts as sharing.',
  'no-liability':
    'The copyright holders are not responsible for damages from using this work.',
  'no-warranty':
    'No promises are made about whether this work is fit for any purpose.',
  'no-trademark':
    "You can't use the creators' names or marks to endorse your product.",
  'no-patent':
    "You can't sue users of this work for patent infringement.",
};
```

---

### LicenseLayout component

```astro
---
// src/components/license/LicenseLayout.astro
import { getFamilyData } from '../../data/license-families';
import ZoneIdentity from './zones/ZoneIdentity.astro';
import ZonePermissions from './zones/ZonePermissions.astro';
import ZoneConditions from './zones/ZoneConditions.astro';
import ZoneCredit from './zones/ZoneCredit.astro';
import ZoneRestrictions from './zones/ZoneRestrictions.astro';
import ZoneProtections from './zones/ZoneProtections.astro';
import ZoneInterpretation from './zones/ZoneInterpretation.astro';
import ExportPanel from './export/ExportPanel.svelte';

const { license } = Astro.props;
const family = getFamilyData(license.data.license_family);
const sourceAvailable = license.data.license_family === 'source-available';
---

<article class="plain-license" data-family={license.data.license_family}>

  <ZoneIdentity license={license.data} />
  <ZonePermissions permissions={license.data.permissions} />

  {/* Source Available: restrictions surface above fold */}
  {sourceAvailable && license.data.restrictions &&
    <ZoneRestrictions restrictions={license.data.restrictions} aboveFold={true} />
  }

  {license.data.conditions?.length > 0 &&
    <ZoneConditions
      conditions={license.data.conditions}
      familyConditions={family.conditions}
      conditionOverrides={license.data.condition_overrides}
    />
  }

  {license.data.attribution_required &&
    <ZoneCredit license={license.data} />
  }

  <div class="below-fold">
    {!sourceAvailable && license.data.restrictions &&
      <ZoneRestrictions restrictions={license.data.restrictions} aboveFold={false} />
    }
    <ZoneProtections familyProtections={family.protections} />
    <ZoneInterpretation license={license.data} />
  </div>

  {/* Exceptional MDX body content (rare — most licenses have none) */}
  <slot name="outro" />

  <ExportPanel license={license.data} client:idle />

</article>
```

**On MDX body content:** Most licenses have no MDX body. For the rare license that needs exceptional prose (e.g. Elastic-2.0's version history note), authors use a `<LicenseSlot>` component in the MDX body:

```mdx
{/* src/content/licenses/source-available/elastic-2.mdx */}

import LicenseSlot from '@components/license/LicenseSlot.astro';

<LicenseSlot zone="outro">
  The Elastic License 2.0 replaced the prior Elastic License 1.0 in early 2021.
  If you are using software released before that date, check which version applies.
</LicenseSlot>
```

This avoids re-introducing the MkDocs problem of content needing to know about its own template. The slot mechanism is Astro's normal component model — no separate rendering pass.

---

### Export pipeline

The MkDocs approach required two Jinja passes: one to fill template blocks with license data, another to fill the license page with rendered blocks. In Astro, this dissolves:

- **"Fill blocks with license data"** disappears. Zone components receive license data as props and render inline. No intermediate state.
- **"Fill page with blocks"** is Astro's normal component tree render, compiled once at build time.

The one place sequential processing survives is the **text export pipeline**, where you are generating string output rather than component output. The clean structure is two explicit stages rather than two Jinja passes:

```typescript
// src/components/license/export/exportFormats.ts

// Stage 1: Resolve all data into a flat, typed render context.
// Merges license frontmatter + family block content + personalization.
// Returns a single object that all format renderers read from.
// Nothing downstream does any data resolution.

function buildRenderContext(
  license: LicenseCollectionSchema,
  familyBlocks: FamilyBlocks,
  personalization: Personalization
): RenderContext {
  return {
    plain_name: license.plain_name,
    original_name: license.original?.name ?? null,
    original_version_display: license.original?.version_display ?? null,
    license_kind: license.is_dedication ? 'dedication' : 'license',
    original_canonical_url: license.original?.canonical_url ?? null,

    // Resolved family blocks
    warranty_block: familyBlocks.warranty,
    interpretation_block: familyBlocks.interpretation,
    extra_how: license.extra_how ?? null,
    show_how: !license.is_dedication,

    // Personalization — falls back to placeholders if not provided
    copyright_holder: personalization.copyrightHolder || '[Copyright holder name]',
    year: personalization.year || '[Year]',
    contact: personalization.contact || null,

    // Zone content
    tldr: license.tldr,
    permissions: license.permissions ?? [],
    conditions: license.conditions ?? [],
    restrictions: license.restrictions ?? [],
    attribution_required: license.attribution_required,
  };
}

// Stage 2: Render the context into the target format.
// Each function takes the same context. None of them do data resolution.
// Ordering of zone renderers mirrors the seven-zone anatomy.

export function renderGFM(
  license: LicenseCollectionSchema,
  familyBlocks: FamilyBlocks,
  personalization: Personalization
): string {
  const ctx = buildRenderContext(license, familyBlocks, personalization);
  return [
    renderGFMZone1(ctx),
    renderGFMZone2(ctx),
    renderGFMZone3(ctx),
    ctx.attribution_required ? renderGFMZone4(ctx) : null,
    '---',
    renderGFMZone5(ctx),
    renderGFMZone6(ctx),
    renderGFMZone7(ctx),
  ].filter(Boolean).join('\n\n');
}

// renderMarkdown and renderPlainText follow the same pattern.
```

Key difference from the Jinja approach: the two stages are synchronous pure functions with typed inputs and outputs. No intermediate template state, no file written between stages, no ordering dependency. `buildRenderContext` is independently testable. Each format renderer is independently testable against a fixed context.

---

### Export panel (Svelte island)

`client:idle` — loads after the license content is interactive. The license text itself is static and must render without JavaScript.

```svelte
<!-- src/components/license/export/ExportPanel.svelte -->
<script lang="ts">
  import { renderGFM, renderMarkdown, renderPlainText } from './exportFormats';

  export let license;

  type Format = 'gfm' | 'markdown' | 'text' | 'iframe' | 'link';

  let format: Format = 'gfm';
  let copyrightHolder = '';
  let year = new Date().getFullYear().toString();
  let contact = '';

  $: personalization = { copyrightHolder, year, contact };
  $: output = renderFormat(format, license, personalization);

  function renderFormat(fmt: Format, lic, person) {
    switch (fmt) {
      case 'gfm':      return renderGFM(lic, person);
      case 'markdown': return renderMarkdown(lic, person);
      case 'text':     return renderPlainText(lic, person);
      case 'link':
        return `https://plainlicense.org/licenses/${lic.license_family}/${lic.spdx_id.toLowerCase()}/`;
      case 'iframe':
        return `<iframe src="https://plainlicense.org/embed/${lic.spdx_id.toLowerCase()}/" `
             + `title="${lic.plain_name}" width="100%" height="600" `
             + `frameborder="0"></iframe>`;
    }
  }
</script>

<section class="export-panel">
  <h2>Export this license</h2>

  <div class="personalization">
    <label>
      Copyright holder name
      <input bind:value={copyrightHolder} placeholder="Your name or organization" />
    </label>
    <label>
      Year(s)
      <input bind:value={year} placeholder="2025" />
    </label>
    <label>
      Contact <span class="optional">(optional)</span>
      <input bind:value={contact} placeholder="email or URL" />
    </label>
  </div>

  <div class="format-tabs" role="tablist">
    {#each (['gfm', 'markdown', 'text', 'iframe', 'link'] as Format[]) as fmt}
      <button
        role="tab"
        aria-selected={format === fmt}
        on:click={() => format = fmt}
      >{fmt}</button>
    {/each}
  </div>

  <div class="export-output">
    <pre><code>{output}</code></pre>
    <button on:click={() => navigator.clipboard.writeText(output)}>Copy</button>
  </div>
</section>
```

---

### Sveltia CMS configuration sketch

Field order mirrors zone order so editors encounter fields in the same sequence a reader encounters content. The `original` object is a nested group — editors filling it in understand they're describing the source material, not the plain version.

```yaml
# public/admin/config.yml
collections:
  - name: licenses
    label: Licenses
    folder: src/content/licenses
    create: true
    identifier_field: plain_name
    fields:

      # Zone 1 — Identity
      - { name: plain_name, label: "Plain language name (e.g. 'Plain MIT License')", widget: string }
      - { name: spdx_id, label: SPDX identifier, widget: string }
      - { name: plain_version, label: "Version of this plain language version", widget: string, hint: "Semver, e.g. 1.0.0" }
      - name: license_family
        label: License family
        widget: select
        options: [public-domain, permissive, copyleft, source-available, proprietary]
      - { name: is_dedication, label: "Is this a public domain dedication (not a license)?", widget: boolean, default: false }
      - { name: status, label: Status, widget: select, options: [draft, published], default: draft }
      - { name: description, label: "Description (1–3 sentences, answers 'what kind of license is this?')", widget: text }
      - name: tldr
        label: "TL;DR — 2 to 4 bullets (answers 'what do I need to know right now?')"
        widget: list
        field: { widget: string }

      # Zone 2 — not authored in CMS (derived from original.permissions + tagMappings)

      # Zone 3 — How-to addition
      - { name: attribution_required, label: "Requires attribution?", widget: boolean, default: false }
      - { name: extra_how, label: "Additional how-to instructions (leave blank for most licenses)", widget: markdown, required: false }

      # Clause mapping
      - { name: has_mapping, label: "Has a clause map?", widget: boolean, default: false }
      - { name: mapping_version, label: "Clause map version", widget: string, required: false, hint: "Semver. Required if has_mapping is true." }

      # Display controls
      - { name: show_original_comparison, widget: boolean, default: true }
      - { name: show_shame_counter, widget: boolean, default: true }
      - { name: featured, widget: boolean, default: false }
      - { name: fair_code, label: "Fair Code license?", widget: boolean, default: false }

      # SEO
      - { name: meta_description, label: "Meta description (overrides auto-generated)", widget: string, required: false }

      # Original license — the source material this plain version is based on
      - name: original
        label: "Original license (leave blank for PlainLicense originals)"
        widget: object
        required: false
        fields:
          - { name: name, label: "Full original name (e.g. 'MIT License')", widget: string }
          - { name: spdx_id, label: "SPDX identifier", widget: string, required: false }
          - { name: version, label: "Version (raw, e.g. '2.0')", widget: string, required: false }
          - { name: version_display, label: "Display version (e.g. 'MIT License (1988)')", widget: string, required: false }
          - { name: organization, label: "Steward organization", widget: string, required: false }
          - { name: has_official_source, label: "Has a single official authoritative source?", widget: boolean, default: false }
          - { name: canonical_url, label: "Canonical URL", widget: string }
          - { name: link_in_original, label: "Does the original text include a link to its own canonical URL?", widget: boolean, default: false }
          - { name: is_deprecated, label: "Deprecated in SPDX?", widget: boolean, default: false }
          - { name: is_osi_approved, widget: boolean, required: false }
          - { name: is_fsf_approved, widget: boolean, required: false }
          - name: permissions
            label: "Permissions (choosealicense.com tags)"
            widget: select
            multiple: true
            required: false
            options: [commercial-use, distribution, modifications, patent-use, private-use, revokable]
          - name: conditions
            label: "Conditions (choosealicense.com tags)"
            widget: select
            multiple: true
            required: false
            options: [disclose-source, document-changes, include-copyright, include-copyright--source, network-use-disclose, same-license, same-license--file, same-license--library]
          - name: limitations
            label: "Limitations (choosealicense.com tags)"
            widget: select
            multiple: true
            required: false
            options: [liability, patent-use, trademark-use, warranty]
```

---

## Open questions for further design

- **Version handling for multi-version licenses:** GPL 2/3, CC 4.0 vs. 3.0 have real substantive differences. Current position: each version is a separate MDX file with shared family-level content. The slug carries the version (`/licenses/copyleft/gpl-3/`). No version-switching UI on a single page.
- **Multi-licensing:** Out of scope for a single license page. Worth a doc page and FAQ explaining how to dual-license using PlainLicense output.
- **Word count targets per zone:** Zone 2 + Zone 3 combined probably shouldn't exceed 400 words. Formal ceiling not yet set.
- **Proprietary gold standard:** The design problem precedes the drafting problem. Candidate defining values: minimal surveillance language, clear termination conditions, human-readable restriction scope, explicit data handling. Separate spec when ready.
- **Clause mapping spec:** Pilot implementation exists. Full spec to be linked here when published.