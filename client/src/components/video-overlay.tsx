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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number>();
  const pipWindowRef = useRef<Window | null>(null);
  const pipContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasVideoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const pipEventHandlersRef = useRef<Map<string, { mousemove: (e: MouseEvent) => void, mouseup: (e: MouseEvent) => void }>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    if (videoRef.current && localStream) {
      console.log('Setting local stream:', localStream);
      console.log(`Local stream ID: ${localStream.id}, Video tracks:`, localStream.getVideoTracks());
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Update PiP window when state changes
  useEffect(() => {
    if (isPiPActive && pipContainerRef.current && pipWindowRef.current && !pipWindowRef.current.closed) {
      updatePiPContent();
    }
  }, [peers, isAudioMuted, isVideoOff, isPiPActive]);

  // Start canvas animation loop when PiP is activated with fallback mode
  useEffect(() => {
    if (isPiPActive && !pipWindowRef.current && canvasRef.current) {
      drawVideosToCanvas();
    }
  }, [isPiPActive]);

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
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    if (isPiPActive && pipVideoRef.current && document.pictureInPictureElement) {
      document.exitPictureInPicture();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    onDisconnect();
  };

  const updatePiPContent = () => {
    if (!pipContainerRef.current || !pipWindowRef.current || pipWindowRef.current.closed) return;

    const container = pipContainerRef.current;
    const pipWindow = pipWindowRef.current;

    // Clean up all existing event listeners
    pipEventHandlersRef.current.forEach((handlers, id) => {
      pipWindow.document.removeEventListener('mousemove', handlers.mousemove);
      pipWindow.document.removeEventListener('mouseup', handlers.mouseup);
    });
    pipEventHandlersRef.current.clear();

    // Clear existing video content but preserve participant states
    const existingVideos = Array.from(container.querySelectorAll('[data-participant-id]'));
    existingVideos.forEach(el => el.remove());

    // Add title (fixed at top)
    let title = container.querySelector('.pip-title') as HTMLDivElement;
    if (!title) {
      title = pipWindow.document.createElement('div');
      title.className = 'pip-title';
      title.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; z-index: 10000; color: white; font-size: 13px; font-weight: bold; padding: 10px; background: rgba(0,0,0,0.9); border-bottom: 1px solid #333;';
      container.appendChild(title);
    }
    title.textContent = `StudyConnect - ${peers.length + 1} Participant${peers.length > 0 ? 's' : ''}`;

    // Add user's own video
    if (localStream) {
      const userVideoBox = createPiPVideoBox(pipWindow, localStream, `${user.username} (You)`, true, isAudioMuted, isVideoOff, 'local');
      container.appendChild(userVideoBox);
    }

    // Add peer videos
    peers.forEach((peer) => {
      if (peer.stream) {
        const peerVideoBox = createPiPVideoBox(pipWindow, peer.stream, peer.username, false, peer.isMuted, peer.isVideoOff, peer.id);
        container.appendChild(peerVideoBox);
      }
    });

    // Add controls at bottom (fixed)
    let controlsContainer = container.querySelector('.pip-controls') as HTMLDivElement;
    if (!controlsContainer) {
      controlsContainer = pipWindow.document.createElement('div');
      controlsContainer.className = 'pip-controls';
      controlsContainer.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; z-index: 10000; padding: 10px; background: rgba(0,0,0,0.9); border-top: 1px solid #333; display: flex; gap: 8px; justify-content: center;';
      container.appendChild(controlsContainer);
    } else {
      controlsContainer.innerHTML = '';
    }
    
    // Get current state from MediaStream
    const currentAudioMuted = localStream ? !localStream.getAudioTracks()[0]?.enabled : true;
    const currentVideoOff = localStream ? !localStream.getVideoTracks()[0]?.enabled : true;
    
    const toggleAudioBtn = createPiPButton(pipWindow, currentAudioMuted ? '🎤 Unmute' : '🔇 Mute', () => {
      toggleAudio();
      // Update will happen via useEffect
    });
    
    const toggleVideoBtn = createPiPButton(pipWindow, currentVideoOff ? '📹 Camera On' : '📵 Camera Off', () => {
      toggleVideo();
      // Update will happen via useEffect
    });

    controlsContainer.appendChild(toggleAudioBtn);
    controlsContainer.appendChild(toggleVideoBtn);
  };

  const drawVideosToCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Include user's own video + all peers
    const allVideos = [
      { stream: localStream, username: `${user.username} (You)`, gender: user.gender, isLocal: true, id: 'local' },
      ...peers.map(p => ({ stream: p.stream, username: p.username, gender: p.gender, isLocal: false, id: p.id }))
    ];

    // Set canvas size
    const videoCount = allVideos.filter(v => v.stream).length;
    const cols = Math.ceil(Math.sqrt(videoCount));
    const rows = Math.ceil(videoCount / cols);
    
    canvas.width = 640;
    canvas.height = (640 / cols) * rows;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const videoWidth = canvas.width / cols;
    const videoHeight = canvas.height / rows;

    // Track current stream IDs
    const currentStreamIds = new Set(allVideos.filter(v => v.stream).map(v => v.id));
    
    // Clean up video elements for removed streams
    Array.from(canvasVideoElementsRef.current.entries()).forEach(([id, element]) => {
      if (!currentStreamIds.has(id)) {
        element.srcObject = null;
        canvasVideoElementsRef.current.delete(id);
      }
    });

    // Draw each video
    let videoIndex = 0;
    allVideos.forEach((videoData) => {
      if (!videoData.stream) return;
      
      // Get or create persistent video element
      let videoElement = canvasVideoElementsRef.current.get(videoData.id);
      if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.srcObject = videoData.stream;
        videoElement.play().catch(() => {});
        canvasVideoElementsRef.current.set(videoData.id, videoElement);
      }

      const col = videoIndex % cols;
      const row = Math.floor(videoIndex / cols);
      const x = col * videoWidth;
      const y = row * videoHeight;

      try {
        if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
          ctx.drawImage(videoElement, x, y, videoWidth, videoHeight);
        } else {
          // Show placeholder while video loads
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(x, y, videoWidth, videoHeight);
        }
        
        // Draw username label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y + videoHeight - 30, videoWidth, 30);
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        const displayName = videoData.isLocal ? '👤 You' : `${videoData.gender === 'male' ? '👨' : '👩'} ${videoData.username}`;
        ctx.fillText(displayName, x + 10, y + videoHeight - 10);
      } catch (err) {
        // Video not ready yet, show placeholder
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x, y, videoWidth, videoHeight);
      }
      videoIndex++;
    });

    if (isPiPActive) {
      animationFrameRef.current = requestAnimationFrame(drawVideosToCanvas);
    }
  };

  const togglePictureInPicture = async () => {
    try {
      // Check if already in PiP, exit if so
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
        pipContainerRef.current = null;
        setIsPiPActive(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        return;
      }

      // Check for Document Picture-in-Picture API
      if ('documentPictureInPicture' in window) {
        // Use Document PiP for advanced controls with more space for dragging
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 650,
          height: 600,
        });

        pipWindowRef.current = pipWindow;
        setIsPiPActive(true);

        // Copy styles to PiP window
        const styleSheets = Array.from(document.styleSheets);
        styleSheets.forEach((sheet) => {
          try {
            const css = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
            const style = pipWindow.document.createElement('style');
            style.textContent = css;
            pipWindow.document.head.appendChild(style);
          } catch (e) {
            // External stylesheets might throw CORS errors
            const link = pipWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = (sheet as any).href;
            pipWindow.document.head.appendChild(link);
          }
        });

        // Create container
        const container = pipWindow.document.createElement('div');
        container.style.cssText = 'width: 100%; height: 100%; background: #0a0a0a; position: relative; overflow: hidden;';
        pipWindow.document.body.appendChild(container);
        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.background = '#0a0a0a';
        pipWindow.document.body.style.overflow = 'hidden';

        // Store container reference for updates
        pipContainerRef.current = container;

        // Populate initial content
        updatePiPContent();

        // Handle window close
        pipWindow.addEventListener('pagehide', () => {
          // Clean up event listeners
          pipEventHandlersRef.current.forEach((handlers) => {
            pipWindow.document.removeEventListener('mousemove', handlers.mousemove);
            pipWindow.document.removeEventListener('mouseup', handlers.mouseup);
          });
          pipEventHandlersRef.current.clear();
          
          pipWindowRef.current = null;
          pipContainerRef.current = null;
          setIsPiPActive(false);
        });

        toast({
          title: "Picture-in-Picture Active",
          description: "All participants visible with full controls!",
        });
      } else {
        // Fallback to standard PiP with canvas
        const canvas = canvasRef.current;
        const videoElement = pipVideoRef.current;
        
        if (!canvas || !videoElement) return;

        // Draw initial frame
        drawVideosToCanvas();
        
        // Create stream from canvas
        const stream = canvas.captureStream(30);
        videoElement.srcObject = stream;
        await videoElement.play();
        await videoElement.requestPictureInPicture();
        setIsPiPActive(true);

        // Continue updating canvas
        drawVideosToCanvas();

        videoElement.addEventListener('leavepictureinpicture', () => {
          setIsPiPActive(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        }, { once: true });

        toast({
          title: "Picture-in-Picture Active",
          description: "All participants visible across all tabs!",
        });
      }
    } catch (error) {
      console.error('PiP error:', error);
      toast({
        title: "PiP Failed",
        description: "Could not activate Picture-in-Picture mode",
        variant: "destructive",
      });
    }
  };

  // Helper function to create video box in PiP window
  const createPiPVideoBox = (pipWindow: Window, stream: MediaStream, username: string, isLocal: boolean, isMuted: boolean, isVideoOff: boolean, id: string) => {
    const box = pipWindow.document.createElement('div');
    box.style.cssText = 'background: #1a1a1a; border-radius: 8px; padding: 8px; position: absolute; cursor: move; min-width: 150px; min-height: 100px; border: 2px solid transparent; transition: border-color 0.2s;';
    box.setAttribute('data-participant-id', id);

    // Default position and size (will be overridden if saved in state)
    const savedState = (pipWindow as any).participantStates?.[id];
    const left = savedState?.left ?? 10 + (Object.keys((pipWindow as any).participantStates || {}).length * 20);
    const top = savedState?.top ?? 60 + (Object.keys((pipWindow as any).participantStates || {}).length * 20);
    const width = savedState?.width ?? 250;
    const height = savedState?.height ?? 180;

    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;

    // Store state
    if (!(pipWindow as any).participantStates) {
      (pipWindow as any).participantStates = {};
    }
    (pipWindow as any).participantStates[id] = { left, top, width, height };

    const videoElement = pipWindow.document.createElement('video');
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    videoElement.muted = isLocal;
    videoElement.playsInline = true;
    videoElement.style.cssText = 'width: 100%; height: calc(100% - 32px); object-fit: cover; border-radius: 4px; background: #000; pointer-events: none;';
    box.appendChild(videoElement);

    const label = pipWindow.document.createElement('div');
    label.style.cssText = 'position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; pointer-events: none;';
    label.textContent = username;
    box.appendChild(label);

    if (isMuted) {
      const muteIndicator = pipWindow.document.createElement('div');
      muteIndicator.style.cssText = 'position: absolute; top: 8px; right: 8px; background: rgba(220,38,38,0.9); color: white; padding: 3px 6px; border-radius: 4px; font-size: 10px; pointer-events: none;';
      muteIndicator.textContent = '🔇';
      box.appendChild(muteIndicator);
    }

    if (isVideoOff) {
      const videoOffIndicator = pipWindow.document.createElement('div');
      videoOffIndicator.style.cssText = 'position: absolute; top: 32px; right: 8px; background: rgba(220,38,38,0.9); color: white; padding: 3px 6px; border-radius: 4px; font-size: 10px; pointer-events: none;';
      videoOffIndicator.textContent = '📵';
      box.appendChild(videoOffIndicator);
    }

    // Resize handle
    const resizeHandle = pipWindow.document.createElement('div');
    resizeHandle.style.cssText = 'position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 0%, transparent 50%, #3b82f6 50%, #3b82f6 100%); border-bottom-right-radius: 6px;';
    box.appendChild(resizeHandle);

    // Make draggable and resizable using a shared state object
    const dragState = {
      isDragging: false,
      isResizing: false,
      dragStartX: 0,
      dragStartY: 0,
      boxStartLeft: 0,
      boxStartTop: 0,
      boxStartWidth: 0,
      boxStartHeight: 0
    };

    box.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement) === resizeHandle) return; // Don't drag when resizing
      
      dragState.isDragging = true;
      dragState.dragStartX = e.clientX;
      dragState.dragStartY = e.clientY;
      dragState.boxStartLeft = parseInt(box.style.left);
      dragState.boxStartTop = parseInt(box.style.top);
      box.style.borderColor = '#3b82f6';
      box.style.zIndex = '1000';
      e.preventDefault();
    });

    resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
      dragState.isResizing = true;
      dragState.dragStartX = e.clientX;
      dragState.dragStartY = e.clientY;
      dragState.boxStartWidth = parseInt(box.style.width);
      dragState.boxStartHeight = parseInt(box.style.height);
      box.style.borderColor = '#3b82f6';
      box.style.zIndex = '1000';
      e.preventDefault();
      e.stopPropagation();
    });

    // Create named handlers for cleanup
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        const deltaX = e.clientX - dragState.dragStartX;
        const deltaY = e.clientY - dragState.dragStartY;
        const newLeft = Math.max(0, Math.min(pipWindow.innerWidth - parseInt(box.style.width), dragState.boxStartLeft + deltaX));
        const newTop = Math.max(0, Math.min(pipWindow.innerHeight - parseInt(box.style.height), dragState.boxStartTop + deltaY));
        
        box.style.left = `${newLeft}px`;
        box.style.top = `${newTop}px`;
        (pipWindow as any).participantStates[id].left = newLeft;
        (pipWindow as any).participantStates[id].top = newTop;
      } else if (dragState.isResizing) {
        const deltaX = e.clientX - dragState.dragStartX;
        const deltaY = e.clientY - dragState.dragStartY;
        const newWidth = Math.max(150, Math.min(pipWindow.innerWidth - parseInt(box.style.left), dragState.boxStartWidth + deltaX));
        const newHeight = Math.max(100, Math.min(pipWindow.innerHeight - parseInt(box.style.top), dragState.boxStartHeight + deltaY));
        
        box.style.width = `${newWidth}px`;
        box.style.height = `${newHeight}px`;
        (pipWindow as any).participantStates[id].width = newWidth;
        (pipWindow as any).participantStates[id].height = newHeight;
      }
    };

    const handleMouseUp = () => {
      if (dragState.isDragging || dragState.isResizing) {
        dragState.isDragging = false;
        dragState.isResizing = false;
        box.style.borderColor = 'transparent';
        box.style.zIndex = '1';
      }
    };

    pipWindow.document.addEventListener('mousemove', handleMouseMove);
    pipWindow.document.addEventListener('mouseup', handleMouseUp);

    // Store handlers for cleanup
    pipEventHandlersRef.current.set(id, { mousemove: handleMouseMove, mouseup: handleMouseUp });

    return box;
  };

  // Helper function to create button in PiP window
  const createPiPButton = (pipWindow: Window, text: string, onClick: () => void) => {
    const button = pipWindow.document.createElement('button');
    button.textContent = text;
    button.style.cssText = 'background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 16px;';
    button.onmouseover = () => { button.style.background = '#2563eb'; };
    button.onmouseout = () => { button.style.background = '#3b82f6'; };
    button.onclick = onClick;
    return button;
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

      {/* Hidden elements for Picture-in-Picture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <video ref={pipVideoRef} style={{ display: 'none' }} muted playsInline />
    </>
  );
}
