import { z } from "astro:content";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** The four spacing options used on <alt> and <optional> elements. */
const SpacingSchema = z
  .enum(["none", "before", "after", "both"])
  .default("before");

// ---------------------------------------------------------------------------
// Formatted content nodes
//
// The XSD uses "mixed content" (interleaved text + child elements).
// We model that here as a discriminated union of typed content nodes,
// where raw text nodes use { type: "text", value: string }.
//
// The types build up in layers:
//   FixedParagraph  – no lists, no alt/optional
//   FixedText       – no alt/optional, but allows lists
//   AltParagraph    – alt/optional allowed, no lists
//   AltText         – alt/optional + lists (the most permissive)
//   AltSLH*         – same as Alt* but also allows <standardLicenseHeader>
// ---------------------------------------------------------------------------

// Forward-declare the recursive schemas with z.lazy so TypeScript is happy.
type FixedParagraphNode =
  | { type: "text"; value: string }
  | { type: "p"; content: FixedParagraphNode[] }
  | { type: "bullet"; value: string }
  | { type: "br" }
  | { type: "titleText"; content: FixedParagraphNode[] }
  | { type: "copyrightText"; content: FixedParagraphNode[] };

type AltParagraphNode =
  | { type: "text"; value: string }
  | { type: "p"; content: AltParagraphNode[] }
  | { type: "bullet"; value: string }
  | { type: "br" }
  | { type: "titleText"; content: AltParagraphNode[] }
  | { type: "copyrightText"; content: AltParagraphNode[] }
  | { type: "optional"; spacing?: string; content: AltParagraphNode[] }
  | {
      type: "alt";
      name: string;
      match: string;
      spacing?: string;
      content: AltParagraphNode[];
    };

type AltTextNode = AltParagraphNode | { type: "list"; items: AltTextNode[][] };

type AltSLHTextNode =
  | { type: "text"; value: string }
  | { type: "p"; content: AltParagraphNode[] }
  | { type: "bullet"; value: string }
  | { type: "br" }
  | { type: "titleText"; content: AltParagraphNode[] }
  | { type: "copyrightText"; content: AltParagraphNode[] }
  | { type: "optional"; spacing?: string; content: AltSLHTextNode[] }
  | {
      type: "alt";
      name: string;
      match: string;
      spacing?: string;
      content: AltSLHTextNode[];
    }
  | { type: "list"; items: AltSLHTextNode[][] }
  | { type: "standardLicenseHeader"; content: AltSLHTextNode[] };

// --- Fixed paragraph (no lists, no alt/optional) -------------------------

const FixedParagraphNodeSchema: z.ZodType<FixedParagraphNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), value: z.string() }),
    z.object({
      type: z.literal("p"),
      content: z.array(FixedParagraphNodeSchema),
    }),
    z.object({ type: z.literal("bullet"), value: z.string() }),
    z.object({ type: z.literal("br") }),
    z.object({
      type: z.literal("titleText"),
      content: z.array(FixedParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("copyrightText"),
      content: z.array(FixedParagraphNodeSchema),
    }),
  ]),
);

// --- Fixed text (allows lists, no alt/optional) ---------------------------

type FixedTextNode =
  | FixedParagraphNode
  | { type: "list"; items: FixedTextNode[][] };

const FixedTextNodeSchema: z.ZodType<FixedTextNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), value: z.string() }),
    z.object({
      type: z.literal("p"),
      content: z.array(FixedParagraphNodeSchema),
    }),
    z.object({ type: z.literal("bullet"), value: z.string() }),
    z.object({ type: z.literal("br") }),
    z.object({
      type: z.literal("titleText"),
      content: z.array(FixedParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("copyrightText"),
      content: z.array(FixedParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("list"),
      items: z.array(z.array(FixedTextNodeSchema)),
    }),
  ]),
);

// --- Alt paragraph (alt/optional allowed, no lists) ----------------------

const AltParagraphNodeSchema: z.ZodType<AltParagraphNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), value: z.string() }),
    z.object({
      type: z.literal("p"),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({ type: z.literal("bullet"), value: z.string() }),
    z.object({ type: z.literal("br") }),
    z.object({
      type: z.literal("titleText"),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("copyrightText"),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("optional"),
      spacing: SpacingSchema.optional(),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("alt"),
      name: z.string(),
      match: z.string(),
      spacing: SpacingSchema.optional(),
      content: z.array(AltParagraphNodeSchema),
    }),
  ]),
);

// --- Alt text (alt/optional + lists — most permissive non-SLH) -----------

const AltTextNodeSchema: z.ZodType<AltTextNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), value: z.string() }),
    z.object({
      type: z.literal("p"),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({ type: z.literal("bullet"), value: z.string() }),
    z.object({ type: z.literal("br") }),
    z.object({
      type: z.literal("titleText"),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("copyrightText"),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("optional"),
      spacing: SpacingSchema.optional(),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("alt"),
      name: z.string(),
      match: z.string(),
      spacing: SpacingSchema.optional(),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("list"),
      items: z.array(z.array(AltTextNodeSchema)),
    }),
  ]),
);

// --- Alt SLH text (same as AltText + standardLicenseHeader) --------------
// Used inside <text> elements, which are allowed to contain <standardLicenseHeader>.

const AltSLHTextNodeSchema: z.ZodType<AltSLHTextNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), value: z.string() }),
    z.object({
      type: z.literal("p"),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({ type: z.literal("bullet"), value: z.string() }),
    z.object({ type: z.literal("br") }),
    z.object({
      type: z.literal("titleText"),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("copyrightText"),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("optional"),
      spacing: SpacingSchema.optional(),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("alt"),
      name: z.string(),
      match: z.string(),
      spacing: SpacingSchema.optional(),
      content: z.array(AltParagraphNodeSchema),
    }),
    z.object({
      type: z.literal("list"),
      items: z.array(z.array(AltSLHTextNodeSchema)),
    }),
    z.object({
      type: z.literal("standardLicenseHeader"),
      content: z.array(AltSLHTextNodeSchema),
    }),
  ]),
);

// ---------------------------------------------------------------------------
// crossRefs
// ---------------------------------------------------------------------------

/**
 * A single URI cross-reference.
 * The first entry in a crossRefs block must be the license steward's URI
 * (by convention — the schema itself doesn't enforce ordering in Zod).
 */
export const CrossRefSchema = z.string().url();

export const CrossRefsSchema = z.object({
  crossRef: z.array(CrossRefSchema).min(1),
});

export type CrossRefs = z.infer<typeof CrossRefsSchema>;

// ---------------------------------------------------------------------------
// obsoletedBy / obsoletedBys
// ---------------------------------------------------------------------------

/**
 * A recommended replacement identifier for a deprecated license expression.
 * - `expression` narrows the replacement to a specific source expression.
 *   When absent, the replacement applies to the bare identifier.
 * - `value` is the replacement identifier (e.g. "GPL-2.0-or-later").
 */
export const ObsoletedBySchema = z.object({
  /** The source expression this replacement applies to (optional). */
  expression: z.string().optional(),
  /** The replacement SPDX identifier or expression. */
  value: z.string(),
});

export const ObsoletedBysSchema = z.object({
  obsoletedBy: z.array(ObsoletedBySchema).min(1),
});

export type ObsoletedBy = z.infer<typeof ObsoletedBySchema>;
export type ObsoletedBys = z.infer<typeof ObsoletedBysSchema>;

// ---------------------------------------------------------------------------
// Exception
// ---------------------------------------------------------------------------

/**
 * An exception to a license condition, or additional permissions beyond
 * those granted in a license.  Not a standalone license.
 *
 * Example: "GCC-exception-2.0" used in "GPL-2.0-only WITH GCC-exception-2.0"
 */
export const ExceptionSchema = z.object({
  /** Short SPDX identifier (e.g. "GCC-exception-2.0"). */
  licenseId: z.string(),

  /** Human-readable name of the exception. */
  name: z.string(),

  /** SPDX list version when this exception was first added. */
  listVersionAdded: z.string().optional(),

  /** SPDX list version when this exception was deprecated, if ever. */
  deprecatedVersion: z.string().optional(),

  obsoletedBys: ObsoletedBysSchema.optional(),
  crossRefs: CrossRefsSchema.optional(),

  /** Unstructured notes about the exception. */
  notes: z.object({ content: z.array(FixedTextNodeSchema) }).optional(),

  /** The exception text. */
  text: z.object({ content: z.array(AltTextNodeSchema) }).optional(),
});

export type Exception = z.infer<typeof ExceptionSchema>;

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------

/**
 * A software license.
 *
 * Example: MIT, Apache-2.0, GPL-2.0-only
 */
export const LicenseSchema = z.object({
  /** Short SPDX identifier used in license expressions (e.g. "MIT"). */
  licenseId: z.string(),

  /** Human-readable name (e.g. "MIT License"). */
  name: z.string(),

  /** True if the OSI has approved this license. */
  isOsiApproved: z.boolean().optional(),

  /** SPDX list version when this license was first added. */
  listVersionAdded: z.string().optional(),

  /** SPDX list version when this license was deprecated, if ever. */
  deprecatedVersion: z.string().optional(),

  obsoletedBys: ObsoletedBysSchema.optional(),
  crossRefs: CrossRefsSchema.optional(),

  /** Unstructured notes about the license. */
  notes: z.object({ content: z.array(FixedTextNodeSchema) }).optional(),

  /**
   * The license steward's recommended per-file header text.
   *
   * Appears as a sibling of <text> when the license body does NOT already
   * contain the header text, or nested inside <text> when it does
   * (e.g. GPL appendix).
   */
  standardLicenseHeader: z
    .object({ content: z.array(AltTextNodeSchema) })
    .optional(),

  /**
   * The full license text.
   * May contain an embedded <standardLicenseHeader> (AltSLH content).
   */
  text: z.object({ content: z.array(AltSLHTextNodeSchema) }).optional(),
});

export type License = z.infer<typeof LicenseSchema>;

// ---------------------------------------------------------------------------
// SPDXLicenseCollection (root)
// ---------------------------------------------------------------------------

/**
 * The root of an SPDX license list file.
 * Contains any mix of licenses and exceptions in any order.
 */
export const SPDXLicenseCollectionSchema = z.object({
  entries: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("license"), license: LicenseSchema }),
        z.object({ kind: z.literal("exception"), exception: ExceptionSchema }),
      ]),
    )
    .min(1),
});

export type SPDXLicenseCollection = z.infer<typeof SPDXLicenseCollectionSchema>;

// ---------------------------------------------------------------------------
// Re-export content node types for consumers
// ---------------------------------------------------------------------------

export type {
  AltParagraphNode,
  AltSLHTextNode,
  AltTextNode,
  FixedParagraphNode,
  FixedTextNode,
};
