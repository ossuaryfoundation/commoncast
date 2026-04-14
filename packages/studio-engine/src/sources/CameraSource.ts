/**
 * commoncast / studio-engine / CameraSource
 *
 * Wraps a MediaStreamTrack in an HTMLVideoElement (so Pixi's Texture.from can
 * read it) and manages the play/pause lifecycle.
 *
 * Zero Vue. The Vue layer wraps this in useUserMedia + useStudioEngine.
 */

export interface CameraSourceHandle {
  readonly video: HTMLVideoElement;
  readonly track: MediaStreamTrack;
  start(): Promise<void>;
  stop(): void;
}

export function createCameraSource(track: MediaStreamTrack): CameraSourceHandle {
  if (track.kind !== "video") {
    throw new Error(`CameraSource: expected a video track, got ${track.kind}`);
  }

  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  // Match the aspect the track declares, fall back to a sensible default.
  video.width = track.getSettings().width ?? 1280;
  video.height = track.getSettings().height ?? 720;

  const stream = new MediaStream([track]);
  video.srcObject = stream;

  let started = false;

  async function start(): Promise<void> {
    if (started) return;
    started = true;
    try {
      await video.play();
    } catch (err) {
      // Autoplay can be blocked even with muted=true in rare cases. Surface the
      // error so the caller can decide what to do.
      started = false;
      throw err;
    }
  }

  function stop(): void {
    if (!started) return;
    started = false;
    video.pause();
    video.srcObject = null;
  }

  return { video, track, start, stop };
}
