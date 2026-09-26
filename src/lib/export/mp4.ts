import { Muxer, ArrayBufferTarget } from "mp4-muxer";

/**
 * MP4 export via the browser-native WebCodecs H.264 encoder + mp4-muxer.
 *
 * This replaces the old ffmpeg.wasm path, which fetched a 30 MB core from a CDN
 * (fragile: any block/offline → silent WebM fallback) and, single-threaded, was
 * far too slow at 1080×1920 to be usable. WebCodecs uses the platform encoder
 * (hardware-accelerated where available), needs no wasm, no CDN and no COOP/COEP
 * headers (so MapLibre tiles keep loading). Frames are captured from the canvas
 * in real time during the flyover — same as the WebM path — so the async map
 * render is handled naturally.
 *
 * H.264 in WebCodecs is available in Chrome/Edge and desktop Safari. Where it
 * isn't (e.g. Firefox), the engine falls back to WebM (MediaRecorder).
 */

const AVC_CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42e01e"];

/** Returns a supported H.264 codec string for the given config, or null. */
export async function pickAvcCodec(
  width: number,
  height: number,
  bitrate: number,
  fps: number,
): Promise<string | null> {
  if (typeof window === "undefined" || !("VideoEncoder" in window)) return null;
  for (const codec of AVC_CODECS) {
    try {
      const s = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
      });
      if (s.supported) return codec;
    } catch {
      /* try next */
    }
  }
  return null;
}

export interface Mp4RecorderOptions {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
}

export class Mp4FrameRecorder {
  private muxer: Muxer<ArrayBufferTarget>;
  private encoder: VideoEncoder;
  private error: unknown = null;
  private lastKeySec = -1;
  // Some platforms (notably iOS Safari) don't attach `decoderConfig` to the very
  // first encoded chunk, which makes mp4-muxer dereference a null colorSpace.
  // Buffer chunks until a config arrives, then write the first with it.
  private config: VideoDecoderConfig | null = null;
  private pending: EncodedVideoChunk[] = [];
  private wroteFirst = false;

  constructor(opts: Mp4RecorderOptions) {
    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: "avc",
        width: opts.width,
        height: opts.height,
        frameRate: opts.fps,
      },
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
    });
    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        try {
          this.onChunk(chunk, meta);
        } catch (e) {
          this.error = e;
        }
      },
      error: (e) => {
        this.error = e;
      },
    });
    this.encoder.configure({
      codec: opts.codec,
      width: opts.width,
      height: opts.height,
      bitrate: opts.bitrate,
      framerate: opts.fps,
      latencyMode: "quality",
    });
  }

  private onChunk(
    chunk: EncodedVideoChunk,
    meta: EncodedVideoChunkMetadata | undefined,
  ): void {
    if (!this.config && meta?.decoderConfig) {
      const dc: VideoDecoderConfig = { ...meta.decoderConfig };
      if (!dc.colorSpace) {
        // A sane default so the muxer never reads a null colorSpace.
        dc.colorSpace = {
          primaries: "bt709",
          transfer: "bt709",
          matrix: "bt709",
          fullRange: false,
        };
      }
      this.config = dc;
    }
    if (!this.config) {
      this.pending.push(chunk); // config not here yet — hold the chunk
      return;
    }
    if (!this.wroteFirst) {
      const queue = this.pending.length ? [...this.pending, chunk] : [chunk];
      this.pending = [];
      this.muxer.addVideoChunk(queue[0], { decoderConfig: this.config });
      this.wroteFirst = true;
      for (let i = 1; i < queue.length; i++) this.muxer.addVideoChunk(queue[i]);
      return;
    }
    this.muxer.addVideoChunk(chunk);
  }

    /** Encode one frame from the canvas at the given timestamp (microseconds). */
  addFrame(source: CanvasImageSource, tsMicros: number): void {
    if (this.error) throw this.error;
    const sec = Math.floor(tsMicros / 1_000_000);
    const keyFrame = sec !== this.lastKeySec; // ~1 keyframe/sec (incl. first)
    if (keyFrame) this.lastKeySec = sec;
    const frame = new VideoFrame(source, { timestamp: tsMicros });
    this.encoder.encode(frame, { keyFrame });
    frame.close();
  }

  async finish(): Promise<Blob> {
    await this.encoder.flush();
    if (this.error) throw this.error;
    if (!this.wroteFirst) {
      // The encoder never supplied a decoder configuration — can't mux a valid
      // MP4. Let the caller fall back to the browser recorder.
      throw new Error("no decoder configuration from the video encoder");
    }
    this.muxer.finalize();
    try {
      this.encoder.close();
    } catch {
      /* already closed */
    }
    return new Blob([this.muxer.target.buffer], { type: "video/mp4" });
  }

  abort(): void {
    try {
      this.encoder.close();
    } catch {
      /* ignore */
    }
  }
}
