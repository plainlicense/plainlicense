import { describe, expect, it } from "vitest";
import {
  countShameWords,
  extractOriginalSection,
  SHAME_PHRASES,
  SHAME_WORDS,
} from "../../src/utils/content.ts";

describe("Shame Words Utilities", () => {
  describe("SHAME_WORDS", () => {
    it("should export a non-empty readonly array", () => {
      expect(SHAME_WORDS.length).toBeGreaterThan(0);
    });

    it("should include canonical legacy legalese words", () => {
      expect(SHAME_WORDS).toContain("herein");
      expect(SHAME_WORDS).toContain("notwithstanding");
      expect(SHAME_WORDS).toContain("aforementioned");
      expect(SHAME_WORDS).toContain("witnesseth");
    });

    it("should include modern formal words from the shame page", () => {
      expect(SHAME_WORDS).toContain("attorney");
      expect(SHAME_WORDS).toContain("utilize");
      expect(SHAME_WORDS).toContain("irrevocable");
      expect(SHAME_WORDS).toContain("perpetual");
      expect(SHAME_WORDS).toContain("shall");
      expect(SHAME_WORDS).toContain("statute");
      expect(SHAME_WORDS).toContain("indemnify");
    });
  });

  describe("SHAME_PHRASES", () => {
    it("should export a non-empty readonly array", () => {
      expect(SHAME_PHRASES.length).toBeGreaterThan(0);
    });

    it("should include canonical wordy phrases", () => {
      expect(SHAME_PHRASES).toContain("in order to");
      expect(SHAME_PHRASES).toContain("in the event that");
      expect(SHAME_PHRASES).toContain("with respect to");
      expect(SHAME_PHRASES).toContain("pursuant to");
    });
  });

  describe("countShameWords", () => {
    it("should return 0 for clean text", () => {
      expect(countShameWords("This is a simple sentence.")).toBe(0);
    });

    it("should count known shame words", () => {
      const text =
        "The aforementioned documentation notwithstanding, the individual shall indemnify the organization.";
      // aforementioned, notwithstanding, shall, indemnify -> 4 words
      expect(countShameWords(text)).toBe(4);
    });

    it("should be case-insensitive", () => {
      expect(countShameWords("HEREIN and herein")).toBe(2);
    });

    it("should only match full words, not substrings", () => {
      // "indemnity" does not contain the word "indemnify"
      expect(countShameWords("indemnity")).toBe(0);
    });

    it("should count multi-word shame phrases", () => {
      const text = "You must do this in order to comply.";
      // "in order to" appears once
      expect(countShameWords(text)).toBe(1);
    });

    it("should count multi-word phrases case-insensitively", () => {
      const text = "IN ORDER TO proceed, you must agree.";
      // "in order to" (case-insensitive) → 1
      expect(countShameWords(text)).toBe(1);
    });

    it("should count multiple occurrences of a phrase", () => {
      const text =
        "In order to use this, and in order to share this, you must comply.";
      // "in order to" appears twice
      expect(countShameWords(text)).toBe(2);
    });

    it("should count both words and phrases in the same text", () => {
      const text =
        "Pursuant to the aforementioned rules, in order to comply, you shall indemnify us.";
      // Word matches: aforementioned(1) + pursuant(1) + shall(1) + indemnify(1) = 4
      // Phrase matches: "pursuant to"(1) + "in order to"(1) = 2
      // Total: 6 (note "pursuant" is counted twice: once as a word and once as part of the phrase)
      const count = countShameWords(text);
      expect(count).toBe(6);
    });
  });
});

describe("extractOriginalSection", () => {
  it("should return empty string when no separator is found", () => {
    expect(extractOriginalSection("No original section here.")).toBe("");
  });

  it("should extract text after the separator", () => {
    const body =
      "Plain text section.\n\n---\n# Original License Text\n\nOriginal content here.";
    const result = extractOriginalSection(body);
    expect(result).toBe("Original content here.");
  });

  it("should return only the original section, not the plain section", () => {
    const body =
      "Plain language version.\n\n---\n\n# Original License Text\n\nHereby granted...";
    const result = extractOriginalSection(body);
    expect(result).not.toContain("Plain language version");
    expect(result).toContain("Hereby granted");
  });

  it("should handle leading and trailing whitespace in the original section", () => {
    const body =
      "Plain.\n\n---\n# Original License Text\n\n  Indented text.  \n\n";
    const result = extractOriginalSection(body);
    expect(result).toBe("Indented text.");
  });
});
