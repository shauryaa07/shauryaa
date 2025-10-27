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
  PictureInPicture2,
} from "lucide-react";
import VideoThumbnail from "./video-thumbnail";
import SettingsModal from "./settings-modal";
import { useToast } from "@/hooks/use-toast";

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
  const [isPiPActive, setIsPiPActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const popupWindowsRef = useRef<Map<string, Window>>(new Map());
  const { toast } = useToast();

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

  const toggleVideo = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const wasEnabled = videoTrack.enabled;
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        
        // If re-enabling video and track is ended, get new stream
        if (videoTrack.enabled && videoTrack.readyState === 'ended') {
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
            
            const newVideoTrack = newStream.getVideoTracks()[0];
            
            // Replace the old video track
            localStream.removeTrack(videoTrack);
            localStream.addTrack(newVideoTrack);
            
            // Update peers with new track
            peers.forEach((peer) => {
              if (peer.peer) {
                const sender = (peer.peer as any)._pc?.getSenders().find((s: RTCRtpSender) => 
                  s.track?.kind === 'video'
                );
                if (sender) {
                  sender.replaceTrack(newVideoTrack).catch(console.error);
                }
              }
            });
            
            // Update video element
            if (videoRef.current) {
              videoRef.current.srcObject = localStream;
            }
          } catch (error) {
            console.error('Error restarting video:', error);
            // Revert state to match reality
            videoTrack.enabled = wasEnabled;
            setIsVideoOff(!wasEnabled);
            toast({
              title: "Camera Error",
              description: "Could not restart camera. Please check permissions and try again.",
              variant: "destructive",
            });
          }
        }
      }
    }
  };

  const handleDisconnect = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    popupWindowsRef.current.forEach(popup => {
      if (popup && !popup.closed) popup.close();
    });
    popupWindowsRef.current.clear();
    setIsPiPActive(false);
    onDisconnect();
  };

  const createCompactPopup = (participant: { id: string; username: string; stream: MediaStream; isLocal: boolean; isMuted: boolean; isVideoOff: boolean }, index: number) => {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const popupWidth = 120;
    const popupHeight = 120;
    const bottomMargin = 40;
    const gap = 10;
    
    // Calculate position: bottom-left corner, horizontal row
    const left = 10 + (index * (popupWidth + gap));
    const top = screenHeight - popupHeight - bottomMargin;
    
    const popup = window.open(
      '',
      `pip_${participant.id}`,
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,location=no,toolbar=no,menubar=no`
    );
    
    if (!popup || popup.closed) return null;
    
    const doc = popup.document;
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${participant.username}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: system-ui, sans-serif; 
              background: #0a0a0a; 
              overflow: hidden; 
              height: 100vh; 
              display: flex; 
              flex-direction: column;
              cursor: pointer;
            }
            .video-container { 
              flex: 1; 
              background: #000; 
              position: relative; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
            }
            video { width: 100%; height: 100%; object-fit: cover; }
            .placeholder { 
              text-align: center; 
              color: #888; 
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .placeholder-icon { 
              font-size: 32px; 
              width: 50px; 
              height: 50px; 
              margin: 0 auto; 
              background: rgba(255,255,255,0.1); 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
            }
            .name-badge {
              position: absolute;
              bottom: 4px;
              left: 4px;
              right: 4px;
              background: rgba(0,0,0,0.8);
              color: white;
              padding: 3px 6px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
              text-align: center;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .mute-indicator {
              position: absolute;
              top: 4px;
              right: 4px;
              background: rgba(239,68,68,0.9);
              color: white;
              padding: 2px 4px;
              border-radius: 3px;
              font-size: 9px;
              font-weight: bold;
            }
            .expand-hint {
              position: absolute;
              top: 4px;
              left: 4px;
              background: rgba(59,130,246,0.9);
              color: white;
              padding: 2px 4px;
              border-radius: 3px;
              font-size: 8px;
              font-weight: bold;
              animation: pulse 2s infinite;
            }
            @keyframes pulse { 
              0%, 100% { opacity: 1; } 
              50% { opacity: 0.6; } 
            }
          </style>
        </head>
        <body onclick="toggleSize()">
          <div class="video-container">
            ${participant.isVideoOff ? 
              `<div class="placeholder"><div class="placeholder-icon">${participant.username.charAt(0).toUpperCase()}</div></div>` : 
              '<video id="video" autoplay playsinline></video>'}
            <div class="name-badge">${participant.username}</div>
            ${participant.isMuted ? '<div class="mute-indicator">🔇</div>' : ''}
            <div class="expand-hint">Click to expand</div>
          </div>
          <script>
            let isExpanded = false;
            function toggleSize() {
              if (isExpanded) {
                window.resizeTo(120, 120);
                isExpanded = false;
              } else {
                window.resizeTo(320, 240);
                isExpanded = true;
              }
            }
          </script>
        </body>
      </html>
    `);
    doc.close();

    if (!participant.isVideoOff && participant.stream) {
      const video = doc.getElementById('video') as HTMLVideoElement;
      if (video) {
        video.srcObject = participant.stream;
        video.muted = participant.isLocal;
        video.play().catch(() => {});
      }
    }

    popup.addEventListener('beforeunload', () => {
      popupWindowsRef.current.delete(participant.id);
      if (popupWindowsRef.current.size === 0) {
        setIsPiPActive(false);
      }
    });

    return popup;
  };

  const togglePictureInPicture = () => {
    if (isPiPActive) {
      popupWindowsRef.current.forEach(popup => {
        if (popup && !popup.closed) popup.close();
      });
      popupWindowsRef.current.clear();
      setIsPiPActive(false);
      return;
    }

    const allParticipants = [
      ...(localStream ? [{
        id: "local",
        username: `${user.username} (You)`,
        stream: localStream,
        isLocal: true,
        isMuted: isAudioMuted,
        isVideoOff: isVideoOff,
      }] : []),
      ...peers.filter(p => p.stream).map(p => ({
        id: p.id,
        username: p.username,
        stream: p.stream!,
        isLocal: false,
        isMuted: p.isMuted,
        isVideoOff: p.isVideoOff,
      })),
    ];

    let blockedCount = 0;
    allParticipants.forEach((participant, index) => {
      const popup = createCompactPopup(participant, index);
      
      if (!popup || popup.closed) {
        blockedCount++;
      } else {
        popupWindowsRef.current.set(participant.id, popup);
      }
    });

    if (blockedCount > 0) {
      popupWindowsRef.current.forEach(popup => popup.close());
      popupWindowsRef.current.clear();
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to use PiP mode.",
        variant: "destructive",
      });
    } else {
      setIsPiPActive(true);
      toast({
        title: "Compact PiP Active",
        description: `${allParticipants.length} video window${allParticipants.length !== 1 ? 's' : ''} opened at the bottom! Click any window to expand it.`,
      });
    }
  };

  return (
    <>
      {/* Hide overlay when PIP is active */}
      {!isPiPActive && (
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
                  {isCollapsed ? "" : `${peers.length} Connected`}
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
                  {/* User's own video */}
                  <VideoThumbnail
                    username={`${user.username} (You)`}
                    gender={user.gender}
                    isLocal={true}
                    isMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    videoRef={videoRef}
                    stream={localStream || undefined}
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
                    variant={isPiPActive ? "default" : "secondary"}
                    size="icon"
                    onClick={togglePictureInPicture}
                    className="w-9 h-9"
                    aria-label="Picture-in-Picture"
                    data-testid="button-pip"
                  >
                    <PictureInPicture2 className="w-4 h-4" />
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
      )}

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
              <p className="text-sm text-foreground dark:text-foreground mb-3">
                <span className="font-semibold">💡 Compact PiP Mode:</span> Click the PiP button to open small video windows at the bottom of your screen!
              </p>
              <ul className="text-sm text-muted-foreground dark:text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>All participants open as tiny windows in a horizontal row at the bottom - won't block your lecture!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Click any window to expand it when you want to see that person's face clearly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>The windows follow you across ALL browser tabs - perfect for Physics Wallah, Unacademy, or taking notes!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
