import { describe, expect, it } from "vitest";
import { derivePlainId } from "../../src/utils/plain-id.ts";

describe("derivePlainId", () => {
  it("passes through simple IDs with Plain- prefix", () => {
    expect(derivePlainId("MIT")).toBe("Plain-MIT");
  });

  it("strips -X.0 version suffix", () => {
    expect(derivePlainId("MPL-2.0")).toBe("Plain-MPL");
    expect(derivePlainId("Elastic-2.0")).toBe("Plain-Elastic");
  });

  it("strips -X.0-only suffix", () => {
    expect(derivePlainId("GPL-3.0-only")).toBe("Plain-GPL");
  });

  it("strips -X.0-or-later suffix", () => {
    expect(derivePlainId("LGPL-2.1-or-later")).toBe("Plain-LGPL");
  });

  it("handles IDs with no version to strip", () => {
    expect(derivePlainId("Unlicense")).toBe("Plain-Unlicense");
    expect(derivePlainId("0BSD")).toBe("Plain-0BSD");
  });

  it("does not double-prefix IDs already starting with Plain-", () => {
    expect(derivePlainId("Plain-MIT")).toBe("Plain-MIT");
    expect(derivePlainId("Plain-GPL3")).toBe("Plain-GPL3");
  });
});
