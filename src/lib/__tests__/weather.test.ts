import { describe, it, expect } from "vitest";
import { resolveCode, weatherLabel } from "../weather";

describe("resolveCode", () => {
  it("keeps a wet code when it actually rained", () => {
    expect(resolveCode(61, 1.2, 90)).toBe(61); // rain, 1.2mm
    expect(resolveCode(51, 0.3, 80)).toBe(51); // drizzle, 0.3mm
  });

  it("demotes a dry drizzle code to clear when the sky is clear", () => {
    // The real bug: code 51 (drizzle) with 0mm precip and a clear sky.
    expect(resolveCode(51, 0, 5)).toBe(0);
    expect(weatherLabel(resolveCode(51, 0, 5), "en-US")).toBe(
      weatherLabel(0, "en-US"),
    );
  });

  it("demotes to partly / overcast by cloud cover when dry", () => {
    expect(resolveCode(53, 0, 40)).toBe(2); // partly
    expect(resolveCode(80, 0, 90)).toBe(3); // overcast
  });

  it("treats missing precipitation as dry", () => {
    expect(resolveCode(61, null, 10)).toBe(0);
  });

  it("assumes partly cloudy when cloud cover is unknown", () => {
    expect(resolveCode(51, 0, null)).toBe(2);
  });

  it("never touches fog, snow or thunder codes", () => {
    expect(resolveCode(45, 0, 100)).toBe(45); // fog
    expect(resolveCode(71, 0, 100)).toBe(71); // snow
    expect(resolveCode(95, 0, 100)).toBe(95); // thunder
    expect(resolveCode(0, 0, 0)).toBe(0); // already clear
  });
});
