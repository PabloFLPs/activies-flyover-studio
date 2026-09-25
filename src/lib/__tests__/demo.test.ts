import { describe, it, expect } from "vitest";
import { buildDemo } from "../demo";

describe("buildDemo (Belo Horizonte run)", () => {
  const demo = buildDemo();

  it("produces a dense running track", () => {
    expect(demo.sport).toBe("running");
    expect(demo.points.length).toBeGreaterThan(250);
  });

  it("stays within the central Belo Horizonte bounding box", () => {
    for (const p of demo.points) {
      expect(p.lat).toBeGreaterThan(-19.945);
      expect(p.lat).toBeLessThan(-19.912);
      expect(p.lng).toBeGreaterThan(-43.943);
      expect(p.lng).toBeLessThan(-43.924);
    }
  });

  it("forms a closed loop with monotonic timestamps", () => {
    const first = demo.points[0];
    const last = demo.points[demo.points.length - 1];
    expect(Math.abs(first.lat - last.lat)).toBeLessThan(0.002);
    expect(Math.abs(first.lng - last.lng)).toBeLessThan(0.002);
    for (let i = 1; i < demo.points.length; i++) {
      expect(demo.points[i].t!).toBeGreaterThanOrEqual(demo.points[i - 1].t!);
    }
  });
});
