import { useState, useEffect, useRef } from "react";
import { User, Settings } from "@shared/schema";
import UsernameEntry from "@/components/username-entry";
import VideoOverlay from "@/components/video-overlay";
import MatchingState from "@/components/matching-state";
import UnifiedLobby from "@/components/unified-lobby";
import { useWebSocket } from "@/lib/useWebSocket";
import { useWebRTC } from "@/lib/useWebRTC-native";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AppState = "username" | "lobby" | "matching" | "connected";

export default function App() {
  const [appState, setAppState] = useState<AppState>("username");
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings>({
    videoEnabled: true,
    audioEnabled: true,
    videoQuality: "medium",
    autoHideOverlay: false,
  });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [matchedPeers, setMatchedPeers] = useState<Array<{ userId: string; username: string }>>([]);
  const [waitingMessage, setWaitingMessage] = useState<{
    message: string;
  } | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const { toast } = useToast();

  const {
    isConnected,
    roomId,
    connect,
    disconnect,
    sendSignal,
  } = useWebSocket({
    user,
    roomId: selectedRoomId,
    onMatched: (peers) => {
      console.log("Matched with peers:", peers);
      console.log("Peer details:", peers.map(p => `userId: ${p.userId}, username: ${p.username}`));
      setMatchedPeers(peers);
      setAppState("connected");
      setWaitingMessage(null);
    },
    onUserJoined: (peers) => {
      console.log("New users joined:", peers);
      setMatchedPeers(peers);
    },
    onUserLeft: (userId) => {
      console.log("User left:", userId);
      webRTC.removePeer(userId);
    },
    onSignal: (message) => {
      console.log(`Received signal from ${message.from}, type: ${message.type}`);
      console.log("Current matchedPeers:", matchedPeers.map(p => `userId: ${p.userId}, username: ${p.username}`));
      
      const peerInfo = matchedPeers.find(p => p.userId === message.from);
      const peerUsername = peerInfo?.username || message.from || "Unknown";
      
      console.log(`Found peer info: userId=${message.from}, username=${peerUsername}`);
      
      webRTC.handleSignal(message.from!, peerUsername, message.data, message.type);
    },
    onWaiting: (data) => {
      console.log("Waiting message:", data);
      setWaitingMessage(data);
    },
    onError: (message) => {
      console.error("WebSocket error:", message);
      
      if (message.toLowerCase().includes("room is full")) {
        toast({
          title: "Room Full",
          description: "This room has reached its maximum capacity of 5 users.",
          variant: "destructive",
        });
        
        // Go back to lobby
        setAppState("lobby");
        setSelectedRoomId(null);
      } else {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
  });

  const webRTC = useWebRTC({
    localStream,
    userId: user?.id || "",
    onSignal: sendSignal,
  });

  useEffect(() => {
    // Initialize media stream before matching
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: settings.videoEnabled ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          } : false,
          audio: settings.audioEnabled ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1
          } : false,
        });
        setLocalStream(stream);
        console.log("Local media stream initialized with enhanced audio settings");
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    if ((appState === "matching" || appState === "connected") && !localStream) {
      initMedia();
    }

    return () => {
      // Don't stop stream on cleanup during navigation
    };
  }, [appState, localStream, settings.videoEnabled, settings.audioEnabled]);

  const handleUsernameSubmit = (username: string) => {
    const newUser: User = {
      id: Math.random().toString(36).substring(7),
      username,
      displayName: username,
    };
    setUser(newUser);
    setAppState("lobby");
  };

  const handleJoinRandom = async () => {
    if (!user) return;
    
    try {
      // First, get a random joinable room
      const randomResponse = await apiRequest("POST", "/api/rooms/random/join");
      const randomData = await randomResponse.json();
      
      // Then, reserve a spot by calling the join endpoint
      await apiRequest("POST", `/api/rooms/${randomData.room.id}/join`, { password: "", userId: user.id });
      
      setSelectedRoomId(randomData.room.id);
      setAppState("matching");
      
      toast({
        title: "Room Found",
        description: `Joining Room ID: ${randomData.room.name}`,
      });
    } catch (error: any) {
      console.error("Error finding random room:", error);
      toast({
        title: "No Rooms Available",
        description: error.message || "No available rooms to join. Try creating one!",
        variant: "destructive",
      });
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
        },
        audio: false,
      });
      
      setScreenStream(stream);
      console.log("Screen sharing started");
      
      stream.getVideoTracks()[0].onended = () => {
        console.log("Screen sharing stopped");
        setScreenStream(null);
      };
      
      return stream;
    } catch (error) {
      console.error("Error starting screen share:", error);
      toast({
        title: "Screen Share Error",
        description: "Could not start screen sharing. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleCreateRoom = async (name: string, password: string, type: "public" | "private") => {
    if (!user) return;

    try {
      const response = await apiRequest("POST", "/api/rooms", {
        name,
        password,
        type,
        createdBy: user.id,
      });
      
      const room = await response.json();
      
      // Reserve a spot for the creator by calling join endpoint
      await apiRequest("POST", `/api/rooms/${room.id}/join`, { 
        password, 
        userId: user.id 
      });
      
      setSelectedRoomId(room.id);
      setIsRoomOwner(true);

      queryClient.invalidateQueries({ queryKey: ["/api/rooms/public"] });

      toast({
        title: "Room Created",
        description: `Your ${type} room has been created successfully! Room ID: ${room.name}`,
      });

      setAppState("matching");
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleJoinRoom = async (roomId: string, password: string) => {
    if (!user) return;
    
    try {
      await apiRequest("POST", `/api/rooms/${roomId}/join`, { password, userId: user.id });
      
      setSelectedRoomId(roomId);
      setIsRoomOwner(false);
      setAppState("matching");
    } catch (error: any) {
      console.error("Error joining room:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to join room. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    webRTC.cleanup();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    setAppState("lobby");
    setMatchedPeers([]);
    setIsRoomOwner(false);
  };

  // Auto-connect to WebSocket only after localStream is ready
  useEffect(() => {
    if (appState === "matching" && user && localStream && !isConnected) {
      console.log("LocalStream ready, connecting to WebSocket");
      connect();
    }
  }, [appState, user, localStream, isConnected, connect]);

  // Create initiator peers only after localStream is ready
  useEffect(() => {
    if (appState === "connected" && localStream && matchedPeers.length > 0 && user) {
      console.log("LocalStream ready, creating initiator peers");
      
      matchedPeers.forEach((peer) => {
        const shouldInitiate = user.id < peer.userId;
        console.log(`Processing peer: userId=${peer.userId}, username=${peer.username}`);
        console.log(`My userId: ${user.id}, Peer userId: ${peer.userId}, Should initiate: ${shouldInitiate}`);
        
        if (shouldInitiate) {
          if (!webRTC.peers.some(p => p.id === peer.userId)) {
            console.log(`Creating initiator peer with userId=${peer.userId}, username=${peer.username}`);
            webRTC.createPeer(peer.userId, peer.username, true);
          } else {
            console.log(`Peer ${peer.userId} already exists, skipping creation`);
          }
        }
      });
    }
  }, [appState, localStream, matchedPeers, user, webRTC]);

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {appState === "username" && (
        <UsernameEntry onSubmit={handleUsernameSubmit} />
      )}

      {appState === "lobby" && user && (
        <UnifiedLobby
          user={user}
          onJoinRandom={handleJoinRandom}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
        />
      )}
      
      {appState === "matching" && user && (
        <MatchingState
          user={user}
          onComplete={() => {}}
          onCancel={() => {
            disconnect();
            setWaitingMessage(null);
            setAppState("lobby");
          }}
          waitingMessage={waitingMessage || undefined}
        />
      )}
      
      {appState === "connected" && user && (
        <VideoOverlay
          user={user}
          settings={settings}
          onSettingsChange={setSettings}
          onDisconnect={handleDisconnect}
          localStream={localStream}
          screenStream={screenStream}
          isRoomOwner={isRoomOwner}
          peers={webRTC.peers}
        />
      )}
    </div>
  );
}
