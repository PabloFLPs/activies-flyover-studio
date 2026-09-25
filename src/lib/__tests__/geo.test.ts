import { describe, it, expect } from "vitest";
import { hav, bearing, lerp, lerpAngle, easeInOut, clamp } from "../geo";

describe("hav", () => {
  it("is zero for the same point", () => {
    expect(hav({ lat: -19.85, lng: -43.98 }, { lat: -19.85, lng: -43.98 })).toBe(0);
  });
  it("approximates ~111m per 0.001° of latitude", () => {
    const d = hav({ lat: 0, lng: 0 }, { lat: 0.001, lng: 0 });
    expect(d).toBeGreaterThan(108);
    expect(d).toBeLessThan(114);
  });
});

describe("bearing", () => {
  it("points north for a due-north step", () => {
    expect(bearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 3);
  });
  it("points east for a due-east step", () => {
    expect(bearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 3);
  });
});

describe("interpolation helpers", () => {
  it("lerp", () => expect(lerp(0, 10, 0.25)).toBe(2.5));
  it("easeInOut endpoints + midpoint", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 6);
  });
  it("lerpAngle takes the short way around 0", () => {
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0, 6);
  });
  it("clamp", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
