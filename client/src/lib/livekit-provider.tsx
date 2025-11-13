import { ReactNode } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import type { AudioPreset } from "livekit-client";

interface LiveKitRoomProviderProps {
  token: string;
  serverUrl: string;
  roomName: string;
  onDisconnected?: () => void;
  children: ReactNode;
}

// Custom audio preset for voice - 96kbps for clear audio
const customAudioPreset: AudioPreset = {
  maxBitrate: 96_000,
};

export function LiveKitRoomProvider({
  token,
  serverUrl,
  roomName,
  onDisconnected,
  children,
}: LiveKitRoomProviderProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={true}
      onDisconnected={onDisconnected}
      options={{
        adaptiveStream: false,
        dynacast: false,
        publishDefaults: {
          simulcast: false,
          dtx: false,
          // Custom audio preset for voice - 96kbps for clear audio
          audioPreset: customAudioPreset,
          // Fixed video encoding - 180p, 20fps, 150-250kbps
          videoEncoding: {
            maxBitrate: 250_000,
            maxFramerate: 20,
          },
        },
        videoCaptureDefaults: {
          resolution: {
            width: 320,
            height: 180,
          },
          frameRate: 20,
        },
        audioCaptureDefaults: {
          autoGainControl: true,
          noiseSuppression: true,
          echoCancellation: true,
          deviceId: undefined,
        },
      }}
      data-lk-theme="default"
    >
      {children}
    </LiveKitRoom>
  );
}
