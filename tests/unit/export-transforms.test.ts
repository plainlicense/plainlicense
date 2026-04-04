import { describe, expect, it } from "vitest";
import {
  SEMANTIC_BLOCK_IDS,
  type SemanticBlock,
  convertDefinitionLists,
  convertFootnotesToEndnotes,
  extractSemanticBlocks,
  footnotesToInline,
  injectTemplateBlocks,
  semanticBlockToCmBlockquote,
  semanticBlockToGfmAlert,
  stripHtmlDivs,
} from "../../src/build/exports/transforms";

describe("transforms", () => {
  describe("SEMANTIC_BLOCK_IDS", () => {
    it("contains warranty and interpretation", () => {
      expect(SEMANTIC_BLOCK_IDS.has("warranty")).toBe(true);
      expect(SEMANTIC_BLOCK_IDS.has("interpretation")).toBe(true);
    });

    it("has exactly 2 entries", () => {
      expect(SEMANTIC_BLOCK_IDS.size).toBe(2);
    });
  });

  describe("injectTemplateBlocks", () => {
    it("replaces a non-semantic block with raw content", () => {
      const content = "before\n\n{{block:credits}}\n\nafter";
      const blocks = { credits: "Credit text here." };
      const result = injectTemplateBlocks(content, blocks);
      expect(result).toBe("before\n\nCredit text here.\n\nafter");
    });

    it("wraps semantic blocks with markers", () => {
      const content = "{{block:warranty}}";
      const blocks = { warranty: "No warranty provided." };
      const result = injectTemplateBlocks(content, blocks);
      expect(result).toBe(
        "<!-- semantic:warranty -->\nNo warranty provided.\n<!-- /semantic:warranty -->",
      );
    });

    it("wraps interpretation block with markers", () => {
      const content = "{{block:interpretation}}";
      const blocks = { interpretation: "How to read this." };
      const result = injectTemplateBlocks(content, blocks);
      expect(result).toBe(
        "<!-- semantic:interpretation -->\nHow to read this.\n<!-- /semantic:interpretation -->",
      );
    });

    it("leaves unresolved placeholders as-is", () => {
      const content = "{{block:unknown}}";
      const result = injectTemplateBlocks(content, {});
      expect(result).toBe("{{block:unknown}}");
    });

    it("handles multiple blocks in one pass", () => {
      const content =
        "{{block:warranty}}\n\nMiddle\n\n{{block:credits}}\n\n{{block:missing}}";
      const blocks = {
        warranty: "No warranty.",
        credits: "By us.",
      };
      const result = injectTemplateBlocks(content, blocks);
      expect(result).toContain("<!-- semantic:warranty -->");
      expect(result).toContain("By us.");
      expect(result).toContain("{{block:missing}}");
    });
  });

  describe("stripHtmlDivs", () => {
    it("removes opening div tags", () => {
      const content = '<div id="plain-permissions">\nSome text\n</div>';
      const result = stripHtmlDivs(content);
      expect(result).toBe("Some text\n");
    });

    it("removes div tags with various attributes", () => {
      const content =
        '<div class="zone" data-id="test">\nContent\n</div>\nMore';
      const result = stripHtmlDivs(content);
      expect(result).toBe("Content\nMore");
    });

    it("removes trailing newline after div tags", () => {
      // <div>\n removes the \n, leaving \nContent\n\n
      // </div>\n removes one \n, leaving \nAfter
      const content = "<div>\n\nContent\n\n</div>\n\nAfter";
      const result = stripHtmlDivs(content);
      expect(result).toBe("\nContent\n\n\nAfter");
    });

    it("leaves non-div HTML alone", () => {
      const content = "<span>keep</span>\n<p>also keep</p>";
      const result = stripHtmlDivs(content);
      expect(result).toBe("<span>keep</span>\n<p>also keep</p>");
    });

    it("handles content with no divs", () => {
      const content = "Just plain text.";
      const result = stripHtmlDivs(content);
      expect(result).toBe("Just plain text.");
    });
  });

  describe("extractSemanticBlocks", () => {
    it("extracts a single semantic block", () => {
      const content =
        "Before\n\n<!-- semantic:warranty -->\nNo warranty.\n<!-- /semantic:warranty -->\n\nAfter";
      const result = extractSemanticBlocks(content);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).toBe("warranty");
      expect(result.blocks[0].content).toBe("No warranty.");
      expect(result.content).toContain("{{rendered:warranty}}");
      expect(result.content).not.toContain("<!-- semantic:warranty -->");
    });

    it("extracts multiple semantic blocks", () => {
      const content =
        "<!-- semantic:warranty -->\nW content\n<!-- /semantic:warranty -->\n\n<!-- semantic:interpretation -->\nI content\n<!-- /semantic:interpretation -->";
      const result = extractSemanticBlocks(content);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].id).toBe("warranty");
      expect(result.blocks[1].id).toBe("interpretation");
    });

    it("preserves the raw matched text in block.raw", () => {
      const content =
        "<!-- semantic:warranty -->\nNo warranty.\n<!-- /semantic:warranty -->";
      const result = extractSemanticBlocks(content);
      expect(result.blocks[0].raw).toBe(content);
    });

    it("returns empty blocks array when no markers exist", () => {
      const content = "Just plain content.";
      const result = extractSemanticBlocks(content);
      expect(result.blocks).toHaveLength(0);
      expect(result.content).toBe("Just plain content.");
    });

    it("handles multiline block content", () => {
      const content =
        "<!-- semantic:warranty -->\nLine one.\nLine two.\nLine three.\n<!-- /semantic:warranty -->";
      const result = extractSemanticBlocks(content);
      expect(result.blocks[0].content).toBe(
        "Line one.\nLine two.\nLine three.",
      );
    });
  });

  describe("convertFootnotesToEndnotes", () => {
    it("converts footnote references to numbered references", () => {
      const content = "Some text[^1] and more[^2].\n\n[^1]: First note\n[^2]: Second note";
      const result = convertFootnotesToEndnotes(content);
      expect(result.content).toContain("Some text[1] and more[2].");
      expect(result.endnotes).toEqual(["First note", "Second note"]);
    });

    it("sorts endnotes numerically", () => {
      const content = "A[^2] B[^1].\n\n[^2]: Second\n[^1]: First";
      const result = convertFootnotesToEndnotes(content);
      expect(result.endnotes).toEqual(["First", "Second"]);
    });

    it("handles multiline footnote definitions", () => {
      const content =
        "Text[^1].\n\n[^1]: First line of note\ncontinuation line\nanother line";
      const result = convertFootnotesToEndnotes(content);
      expect(result.endnotes[0]).toBe(
        "First line of note\ncontinuation line\nanother line",
      );
    });

    it("stops multiline continuation at next footnote", () => {
      const content =
        "A[^1] B[^2].\n\n[^1]: Note one\ncontinuation\n[^2]: Note two";
      const result = convertFootnotesToEndnotes(content);
      expect(result.endnotes[0]).toBe("Note one\ncontinuation");
      expect(result.endnotes[1]).toBe("Note two");
    });

    it("stops multiline continuation at blank line", () => {
      const content = "A[^1].\n\n[^1]: Note one\ncontinuation\n\nParagraph";
      const result = convertFootnotesToEndnotes(content);
      expect(result.endnotes[0]).toBe("Note one\ncontinuation");
      expect(result.content).toContain("Paragraph");
    });

    it("removes footnote definitions from content", () => {
      const content = "Text[^1].\n\n[^1]: A footnote";
      const result = convertFootnotesToEndnotes(content);
      expect(result.content).not.toContain("[^1]:");
    });

    it("returns empty endnotes when no footnotes exist", () => {
      const content = "No footnotes here.";
      const result = convertFootnotesToEndnotes(content);
      expect(result.endnotes).toEqual([]);
      expect(result.content).toBe("No footnotes here.");
    });
  });

  describe("convertDefinitionLists", () => {
    it("converts to markdown mode with bold term and em-dash", () => {
      const content = "`we`\n\n:    The creators of the work.";
      const result = convertDefinitionLists(content, "markdown");
      expect(result).toBe("**we** — The creators of the work.");
    });

    it("converts to plaintext mode with uppercase term", () => {
      const content = "`we`\n\n:    The creators of the work.";
      const result = convertDefinitionLists(content, "plaintext");
      expect(result).toBe("WE — The creators of the work.");
    });

    it("handles multiple definition list entries", () => {
      const content =
        "`we`\n\n:    The creators.\n\n`you`\n\n:    The user.";
      const result = convertDefinitionLists(content, "markdown");
      expect(result).toContain("**we** — The creators.");
      expect(result).toContain("**you** — The user.");
    });

    it("returns content unchanged when no definition lists found", () => {
      const content = "Just regular text.";
      const result = convertDefinitionLists(content, "markdown");
      expect(result).toBe("Just regular text.");
    });
  });

  describe("semanticBlockToGfmAlert", () => {
    it("converts warranty block to CAUTION alert", () => {
      const block: SemanticBlock = {
        id: "warranty",
        content: "No warranty provided.",
        raw: "",
      };
      const result = semanticBlockToGfmAlert(block);
      expect(result).toBe("> [!CAUTION]\n> No warranty provided.");
    });

    it("converts interpretation block to NOTE alert", () => {
      const block: SemanticBlock = {
        id: "interpretation",
        content: "How to read this license.",
        raw: "",
      };
      const result = semanticBlockToGfmAlert(block);
      expect(result).toBe("> [!NOTE]\n> How to read this license.");
    });

    it("handles multiline content", () => {
      const block: SemanticBlock = {
        id: "warranty",
        content: "Line one.\nLine two.\nLine three.",
        raw: "",
      };
      const result = semanticBlockToGfmAlert(block);
      expect(result).toBe(
        "> [!CAUTION]\n> Line one.\n> Line two.\n> Line three.",
      );
    });
  });

  describe("semanticBlockToCmBlockquote", () => {
    it("converts warranty block to Caution blockquote", () => {
      const block: SemanticBlock = {
        id: "warranty",
        content: "No warranty provided.",
        raw: "",
      };
      const result = semanticBlockToCmBlockquote(block);
      expect(result).toBe("> **Caution:** No warranty provided.");
    });

    it("converts interpretation block to Note blockquote", () => {
      const block: SemanticBlock = {
        id: "interpretation",
        content: "How to read this.",
        raw: "",
      };
      const result = semanticBlockToCmBlockquote(block);
      expect(result).toBe("> **Note:** How to read this.");
    });

    it("handles multiline content", () => {
      const block: SemanticBlock = {
        id: "warranty",
        content: "Line one.\nLine two.",
        raw: "",
      };
      const result = semanticBlockToCmBlockquote(block);
      expect(result).toBe("> **Caution:** Line one.\n> Line two.");
    });
  });

  describe("footnotesToInline", () => {
    it("replaces footnote references with inline note text", () => {
      const content = "Some text[^1] here.\n\n[^1]: This is a note";
      const result = footnotesToInline(content);
      expect(result).toContain("Some text *(Note: This is a note)* here.");
      expect(result).not.toContain("[^1]:");
    });

    it("handles multiple footnotes", () => {
      const content =
        "A[^1] and B[^2].\n\n[^1]: Note one\n[^2]: Note two";
      const result = footnotesToInline(content);
      expect(result).toContain("*(Note: Note one)*");
      expect(result).toContain("*(Note: Note two)*");
    });

    it("returns content unchanged when no footnotes exist", () => {
      const content = "No footnotes here.";
      const result = footnotesToInline(content);
      expect(result).toBe("No footnotes here.");
    });

    it("removes footnote definition lines", () => {
      const content = "Text[^1].\n\n[^1]: Definition";
      const result = footnotesToInline(content);
      expect(result).not.toContain("[^1]: Definition");
    });

    it("handles multiline footnote definitions by joining them", () => {
      const content = "Text[^1].\n\n[^1]: First line\ncontinuation";
      const result = footnotesToInline(content);
      expect(result).toContain("*(Note: First line continuation)*");
    });
  });
});
