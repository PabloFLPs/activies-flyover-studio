import type { ParseResult } from "../types";
import { parseGPX } from "./gpx";
import { parseKML } from "./kml";
import { parseGeo } from "./geojson";
import { parseFIT } from "./fit";

/**
 * Read an uploaded activity file and return its track. Dispatches by extension,
 * with a content sniff for unknown extensions.
 */
export async function parseActivityFile(file: File): Promise<ParseResult> {
  const name = file.name || "activity";
  const ext = (name.split(".").pop() || "").toLowerCase();

  let res: ParseResult;
  if (ext === "fit") {
    res = await parseFIT(await file.arrayBuffer());
  } else {
    const text = await file.text();
    if (ext === "gpx") res = parseGPX(text);
    else if (ext === "kml") res = parseKML(text);
    else if (ext === "geojson" || ext === "json") res = parseGeo(text);
    else if (text.trim().startsWith("<"))
      res = text.includes("kml") ? parseKML(text) : parseGPX(text);
    else res = parseGeo(text);
  }

  if (!res || !res.points || res.points.length < 2) {
    throw new Error("No GPS track found in this file.");
  }
  return res;
}

export { parseGPX, parseKML, parseGeo, parseFIT };
