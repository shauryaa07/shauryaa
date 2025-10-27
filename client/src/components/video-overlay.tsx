import { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import { User, Preference, Settings, PeerConnection } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Settings as SettingsIcon,
  Phone,
  Minimize2,
  Maximize2,
} from "lucide-react";
import VideoThumbnail from "./video-thumbnail";
import SettingsModal from "./settings-modal";

interface VideoOverlayProps {
  user: User;
  preferences: Preference;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onDisconnect: () => void;
  localStream: MediaStream | null;
  peers: PeerConnection[];
}

export default function VideoOverlay({
  user,
  preferences,
  settings,
  onSettingsChange,
  onDisconnect,
  localStream,
  peers,
}: VideoOverlayProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(!settings.audioEnabled);
  const [isVideoOff, setIsVideoOff] = useState(!settings.videoEnabled);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      console.log('Setting local stream:', localStream);
      console.log(`Local stream ID: ${localStream.id}, Video tracks:`, localStream.getVideoTracks());
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleDisconnect = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    onDisconnect();
  };

  return (
    <>
      <Draggable handle=".drag-handle" bounds="parent">
        <div
          className="fixed bottom-4 right-4 z-50"
          style={{ width: isCollapsed ? "64px" : "360px" }}
          data-testid="overlay-window"
        >
          <div className="bg-card dark:bg-card border border-border dark:border-border rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="drag-handle bg-muted/50 dark:bg-muted/20 px-3 py-2 flex items-center justify-between cursor-move border-b border-border dark:border-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-foreground dark:text-foreground">
                  {isCollapsed ? "" : `${peers.length + 1} Connected`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-muted dark:hover:bg-muted rounded transition-colors"
                  aria-label={isCollapsed ? "Expand" : "Collapse"}
                  data-testid="button-toggle-collapse"
                >
                  {isCollapsed ? (
                    <Maximize2 className="w-3 h-3 text-muted-foreground dark:text-muted-foreground" />
                  ) : (
                    <Minimize2 className="w-3 h-3 text-muted-foreground dark:text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            {!isCollapsed && (
              <div className="p-3">
                {/* Video Grid */}
                <div className="space-y-2 mb-3">
                  {/* Local Video */}
                  <VideoThumbnail
                    username={user.username}
                    gender={user.gender}
                    isLocal={true}
                    isMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    videoRef={videoRef}
                  />

                  {/* Peer Videos */}
                  {peers.map((peer) => (
                    <VideoThumbnail
                      key={peer.id}
                      username={peer.username}
                      gender={peer.gender}
                      isLocal={false}
                      isMuted={peer.isMuted}
                      isVideoOff={peer.isVideoOff}
                      stream={peer.stream}
                    />
                  ))}
                </div>

                {/* Control Bar */}
                <div className="flex items-center justify-center gap-2 pt-3 border-t border-border dark:border-border">
                  <Button
                    variant={isAudioMuted ? "destructive" : "secondary"}
                    size="icon"
                    onClick={toggleAudio}
                    className="w-9 h-9"
                    aria-label={isAudioMuted ? "Unmute" : "Mute"}
                    data-testid="button-toggle-audio"
                  >
                    {isAudioMuted ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant={isVideoOff ? "destructive" : "secondary"}
                    size="icon"
                    onClick={toggleVideo}
                    className="w-9 h-9"
                    aria-label={isVideoOff ? "Turn on video" : "Turn off video"}
                    data-testid="button-toggle-video"
                  >
                    {isVideoOff ? (
                      <VideoOff className="w-4 h-4" />
                    ) : (
                      <VideoIcon className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => setShowSettings(true)}
                    className="w-9 h-9"
                    aria-label="Settings"
                    data-testid="button-settings"
                  >
                    <SettingsIcon className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleDisconnect}
                    className="w-9 h-9"
                    aria-label="Disconnect"
                    data-testid="button-disconnect"
                  >
                    <Phone className="w-4 h-4 rotate-135" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Draggable>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSettingsChange={onSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Background Content */}
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl p-8 shadow-lg">
            <h1 className="text-3xl font-bold text-foreground dark:text-foreground mb-4">
              Connected & Ready!
            </h1>
            <p className="text-lg text-muted-foreground dark:text-muted-foreground mb-6">
              You're now connected with {peers.length} study partner{peers.length !== 1 ? 's' : ''}. The floating overlay on the bottom-right shows your video chat.
            </p>
            
            <div className="bg-muted/30 dark:bg-muted/10 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-foreground dark:text-foreground mb-3">
                How to use:
              </h2>
              <ul className="space-y-2 text-muted-foreground dark:text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Drag the overlay anywhere on your screen</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Minimize it when you need more space</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Mute/unmute audio or video anytime</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Open another tab with your online class and the overlay will stay on top</span>
                </li>
              </ul>
            </div>

            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground dark:text-foreground">
                <span className="font-semibold">💡 Pro Tip:</span> Open your online class (Physics Wallah, Unacademy, etc.) in a new tab, and the overlay will appear on top so you can study together!
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
