/**
 * useMediaDevices — wraps enumerateDevices and listens for devicechange.
 *
 * Note: device labels are empty until the user has granted a permission at
 * least once. That's a browser rule we can't work around.
 */
import { ref, onScopeDispose, onMounted } from "vue";

export interface DeviceList {
  videoInputs: ReturnType<typeof ref<MediaDeviceInfo[]>>;
  audioInputs: ReturnType<typeof ref<MediaDeviceInfo[]>>;
  audioOutputs: ReturnType<typeof ref<MediaDeviceInfo[]>>;
  refresh(): Promise<void>;
}

export function useMediaDevices(): DeviceList {
  const videoInputs = ref<MediaDeviceInfo[]>([]);
  const audioInputs = ref<MediaDeviceInfo[]>([]);
  const audioOutputs = ref<MediaDeviceInfo[]>([]);

  async function refresh(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    videoInputs.value = all.filter((d) => d.kind === "videoinput");
    audioInputs.value = all.filter((d) => d.kind === "audioinput");
    audioOutputs.value = all.filter((d) => d.kind === "audiooutput");
  }

  function onChange() {
    void refresh();
  }

  onMounted(() => {
    void refresh();
    navigator.mediaDevices?.addEventListener("devicechange", onChange);
  });

  onScopeDispose(() => {
    navigator.mediaDevices?.removeEventListener("devicechange", onChange);
  });

  return { videoInputs, audioInputs, audioOutputs, refresh };
}
