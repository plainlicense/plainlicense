/**
 * Type definitions for package commitlint-plugin-selective-scope
 */

//
declare module "commitlint-plugin-selective-scope" {
  import type { RuleConfig } from "@commitlint/types";

  // A type (i.e. `perf`, `fix`, etc.) that is not valid for commitlint scopes
  // if it is an empty array, but is valid if it is null or a non-empty array.
  export type InvalidType = [];

  // If the match includes null, then scope is optional.
  export type OptionalMatchDesignator = null;
  // matches for the scope can be a string or a regex, and if it includes null, then scope is optional.
  export type MatchPattern = RegExp | string;

  export type ScopeMatch = MatchPattern & OptionalMatchDesignator;

  export type ScopeMatchOptions = ScopeMatch[] | InvalidType;

  export type Options = {
    [scope: string]: ScopeMatchOptions;
  };

  export type SelectiveScopeRuleConfig = RuleConfig<Options>;

  export const rules: {
    "selective-scope": SelectiveScopeRuleConfig;
  };
}
