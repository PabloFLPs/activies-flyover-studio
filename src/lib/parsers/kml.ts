import type { ParseResult, TrackPoint } from "../types";

export function parseKML(text: string): ParseResult {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("Invalid KML file.");

  const all = Array.from(xml.getElementsByTagName("*"));
  const trackEl = all.find((n) => n.localName === "Track");
  const pts: TrackPoint[] = [];

  if (trackEl) {
    const whens = Array.from(trackEl.getElementsByTagName("*"))
      .filter((n) => n.localName === "when")
      .map((n) => Date.parse(n.textContent ?? "") || null);
    const coords = Array.from(trackEl.getElementsByTagName("*")).filter(
      (n) => n.localName === "coord" || n.localName === "gx:coord",
    );
    coords.forEach((c, i) => {
      const [lng, lat, ele] = (c.textContent ?? "").trim().split(/\s+/).map(Number);
      if (isFinite(lat) && isFinite(lng)) {
        pts.push({
          lat,
          lng,
          ele: isFinite(ele) ? ele : null,
          t: whens[i] ?? null,
          hr: null,
        });
      }
    });
  } else {
    const ls = all.find((n) => n.localName === "LineString");
    const co =
      ls &&
      Array.from(ls.getElementsByTagName("*")).find(
        (n) => n.localName === "coordinates",
      );
    if (co) {
      (co.textContent ?? "")
        .trim()
        .split(/\s+/)
        .forEach((tok) => {
          const [lng, lat, ele] = tok.split(",").map(Number);
          if (isFinite(lat) && isFinite(lng)) {
            pts.push({
              lat,
              lng,
              ele: isFinite(ele) ? ele : null,
              t: null,
              hr: null,
            });
          }
        });
    }
  }

  if (!pts.length) throw new Error("No line or track found in KML.");
  return { points: pts };
}
