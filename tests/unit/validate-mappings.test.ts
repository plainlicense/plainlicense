import { describe, expect, it } from "vitest";
import { stripMarkdown } from "../../src/build/validate-mappings";

describe("stripMarkdown", () => {
  it("should strip header markers", () => {
    expect(stripMarkdown("## You Can Do Anything")).toBe("You Can Do Anything");
  });

  it("should strip bold markers", () => {
    expect(stripMarkdown("**Use** it")).toBe("Use it");
  });

  it("should strip link syntax", () => {
    expect(stripMarkdown("[Link text](https://example.com)")).toBe("Link text");
  });

  it("should strip HTML div tags", () => {
    expect(stripMarkdown('<div id="test">content</div>')).toBe("content");
  });

  it("should strip list markers", () => {
    expect(stripMarkdown("- Item one\n- Item two")).toBe("Item one\nItem two");
  });

  it("should collapse excessive newlines", () => {
    expect(stripMarkdown("a\n\n\n\nb")).toBe("a\n\nb");
  });
});
