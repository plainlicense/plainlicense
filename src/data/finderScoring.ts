import type { FinderOption, LicenseCandidate } from "./finderTypes";

/**
 * Score a single license candidate against the user's collected answers.
 *
 * Scoring rules:
 *  - Positive tag match (conditions, permissions, commercial_restrictions):
 *    +2 when the license has at least one of the desired tags.
 *  - Negative mismatch: −1 when the license lacks a desired tag.
 *  - "preferEmpty": +1 when the license's array is empty / has fewer entries.
 *  - Neutral / "I don't care": no score change (option is not in the map).
 */
export function scoreLicense(
  license: LicenseCandidate,
  answers: Map<string, FinderOption>,
): number {
  let score = 0;

  answers.forEach((option: FinderOption) => {
    const { match } = option;

    // --- Conditions match ---
    if (match.conditions?.length) {
      const hasAny = match.conditions.some((c: string) =>
        license.conditions.includes(c),
      );
      score += hasAny ? 2 : -1;
    }

    // --- Commercial restrictions match ---
    if (match.commercial_restrictions !== undefined) {
      const wantEmpty = match.commercial_restrictions.length === 0;
      const isEmpty = license.commercial_restrictions.length === 0;

      if (wantEmpty && isEmpty) {
        score += 2;
      } else if (!wantEmpty) {
        const hasAny = match.commercial_restrictions.some((r: string) =>
          license.commercial_restrictions.includes(r),
        );
        score += hasAny ? 2 : -1;
      } else {
        // User wants no restrictions but license has some
        score -= 1;
      }
    }

    // --- Permissions match (softer: missing is 0, not −1) ---
    if (match.permissions?.length) {
      const hasAll = match.permissions.every((p: string) =>
        license.permissions.includes(p),
      );
      score += hasAll ? 1 : 0;
    }

    // --- "preferEmpty" — user prefers fewer requirements ---
    if (match.preferEmpty) {
      for (const field of match.preferEmpty) {
        if (field === "conditions" && license.conditions.length === 0) {
          score += 1;
        }
        if (
          field === "commercial_restrictions" &&
          license.commercial_restrictions.length === 0
        ) {
          score += 1;
        }
      }
    }
  });

  return score;
}

/**
 * Rank all candidates and return them sorted best-first.
 * Ties are broken by `featured` status (if available via extra data)
 * or alphabetically by plain_name.
 */
export function rankLicenses(
  licenses: LicenseCandidate[],
  answers: Map<string, FinderOption>,
): LicenseCandidate[] {
  return [...licenses]
    .map((l) => ({ license: l, score: scoreLicense(l, answers) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.license.plain_name.localeCompare(b.license.plain_name);
    })
    .map(({ license }) => license);
}
