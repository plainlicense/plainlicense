import CMS from "@sveltia/cms";
import { isCacheReady, lookupSpdx } from "./spdx-cache";

/**
 * Derives a Plain License identifier from an SPDX ID.
 * Strips trailing version suffixes (-2.0, -3.0-only, -2.0-or-later)
 * and prepends "Plain-".
 *
 * Inlined from src/utils/plain-id.ts to avoid cross-workspace imports.
 */
function derivePlainId(spdxId: string): string {
  if (spdxId.toLowerCase().startsWith("plain-")) return spdxId;
  const base = spdxId.replace(/-\d+\.\d+(-only|-or-later)?$/i, "");
  return `Plain-${base}`;
}

/**
 * Minimal Immutable.js Map interface for the methods we use.
 * Avoids depending on the full `immutable` package in the worker.
 */
interface ImmutableMap {
  get(key: string): unknown;
  getIn(path: string[]): unknown;
  set(key: string, value: unknown): ImmutableMap;
  setIn(path: string[], value: unknown): ImmutableMap;
}

interface EventAuthor {
  login?: string;
  name?: string;
}

/**
 * Register CMS event hooks for auto-resolving hidden/computed fields.
 *
 * These hooks run client-side in the browser before the entry is committed
 * to the repository. They handle fields that can be derived from other
 * fields within the same entry, without requiring filesystem or build access.
 */
export function registerHooks() {
  CMS.registerEventListener({
    name: "preSave",
    handler: ({ author, entry }) => {
      const collection = entry.get("collection") as string;

      // Each resolver returns the modified data Immutable Map.
      // The Sveltia preSave handler accepts the data map as the return value
      // (per docs: entry.get('data').set(...)).
      if (collection === "licenses") {
        return resolveLicenseFields(entry, author) as never;
      }

      if (collection === "blog-posts") {
        return resolveBlogPostFields(entry, author) as never;
      }

      if (collection === "authors") {
        return resolveAuthorFields(entry, author) as never;
      }
    },
  });
}

/**
 * Auto-resolve computed license fields:
 * - plain_id: derived from original.spdx_id (or spdx_id) via derivePlainId()
 * - is_dedication: true when license_family is "public-domain"
 * - title: falls back to plain_name if empty
 * - original.has_official_source: true when canonical_url is present
 */
function resolveLicenseFields(
  entry: ImmutableMap,
  _author: EventAuthor,
) {
  let data = entry.get("data") as ImmutableMap;

  // Derive plain_id from original.spdx_id (or spdx_id for originals)
  const originalSpdxId = (data.get("original") as ImmutableMap | undefined)?.get(
    "spdx_id",
  ) as string | undefined;
  const spdxId = (data.get("spdx_id") as string | undefined) || originalSpdxId;
  if (spdxId) {
    data = data.set("plain_id", derivePlainId(spdxId));
  }

  // Derive is_dedication from license_family
  const licenseFamily = data.get("license_family") as string | undefined;
  data = data.set("is_dedication", licenseFamily === "public-domain");

  // Default title to plain_name if empty
  const title = data.get("title") as string | undefined;
  const plainName = data.get("plain_name") as string | undefined;
  if (!title && plainName) {
    data = data.set("title", plainName);
  }

  // Derive original.has_official_source from canonical_url presence
  const original = data.get("original") as
    | ImmutableMap
    | undefined;
  if (original) {
    const canonicalUrl = original.get("canonical_url") as string | undefined;
    data = data.setIn(
      ["original", "has_official_source"],
      Boolean(canonicalUrl?.trim()),
    );

    // Enrich from prefetched SPDX + GitHub license data (best-effort)
    const spdxId = original.get("spdx_id") as string | undefined;
    if (spdxId && isCacheReady()) {
      const cached = lookupSpdx(spdxId);
      if (cached) {
        data = data.setIn(["original", "is_osi_approved"], cached.isOsiApproved);
        data = data.setIn(["original", "is_deprecated"], cached.isDeprecated);

        if (cached.permissions) {
          data = data.setIn(["original", "permissions"], cached.permissions);
        }
        if (cached.conditions) {
          data = data.setIn(["original", "conditions"], cached.conditions);
        }
        if (cached.limitations) {
          data = data.setIn(["original", "limitations"], cached.limitations);
        }
      }
    }
  }

  return data;
}

/**
 * Auto-resolve blog post fields:
 * - creation_date: set on first save if missing
 * - last_updated: always update to current timestamp
 */
function resolveBlogPostFields(
  entry: ImmutableMap,
  _author: EventAuthor,
) {
  let data = entry.get("data") as ImmutableMap;
  const now = new Date().toISOString();

  const isNew = entry.get("newRecord") as boolean | undefined;
  if (isNew || !data.get("creation_date")) {
    data = data.set("creation_date", now);
  }

  data = data.set("last_updated", now);

  return data;
}

/**
 * Auto-resolve author fields from the CMS auth context:
 * - name: from author display name if blank
 * - email: placeholder (not available from GitHub OAuth)
 * - social_links.github: from author login
 */
function resolveAuthorFields(
  entry: ImmutableMap,
  author: EventAuthor,
) {
  let data = entry.get("data") as ImmutableMap;
  const isNew = entry.get("newRecord") as boolean | undefined;

  if (isNew) {
    // Pre-fill name from GitHub auth if empty
    const name = data.get("name") as string | undefined;
    if (!name && author.name) {
      data = data.set("name", author.name);
    }

    // Pre-fill GitHub username from login
    const github = data.getIn(["social_links", "github"]) as
      | string
      | undefined;
    if (!github && author.login) {
      data = data.setIn(["social_links", "github"], author.login);
    }
  }

  return data;
}
