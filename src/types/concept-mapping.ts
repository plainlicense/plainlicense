/** A single concept in the source mapping JSON (authored by LLM/human). */
export type ConceptMapping = {
  id: string;
  original: string;
  plain?: string[];
  type?: "filler";
};

/** The source mapping JSON file structure (content/mappings/{SPDX}-mapping.json). */
export type ConceptMappingFile = {
  license_id: string;
  version: string;
  last_updated: string;
  generation_method: "ai-generated" | "manual";
  human_reviewed: boolean;
  concepts: ConceptMapping[];
};

/** A plain-side text match with character offsets in the rendered plain HTML. */
export type PlainMatch = {
  text: string;
  start: number;
  end: number;
};

/** A resolved concept with character offsets in the rendered original text. */
export type ResolvedConcept = {
  id: string;
  start: number;
  end: number;
  original: string;
  parent: string | null;
  type: "leaf" | "parent";
  plain_matches: PlainMatch[];
};

/** A resolved filler entry with character offsets. */
export type ResolvedFiller = {
  id: string;
  start: number;
  end: number;
  original: string;
};

/** The resolved mapping file served to the client (public/mappings/{SPDX}-mapping.resolved.json). */
export type ResolvedMappingFile = {
  license_id: string;
  version: string;
  concepts: ResolvedConcept[];
  filler: ResolvedFiller[];
  warnings: string[];
};
