import type { FinderAxis, LicenseCandidate } from "./finderTypes";

/**
 * Question axes for the license finder.
 *
 * Each axis maps to a dimension of tag variance across the adapted
 * license set. Questions are only shown when `isRelevant` returns true,
 * meaning at least two licenses differ on that axis.
 *
 * Explainer text draws on the plain-language voice established in
 * tagMappings.ts.
 */

const hasCopyleftCondition = (l: LicenseCandidate) =>
  l.conditions.some(
    (c) => c.startsWith("same-license") || c === "disclose-source",
  );

export const FINDER_AXES: FinderAxis[] = [
  {
    id: "sharing",
    question: "Should people who change your work share those changes?",
    hint: "This is about what happens when someone builds on what you made.",
    explainer:
      "Some licenses require that if someone changes your files, they share " +
      "those changes under the same license. This means improvements come " +
      "back to the community. Without this rule, someone could take your " +
      "work, improve it, and keep those improvements to themselves.",
    options: [
      {
        label: "Yes, for the files they change",
        match: { conditions: ["same-license--file", "disclose-source"] },
      },
      {
        label: "No, they can keep changes private",
        match: { preferEmpty: ["conditions"] },
      },
    ],
    isRelevant: (licenses) => {
      const has = licenses.some(hasCopyleftCondition);
      const hasNot = licenses.some((l) => !hasCopyleftCondition(l));
      return has && hasNot;
    },
  },

  {
    id: "attribution",
    question: "Do you want credit when people share your work?",
    hint: "They would include your name and the license with any copies.",
    explainer:
      "An attribution requirement means anyone who shares your work must " +
      "include your name and a copy of the license. This is the most common " +
      "license condition — it costs nothing to comply with and helps your " +
      "work stay connected to you.",
    options: [
      {
        label: "Yes, always",
        match: { conditions: ["include-copyright"] },
      },
      {
        label: "Not necessary",
        match: { preferEmpty: ["conditions"] },
      },
    ],
    isRelevant: (licenses) => {
      const has = licenses.some((l) =>
        l.conditions.includes("include-copyright"),
      );
      const hasNot = licenses.some(
        (l) => !l.conditions.includes("include-copyright"),
      );
      return has && hasNot;
    },
  },

  {
    id: "commercial",
    question:
      "How do you feel about companies offering your work as a service?",
    hint: "Some makers want to prevent large companies from hosting their work without contributing back.",
    explainer:
      "A 'managed service' restriction means a company cannot take your " +
      "work and sell access to it as a hosted product (think cloud services). " +
      "They can still use it internally and even sell products built with it " +
      "— they just can't offer the work itself as the service. This is a " +
      "common choice for open-source projects that compete with cloud providers.",
    options: [
      {
        label: "That's fine with me",
        match: { commercial_restrictions: [] },
      },
      {
        label: "I want to prevent that",
        match: { commercial_restrictions: ["no-managed-service"] },
      },
    ],
    isRelevant: (licenses) =>
      licenses.some((l) => l.commercial_restrictions.length > 0),
  },

  {
    id: "patent",
    question: "Should your license include a patent grant?",
    hint: "A patent grant protects users from patent claims by contributors.",
    explainer:
      "Some licenses include an explicit promise that contributors will " +
      "not sue users for patent infringement related to the work. Without " +
      "this, someone could contribute code and later claim a patent covers " +
      "it. If patent safety matters for your project, look for a license " +
      "with a patent grant.",
    options: [
      {
        label: "Yes, include patent protection",
        match: { permissions: ["patent-use"] },
      },
      {
        label: "Not important to me",
        match: {},
      },
    ],
    isRelevant: (licenses) => {
      const has = licenses.some((l) => l.permissions.includes("patent-use"));
      const hasNot = licenses.some(
        (l) => !l.permissions.includes("patent-use"),
      );
      return has && hasNot;
    },
  },
];
