/**
 * Types for the License Finder guided filter component.
 *
 * The finder scores adapted licenses against user answers to produce
 * ranked recommendations. Types here are shared across the question
 * config, scoring logic, and Preact component.
 */

/** A flattened, serialisable view of a license used by the finder at runtime. */
export interface LicenseCandidate {
  spdx_id: string;
  plain_name: string;
  license_family: string;
  maker_pitch: string;
  url: string;
  permissions: string[];
  conditions: string[];
  limitations: string[];
  commercial_restrictions: string[];
  compare_to: CompareEntry[];
}

export interface CompareEntry {
  spdx_id: string;
  contrast: string;
}

/** A single selectable answer within a question axis. */
export interface FinderOption {
  label: string;
  /**
   * Tags this answer aligns with — used for scoring.
   * A candidate scores higher when its tags match.
   */
  match: {
    conditions?: string[];
    commercial_restrictions?: string[];
    permissions?: string[];
    /**
     * Fields the user prefers to be empty.
     * e.g. "I don't need attribution" → empty conditions preferred.
     */
    preferEmpty?: ("conditions" | "commercial_restrictions")[];
  };
}

/** One question axis in the guided filter. */
export interface FinderAxis {
  id: string;
  question: string;
  /** Short context line shown below the question. */
  hint: string;
  /** Longer explanation revealed by "I'm not sure — tell me more". */
  explainer: string;
  options: FinderOption[];
  /**
   * Only show this question if there is actual variance
   * in the current license set on this axis.
   */
  isRelevant: (licenses: LicenseCandidate[]) => boolean;
}
