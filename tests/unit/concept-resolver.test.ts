import { describe, expect, it } from "vitest";
import {
  resolvePositions,
  deriveHierarchy,
  validatePlainMatches,
  resolveConceptMapping,
} from "../../src/build/concept-resolver";
import type { ConceptMappingFile } from "../../src/types/concept-mapping";

const ORIGINAL_TEXT =
  "Permission is hereby granted, free of charge, to any person " +
  "obtaining a copy of this software and associated documentation " +
  'files (the "Software"), to deal in the Software without ' +
  "restriction, including without limitation the rights to use, " +
  "copy, modify, merge, publish, distribute, sublicense, and/or sell " +
  "copies of the Software, and to permit persons to whom the " +
  "Software is furnished to do so, subject to the following conditions:";

const PLAIN_TEXT =
  "We give you permission to:\n\n" +
  "- Use it\n" +
  "- Copy it\n" +
  "- Change it\n" +
  "- Share it\n" +
  "- Sell it\n" +
  "- Mix or put it together with other works\n\n" +
  "You can do all of these things for free.";

describe("resolvePositions", () => {
  it("should find concept positions sequentially in original text", () => {
    const concepts = [
      { id: "grant-free", original: "Permission is hereby granted, free of charge", plain: ["We give you permission to"] },
      { id: "right-use", original: "use", plain: ["Use it"] },
      { id: "right-copy", original: "copy", plain: ["Copy it"] },
    ];

    const result = resolvePositions(concepts, ORIGINAL_TEXT);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("grant-free");
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(44);
    expect(result[1].id).toBe("right-use");
    expect(ORIGINAL_TEXT.slice(result[1].start, result[1].end)).toBe("use");
    expect(result[2].start).toBeGreaterThan(result[1].end);
  });

  it("should warn and skip concepts whose text is not found", () => {
    const concepts = [
      { id: "missing", original: "this text does not exist", plain: ["something"] },
    ];

    const result = resolvePositions(concepts, ORIGINAL_TEXT);
    expect(result).toHaveLength(0);
  });

  it("should handle filler concepts (no plain field)", () => {
    const concepts = [
      { id: "filler-hereby", original: "hereby", type: "filler" as const },
    ];

    const result = resolvePositions(concepts, ORIGINAL_TEXT);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("filler-hereby");
    expect(ORIGINAL_TEXT.slice(result[0].start, result[0].end)).toBe("hereby");
  });
});

describe("deriveHierarchy", () => {
  it("should detect parent-child from positional containment", () => {
    const containment = [
      { id: "outer", start: 0, end: 100, original: "outer text" },
      { id: "inner", start: 10, end: 50, original: "inner text" },
    ];

    const result = deriveHierarchy(containment);
    expect(result.find(c => c.id === "inner")?.parent).toBe("outer");
    expect(result.find(c => c.id === "outer")?.parent).toBeNull();
  });

  it("should set type to parent when concept contains children", () => {
    const positions = [
      { id: "outer", start: 0, end: 100, original: "outer" },
      { id: "inner", start: 10, end: 50, original: "inner" },
    ];
    const result = deriveHierarchy(positions);
    expect(result.find(c => c.id === "outer")?.type).toBe("parent");
    expect(result.find(c => c.id === "inner")?.type).toBe("leaf");
  });

  it("should assign tightest parent when multiple containers exist", () => {
    const positions = [
      { id: "grandparent", start: 0, end: 200, original: "gp" },
      { id: "parent", start: 5, end: 100, original: "p" },
      { id: "child", start: 10, end: 50, original: "c" },
    ];
    const result = deriveHierarchy(positions);
    expect(result.find(c => c.id === "child")?.parent).toBe("parent");
    expect(result.find(c => c.id === "parent")?.parent).toBe("grandparent");
  });
});

describe("validatePlainMatches", () => {
  it("should find plain text matches with offsets", () => {
    const concepts = [
      { id: "grant-free", plain: ["We give you permission to", "for free"] },
    ];

    const result = validatePlainMatches(concepts, PLAIN_TEXT);
    expect(result[0].plain_matches).toHaveLength(2);
    expect(result[0].plain_matches[0].text).toBe("We give you permission to");
    expect(result[0].plain_matches[0].start).toBe(0);
  });

  it("should return empty matches and a warning for missing plain text", () => {
    const concepts = [
      { id: "missing", plain: ["this text is not in the plain version"] },
    ];

    const result = validatePlainMatches(concepts, PLAIN_TEXT);
    expect(result[0].plain_matches).toHaveLength(0);
    expect(result[0].warnings).toContain(
      'Concept "missing": plain text "this text is not in the plain version" not found'
    );
  });
});

describe("resolveConceptMapping (integration)", () => {
  it("should produce a complete resolved mapping", () => {
    const mappingFile: ConceptMappingFile = {
      license_id: "MIT",
      version: "1.0.0",
      last_updated: "2026-04-05T00:00:00Z",
      generation_method: "ai-generated",
      human_reviewed: false,
      concepts: [
        { id: "grant-free", original: "Permission is hereby granted, free of charge", plain: ["We give you permission to"] },
        { id: "right-use", original: "use", plain: ["Use it"] },
        { id: "filler-hereby", original: "hereby", type: "filler" },
      ],
    };

    const result = resolveConceptMapping(mappingFile, ORIGINAL_TEXT, PLAIN_TEXT);
    expect(result.license_id).toBe("MIT");
    expect(result.concepts).toHaveLength(2);
    expect(result.filler).toHaveLength(1);
    expect(result.concepts[0].id).toBe("grant-free");
    expect(result.concepts[0].original).toBe("Permission is hereby granted, free of charge");
    expect(result.concepts[0].plain_matches.length).toBeGreaterThan(0);
    expect(result.filler[0].id).toBe("filler-hereby");
    expect(result.filler[0].original).toBe("hereby");
  });
});
