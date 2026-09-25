import type { CSSProperties } from "react";
import type { UseFlyover } from "@/hooks/useFlyover";
import { STAGE_W, STAGE_H } from "@/lib/constants";

const stageArea: CSSProperties = {
  flex: 1,
  position: "relative",
  overflow: "hidden",
  minHeight: 0,
};

const stageWrap: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  width: STAGE_W,
  height: STAGE_H,
  transform: "translate(-50%,-50%) scale(0.3)",
  transformOrigin: "center center",
  borderRadius: 20,
  overflow: "hidden",
  boxShadow: "var(--stage-shadow)",
};

export default function Stage({ refs }: { refs: UseFlyover["refs"] }) {
  return (
    <div ref={refs.stageAreaRef} style={stageArea}>
      <div ref={refs.stageWrapRef} style={stageWrap}>
        <div
          ref={refs.mapRef}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        />
        <canvas
          ref={refs.canvasRef}
          width={STAGE_W}
          height={STAGE_H}
          style={{ position: "absolute", inset: 0, width: STAGE_W, height: STAGE_H }}
        />
      </div>
    </div>
  );
}
