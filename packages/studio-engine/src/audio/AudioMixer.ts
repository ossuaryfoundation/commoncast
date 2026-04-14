/**
 * commoncast / studio-engine / AudioMixer
 *
 * A framework-agnostic summing WebAudio graph. Zero Vue, zero React — a
 * plain TypeScript class that owns an AudioContext and exposes:
 *
 *   addSource(id, track, opts)  — connect a MediaStreamTrack (kind="audio")
 *                                  to the mix via a per-source GainNode
 *   removeSource(id)            — disconnect and drop the node
 *   setGain / setMuted          — per-source faders
 *   setMasterGain               — global output level
 *   outputTrack()               — the MediaStreamTrack you attach to the
 *                                  composite output stream (for recording
 *                                  or broadcast). Stable identity: the
 *                                  underlying MediaStreamAudioDestinationNode
 *                                  owns exactly one audio track and we
 *                                  reuse it across source changes.
 *   destroy()                   — closes the context, disconnects everything
 *
 * Design notes:
 * - AudioContext autoplay policy: Chrome/Safari start the context in the
 *   "suspended" state. Call `ensureRunning()` after a user gesture
 *   (clicking Go Live, toggling a source, etc.) to resume. `addSource`
 *   also calls it defensively.
 * - We wrap each track in its own MediaStream because
 *   createMediaStreamSource() wants a MediaStream. Keeping that wrapper
 *   alive on the source record prevents a premature GC.
 * - The graph is: src → perSourceGain → masterGain → destinationNode.
 *   Every source gets its own gain node; mute = gain.value = 0.
 * - Completely safe to call addSource with kind !== "audio"; it silently
 *   no-ops so the caller can hand us any remote track without filtering.
 */

export interface AudioMixerSourceOptions {
  /** Initial gain. Default 1.0. */
  gain?: number;
  /** Initial muted state. Default false. */
  muted?: boolean;
}

/** Uint8Array<ArrayBuffer> — the concrete type AnalyserNode reads into. */
type ByteBuffer = Uint8Array<ArrayBuffer>;

function makeByteBuffer(size: number): ByteBuffer {
  return new Uint8Array(new ArrayBuffer(size)) as ByteBuffer;
}

interface MixerSource {
  track: MediaStreamTrack;
  /** Held to prevent GC of the single-track MediaStream the source reads. */
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  analyser: AnalyserNode;
  analyserData: ByteBuffer;
  gainValue: number;
  muted: boolean;
}

export class AudioMixer {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly destination: MediaStreamAudioDestinationNode;
  private readonly masterAnalyser: AnalyserNode;
  private readonly masterAnalyserData: ByteBuffer;
  private readonly sources = new Map<string, MixerSource>();
  private destroyed = false;

  constructor(ctx?: AudioContext) {
    this.ctx = ctx ?? new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.destination = this.ctx.createMediaStreamDestination();
    this.master.connect(this.destination);

    // Branch the master output into an analyser node that does not feed
    // the destination — so reading the meter never double-sums or taps
    // into the outgoing audio stream itself.
    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 512;
    this.masterAnalyser.smoothingTimeConstant = 0.4;
    this.master.connect(this.masterAnalyser);
    this.masterAnalyserData = makeByteBuffer(this.masterAnalyser.fftSize);
  }

  /** Resume the context if it's been suspended by the autoplay policy. */
  async ensureRunning(): Promise<void> {
    if (this.destroyed) return;
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        // no-op — caller can inspect state and retry
      }
    }
  }

  /** True if this id has an active audio graph node. */
  has(id: string): boolean {
    return this.sources.has(id);
  }

  /** Connect an audio track into the mix. Replaces any existing id. */
  addSource(
    id: string,
    track: MediaStreamTrack,
    opts: AudioMixerSourceOptions = {},
  ): void {
    if (this.destroyed) return;
    if (track.kind !== "audio") return;
    if (this.sources.has(id)) this.removeSource(id);
    // Best-effort resume — in case the caller forgot to gesture-unlock.
    void this.ensureRunning();

    const stream = new MediaStream([track]);
    const source = this.ctx.createMediaStreamSource(stream);
    const gain = this.ctx.createGain();
    const initialGain = opts.gain ?? 1;
    const muted = opts.muted ?? false;
    gain.gain.value = muted ? 0 : initialGain;
    source.connect(gain);
    gain.connect(this.master);

    // Per-source analyser branches off the post-gain node so the level
    // reflects what the user actually hears in the mix (mute → 0, gain
    // reduction → lower reading).
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    gain.connect(analyser);

    this.sources.set(id, {
      track,
      stream,
      source,
      gain,
      analyser,
      analyserData: makeByteBuffer(analyser.fftSize),
      gainValue: initialGain,
      muted,
    });
  }

  removeSource(id: string): void {
    const s = this.sources.get(id);
    if (!s) return;
    try {
      s.source.disconnect();
    } catch {
      // ignore double-disconnect
    }
    try {
      s.gain.disconnect();
    } catch {
      // ignore
    }
    try {
      s.analyser.disconnect();
    } catch {
      // ignore
    }
    this.sources.delete(id);
  }

  /** RMS 0..1 level for a specific source. Returns 0 for unknown ids. */
  getSourceLevel(id: string): number {
    const s = this.sources.get(id);
    if (!s) return 0;
    s.analyser.getByteTimeDomainData(s.analyserData);
    return computeRms(s.analyserData);
  }

  /** RMS 0..1 level for the final mix. */
  getMasterLevel(): number {
    this.masterAnalyser.getByteTimeDomainData(this.masterAnalyserData);
    return computeRms(this.masterAnalyserData);
  }

  setGain(id: string, gain: number): void {
    const s = this.sources.get(id);
    if (!s) return;
    s.gainValue = gain;
    if (!s.muted) s.gain.gain.value = gain;
  }

  setMuted(id: string, muted: boolean): void {
    const s = this.sources.get(id);
    if (!s) return;
    s.muted = muted;
    s.gain.gain.value = muted ? 0 : s.gainValue;
  }

  setMasterGain(gain: number): void {
    this.master.gain.value = gain;
  }

  /** The single audio track fed by this mixer's graph. Stable identity. */
  outputTrack(): MediaStreamTrack | null {
    return this.destination.stream.getAudioTracks()[0] ?? null;
  }

  outputStream(): MediaStream {
    return this.destination.stream;
  }

  listSources(): ReadonlyArray<{
    id: string;
    gain: number;
    muted: boolean;
  }> {
    return Array.from(this.sources.entries()).map(([id, s]) => ({
      id,
      gain: s.gainValue,
      muted: s.muted,
    }));
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const id of Array.from(this.sources.keys())) this.removeSource(id);
    try {
      this.masterAnalyser.disconnect();
    } catch {
      // ignore
    }
    try {
      this.master.disconnect();
    } catch {
      // ignore
    }
    if (this.ctx.state !== "closed") {
      void this.ctx.close().catch(() => {});
    }
  }
}

function computeRms(data: ByteBuffer): number {
  let sum = 0;
  const n = data.length;
  for (let i = 0; i < n; i++) {
    const v = (data[i]! - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / n);
}
