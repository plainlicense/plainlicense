import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFileAtCommit,
  getTaggedVersions,
} from "../../src/utils/git-versions.ts";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

describe("getTaggedVersions", () => {
  afterEach(() => vi.clearAllMocks());

  it("parses git tag output into version objects", () => {
    vi.mocked(execFileSync).mockReturnValue(
      "mit@0.1.0 abc1234\nmit@0.2.0 def5678\n",
    );
    const versions = getTaggedVersions("MIT");
    expect(versions).toEqual([
      { version: "0.1.0", commitRef: "abc1234" },
      { version: "0.2.0", commitRef: "def5678" },
    ]);
  });

  it("returns empty array when no tags exist", () => {
    vi.mocked(execFileSync).mockReturnValue("");
    expect(getTaggedVersions("MIT")).toEqual([]);
  });

  it("returns empty array on git error", () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("not a git repo");
    });
    expect(getTaggedVersions("MIT")).toEqual([]);
  });
});

describe("getFileAtCommit", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns file content at commit", () => {
    vi.mocked(execFileSync).mockReturnValue("# License content\n");
    expect(
      getFileAtCommit("abc1234", "content/licenses/permissive/mit.md"),
    ).toBe("# License content\n");
  });

  it("returns null when file does not exist at commit", () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("path not found");
    });
    expect(getFileAtCommit("abc1234", "nonexistent.md")).toBeNull();
  });
});
