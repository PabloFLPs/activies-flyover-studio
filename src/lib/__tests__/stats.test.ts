import { describe, it, expect } from "vitest";
import { buildStats } from "../stats";
import type { TrackPoint } from "../types";

const line = (withTime: boolean): TrackPoint[] => {
  const t0 = Date.parse("2026-01-01T00:00:00Z");
  return [
    { lat: 0, lng: 0, ele: 100, hr: 140, t: withTime ? t0 : null },
    { lat: 0.001, lng: 0, ele: 110, hr: 150, t: withTime ? t0 + 60000 : null },
    { lat: 0.002, lng: 0, ele: 105, hr: 155, t: withTime ? t0 + 120000 : null },
  ];
};

describe("buildStats", () => {
  it("computes distance and honours real timing", () => {
    const s = buildStats(line(true), "running", { fallbackDurationSec: 15 });
    expect(s.total).toBeGreaterThan(200);
    expect(s.hasTime).toBe(true);
    expect(s.dur).toBeCloseTo(120, 0);
    expect(s.coords.length).toBe(3);
    expect(s.hasHr).toBe(true);
  });

  it("falls back to the video duration when there is no timing", () => {
    const s = buildStats(line(false), "running", { fallbackDurationSec: 15 });
    expect(s.hasTime).toBe(false);
    expect(s.dur).toBe(15);
  });
});
