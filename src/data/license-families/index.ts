/**
 * License family data: shared protections and interpretation text.
 * Each family owns its standard condition blocks and warranty boilerplate.
 */

export interface FamilyBlocks {
  protections: string;
  interpretation: string;
  conditionSummary?: string;
}

const permissiveFamily: FamilyBlocks = {
  protections: `### No warranties

The work is provided as-is. The copyright holders make no promises about
whether it will work, whether it is accurate, or whether it is fit for
any particular purpose.

### No liability

The copyright holders are not responsible for any damages or losses that
result from using this work, even if they knew such damage was possible.`,
  interpretation: `This is a permissive license. It lets you do almost anything
with the work as long as you keep the copyright notice.`,
};

const copyleftFamily: FamilyBlocks = {
  protections: `### No warranties

The work is provided as-is. The copyright holders make no promises about
whether it will work, whether it is accurate, or whether it is fit for
any particular purpose.

### No liability

The copyright holders are not responsible for any damages or losses that
result from using this work, even if they knew such damage was possible.`,
  interpretation: `This is a copyleft license. Changes you share must come back
under the same rules so everyone benefits equally.`,
};

const publicDomainFamily: FamilyBlocks = {
  protections: `### No warranties

The work is provided as-is. The creators make no promises about
whether it will work, whether it is accurate, or whether it is fit for
any particular purpose.

### No liability

The creators are not responsible for any damages or losses that
result from using this work.`,
  interpretation: `This is a public domain dedication. The creator has given up
all rights so everyone can use the work freely and without restriction.`,
};

const sourceAvailableFamily: FamilyBlocks = {
  protections: `### No warranties

The work is provided as-is. The copyright holders make no promises about
whether it will work, whether it is accurate, or whether it is fit for
any particular purpose.

### No liability

The copyright holders are not responsible for any damages or losses that
result from using this work, even if they knew such damage was possible.`,
  interpretation: `This is a source-available license. The source is visible, but
commercial and competitive use is restricted. Read the restrictions carefully.`,
};

const proprietaryFamily: FamilyBlocks = {
  protections: `### No warranties

The work is provided as-is. The copyright holders make no promises about
whether it will work, whether it is accurate, or whether it is fit for
any particular purpose.

### No liability

The copyright holders are not responsible for any damages or losses that
result from using this work.`,
  interpretation: `This is a proprietary license. All rights are reserved except
those explicitly granted.`,
};

const FAMILY_DATA: Record<string, FamilyBlocks> = {
  permissive: permissiveFamily,
  copyleft: copyleftFamily,
  "public-domain": publicDomainFamily,
  "source-available": sourceAvailableFamily,
  proprietary: proprietaryFamily,
};

export function getFamilyData(family: string): FamilyBlocks {
  const data = FAMILY_DATA[family];
  if (!data) {
    console.warn(
      `[license-families] Unknown license family: "${family}". Falling back to permissive defaults.`,
    );
    return permissiveFamily;
  }
  return data;
}

export const FAMILY_LABELS: Record<string, string> = {
  permissive: "Permissive",
  copyleft: "Copyleft",
  "public-domain": "Public Domain",
  "source-available": "Source Available",
  proprietary: "Proprietary",
};
