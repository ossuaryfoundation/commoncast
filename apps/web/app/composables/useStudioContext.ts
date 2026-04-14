/**
 * StudioContext — the single injection bundle every studio surface reads from.
 *
 * The studio page wires up engine + media + devices + peers + selection and
 * provides this context; children (StudioStage, SourcesPanel, TopToolbar,
 * StatusBar, ControlsPanel) inject it instead of each reaching for their own
 * composables. This keeps a single compositor + media instance alive and
 * makes it impossible to forget to thread a piece of state through.
 */
import { inject, provide, type InjectionKey, type Ref, type ShallowRef } from "vue";
import type { Compositor } from "@commoncast/studio-engine";
import type { UseUserMediaReturn } from "./useUserMedia";
import type { UseStudioPeersReturn } from "./useStudioPeers";
import type { UseStageSelectionReturn } from "./useStageSelection";
import type { UseStudioRecorderReturn } from "./useStudioRecorder";
import type { UseBroadcastSenderReturn } from "./useBroadcastSender";

export interface StudioDevices {
  readonly videoInputs: Ref<MediaDeviceInfo[]>;
  readonly audioInputs: Ref<MediaDeviceInfo[]>;
  refresh(): Promise<void>;
}

export interface StudioScreen {
  readonly active: Ref<boolean>;
  start(): Promise<void>;
  stop(): void;
}

export interface StudioContext {
  readonly myPid: string;
  readonly myName: string;
  readonly role: "host" | "guest";
  readonly engine: Readonly<ShallowRef<Compositor | null>>;
  readonly engineReady: Readonly<Ref<boolean>>;
  readonly media: UseUserMediaReturn;
  readonly peers: UseStudioPeersReturn;
  readonly selection: UseStageSelectionReturn;
  readonly recorder: UseStudioRecorderReturn;
  readonly sender: UseBroadcastSenderReturn;
  readonly devices: StudioDevices;
  readonly screen: StudioScreen;
  readonly audioLevel: Ref<number>;
  readonly audioPeak: Ref<number>;
  /** Stable source id for our local camera feed. */
  readonly localSourceId: string;
  /** Stable source id for our local screen capture feed. */
  readonly screenSourceId: string;
  switchCamera(deviceId: string | null): Promise<void>;
  switchMic(deviceId: string | null): Promise<void>;
  /** Assigns a source into the currently-selected slot, if any. */
  assignToSelectedSlot(sourceId: string): void;
  /** Human-ish label for a given source id (peer name, "You", etc). */
  labelForSource(sourceId: string): string;
}

const KEY: InjectionKey<StudioContext> = Symbol("commoncast:studio");

export function provideStudioContext(ctx: StudioContext): void {
  provide(KEY, ctx);
}

export function useStudioContext(): StudioContext {
  const ctx = inject(KEY);
  if (!ctx) {
    throw new Error(
      "useStudioContext: StudioContext was not provided. " +
        "Mount this component inside pages/studios/[id].vue.",
    );
  }
  return ctx;
}
