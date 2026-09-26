"use client";

import type { CSSProperties } from "react";
import type { UseFlyover } from "@/hooks/useFlyover";
import { tr } from "@/lib/i18n";

interface Props {
  lang: UseFlyover["settings"]["lang"];
  accent: string;
  consent: UseFlyover["consent"];
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentBanner({
  lang,
  accent,
  consent,
  onAccept,
  onDecline,
}: Props) {
  if (consent !== null) return null; // already answered
  const t = tr(lang);

  const btn = (filled: boolean): CSSProperties => ({
    padding: "8px 16px",
    borderRadius: 9,
    fontFamily: "inherit",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    border: filled ? "none" : "1px solid var(--border-soft)",
    background: filled ? accent : "transparent",
    color: filled ? "#0b0d10" : "var(--sub)",
  });

  return (
    <div
      role="dialog"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 60,
        margin: "0 auto",
        maxWidth: 640,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        padding: "12px 16px",
        borderRadius: 14,
        background: "var(--sidebar-bg)",
        border: "1px solid var(--border-soft)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
      }}
    >
      <span
        style={{
          flex: 1,
          minWidth: 220,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: "var(--sub)",
        }}
      >
        {t.consent.text}
      </span>
      <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
        <button onClick={onDecline} style={btn(false)}>
          {t.consent.decline}
        </button>
        <button onClick={onAccept} style={btn(true)}>
          {t.consent.accept}
        </button>
      </div>
    </div>
  );
}
