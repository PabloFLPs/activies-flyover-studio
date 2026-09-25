import type { ParseResult, TrackPoint } from "../types";
import { guessSport } from "./shared";

/**
 * FIT is a binary format. We lazily load `fit-file-parser` only when a .fit file
 * is actually dropped, so it never enters the main bundle.
 */
export async function parseFIT(buf: ArrayBuffer): Promise<ParseResult> {
  let FitParser: any;
  try {
    const mod: any = await import("fit-file-parser");
    FitParser = mod.default || mod.FitParser || mod;
  } catch {
    throw new Error(
      "FIT decoder could not load. Export a GPX from your device instead.",
    );
  }
  if (!FitParser) throw new Error("FIT decoder unavailable. Try a GPX file.");

  const fp = new FitParser({
    force: true,
    speedUnit: "km/h",
    // Metres, not km: with lengthUnit "km" the altitude field comes back in
    // kilometres (e.g. 0.65) and downstream code treats it as metres, flattening
    // the elevation profile. Distance is computed from lat/lng, so this only
    // affects altitude — which we want in metres.
    lengthUnit: "m",
    mode: "list",
    elapsedRecordField: true,
  });

  const data: any = await new Promise((res, rej) => {
    try {
      fp.parse(buf, (err: any, d: any) =>
        err ? rej(new Error("This FIT file could not be decoded.")) : res(d),
      );
    } catch {
      rej(new Error("This FIT file could not be decoded."));
    }
  });

  const recs: any[] = data.records || (data.activity && data.activity.sessions) || [];
  // FIT stores lat/long as semicircles; convert to degrees.
  const conv = (v: number) => (Math.abs(v) > 180 ? v * (180 / Math.pow(2, 31)) : v);

  const pts: TrackPoint[] = recs
    .filter((r) => r.position_lat != null && r.position_long != null)
    .map((r) => ({
      lat: conv(r.position_lat),
      lng: conv(r.position_long),
      ele:
        r.enhanced_altitude != null
          ? r.enhanced_altitude
          : r.altitude != null
            ? r.altitude
            : null,
      t: r.timestamp ? +new Date(r.timestamp) : null,
      hr: r.heart_rate != null ? r.heart_rate : null,
    }))
    .filter((p) => isFinite(p.lat) && isFinite(p.lng));

  const sess = (data.sessions && data.sessions[0]) || null;
  const sport = sess
    ? guessSport(sess.sport)
    : data.sports && data.sports[0]
      ? guessSport(data.sports[0].sport)
      : null;
  const calories = sess && sess.total_calories != null ? sess.total_calories : null;

  return { points: pts, sport, calories };
}
