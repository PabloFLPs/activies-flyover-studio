"use client";

import dynamic from "next/dynamic";

/**
 * The entire Studio depends on browser-only APIs (MapLibre GL, <canvas>,
 * MediaRecorder, the File API and, for MP4, WebCodecs). We load it with
 * ssr:false so none of that is ever evaluated on the server.
 */
const RouteFlyoverStudio = dynamic(() => import("./RouteFlyoverStudio"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--app-bg)",
        color: "var(--sub)",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        fontSize: 14,
        letterSpacing: "0.02em",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 16,
          height: 16,
          marginRight: 10,
          border: "2px solid color-mix(in srgb, var(--accent) 28%, transparent)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          animation: "fspin .7s linear infinite",
        }}
      />
      Carregando estúdio…
    </div>
  ),
});

export default function StudioClient() {
  return <RouteFlyoverStudio />;
}
