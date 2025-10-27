import { useState, useEffect, useRef } from "react";
import { User, Preference, Settings } from "@shared/schema";
import UsernameEntry from "@/components/username-entry";
import PreferenceSelection from "@/components/preference-selection";
import VideoOverlay from "@/components/video-overlay";
import MatchingState from "@/components/matching-state";
import { useWebSocket } from "@/lib/useWebSocket";
import { useWebRTC } from "@/lib/useWebRTC-native";

type AppState = "username" | "preferences" | "matching" | "connected";

export default function App() {
  const [appState, setAppState] = useState<AppState>("username");
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<Preference | null>(null);
  const [settings, setSettings] = useState<Settings>({
    videoEnabled: true,
    audioEnabled: true,
    videoQuality: "medium",
    autoHideOverlay: false,
  });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [matchedPeers, setMatchedPeers] = useState<Array<{ userId: string; username: string; gender?: "male" | "female" }>>([]);
  const [waitingMessage, setWaitingMessage] = useState<{
    message: string;
    suggestion?: "male" | "female" | null;
    availability?: {
      males: number;
      females: number;
      any: number;
    };
  } | null>(null);

  const {
    isConnected,
    roomId,
    connect,
    disconnect,
    sendSignal,
  } = useWebSocket({
    user,
    preferences,
    onMatched: (peers) => {
      console.log("Matched with peers:", peers);
      setMatchedPeers(peers);
      setAppState("connected");
      setWaitingMessage(null);
      // Don't create peers here - wait for localStream to be ready
      // This will be handled in the useEffect below
    },
    onUserLeft: (userId) => {
      console.log("User left:", userId);
      webRTC.removePeer(userId);
    },
    onSignal: (message) => {
      // Handle WebRTC signaling messages
      // Find peer info from matchedPeers
      const peerInfo = matchedPeers.find(p => p.userId === message.from);
      const peerUsername = peerInfo?.username || message.from || "Unknown";
      const peerGender = peerInfo?.gender;
      
      webRTC.handleSignal(message.from!, peerUsername, message.data, message.type, peerGender);
    },
    onWaiting: (data) => {
      console.log("Waiting message:", data);
      setWaitingMessage(data);
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
          video: settings.videoEnabled,
          audio: settings.audioEnabled,
        });
        setLocalStream(stream);
        console.log("Local media stream initialized");
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

  const handleUsernameSubmit = (username: string, gender: "male" | "female") => {
    const newUser: User = {
      id: Math.random().toString(36).substring(7),
      username,
      displayName: username,
      gender,
    };
    setUser(newUser);
    setAppState("preferences");
  };

  const handlePreferencesSubmit = (prefs: Preference) => {
    setPreferences(prefs);
    setWaitingMessage(null);
    setAppState("matching");
  };

  const handleChangePreference = (newPreference: "any" | "male" | "female") => {
    console.log("Changing preference to:", newPreference);
    const newPrefs: Preference = {
      partnerType: newPreference,
    };
    setPreferences(newPrefs);
    setWaitingMessage(null);
    
    // Disconnect and reconnect with new preferences
    disconnect();
    
    // Wait a bit then reconnect
    setTimeout(() => {
      setAppState("matching");
    }, 500);
  };

  const handleDisconnect = () => {
    disconnect();
    webRTC.cleanup();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setAppState("preferences");
    setPreferences(null);
    setMatchedPeers([]);
  };

  // Auto-connect to WebSocket only after localStream is ready
  useEffect(() => {
    if (appState === "matching" && user && preferences && localStream && !isConnected) {
      console.log("LocalStream ready, connecting to WebSocket");
      connect();
    }
  }, [appState, user, preferences, localStream, isConnected, connect]);

  // Create initiator peers only after localStream is ready
  useEffect(() => {
    if (appState === "connected" && localStream && matchedPeers.length > 0 && user) {
      console.log("LocalStream ready, creating initiator peers");
      
      matchedPeers.forEach((peer) => {
        const shouldInitiate = user.id < peer.userId;
        console.log(`Creating peer with ${peer.username}, initiator: ${shouldInitiate}`);
        
        if (shouldInitiate) {
          // Only create if we don't already have this peer
          if (!webRTC.peers.some(p => p.id === peer.userId)) {
            webRTC.createPeer(peer.userId, peer.username, true, peer.gender);
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
      
      {appState === "preferences" && user && (
        <PreferenceSelection
          user={user}
          onSubmit={handlePreferencesSubmit}
          onBack={() => setAppState("username")}
        />
      )}
      
      {appState === "matching" && user && preferences && (
        <MatchingState
          user={user}
          preferences={preferences}
          onComplete={() => {}} // Handled by WebSocket onMatched
          onCancel={() => {
            disconnect();
            setWaitingMessage(null);
            setAppState("preferences");
          }}
          waitingMessage={waitingMessage || undefined}
          onChangePreference={handleChangePreference}
        />
      )}
      
      {appState === "connected" && user && preferences && (
        <VideoOverlay
          user={user}
          preferences={preferences}
          settings={settings}
          onSettingsChange={setSettings}
          onDisconnect={handleDisconnect}
          localStream={localStream}
          peers={webRTC.peers}
        />
      )}
    </div>
  );
}
