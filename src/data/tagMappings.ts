// Maps choosealicense.com tags → PlainLicense display tags.
// Manually authored values in original.permissions/conditions/limitations
// always take precedence over auto-populated choose_a_license_details values.

export const PERMISSION_MAP = {
  "commercial-use": "can-sell",
  distribution: "can-share",
  modifications: "can-change",
  "private-use": "can-keep-private",
  "patent-use": "patent-use",
  revokable: "can-revoke",
} as const;

export const CONDITION_MAP = {
  "disclose-source": "share-source",
  "document-changes": "describe-changes",
  "include-copyright": "give-credit",
  "include-copyright--source": "give-credit",
  "network-use-disclose": "share-alike-network",
  "same-license": "share-alike-strict",
  "same-license--file": "share-alike-relaxed",
  "same-license--library": "share-alike-relaxed",
} as const;

export const LIMITATION_MAP = {
  liability: "no-liability",
  warranty: "no-warranty",
  "trademark-use": "no-trademark",
  "patent-use": "no-patent",
} as const;

export const TAG_DESCRIPTIONS: Record<string, string> = {
  "can-sell": "You can sell this work or use it in a paid product.",
  "can-share": "You can share or give copies of this work to anyone.",
  "can-change": "You can change this work however you want.",
  "can-keep-private":
    "You have no obligation to publish or share your changes.",
  "can-revoke":
    "The copyright holder can revoke this license from future users.",
  "patent-use": "You get an express license to use any contributor patents.",
  "give-credit": "You must name the original creator when you share this work.",
  "describe-changes":
    "You must say what you changed when you share a modified version.",
  "share-source":
    "You must make the source code available when you share this work.",
  "share-alike-strict":
    "You must share changes under the same license — for the entire project.",
  "share-alike-relaxed":
    "You must share changes under the same license — for the same file or library.",
  "share-alike-network":
    "Letting users access this work over a network counts as sharing.",
  "no-liability":
    "The copyright holders are not responsible for damages from using this work.",
  "no-warranty":
    "No promises are made about whether this work is fit for any purpose.",
  "no-trademark":
    "You can't use the creators' names or marks to endorse your product.",
  "no-patent": "You can't sue users of this work for patent infringement.",
};

export const PERMISSION_LABELS: Record<string, string> = {
  "commercial-use": "Sell it",
  distribution: "Share it",
  modifications: "Change it",
  "private-use": "Keep it private",
  "patent-use": "Patent use",
  revokable: "Revokable",
};

export const CONDITION_LABELS: Record<string, string> = {
  "disclose-source": "Share source",
  "document-changes": "Describe changes",
  "include-copyright": "Give credit",
  "include-copyright--source": "Give credit",
  "network-use-disclose": "Share alike (network)",
  "same-license": "Share alike",
  "same-license--file": "Share alike (file)",
  "same-license--library": "Share alike (library)",
};

export const LIMITATION_LABELS: Record<string, string> = {
  liability: "No liability",
  warranty: "No warranty",
  "trademark-use": "No trademark use",
  "patent-use": "No patent claims",
};

export const PERMISSION_WHY: Record<string, string> = {
  "commercial-use":
    "So you can build a business or earn income with this work.",
  distribution: "So you can share the work freely with others.",
  modifications: "So you can improve, adapt, or build upon this work.",
  "private-use": "So you are not forced to publish changes you make privately.",
  "patent-use":
    "So you can use this work without fear of patent claims from contributors.",
  revokable: "The original creator retains the ability to withdraw permission.",
};

export const CONDITION_WHY: Record<string, string> = {
  "disclose-source": "So others can see and build on the work.",
  "document-changes": "So others know what you changed from the original.",
  "include-copyright": "So the original creator gets credit for their work.",
  "include-copyright--source":
    "So the original creator gets credit for their work.",
  "network-use-disclose":
    "Because sharing over a network is still sharing the work.",
  "same-license": "So every version of the work stays equally free to use.",
  "same-license--file": "So the modified files stay equally free to use.",
  "same-license--library": "So the library stays equally free to use.",
};

export const LIMITATION_WHY: Record<string, string> = {
  liability:
    "So contributors are not held responsible for how the work is used.",
  warranty: "So contributors are not obligated to fix problems in the work.",
  "trademark-use":
    "So the creators' brand and reputation are not misrepresented.",
  "patent-use":
    "So the creators are not exposed to patent lawsuits from users.",
};

export const PERMISSION_ICONS: Record<string, string> = {
  "commercial-use": "💰",
  distribution: "📤",
  modifications: "✏️",
  "private-use": "🔒",
  "patent-use": "⚗️",
  revokable: "↩️",
};

export const CONDITION_ICONS: Record<string, string> = {
  "disclose-source": "📂",
  "document-changes": "📝",
  "include-copyright": "©️",
  "include-copyright--source": "©️",
  "network-use-disclose": "🌐",
  "same-license": "♻️",
  "same-license--file": "♻️",
  "same-license--library": "♻️",
};

export const LIMITATION_ICONS: Record<string, string> = {
  liability: "⚖️",
  warranty: "🛡️",
  "trademark-use": "™️",
  "patent-use": "⚗️",
};
