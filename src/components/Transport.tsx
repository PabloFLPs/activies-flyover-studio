import type { CSSProperties } from "react";
import type { UseFlyover } from "@/hooks/useFlyover";
import { tr } from "@/lib/i18n";
import { ExportIcon, PauseIcon, PlayIcon, RestartIcon, Spinner } from "./icons";

interface Props {
  refs: UseFlyover["refs"];
  display: UseFlyover["display"];
  settings: UseFlyover["settings"];
  appliedAccent: string;
  actions: UseFlyover["actions"];
}

const bar: CSSProperties = {
  flex: "0 0 auto",
  padding: "14px 22px",
  borderTop: "1px solid var(--hairline)",
  background: "var(--app-bg)",
  display: "flex",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

export default function Transport({
  refs,
  display,
  settings,
  appliedAccent,
  actions,
}: Props) {
  // Play button follows the map-applied accent so it recolors with the map.
  const acc = appliedAccent;
  const t = tr(settings.lang);
  const canAct = display.hasData && !display.recording;

  const playBtn: CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: 14,
    border: "none",
    background: canAct ? acc : "var(--disabled)",
    color: "#06070a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: canAct ? "pointer" : "default",
    boxShadow: canAct ? `0 0 26px ${acc}59` : "none",
    opacity: canAct ? 1 : 0.6,
  };

  const ghostBtn: CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: "1px solid var(--border-soft)",
    background: "var(--ghost-bg)",
    color: "var(--ink)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: display.hasData ? "pointer" : "default",
    opacity: display.hasData ? 1 : 0.5,
  };

  const exportBtn: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    padding: "0 20px",
    height: 52,
    borderRadius: 14,
    border: "none",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 700,
    cursor: canAct ? "pointer" : "default",
    background: canAct ? "var(--export-bg)" : "var(--disabled)",
    color: canAct ? "var(--export-fg)" : "#06070a",
    opacity: canAct ? 1 : 0.6,
  };

  return (
    <div style={bar}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={actions.togglePlay}
          disabled={!canAct}
          style={playBtn}
          aria-label={display.playing ? t.transport.pause : t.transport.play}
        >
          {display.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          onClick={actions.restart}
          title={t.transport.restart}
          disabled={!display.hasData}
          style={ghostBtn}
          aria-label={t.transport.restart}
        >
          <RestartIcon />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 180,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <input
          ref={refs.scrubRef}
          type="range"
          min={0}
          max={1000}
          step={1}
          defaultValue={0}
          disabled={!display.hasData}
          onChange={(e) => actions.onSeek(+e.target.value)}
          style={{ flex: 1, minWidth: 120 }}
          aria-label={t.transport.timeline}
        />
        <span
          ref={refs.timeRef}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            color: "var(--time)",
            flex: "0 0 auto",
            minWidth: 96,
            textAlign: "right",
          }}
        >
          0:00 / 0:00
        </span>
      </div>

      <button
        onClick={() =>
          settings.exportFormat === "png"
            ? actions.exportImage()
            : actions.exportVideo()
        }
        disabled={!canAct}
        style={exportBtn}
      >
        {display.recording ? (
          <>
            <Spinner />
            {(display.exportStage || t.transport.recording) +
              " " +
              display.exportPct +
              "%"}
          </>
        ) : (
          <>
            <ExportIcon />
            {t.transport.export + " " + settings.exportFormat.toUpperCase()}
          </>
        )}
      </button>
    </div>
  );
}
