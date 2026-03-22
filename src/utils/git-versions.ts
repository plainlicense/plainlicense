import { execFileSync } from "node:child_process";

export interface TaggedVersion {
  version: string;
  commitRef: string;
}

/**
 * Lists all git tags matching {spdxId}@{version} and returns
 * the version + commit ref for each.
 *
 * Uses execFileSync (not execSync) to prevent shell injection.
 */
export function getTaggedVersions(spdxId: string): TaggedVersion[] {
  const tagPattern = `${spdxId.toLowerCase()}@*`;
  try {
    const output = execFileSync(
      "git",
      [
        "tag",
        "-l",
        tagPattern,
        "--format=%(refname:short) %(objectname:short)",
      ],
      { encoding: "utf8", timeout: 10000 },
    ).trim();

    if (!output) return [];

    return output.split("\n").map((line) => {
      const [tag, commitRef] = line.split(" ");
      const version = tag.replace(`${spdxId.toLowerCase()}@`, "");
      return { version, commitRef };
    });
  } catch {
    return [];
  }
}

/**
 * Extracts a file's content at a specific git commit.
 *
 * Uses execFileSync (not execSync) to prevent shell injection.
 */
export function getFileAtCommit(
  commitRef: string,
  filePath: string,
): string | null {
  try {
    return execFileSync("git", ["show", `${commitRef}:${filePath}`], {
      encoding: "utf8",
      timeout: 10000,
    });
  } catch {
    return null;
  }
}
