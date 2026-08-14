import { describe, it, expect } from "vitest";
import { areaToZoneSlug } from "./service-zones";

describe("areaToZoneSlug", () => {
  it("maps a display label to its canonical slug", () => {
    expect(areaToZoneSlug("Mile 1")).toBe("mile1");
    expect(areaToZoneSlug("GRA Phase 2")).toBe("gra");
    expect(areaToZoneSlug("Trans Amadi")).toBe("transamadi");
  });

  it("passes through an existing slug unchanged", () => {
    expect(areaToZoneSlug("mile3")).toBe("mile3");
    expect(areaToZoneSlug("woji")).toBe("woji");
  });

  it("normalizes whitespace and case", () => {
    expect(areaToZoneSlug("  Trans Amadi ")).toBe("transamadi");
    // "D-LINE" matches the "D-Line" label case-insensitively → its slug.
    expect(areaToZoneSlug("D-LINE")).toBe("dline");
  });

  it("falls back to a normalized slug for unknown areas", () => {
    expect(areaToZoneSlug("Nowhere Land")).toBe("nowhereland");
  });
});
