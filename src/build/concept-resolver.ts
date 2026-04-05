import type {
  ConceptMapping,
  ConceptMappingFile,
  PlainMatch,
  ResolvedConcept,
  ResolvedFiller,
  ResolvedMappingFile,
} from "../types/concept-mapping";

type PositionedConcept = {
  id: string;
  start: number;
  end: number;
  original: string;
  plain?: string[];
  type?: "filler";
};

/**
 * Find each concept's original text position using sequential document-order matching.
 * Scans left-to-right, advancing past each match start to resolve ambiguity.
 */
export function resolvePositions(
  concepts: ConceptMapping[],
  originalText: string,
): PositionedConcept[] {
  const results: PositionedConcept[] = [];
  let scanPos = 0;

  for (const concept of concepts) {
    // Filler concepts may overlap with regular concepts, so search from the
    // beginning of the document instead of the advancing scan position.
    const searchFrom = concept.type === "filler" ? 0 : scanPos;
    const idx = originalText.indexOf(concept.original, searchFrom);
    if (idx === -1) {
      console.warn(
        `Concept "${concept.id}": original text "${concept.original.slice(0, 40)}..." not found after position ${searchFrom}`,
      );
      continue;
    }

    results.push({
      id: concept.id,
      start: idx,
      end: idx + concept.original.length,
      original: concept.original,
      plain: concept.plain,
      type: concept.type,
    });

    // Only advance scanPos for non-filler concepts to preserve sequential ordering.
    if (concept.type !== "filler") {
      scanPos = idx + 1;
    }
  }

  return results;
}

type HierarchyEntry = {
  id: string;
  start: number;
  end: number;
  original: string;
  parent: string | null;
  type: "leaf" | "parent";
};

/**
 * Derive parent-child hierarchy from positional containment.
 * Uses the tightest (smallest) container as the parent.
 */
export function deriveHierarchy(
  positions: Array<{ id: string; start: number; end: number; original: string }>,
): HierarchyEntry[] {
  const entries: HierarchyEntry[] = positions.map((p) => ({
    id: p.id,
    start: p.start,
    end: p.end,
    original: p.original,
    parent: null,
    type: "leaf" as const,
  }));

  for (const child of entries) {
    let tightestParent: HierarchyEntry | null = null;
    let tightestSize = Infinity;

    for (const candidate of entries) {
      if (candidate.id === child.id) continue;
      const contains =
        candidate.start <= child.start && candidate.end >= child.end;
      if (!contains) continue;

      const size = candidate.end - candidate.start;
      if (size < tightestSize) {
        tightestSize = size;
        tightestParent = candidate;
      }
    }

    if (tightestParent) {
      child.parent = tightestParent.id;
      tightestParent.type = "parent";
    }
  }

  return entries;
}

/**
 * Validate plain-side text matches.
 */
export function validatePlainMatches(
  concepts: Array<{ id: string; plain?: string[] }>,
  plainText: string,
): Array<{ id: string; plain_matches: PlainMatch[]; warnings: string[] }> {
  return concepts.map((concept) => {
    const matches: PlainMatch[] = [];
    const warnings: string[] = [];

    if (!concept.plain) return { id: concept.id, plain_matches: matches, warnings };

    for (const text of concept.plain) {
      const idx = plainText.indexOf(text);
      if (idx === -1) {
        warnings.push(`Concept "${concept.id}": plain text "${text}" not found`);
        continue;
      }
      matches.push({ text, start: idx, end: idx + text.length });
    }

    return { id: concept.id, plain_matches: matches, warnings };
  });
}

/**
 * Full resolution pipeline: positions -> hierarchy -> plain matches -> output.
 */
export function resolveConceptMapping(
  mappingFile: ConceptMappingFile,
  originalText: string,
  plainText: string,
): ResolvedMappingFile {
  const allPositions = resolvePositions(mappingFile.concepts, originalText);

  const fillerPositions = allPositions.filter((p) => p.type === "filler");
  const conceptPositions = allPositions.filter((p) => p.type !== "filler");

  const hierarchy = deriveHierarchy(conceptPositions);
  const plainResults = validatePlainMatches(conceptPositions, plainText);

  const allWarnings: string[] = [];
  const resolvedConcepts: ResolvedConcept[] = hierarchy.map((h) => {
    const plainResult = plainResults.find((p) => p.id === h.id);
    if (plainResult) allWarnings.push(...plainResult.warnings);

    return {
      id: h.id,
      start: h.start,
      end: h.end,
      original: h.original,
      parent: h.parent,
      type: h.type,
      plain_matches: plainResult?.plain_matches ?? [],
    };
  });

  const filler: ResolvedFiller[] = fillerPositions.map((f) => ({
    id: f.id,
    start: f.start,
    end: f.end,
    original: f.original,
  }));

  return {
    license_id: mappingFile.license_id,
    version: mappingFile.version,
    concepts: resolvedConcepts,
    filler,
    warnings: allWarnings,
  };
}
