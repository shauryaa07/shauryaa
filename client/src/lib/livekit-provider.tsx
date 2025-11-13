import { ReactNode } from "react";
import { LiveKitRoom } from "@livekit/components-react";

interface LiveKitRoomProviderProps {
  token: string;
  serverUrl: string;
  roomName: string;
  onDisconnected?: () => void;
  children: ReactNode;
}

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
          dtx: true,
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
        },
      }}
      data-lk-theme="default"
    >
      {children}
    </LiveKitRoom>
  );
}
