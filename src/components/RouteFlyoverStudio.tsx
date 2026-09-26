"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useState } from "react";
import { useFlyover } from "@/hooks/useFlyover";
import Sidebar from "./Sidebar";
import Stage from "./Stage";
import Transport from "./Transport";
import { LogoMark } from "./icons";
import { tr } from "@/lib/i18n";
import HeaderMenu from "./HeaderMenu";
import ConsentBanner from "./ConsentBanner";

export default function RouteFlyoverStudio() {
  const {
    settings,
    appliedTheme,
    appliedAccent,
    consent,
    grantConsent,
    declineConsent,
    patch,
    toggleOverlay,
    display,
    actions,
    refs,
  } = useFlyover();
  // Header logo + status dot follow the map-applied accent so they recolor
  // together with the map, not ahead of it.
  const acc = appliedAccent;

  // Hold a full-screen loader until the map has painted its first frame, so the
  // UI reveals as a finished picture instead of chrome-first, map-a-beat-later.
  const [revealFallback, setRevealFallback] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setRevealFallback(true), 8000);
    return () => clearTimeout(id);
  }, []);
  const covered = !display.mapReady && !revealFallback;

  // Chrome accent follows the MAP's applied accent (see useFlyover) so the
  // page and the map recolor in the same beat.
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", appliedAccent);
  }, [appliedAccent]);

  // Chrome theme follows the MAP's applied theme (see useFlyover) so the page
  // and the map flip in the same beat instead of the chrome jumping ahead.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", appliedTheme);
  }, [appliedTheme]);

  return (
    <div className="rfs-shell" style={{ position: "relative" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--app-bg)",
          color: "var(--sub)",
          fontSize: 14,
          letterSpacing: "0.02em",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          opacity: covered ? 1 : 0,
          visibility: covered ? "visible" : "hidden",
          transition: "opacity .35s ease, visibility 0s linear .35s",
          pointerEvents: covered ? "auto" : "none",
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
        {settings.lang === "pt-BR" ? "Carregando estúdio…" : "Loading studio…"}
      </div>
      <header className="rfs-header">
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: acc,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 22px ${acc}59`,
            }}
          >
            <LogoMark />
          </div>
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Route Flyover Studio
            </div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--sub)",
                fontWeight: 500,
              }}
            >
              {tr(settings.lang).header.subtitle}
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              fontSize: 12,
              color: "var(--sub)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: acc,
                boxShadow: `0 0 8px ${acc}`,
              }}
            />
            1080 × 1920 · 9:16
          </div>
          <HeaderMenu settings={settings} appliedAccent={appliedAccent} patch={patch} />
        </div>
      </header>

      <div className="rfs-body">
        <Sidebar
          settings={settings}
          appliedAccent={appliedAccent}
          patch={patch}
          toggleOverlay={toggleOverlay}
          display={display}
          actions={actions}
        />
        <main className="rfs-main">
          <Stage refs={refs} />
          <Transport
            refs={refs}
            display={display}
            settings={settings}
            appliedAccent={appliedAccent}
            actions={actions}
          />
        </main>
      </div>
      <ConsentBanner
        lang={settings.lang}
        accent={appliedAccent}
        consent={consent}
        onAccept={grantConsent}
        onDecline={declineConsent}
      />
    </div>
  );
}
