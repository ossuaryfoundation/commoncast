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

interface MixerSource {
  track: MediaStreamTrack;
  /** Held to prevent GC of the single-track MediaStream the source reads. */
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  gainValue: number;
  muted: boolean;
}

export class AudioMixer {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly destination: MediaStreamAudioDestinationNode;
  private readonly sources = new Map<string, MixerSource>();
  private destroyed = false;

  constructor(ctx?: AudioContext) {
    this.ctx = ctx ?? new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.destination = this.ctx.createMediaStreamDestination();
    this.master.connect(this.destination);
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

    this.sources.set(id, {
      track,
      stream,
      source,
      gain,
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
    this.sources.delete(id);
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
      this.master.disconnect();
    } catch {
      // ignore
    }
    if (this.ctx.state !== "closed") {
      void this.ctx.close().catch(() => {});
    }
  }
}
