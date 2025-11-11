import { useState, useEffect, useRef } from "react";
import { User, Settings } from "@shared/schema";
import { AuthForm } from "@/components/auth-form";
import UsernameEntry from "@/components/username-entry";
import VideoOverlay from "@/components/video-overlay";
import MatchingState from "@/components/matching-state";
import UnifiedLobby from "@/components/unified-lobby";
import { useWebSocket } from "@/lib/useWebSocket";
import { useWebRTC } from "@/lib/useWebRTC";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AppState = "auth" | "username" | "lobby" | "matching" | "connected";

export default function App() {
  const [appState, setAppState] = useState<AppState>("auth");
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
    sendParticipantState,
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
      console.log(`[SIGNAL DEBUG] Received signal message:`, JSON.stringify(message, null, 2));
      console.log(`[SIGNAL DEBUG] message.from=${message.from}, message.type=${message.type}, message.username=${message.username}, message.data=`, message.data);
      
      if (!message.from) {
        console.error("[SIGNAL ERROR] message.from is undefined! Full message:", message);
        return;
      }
      
      if (!message.type) {
        console.error("[SIGNAL ERROR] message.type is undefined! Full message:", message);
        return;
      }
      
      // CRITICAL: Ignore signals from ourselves to prevent loopback connections
      if (user && message.from === user.id) {
        console.log(`[SIGNAL DEBUG] Ignoring self-signal from ${message.from}`);
        return;
      }
      
      // Use username from message if available, otherwise fallback to matchedPeers lookup
      const peerUsername = message.username || matchedPeers.find(p => p.userId === message.from)?.username || message.from;
      
      console.log(`[SIGNAL DEBUG] Calling webRTC.handleSignal with from=${message.from}, username=${peerUsername}, type=${message.type}`);
      webRTC.handleSignal(message.from, peerUsername, message.data, message.type);
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
    onParticipantStateUpdate: (update) => {
      console.log("Participant state update:", update);
      webRTC.updatePeerState?.(update.userId, update.isMuted, update.isVideoOff);
    },
  });

  const webRTC = useWebRTC({
    localStream,
    userId: user?.id || "",
    onSignal: sendSignal,
  });

  useEffect(() => {
    if (appState !== "connected" || !localStream || !user) return;

    // Only clean up peers that have left - don't create any here
    // Peer creation is handled by the useEffect below with proper initiator logic
    const currentPeerIds = new Set(matchedPeers.map(p => p.userId));
    webRTC.peers.forEach((peer) => {
      if (!currentPeerIds.has(peer.id)) {
        console.log(`Removing peer connection for left user: ${peer.id}`);
        webRTC.removePeer(peer.id);
      }
    });
  }, [matchedPeers, appState, localStream, user, webRTC]);

  useEffect(() => {
    // Check for authenticated user in localStorage
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      try {
        const parsedUser = JSON.parse(currentUser);
        setUser(parsedUser);
        setAppState("lobby");
        console.log("Loaded authenticated user from localStorage:", parsedUser);
      } catch (error) {
        console.error("Error parsing saved user:", error);
        localStorage.removeItem("currentUser");
      }
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser: { id: string; username: string; email: string }) => {
    setUser(authenticatedUser as User);
    setAppState("lobby");
  };

  useEffect(() => {
    // Initialize media stream before matching
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: settings.videoEnabled ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
            facingMode: "user"
          } : false,
          audio: settings.audioEnabled ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 48000 },
            sampleSize: { ideal: 16 },
            channelCount: { ideal: 1 }
          } : false,
        });
        setLocalStream(stream);
        console.log("Local media stream initialized with enhanced audio settings");
      } catch (error: any) {
        console.error("Error accessing media devices:", error);
        
        // Provide helpful error message based on error type
        if (error.name === 'OverconstrainedError') {
          console.warn('Audio/video constraints not supported on this device:', error.constraint);
          toast({
            title: "Media Constraints Not Supported",
            description: `Your device doesn't support the requested ${error.constraint} setting. Trying with default settings...`,
            variant: "default",
          });
          
          // Fallback to simpler constraints
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: settings.videoEnabled,
              audio: settings.audioEnabled,
            });
            setLocalStream(fallbackStream);
            console.log("Fallback media stream initialized successfully");
          } catch (fallbackError) {
            console.error("Fallback media init also failed:", fallbackError);
            toast({
              title: "Camera/Microphone Access Failed",
              description: "Please check your device permissions and try again.",
              variant: "destructive",
            });
          }
        } else if (error.name === 'NotAllowedError') {
          toast({
            title: "Permission Denied",
            description: "Please allow camera and microphone access to join the call.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Media Error",
            description: "Failed to access camera/microphone. Please check your device and try again.",
            variant: "destructive",
          });
        }
      }
    };

    if ((appState === "matching" || appState === "connected") && !localStream) {
      initMedia();
    }

    return () => {
      // Don't stop stream on cleanup during navigation
    };
  }, [appState, localStream, settings.videoEnabled, settings.audioEnabled]);

  const handleUsernameSubmit = async (username: string) => {
    try {
      const response = await apiRequest("POST", "/api/users/upsert", {
        username,
        email: `${username}@heybuddy.local`, // Generate a local email for username-only users
      });
      
      const userData = await response.json();
      
      const newUser: User = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
      };
      
      setUser(newUser);
      localStorage.setItem("currentUser", JSON.stringify(newUser));
      setAppState("lobby");
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: "Failed to create user account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleJoinRandom = async () => {
    if (!user) return;
    
    try {
      // First, get a random joinable room
      const randomResponse = await apiRequest("POST", "/api/rooms/random/join");
      const randomData = await randomResponse.json();
      
      // Check if the response indicates no rooms are available
      if (!randomData.success) {
        toast({
          title: "No Rooms Available",
          description: randomData.error || "No available rooms right now. Try creating one!",
          variant: "destructive",
        });
        return;
      }
      
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
        title: "Error",
        description: error.message || "Failed to find room. Please try again.",
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
      {appState === "auth" && (
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      )}

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
          sendParticipantState={sendParticipantState}
        />
      )}
    </div>
  );
}
