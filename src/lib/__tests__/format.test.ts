import { describe, it, expect } from "vitest";
import { fmtClock, fmtPace, fmtKm } from "../format";

describe("fmtClock", () => {
  it("formats minutes:seconds", () => {
    expect(fmtClock(0)).toBe("0:00");
    expect(fmtClock(65)).toBe("1:05");
    expect(fmtClock(600)).toBe("10:00");
  });
  it("adds hours when needed", () => {
    expect(fmtClock(3661)).toBe("1:01:01");
  });
  it("clamps negatives", () => {
    expect(fmtClock(-5)).toBe("0:00");
  });
});

describe("fmtPace", () => {
  it("formats seconds-per-unit", () => {
    expect(fmtPace(330)).toBe("5:30");
    expect(fmtPace(300)).toBe("5:00");
  });
  it("returns dash for non-positive/invalid", () => {
    expect(fmtPace(0)).toBe("—");
    expect(fmtPace(-1)).toBe("—");
    expect(fmtPace(Infinity)).toBe("—");
  });
});

describe("fmtKm", () => {
  it("formats metres as km with 2 decimals", () => {
    expect(fmtKm(1234)).toBe("1.23 km");
    expect(fmtKm(0)).toBe("0.00 km");
  });
});
