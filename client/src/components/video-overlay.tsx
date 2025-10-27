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
    setIsPiPActive(false);
    onDisconnect();
  };

  const createBlankPopup = (peerId: string, index: number) => {
    const popup = window.open(
      '',
      `pip_${peerId}`,
      `width=400,height=320,left=${100 + index * 50},top=${100 + index * 50},resizable=yes,scrollbars=no,status=no,location=no,toolbar=no,menubar=no`
    );
    
    if (popup && !popup.closed) {
      const doc = popup.document;
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Loading...</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: system-ui, sans-serif; background: #0a0a0a; overflow: hidden; height: 100vh; display: flex; align-items: center; justify-content: center; }
              .loading { color: white; text-align: center; }
              .spinner { border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid white; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 12px; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="loading">
              <div class="spinner"></div>
              <p>Connecting...</p>
            </div>
          </body>
        </html>
      `);
      doc.close();
    }
    
    return popup;
  };

  const fillPopupWindow = (popup: Window, participant: { id: string; username: string; stream: MediaStream; isLocal: boolean; isMuted: boolean; isVideoOff: boolean }) => {
    const doc = popup.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${participant.username}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, sans-serif; background: #0a0a0a; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
            .header { background: rgba(0,0,0,0.9); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); }
            .username { color: white; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
            .status { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            .mute-indicator { color: #ef4444; font-size: 12px; padding: 4px 8px; background: rgba(239,68,68,0.1); border-radius: 4px; }
            .video-container { flex: 1; background: #000; position: relative; display: flex; align-items: center; justify-content: center; }
            video { width: 100%; height: 100%; object-fit: cover; }
            .placeholder { text-align: center; color: #888; }
            .placeholder-icon { font-size: 64px; width: 80px; height: 80px; margin: 0 auto 12px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="username"><span class="status"></span><span>${participant.username}</span></div>
            ${participant.isMuted ? '<div class="mute-indicator">🔇 Muted</div>' : ''}
          </div>
          <div class="video-container">
            ${participant.isVideoOff ? `<div class="placeholder"><div class="placeholder-icon">${participant.username.charAt(0).toUpperCase()}</div><div>Video Off</div></div>` : '<video id="video" autoplay playsinline></video>'}
          </div>
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
  };

  // Helper function to attach stream to an existing popup
  const attachStreamToPopup = (peerId: string, stream: MediaStream) => {
    const popup = popupWindowsRef.current.get(peerId);
    if (popup && !popup.closed) {
      const video = popup.document.getElementById('video') as HTMLVideoElement;
      if (video) {
        video.srcObject = stream;
        video.play().catch(() => {});
      }
    }
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

    // Step 1: Pre-open blank popups immediately (during user click)
    let blockedCount = 0;
    allParticipants.forEach((participant, index) => {
      const popup = createBlankPopup(participant.id, index);
      
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
      return;
    }

    // Step 2: Fill popups asynchronously when streams are ready
    setTimeout(() => {
      allParticipants.forEach((participant) => {
        const popup = popupWindowsRef.current.get(participant.id);
        if (popup && !popup.closed) {
          fillPopupWindow(popup, participant);
        }
      });
    }, 0);

    setIsPiPActive(true);
    toast({
      title: "Floating PiP Active",
      description: "Each participant has their own window that follows across tabs!",
    });
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
                <span className="font-semibold">💡 Enhanced Picture-in-Picture:</span> Click the PiP button to pop out ALL videos (including yourself) in a compact window with full controls!
              </p>
              <ul className="text-sm text-muted-foreground dark:text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>See yourself and all study partners together in one window</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Toggle camera and mic directly from the PiP window</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Works across all tabs and apps - perfect for Physics Wallah, Unacademy, or any website!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
