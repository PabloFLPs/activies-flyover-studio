import type { ParseResult, TrackPoint } from "../types";
import { guessSport } from "./shared";

export function parseGPX(text: string): ParseResult {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("Invalid GPX file.");

  let nodes = Array.from(xml.getElementsByTagName("*")).filter(
    (n) => n.localName === "trkpt",
  );
  if (!nodes.length) {
    nodes = Array.from(xml.getElementsByTagName("*")).filter(
      (n) => n.localName === "rtept",
    );
  }

  const pts: TrackPoint[] = nodes
    .map((el) => {
      const lat = parseFloat(el.getAttribute("lat") ?? "");
      const lng = parseFloat(el.getAttribute("lon") ?? "");
      let ele: number | null = null;
      let t: number | null = null;
      let hr: number | null = null;
      for (const c of Array.from(el.getElementsByTagName("*"))) {
        if (c.localName === "ele") {
          const v = parseFloat(c.textContent ?? "");
          ele = isFinite(v) ? v : null;
        } else if (c.localName === "time") {
          t = Date.parse(c.textContent ?? "") || null;
        } else if (c.localName === "hr") {
          const v = parseFloat(c.textContent ?? "");
          hr = isFinite(v) ? v : null;
        }
      }
      return { lat, lng, ele, t, hr };
    })
    .filter((p) => isFinite(p.lat) && isFinite(p.lng));

  let sport = null;
  const typeEl = Array.from(xml.getElementsByTagName("*")).find(
    (n) => n.localName === "type",
  );
  if (typeEl) sport = guessSport(typeEl.textContent);

  return { points: pts, sport };
}
