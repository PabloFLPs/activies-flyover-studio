import { useState, type CSSProperties, type ChangeEvent, type DragEvent } from "react";
import type { UseFlyover } from "@/hooks/useFlyover";
import {
  DURATION_MAX,
  DURATION_MIN,
  OVERLAY_ORDER,
  PITCH_MAX,
  PITCH_MIN,
  SPORT_OPTIONS,
} from "@/lib/constants";
import { tr } from "@/lib/i18n";
import { WEATHER_CONDITIONS, weatherLabel } from "@/lib/weather";
import { DropIcon, PlayTriangle } from "./icons";
import Select from "./Select";

interface Props {
  settings: UseFlyover["settings"];
  appliedAccent: string;
  patch: UseFlyover["patch"];
  toggleOverlay: UseFlyover["toggleOverlay"];
  display: UseFlyover["display"];
  actions: UseFlyover["actions"];
}

const label: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--muted)",
  fontWeight: 600,
  marginBottom: 11,
};

const divider: CSSProperties = {
  height: 1,
  background: "var(--hairline)",
  margin: "20px 0",
};

const textInput: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border-soft)",
  background: "var(--input-bg)",
  color: "var(--ink)",
  fontFamily: "inherit",
  fontSize: 13,
  outline: "none",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={label}>{children}</div>;
}

export default function Sidebar({
  settings,
  appliedAccent,
  patch,
  toggleOverlay,
  display,
  actions,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const acc = appliedAccent;
  const t = tr(settings.lang);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) actions.handleFile(f);
    e.target.value = "";
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) actions.handleFile(f);
  };

  const dropZone: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 22,
    borderRadius: 14,
    border: dragging ? `1.5px dashed ${acc}` : "1.5px dashed var(--border-soft)",
    background: dragging ? `${acc}14` : "var(--card-bg)",
    cursor: "pointer",
    transition: "all .15s",
    color: acc,
  };

  const seg = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: 10,
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${active ? acc + "80" : "var(--border-soft)"}`,
    background: active ? acc + "1f" : "transparent",
    color: active ? acc : "var(--sub)",
  });

  const sportLabel = t.sportShort[settings.sport] || "Activity";

  return (
    <aside className="rfs-sidebar">
      {/* Activity file */}
      <SectionLabel>{t.sidebar.activityFile}</SectionLabel>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragging) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
        style={dropZone}
      >
        <input
          type="file"
          onChange={onFile}
          style={{ display: "none" }}
        />
        <DropIcon />
        <div
          style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginTop: 9 }}
        >
          {t.sidebar.dropOrBrowse}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
          {t.sidebar.fileFormats}
        </div>
      </label>
      <button
        onClick={actions.loadDemo}
        style={{
          width: "100%",
          marginTop: 9,
          padding: 10,
          borderRadius: 10,
          border: "1px solid var(--border-soft)",
          background: "var(--ghost-bg)",
          color: "var(--ink)",
          fontFamily: "inherit",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
        }}
      >
        <span style={{ color: acc, display: "inline-flex" }}>
          <PlayTriangle />
        </span>
        {t.sidebar.loadDemo}
      </button>

      {display.error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(255,90,90,0.12)",
            border: "1px solid rgba(255,90,90,0.30)",
            color: "#d84b4b",
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {display.error}
        </div>
      )}

      {display.hasData && (
        <div
          style={{
            marginTop: 18,
            padding: 13,
            borderRadius: 12,
            background: `${acc}12`,
            border: `1px solid ${acc}33`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {display.fileName}
            </div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#0b0d10",
                background: acc,
                padding: "3px 7px",
                borderRadius: 6,
                fontWeight: 700,
              }}
            >
              {sportLabel}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            {[
              { v: display.sumDist, l: t.sidebar.summaryDistance },
              { v: display.sumDur, l: t.sidebar.summaryDuration },
              { v: display.sumPts, l: t.sidebar.summaryPoints },
            ].map((sm) => (
              <div key={sm.l}>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 19,
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {sm.v}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginTop: 1,
                  }}
                >
                  {sm.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={divider} />

      {/* Identity */}
      <SectionLabel>{t.sidebar.identity}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <input
          value={settings.athleteName}
          onChange={(e) => patch({ athleteName: e.target.value })}
          placeholder={t.sidebar.athletePlaceholder}
          style={textInput}
        />
        <input
          value={settings.location}
          onChange={(e) => patch({ location: e.target.value })}
          placeholder={t.sidebar.locationPlaceholder}
          style={textInput}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: 12, color: "var(--sub)", flex: "0 0 auto" }}>
            {t.sidebar.sport}
          </span>
          <Select
            value={settings.sport}
            onChange={(v) => patch({ sport: v as typeof settings.sport })}
            accent={acc}
            ariaLabel={t.sidebar.sport}
            options={SPORT_OPTIONS.map((sp) => ({
              value: sp.value,
              label: t.sportLabel[sp.value],
            }))}
            style={{ flex: 1 }}
          />
        </div>
        <button
          onClick={() => patch({ weatherManual: !settings.weatherManual })}
          style={{
            ...seg(settings.weatherManual),
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
          }}
        >
          <span>{t.sidebar.weatherManual}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {settings.weatherManual ? t.on : t.off}
          </span>
        </button>
        {settings.weatherManual && (
          <div style={{ display: "flex", gap: 9 }}>
            <input
              type="number"
              value={settings.weatherTempC}
              onChange={(e) => patch({ weatherTempC: +e.target.value })}
              placeholder={t.sidebar.weatherTempPlaceholder}
              aria-label={t.sidebar.weatherTempPlaceholder}
              style={{ ...textInput, flex: "0 0 40%" }}
            />
            <Select
              value={String(settings.weatherCode)}
              onChange={(v) => patch({ weatherCode: +v })}
              accent={acc}
              ariaLabel={t.sidebar.weatherCondition}
              options={WEATHER_CONDITIONS.map((code) => ({
                value: String(code),
                label: weatherLabel(code, settings.lang),
              }))}
              style={{ flex: 1 }}
            />
          </div>
        )}
      </div>

      <div style={divider} />

      {/* Camera */}
      <SectionLabel>{t.sidebar.camera}</SectionLabel>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 9,
        }}
      >
        <span style={{ fontSize: 12.5, color: "var(--sub)" }}>{t.sidebar.tilt}</span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            color: acc,
            fontWeight: 600,
          }}
        >
          {settings.cameraPitch}°
        </span>
      </div>
      <input
        type="range"
        min={PITCH_MIN}
        max={PITCH_MAX}
        step={1}
        value={settings.cameraPitch}
        onChange={(e) => patch({ cameraPitch: +e.target.value })}
        style={{ width: "100%" }}
      />
      <button
        onClick={() => patch({ introOutro: !settings.introOutro })}
        style={{
          ...seg(settings.introOutro),
          width: "100%",
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
        }}
      >
        <span>{t.sidebar.introOutro}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {settings.introOutro ? t.on : t.off}
        </span>
      </button>

      <div style={divider} />

      {/* Overlays */}
      <SectionLabel>{t.sidebar.overlays}</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {OVERLAY_ORDER.map((key) => {
          const on = settings.overlays[key];
          return (
            <button
              key={key}
              onClick={() => toggleOverlay(key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 12px",
                borderRadius: 99,
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all .12s",
                border: `1px solid ${on ? acc + "80" : "var(--border-soft)"}`,
                background: on ? acc + "1a" : "transparent",
                color: on ? acc : "var(--sub)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  flex: "0 0 auto",
                  background: on ? acc : "var(--muted)",
                }}
              />
              {t.overlay[key]}
            </button>
          );
        })}
      </div>

      <div style={divider} />

      {/* Video length */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 9,
        }}
      >
        <SectionLabel>{t.sidebar.videoLength}</SectionLabel>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            color: acc,
            fontWeight: 600,
          }}
        >
          {settings.durationSec}s
        </div>
      </div>
      <input
        type="range"
        min={DURATION_MIN}
        max={DURATION_MAX}
        step={1}
        value={settings.durationSec}
        onChange={(e) => patch({ durationSec: +e.target.value })}
        style={{ width: "100%" }}
      />

      <div style={divider} />

      {/* Export format */}
      <SectionLabel>{t.sidebar.exportFormat}</SectionLabel>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => patch({ exportFormat: "mp4" })}
          style={seg(settings.exportFormat === "mp4")}
        >
          MP4
        </button>
        <button
          onClick={() => patch({ exportFormat: "png" })}
          style={seg(settings.exportFormat === "png")}
        >
          PNG
        </button>
      </div>
      <div
        style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}
      >
        {settings.exportFormat === "mp4"
          ? t.sidebar.exportHelpMp4
          : t.sidebar.exportHelpPng}
      </div>
    </aside>
  );
}
