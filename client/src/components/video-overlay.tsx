import { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import { User, Settings, PeerConnection } from "@shared/schema";
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
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onDisconnect: () => void;
  localStream: MediaStream | null;
  peers: PeerConnection[];
}

export default function VideoOverlay({
  user,
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
  const pipDocumentRef = useRef<Window | null>(null);
  const peerVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
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
    if (pipDocumentRef.current && !pipDocumentRef.current.closed) {
      pipDocumentRef.current.close();
    }
    setIsPiPActive(false);
    onDisconnect();
  };

  const togglePictureInPicture = async () => {
    if (isPiPActive) {
      if (pipDocumentRef.current && !pipDocumentRef.current.closed) {
        pipDocumentRef.current.close();
      }
      setIsPiPActive(false);
      return;
    }

    try {
      // Check if Document Picture-in-Picture API is available
      if (!(window as any).documentPictureInPicture) {
        toast({
          title: "PiP Not Supported",
          description: "Your browser doesn't support Picture-in-Picture mode yet. Try Chrome 116+ or Edge.",
          variant: "destructive",
        });
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
      ].slice(0, 3);

      const participantCount = allParticipants.length;
      const videoWidth = 120;
      const gap = 8;
      const padding = 12;
      const controlsWidth = 140;
      const dragHandleHeight = 20;
      const windowWidth = (participantCount * videoWidth) + ((participantCount - 1) * gap) + (padding * 2) + controlsWidth;
      const windowHeight = 110 + dragHandleHeight;

      // Create the PiP window
      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: windowWidth,
        height: windowHeight,
      });

      pipDocumentRef.current = pipWindow;
      
      // Position the window at bottom center after creation
      setTimeout(() => {
        try {
          const screenWidth = window.screen.availWidth;
          const screenHeight = window.screen.availHeight;
          const xPosition = Math.floor((screenWidth - windowWidth) / 2);
          const yPosition = Math.floor(screenHeight - windowHeight - 60);
          pipWindow.moveTo(xPosition, yPosition);
        } catch (e) {
          console.log('Could not reposition window:', e);
        }
      }, 100);

      // Write the HTML content
      pipWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                height: 100vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
              }
              .container {
                display: flex;
                gap: 10px;
                align-items: center;
                width: 100%;
                padding: 10px;
                flex: 1;
              }
              .videos {
                display: flex;
                gap: 10px;
                flex: 1;
              }
              .video-item {
                position: relative;
                width: 120px;
                height: 90px;
                border-radius: 6px;
                overflow: hidden;
                background: #000;
                border: 2px solid rgba(59, 130, 246, 0.3);
                transition: border-color 0.2s;
              }
              .video-item:hover {
                border-color: rgba(59, 130, 246, 0.6);
              }
              video {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }
              .placeholder {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #222;
              }
              .avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(59, 130, 246, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: 600;
                color: #3b82f6;
              }
              .name-badge {
                position: absolute;
                bottom: 6px;
                left: 6px;
                right: 6px;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(4px);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-align: center;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .mute-badge {
                position: absolute;
                top: 6px;
                right: 6px;
                background: rgba(239, 68, 68, 0.9);
                color: white;
                padding: 3px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
              }
              .controls {
                display: flex;
                gap: 8px;
                padding-left: 10px;
                border-left: 1px solid rgba(255, 255, 255, 0.1);
              }
              button {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: all 0.2s;
                position: relative;
              }
              .icon-wrapper {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .slash {
                position: absolute;
                width: 26px;
                height: 2px;
                background: white;
                transform: rotate(-45deg);
                border-radius: 1px;
                box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
              }
              .btn-audio, .btn-video {
                background: rgba(34, 197, 94, 0.9);
                color: white;
              }
              .btn-audio:hover, .btn-video:hover {
                background: rgba(34, 197, 94, 1);
                transform: scale(1.05);
              }
              .btn-audio.muted, .btn-video.off {
                background: rgba(239, 68, 68, 0.9);
              }
              .btn-audio.muted:hover, .btn-video.off:hover {
                background: rgba(220, 38, 38, 1);
              }
              .btn-close {
                background: rgba(239, 68, 68, 0.9);
                color: white;
              }
              .btn-close:hover {
                background: rgba(220, 38, 38, 1);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="videos" id="videos"></div>
              <div class="controls">
                <button class="btn-audio ${isAudioMuted ? 'muted' : ''}" id="btnAudio" title="${isAudioMuted ? 'Click to Unmute' : 'Click to Mute'}">
                  <div class="icon-wrapper">
                    🎤
                    ${isAudioMuted ? '<div class="slash"></div>' : ''}
                  </div>
                </button>
                <button class="btn-video ${isVideoOff ? 'off' : ''}" id="btnVideo" title="${isVideoOff ? 'Click to turn on camera' : 'Click to turn off camera'}">
                  <div class="icon-wrapper">
                    📹
                    ${isVideoOff ? '<div class="slash"></div>' : ''}
                  </div>
                </button>
                <button class="btn-close" id="btnClose" title="Close PiP">
                  ✕
                </button>
              </div>
            </div>
          </body>
        </html>
      `);
      pipWindow.document.close();

      // Add videos to the PiP window
      const videosContainer = pipWindow.document.getElementById('videos');
      allParticipants.forEach((participant) => {
        const videoItem = pipWindow.document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `
          <div class="name-badge">${participant.username}</div>
          ${participant.isMuted ? '<div class="mute-badge">🔇</div>' : ''}
        `;

        if (participant.isVideoOff) {
          const placeholder = pipWindow.document.createElement('div');
          placeholder.className = 'placeholder';
          placeholder.innerHTML = `<div class="avatar">${participant.username.charAt(0).toUpperCase()}</div>`;
          videoItem.insertBefore(placeholder, videoItem.firstChild);
        } else {
          const video = pipWindow.document.createElement('video');
          video.autoplay = true;
          video.playsInline = true;
          video.muted = participant.isLocal;
          video.srcObject = participant.stream;
          videoItem.insertBefore(video, videoItem.firstChild);
        }

        videosContainer.appendChild(videoItem);
      });

      // Track state within PiP window
      let pipAudioMuted = isAudioMuted;
      let pipVideoOff = isVideoOff;
      
      // Add event listeners for controls
      const btnAudio = pipWindow.document.getElementById('btnAudio');
      const btnVideo = pipWindow.document.getElementById('btnVideo');
      
      btnAudio.addEventListener('click', () => {
        toggleAudio();
        pipAudioMuted = !pipAudioMuted;
        
        // Update button appearance
        if (pipAudioMuted) {
          btnAudio.classList.add('muted');
          btnAudio.title = 'Click to Unmute';
          btnAudio.querySelector('.icon-wrapper').innerHTML = '🎤<div class="slash"></div>';
        } else {
          btnAudio.classList.remove('muted');
          btnAudio.title = 'Click to Mute';
          btnAudio.querySelector('.icon-wrapper').innerHTML = '🎤';
        }
      });

      btnVideo.addEventListener('click', () => {
        toggleVideo();
        pipVideoOff = !pipVideoOff;
        
        // Update button appearance
        if (pipVideoOff) {
          btnVideo.classList.add('off');
          btnVideo.title = 'Click to turn on camera';
          btnVideo.querySelector('.icon-wrapper').innerHTML = '📹<div class="slash"></div>';
        } else {
          btnVideo.classList.remove('off');
          btnVideo.title = 'Click to turn off camera';
          btnVideo.querySelector('.icon-wrapper').innerHTML = '📹';
        }
      });

      pipWindow.document.getElementById('btnClose').addEventListener('click', () => {
        pipWindow.close();
      });

      pipWindow.addEventListener('pagehide', () => {
        setIsPiPActive(false);
        pipDocumentRef.current = null;
      });

      setIsPiPActive(true);
      toast({
        title: "PiP Active!",
        description: "Floating window is active. It will follow you across all tabs!",
      });

    } catch (error) {
      console.error('PiP error:', error);
      toast({
        title: "PiP Error",
        description: "Could not open Picture-in-Picture window. Make sure you're using Chrome 116+ or Edge.",
        variant: "destructive",
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
                <span className="font-semibold">💡 Floating PiP Mode:</span> Click the PiP button to open a floating window that works across ALL tabs!
              </p>
              <ul className="text-sm text-muted-foreground dark:text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Up to 3 participants appear in a compact floating window at the bottom center of your screen</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Small size that doesn't cover much area - perfect for studying!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>The window stays on top when you switch to Physics Wallah, Unacademy, or ANY other tab!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Control your mic and camera right from the floating window</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-xs italic">Note: Requires Chrome 116+ or Edge browser</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
