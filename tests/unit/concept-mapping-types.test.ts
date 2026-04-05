import { describe, expect, it } from "vitest";
import type {
  ConceptMapping,
  ConceptMappingFile,
  ResolvedConcept,
  ResolvedMappingFile,
} from "../../src/types/concept-mapping";

describe("ConceptMapping types", () => {
  it("should accept a valid concept mapping file structure", () => {
    const file: ConceptMappingFile = {
      license_id: "MIT",
      version: "1.0.0",
      last_updated: "2026-04-05T00:00:00Z",
      generation_method: "ai-generated",
      human_reviewed: false,
      concepts: [
        {
          id: "grant-free",
          original: "Permission is hereby granted, free of charge",
          plain: ["We give you permission to", "for free"],
        },
        {
          id: "filler-hereby",
          original: "hereby",
          type: "filler",
        },
      ],
    };
    expect(file.concepts).toHaveLength(2);
    expect(file.concepts[0].plain).toBeDefined();
    expect(file.concepts[1].type).toBe("filler");
    expect(file.concepts[1]).not.toHaveProperty("plain");
  });

  it("should accept a valid resolved mapping file structure", () => {
    const resolved: ResolvedMappingFile = {
      license_id: "MIT",
      version: "1.0.0",
      concepts: [
        {
          id: "grant-free",
          start: 0,
          end: 45,
          original: "Permission is hereby granted, free of charge",
          parent: null,
          type: "leaf",
          plain_matches: [
            { text: "We give you permission to", start: 0, end: 25 },
          ],
        },
      ],
      filler: [{ id: "filler-hereby", start: 14, end: 20, original: "hereby" }],
      warnings: [],
    };
    expect(resolved.concepts).toHaveLength(1);
    expect(resolved.concepts[0].type).toBe("leaf");
    expect(resolved.filler).toHaveLength(1);
  });
});
