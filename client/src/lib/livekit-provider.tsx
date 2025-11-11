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
        adaptiveStream: true,
        dynacast: true,
      }}
      data-lk-theme="default"
    >
      {children}
    </LiveKitRoom>
  );
}
