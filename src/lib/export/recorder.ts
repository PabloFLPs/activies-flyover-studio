/** True on iPhone/iPad (all iOS browsers are WebKit under the hood). */
export function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iP(hone|ad|od)/.test(ua);
  const iPadOS =
    navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
  return iOS || iPadOS;
}

/**
 * Pick the best supported MediaRecorder container/codec, or "" if none.
 * When `preferMp4` is set (the MP4 export fallback), try MP4 first — iOS WebKit
 * records H.264 MP4 natively but has no WebM.
 */
export function pickMime(preferMp4 = false): string {
  if (typeof MediaRecorder === "undefined") return "";
  const mp4 = ["video/mp4;codecs=avc1", "video/mp4;codecs=h264", "video/mp4"];
  const webm = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const candidates = preferMp4 ? [...mp4, ...webm] : [...webm, ...mp4];
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* ignore */
    }
  }
  return "";
}

/** Slug for the download filename, e.g. "alex-rivera" → "alex-rivera-flyover.mp4". */
export function sanitizeBase(name: string): string {
  return (
    (name || "activity")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "activity"
  );
}

export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
