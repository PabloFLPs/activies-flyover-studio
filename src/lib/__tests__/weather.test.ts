import { describe, it, expect } from "vitest";
import { resolveCode, weatherLabel, WEATHER_CONDITIONS } from "../weather";

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

  it("classifies by measured precipitation amount", () => {
    expect(resolveCode(51, 3.0, 100)).toBe(65); // heavy rain
    expect(resolveCode(51, 0.8, 100)).toBe(61); // rain
    expect(resolveCode(2, 0.2, 100)).toBe(51); // trace precip -> drizzle
  });
});

describe("WEATHER_CONDITIONS", () => {
  it("offers a non-empty set of distinctly-labelled conditions", () => {
    expect(WEATHER_CONDITIONS.length).toBeGreaterThan(5);
    const labels = WEATHER_CONDITIONS.map((c) => weatherLabel(c, "pt-BR"));
    expect(new Set(labels).size).toBe(WEATHER_CONDITIONS.length);
  });
});
