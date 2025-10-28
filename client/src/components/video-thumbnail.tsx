import { User as UserIcon, MicOff, Maximize2 } from "lucide-react";
import { RefObject, useEffect, useRef, useState, useCallback } from "react";

interface VideoThumbnailProps {
  username: string;
  isLocal: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  videoRef?: RefObject<HTMLVideoElement>;
  stream?: MediaStream;
  onResize?: (width: number, height: number) => void;
}

export default function VideoThumbnail({
  username,
  isLocal,
  isMuted,
  isVideoOff,
  videoRef,
  stream,
  onResize,
}: VideoThumbnailProps) {
  const peerVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Handle peer stream
  useEffect(() => {
    if (!isLocal && stream && peerVideoRef.current) {
      console.log(`Setting remote stream for ${username}:`, stream);
      console.log(`Stream ID: ${stream.id}, Video tracks:`, stream.getVideoTracks(), `Audio tracks:`, stream.getAudioTracks());
      peerVideoRef.current.srcObject = stream;
      
      // Set volume to maximum for clear audio
      peerVideoRef.current.volume = 1.0;
      
      // Ensure audio plays - handle autoplay policy
      peerVideoRef.current.play().then(() => {
        console.log(`Started playing audio/video for ${username} with volume: 1.0`);
      }).catch((error) => {
        console.warn(`Autoplay blocked for ${username}, attempting to play after user gesture:`, error);
        // Try to play on user interaction
        const playOnInteraction = () => {
          if (peerVideoRef.current) {
            peerVideoRef.current.volume = 1.0;
            peerVideoRef.current.play().then(() => {
              console.log(`Audio/video started after user interaction for ${username}`);
              document.removeEventListener('click', playOnInteraction);
              document.removeEventListener('touchstart', playOnInteraction);
            }).catch(console.error);
          }
        };
        document.addEventListener('click', playOnInteraction, { once: true });
        document.addEventListener('touchstart', playOnInteraction, { once: true });
      });
    }
  }, [isLocal, stream, username]);

  // Initialize size
  useEffect(() => {
    if (containerRef.current && size.width === 0) {
      const rect = containerRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }
  }, [size.width]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width || containerRef.current?.offsetWidth || 300;
    const startHeight = size.height || containerRef.current?.offsetHeight || 169;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      const newWidth = Math.max(200, Math.min(600, startWidth + deltaX));
      const newHeight = Math.max(113, Math.min(338, startHeight + deltaY));
      
      setSize({ width: newWidth, height: newHeight });
      onResize?.(newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [size, onResize]);

  const hasVideo = isLocal ? videoRef : (stream && peerVideoRef);
  const showPlaceholder = isVideoOff || !hasVideo;

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg overflow-hidden bg-muted dark:bg-muted group"
      style={{
        width: size.width > 0 ? `${size.width}px` : '100%',
        height: size.width > 0 ? `${size.height}px` : 'auto',
        aspectRatio: size.width === 0 ? '16/9' : 'auto',
      }}
      data-testid={`video-${isLocal ? "local" : username}`}
    >
      {!showPlaceholder ? (
        isLocal && videoRef ? (
          <video
            ref={videoRef}
            autoPlay
            muted={true}
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <video
            ref={peerVideoRef}
            autoPlay
            muted={false}
            playsInline
            className="w-full h-full object-cover"
            data-testid={`video-remote-${username}`}
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 dark:from-primary/10 dark:to-accent/10">
          <div className="w-12 h-12 rounded-full bg-primary/20 dark:bg-primary/10 flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-primary" />
          </div>
        </div>
      )}

      {/* Username Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent backdrop-blur-sm p-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white truncate flex items-center gap-1">
              {username}
            </span>
            
            {/* Muted Indicator */}
            {isMuted && (
              <div className="flex items-center gap-1">
                <MicOff className="w-3 h-3 text-red-400" />
              </div>
            )}
          </div>
          {/* Stream type indicator */}
          <span className="text-[10px] text-white/70">
            {isLocal ? "📹 Your Camera" : "📡 Partner's Camera"}
          </span>
        </div>
      </div>

      {/* Speaking Indicator */}
      {!isMuted && !isLocal && (
        <div className="absolute top-2 right-2">
          <div className="relative">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-pulse-ring"></div>
          </div>
        </div>
      )}

      {/* Resize Handle */}
      <div
        className={`absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity ${
          isResizing ? 'opacity-100' : ''
        }`}
        onMouseDown={handleMouseDown}
        data-testid={`resize-handle-${username}`}
      >
        <div className="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center bg-primary/80 rounded-tl-lg hover:bg-primary">
          <Maximize2 className="w-3 h-3 text-white rotate-90" />
        </div>
      </div>
    </div>
  );
}
