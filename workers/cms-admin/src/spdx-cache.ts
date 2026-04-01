/**
 * Prefetch cache for SPDX and GitHub Licenses API data.
 *
 * Fetches on CMS init so that preSave hooks can do instant lookups
 * without blocking the save operation. If either fetch fails (network
 * issue, rate limit, etc.), the cache is simply empty and preSave
 * skips enrichment gracefully.
 */

// ─── Types ───────────────────────────────────────────────────

interface SpdxLicenseEntry {
  licenseId: string;
  name: string;
  isOsiApproved: boolean;
  isDeprecatedLicenseId: boolean;
}

interface GitHubLicenseListEntry {
  key: string;
  spdx_id: string;
  url: string;
}

interface GitHubLicenseDetail {
  permissions: string[];
  conditions: string[];
  limitations: string[];
}

/** Combined data available for a single SPDX ID. */
export interface CachedLicenseData {
  /** Official license name from SPDX. */
  name: string;
  isOsiApproved: boolean;
  isDeprecated: boolean;
  /** choosealicense.com permission tags (e.g. "commercial-use"). */
  permissions?: string[];
  /** choosealicense.com condition tags (e.g. "include-copyright"). */
  conditions?: string[];
  /** choosealicense.com limitation tags (e.g. "liability"). */
  limitations?: string[];
}

// ─── Cache ───────────────────────────────────────────────────

const cache = new Map<string, CachedLicenseData>();
let initialized = false;

// ─── Public API ──────────────────────────────────────────────

/**
 * Look up cached license data by SPDX ID.
 * Returns undefined if the ID wasn't found or the cache failed to load.
 */
export function lookupSpdx(spdxId: string): CachedLicenseData | undefined {
  return cache.get(spdxId.toUpperCase());
}

/** Whether the cache has been populated (even if empty due to errors). */
export function isCacheReady(): boolean {
  return initialized;
}

/**
 * Prefetch SPDX + GitHub license data into the in-memory cache.
 * Call once on CMS init. Non-blocking — fires and forgets.
 * Errors are caught and logged; the cache stays empty on failure.
 */
export function prefetchSpdxData(): void {
  // Fire and forget — don't await, don't block CMS init
  doPrefetch().catch((err) => {
    console.warn("[spdx-cache] Prefetch failed, enrichment will be skipped:", err);
    initialized = true;
  });
}

// ─── Implementation ──────────────────────────────────────────

const SPDX_URL =
  "https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json";
const GH_LICENSES_URL = "https://api.github.com/licenses";

async function doPrefetch(): Promise<void> {
  // Fetch SPDX list and GitHub license list in parallel
  const [spdxResult, ghListResult] = await Promise.allSettled([
    fetchJson<{ licenses: SpdxLicenseEntry[] }>(SPDX_URL),
    fetchJson<GitHubLicenseListEntry[]>(GH_LICENSES_URL),
  ]);

  // ── Phase 1: Populate cache with SPDX data ──────────────

  if (spdxResult.status === "fulfilled" && spdxResult.value?.licenses) {
    for (const entry of spdxResult.value.licenses) {
      cache.set(entry.licenseId.toUpperCase(), {
        name: entry.name,
        isOsiApproved: entry.isOsiApproved,
        isDeprecated: entry.isDeprecatedLicenseId,
      });
    }
    console.info(`[spdx-cache] Loaded ${cache.size} SPDX entries`);
  } else {
    console.warn("[spdx-cache] SPDX fetch failed, skipping SPDX enrichment");
  }

  // ── Phase 2: Enrich with GitHub Licenses API (choosealicense data) ──

  if (ghListResult.status === "fulfilled" && Array.isArray(ghListResult.value)) {
    const ghList = ghListResult.value;

    // Build spdx_id → GitHub API key mapping
    const spdxToKey = new Map<string, string>();
    for (const entry of ghList) {
      if (entry.spdx_id && entry.key) {
        spdxToKey.set(entry.spdx_id.toUpperCase(), entry.key);
      }
    }

    // Fetch details for all GitHub-known licenses in parallel
    const detailFetches = [...spdxToKey.entries()].map(
      async ([spdxId, key]) => {
        try {
          const detail = await fetchJson<GitHubLicenseDetail>(
            `${GH_LICENSES_URL}/${key}`,
          );
          if (detail) {
            const existing = cache.get(spdxId);
            if (existing) {
              existing.permissions = detail.permissions;
              existing.conditions = detail.conditions;
              existing.limitations = detail.limitations;
            } else {
              // License in GitHub but not SPDX (unlikely but handle it)
              cache.set(spdxId, {
                name: key,
                isOsiApproved: false,
                isDeprecated: false,
                permissions: detail.permissions,
                conditions: detail.conditions,
                limitations: detail.limitations,
              });
            }
          }
        } catch {
          // Individual detail fetch failed — skip this license
        }
      },
    );

    await Promise.allSettled(detailFetches);
    console.info(
      `[spdx-cache] Enriched with GitHub license details (${spdxToKey.size} licenses)`,
    );
  } else {
    console.warn(
      "[spdx-cache] GitHub Licenses API fetch failed, skipping choosealicense enrichment",
    );
  }

  initialized = true;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}
