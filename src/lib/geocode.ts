import type { Lang } from "./types";

interface BdcResp {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
  principalSubdivisionCode?: string; // e.g. "BR-MG"
  countryCode?: string;
  localityInfo?: {
    administrative?: { name?: string; order?: number }[];
  };
}

/** Short "Neighbourhood, City · STATE" style label, best-effort. */
function labelFrom(j: BdcResp): string | null {
  const place = j.locality || j.city || j.principalSubdivision;
  if (!place) return null;
  const city = j.city && j.city !== place ? j.city : undefined;
  // state abbreviation from "BR-MG" -> "MG"
  const code = j.principalSubdivisionCode || "";
  const state = code.includes("-") ? code.split("-")[1] : undefined;
  const head = city ? `${place}, ${city}` : place;
  return state ? `${head} - ${state}` : head;
}

/**
 * Reverse-geocode a coordinate to a human place label. Uses BigDataCloud's
 * keyless, CORS-enabled client endpoint. Returns null on any failure — callers
 * treat the result as optional (it only prefills the editable Location field).
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  lang: Lang,
): Promise<string | null> {
  const locale = lang === "pt-BR" ? "pt" : "en";
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client` +
    `?latitude=${lat.toFixed(5)}&longitude=${lon.toFixed(5)}&localityLanguage=${locale}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = (await res.json()) as BdcResp;
    return labelFrom(j);
  } catch {
    return null;
  }
}
