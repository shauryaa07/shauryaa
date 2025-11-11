import { useState, useEffect } from "react";
import { User, Settings } from "@shared/schema";
import { AuthForm } from "@/components/auth-form";
import UnifiedLobby from "@/components/unified-lobby";
import LiveKitVideoRoom from "@/components/livekit-video-room";
import { LiveKitRoomProvider } from "@/lib/livekit-provider";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type AppState = "auth" | "lobby" | "connecting" | "connected";

interface LiveKitSession {
  token: string;
  url: string;
  roomId: string;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("auth");
  const [user, setUser] = useState<User | null>(null);
  const [livekitSession, setLivekitSession] = useState<LiveKitSession | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const { toast } = useToast();

  // Check for existing user session
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setAppState("lobby");
      } catch (error) {
        console.error("Error parsing saved user:", error);
        localStorage.removeItem("currentUser");
      }
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    localStorage.setItem("currentUser", JSON.stringify(authenticatedUser));
    setAppState("lobby");
  };

  const handleRoomJoin = async (roomId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in first",
        variant: "destructive",
      });
      return;
    }

    setAppState("connecting");
    setSelectedRoomId(roomId);

    try {
      // Request LiveKit token from server (userId/username come from session)
      const response = await apiRequest("POST", "/api/livekit/token", {
        roomId,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get access token");
      }

      setLivekitSession({
        token: data.token,
        url: data.url,
        roomId: data.roomId,
      });

      setAppState("connected");
    } catch (error) {
      console.error("Error joining room:", error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to join room",
        variant: "destructive",
      });
      setAppState("lobby");
      setSelectedRoomId(null);
    }
  };

  const handleDisconnect = () => {
    setAppState("lobby");
    setLivekitSession(null);
    setSelectedRoomId(null);
    
    toast({
      title: "Disconnected",
      description: "You have left the room",
    });
  };

  const handleLogout = () => {
    setUser(null);
    setAppState("auth");
    setLivekitSession(null);
    setSelectedRoomId(null);
    localStorage.removeItem("currentUser");
  };

  return (
    <div className="relative min-h-screen bg-background">
      {appState === "auth" && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <AuthForm onAuthSuccess={handleAuthSuccess} />
        </div>
      )}

      {appState === "lobby" && user && (
        <UnifiedLobby
          user={user}
          onJoinRoom={handleRoomJoin}
        />
      )}

      {appState === "connecting" && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Connecting to room...</p>
          </div>
        </div>
      )}

      {appState === "connected" && livekitSession && (
        <LiveKitRoomProvider
          token={livekitSession.token}
          serverUrl={livekitSession.url}
          roomName={livekitSession.roomId}
          onDisconnected={handleDisconnect}
        >
          <LiveKitVideoRoom onDisconnect={handleDisconnect} />
        </LiveKitRoomProvider>
      )}
    </div>
  );
}
