import { useState, useEffect, useRef } from "react";
import { User, Settings } from "@shared/schema";
import { AuthForm } from "@/components/auth-form";
import UnifiedLobby from "@/components/unified-lobby";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type AppState = "auth" | "lobby" | "connecting" | "connected";

export default function App() {
  const [appState, setAppState] = useState<AppState>("auth");
  const [user, setUser] = useState<User | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const isDisconnectingRef = useRef(false);

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

  const handleCreateRoom = async (
    name: string,
    password: string,
    type: "public" | "private"
  ) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/rooms", {
        name: name,
        password: password || undefined,
        type,
        createdBy: user.id,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create room");
      }

      const createdRoom = await response.json();

      toast({
        title: "Room Created",
        description: `Room "${name}" has been created successfully`,
      });

      // Join the newly created room using the actual room ID
      handleRoomJoin(createdRoom.id, password);
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create room",
        variant: "destructive",
      });
    }
  };

  const handleRoomJoin = async (roomId: string, password: string = "") => {
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
      // Join room logic will be implemented with WebRTC
      // For now, just set the state to connected
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

  const handleJoinRandom = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/rooms/public");
      if (!response.ok) {
        throw new Error("Failed to fetch public rooms");
      }

      const rooms = await response.json();
      const availableRooms = rooms.filter((room: any) => room.currentOccupancy < room.maxOccupancy);

      if (availableRooms.length === 0) {
        toast({
          title: "No Rooms Available",
          description: "There are no available public rooms. Try creating one!",
        });
        return;
      }

      const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
      handleRoomJoin(randomRoom.id, "");
    } catch (error) {
      console.error("Error joining random room:", error);
      toast({
        title: "Error",
        description: "Failed to find a random room",
        variant: "destructive",
      });
    }
  };

  // Centralized room disconnect handler - calls API to decrement occupancy and cleanup
  const handleRoomDisconnect = async () => {
    // Prevent duplicate disconnect calls
    if (isDisconnectingRef.current || !selectedRoomId) {
      return;
    }

    isDisconnectingRef.current = true;

    try {
      await apiRequest("POST", `/api/rooms/${selectedRoomId}/disconnect`, {});
      console.log(`Disconnected from room ${selectedRoomId}`);
    } catch (error) {
      console.error("Error disconnecting from room:", error);
    } finally {
      isDisconnectingRef.current = false;
    }
  };

  const handleDisconnect = async () => {
    await handleRoomDisconnect();
    
    setAppState("lobby");
    setSelectedRoomId(null);
    
    toast({
      title: "Disconnected",
      description: "You have left the room",
    });
  };

  // Handle tab close or browser crash - use sendBeacon for reliable cleanup
  useEffect(() => {
    const handlePageHide = () => {
      if (selectedRoomId && !isDisconnectingRef.current) {
        // Use sendBeacon for reliable delivery even when page is unloading
        const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
        navigator.sendBeacon(`/api/rooms/${selectedRoomId}/disconnect`, blob);
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [selectedRoomId]);

  const handleLogout = () => {
    setUser(null);
    setAppState("auth");
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
          onCreateRoom={handleCreateRoom}
          onJoinRandom={handleJoinRandom}
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

      {appState === "connected" && selectedRoomId && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">WebRTC Room</h2>
            <p className="text-muted-foreground mb-4">Room ID: {selectedRoomId}</p>
            <button 
              onClick={handleDisconnect}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md"
            >
              Leave Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
