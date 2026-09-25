"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { UseFlyover } from "@/hooks/useFlyover";
import { ACCENT_PRESETS } from "@/lib/constants";
import { LANGS, LANG_NAMES, tr } from "@/lib/i18n";

interface Props {
  settings: UseFlyover["settings"];
  appliedAccent: string;
  patch: UseFlyover["patch"];
}

const label: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--muted)",
  fontWeight: 600,
  marginBottom: 8,
};

export default function HeaderMenu({ settings, appliedAccent, patch }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const acc = appliedAccent;
  const t = tr(settings.lang);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const seg = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: "8px 10px",
    borderRadius: 9,
    fontFamily: "inherit",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${active ? acc + "80" : "var(--border-soft)"}`,
    background: active ? acc + "1f" : "transparent",
    color: active ? acc : "var(--sub)",
  });

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t.menu.settings}
        title={t.menu.settings}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 38,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid var(--border-soft)",
          background: "var(--ghost-bg)",
          color: "var(--ink)",
          fontFamily: "inherit",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <SlidersIcon />
        <span style={{ letterSpacing: "0.04em" }}>
          {settings.lang === "pt-BR" ? "PT" : "EN"}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 268,
            padding: 18,
            borderRadius: 16,
            background: "var(--sidebar-bg)",
            border: "1px solid var(--border-soft)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
            zIndex: 50,
          }}
        >
          <div style={label}>{t.menu.language}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => patch({ lang: l })}
                style={seg(settings.lang === l)}
              >
                {LANG_NAMES[l]}
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: "var(--hairline)", margin: "16px 0" }} />

          <div style={label}>{t.menu.theme}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => patch({ theme: "dark" })}
              style={seg(settings.theme === "dark")}
            >
              {t.theme.dark}
            </button>
            <button
              onClick={() => patch({ theme: "light" })}
              style={seg(settings.theme === "light")}
            >
              {t.theme.light}
            </button>
          </div>

          <div style={{ height: 1, background: "var(--hairline)", margin: "16px 0" }} />

          <div style={label}>{t.menu.accent}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {ACCENT_PRESETS.map((p) => {
              const active = settings.accent.toLowerCase() === p.value.toLowerCase();
              return (
                <button
                  key={p.value}
                  onClick={() => patch({ accent: p.value })}
                  title={p.name}
                  aria-label={p.name}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    border: "none",
                    cursor: "pointer",
                    background: p.value,
                    boxShadow: active
                      ? `0 0 0 2px var(--sidebar-bg), 0 0 0 4px ${p.value}`
                      : "0 0 0 1px var(--border-soft)",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SlidersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="9" cy="8" r="2.4" fill="var(--sidebar-bg)" />
      <circle cx="15" cy="16" r="2.4" fill="var(--sidebar-bg)" />
    </svg>
  );
}
