import { describe, expect, it } from "vitest";
import { generateClauseHash } from "../../src/utils/hash.ts";
import {
  type MappingValidationResult,
  extractDivContent,
  validateMappingHashes,
} from "../../src/build/validate-mappings.ts";

describe("extractDivContent", () => {
  it("should extract content from a single div", () => {
    const md = `
Some preamble text.

<div id="plain-permissions">

## You Can Do Anything

We give you permission to use it.

</div>

Some trailing text.
`;
    const result = extractDivContent(md);
    expect(result).toHaveProperty("plain-permissions");
    expect(result["plain-permissions"]).toContain(
      "We give you permission to use it.",
    );
    expect(result["plain-permissions"]).toContain("## You Can Do Anything");
  });

  it("should extract content from multiple divs", () => {
    const md = `
<div id="plain-permissions">

Permission content here.

</div>

<div id="original-permissions">

Original permission content here.

</div>
`;
    const result = extractDivContent(md);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result["plain-permissions"]).toContain("Permission content here.");
    expect(result["original-permissions"]).toContain(
      "Original permission content here.",
    );
  });

  it("should return empty object when no divs are present", () => {
    const md = "# Just a heading\n\nSome plain markdown content.";
    const result = extractDivContent(md);
    expect(result).toEqual({});
  });
});

describe("validateMappingHashes", () => {
  it("should report valid when hashes match", async () => {
    const plainContent = "We give you permission to use it.";
    const originalContent = "Permission is hereby granted.";
    const plainHash = `sha256:${await generateClauseHash(plainContent)}`;
    const originalHash = `sha256:${await generateClauseHash(originalContent)}`;

    const mapping = {
      license_id: "MIT",
      version: "1.0.0",
      mapping_philosophy: "clause-level",
      mappings: [
        {
          id: "map-perm-use",
          type: "one-to-one",
          plain_clause: {
            id: "plain-permissions",
            hash: plainHash,
            content: plainContent,
          },
          original_clause: {
            id: "original-permissions",
            hash: originalHash,
            content: originalContent,
          },
        },
      ],
    };

    const plainDivs: Record<string, string> = {
      "plain-permissions": plainContent,
    };
    const originalDivs: Record<string, string> = {
      "original-permissions": originalContent,
    };

    const result = await validateMappingHashes(mapping, plainDivs, originalDivs);
    expect(result.licenseId).toBe("MIT");
    expect(result.valid).toBe(true);
    expect(result.staleClauseIds).toHaveLength(0);
    expect(result.missingIds).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect stale hashes", async () => {
    const mapping = {
      license_id: "MIT",
      version: "1.0.0",
      mapping_philosophy: "clause-level",
      mappings: [
        {
          id: "map-perm-use",
          type: "one-to-one",
          plain_clause: {
            id: "plain-permissions",
            hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
            content: "Old content that no longer matches.",
          },
          original_clause: {
            id: "original-permissions",
            hash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            content: "Old original content.",
          },
        },
      ],
    };

    const plainDivs: Record<string, string> = {
      "plain-permissions": "Updated permission content.",
    };
    const originalDivs: Record<string, string> = {
      "original-permissions": "Updated original content.",
    };

    const result = await validateMappingHashes(mapping, plainDivs, originalDivs);
    expect(result.valid).toBe(false);
    expect(result.staleClauseIds).toContain("plain-permissions");
    expect(result.staleClauseIds).toContain("original-permissions");
  });

  it("should detect missing div IDs", async () => {
    const mapping = {
      license_id: "MIT",
      version: "1.0.0",
      mapping_philosophy: "clause-level",
      mappings: [
        {
          id: "map-perm-use",
          type: "one-to-one",
          plain_clause: {
            id: "plain-nonexistent",
            hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
            content: "Some content.",
          },
          original_clause: {
            id: "original-nonexistent",
            hash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            content: "Some original content.",
          },
        },
      ],
    };

    const plainDivs: Record<string, string> = {};
    const originalDivs: Record<string, string> = {};

    const result = await validateMappingHashes(mapping, plainDivs, originalDivs);
    expect(result.valid).toBe(false);
    expect(result.missingIds).toContain("plain-nonexistent");
    expect(result.missingIds).toContain("original-nonexistent");
  });

  it("should skip unmapped entries", async () => {
    const mapping = {
      license_id: "MIT",
      version: "1.0.0",
      mapping_philosophy: "clause-level",
      mappings: [
        {
          id: "map-unmapped-1",
          type: "unmapped-plain",
          plain_clause: {
            id: "plain-extra",
            hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
            content: "Unmapped plain clause.",
          },
        },
        {
          id: "map-unmapped-2",
          type: "unmapped-original",
          original_clause: {
            id: "original-extra",
            hash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            content: "Unmapped original clause.",
          },
        },
      ],
    };

    const plainDivs: Record<string, string> = {};
    const originalDivs: Record<string, string> = {};

    const result = await validateMappingHashes(mapping, plainDivs, originalDivs);
    expect(result.valid).toBe(true);
    expect(result.staleClauseIds).toHaveLength(0);
    expect(result.missingIds).toHaveLength(0);
  });

  it("should handle plural clause keys (plain_clauses / original_clauses)", async () => {
    const plainContent1 = "First plain clause.";
    const plainContent2 = "Second plain clause.";
    const originalContent = "Original clause.";
    const plainHash1 = `sha256:${await generateClauseHash(plainContent1)}`;
    const plainHash2 = `sha256:${await generateClauseHash(plainContent2)}`;
    const originalHash = `sha256:${await generateClauseHash(originalContent)}`;

    const mapping = {
      license_id: "MIT",
      version: "1.0.0",
      mapping_philosophy: "clause-level",
      mappings: [
        {
          id: "map-multi",
          type: "one-to-many",
          plain_clauses: [
            {
              id: "plain-a",
              hash: plainHash1,
              content: plainContent1,
            },
            {
              id: "plain-b",
              hash: plainHash2,
              content: plainContent2,
            },
          ],
          original_clause: {
            id: "original-a",
            hash: originalHash,
            content: originalContent,
          },
        },
      ],
    };

    const plainDivs: Record<string, string> = {
      "plain-a": plainContent1,
      "plain-b": plainContent2,
    };
    const originalDivs: Record<string, string> = {
      "original-a": originalContent,
    };

    const result = await validateMappingHashes(mapping, plainDivs, originalDivs);
    expect(result.valid).toBe(true);
    expect(result.staleClauseIds).toHaveLength(0);
    expect(result.missingIds).toHaveLength(0);
  });
});
