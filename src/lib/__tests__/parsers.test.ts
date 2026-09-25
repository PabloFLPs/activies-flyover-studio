import { describe, it, expect } from "vitest";
import { parseGeo } from "../parsers/geojson";

describe("parseGeo (GeoJSON)", () => {
  it("reads a FeatureCollection LineString", () => {
    const gj = JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [-43.98, -19.85, 800],
              [-43.981, -19.851, 802],
            ],
          },
        },
      ],
    });
    const res = parseGeo(gj);
    expect(res.points.length).toBe(2);
    expect(res.points[0].lng).toBeCloseTo(-43.98);
    expect(res.points[0].ele).toBe(800);
  });

  it("reads a bare [[lng,lat], ...] array", () => {
    const res = parseGeo(
      JSON.stringify([
        [-43.98, -19.85],
        [-43.981, -19.851],
      ]),
    );
    expect(res.points.length).toBe(2);
  });

  it("throws on JSON with no line geometry", () => {
    expect(() =>
      parseGeo(JSON.stringify({ type: "Point", coordinates: [0, 0] })),
    ).toThrow();
  });
});

describe("parseGeo (Suunto DeviceLog)", () => {
  it("converts radian lat/lon to degrees and merges HR", () => {
    const R = Math.PI / 180;
    const log = {
      DeviceLog: {
        Header: { Activity: "Running" },
        Samples: [
          {
            Latitude: -19.85 * R,
            Longitude: -43.98 * R,
            GPSAltitude: 801,
            TimeISO8601: "2026-09-13T06:40:00-03:00",
          },
          { HR: 2.5, TimeISO8601: "2026-09-13T06:40:00-03:00" },
          {
            Latitude: -19.851 * R,
            Longitude: -43.981 * R,
            GPSAltitude: 803,
            TimeISO8601: "2026-09-13T06:40:30-03:00",
          },
        ],
      },
    };
    const res = parseGeo(JSON.stringify(log));
    expect(res.sport).toBe("running");
    expect(res.points.length).toBe(2);
    expect(res.points[0].lat).toBeCloseTo(-19.85, 4);
    expect(res.points[0].lng).toBeCloseTo(-43.98, 4);
    expect(res.points[0].hr).toBe(150); // 2.5 Hz -> 150 bpm
    expect(res.points[0].ele).toBe(801);
  });
});
