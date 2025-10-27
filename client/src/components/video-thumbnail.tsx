import { User as UserIcon, MicOff } from "lucide-react";
import { RefObject, useEffect, useRef } from "react";

interface VideoThumbnailProps {
  username: string;
  gender?: "male" | "female";
  isLocal: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  videoRef?: RefObject<HTMLVideoElement>;
  stream?: MediaStream;
}

export default function VideoThumbnail({
  username,
  gender,
  isLocal,
  isMuted,
  isVideoOff,
  videoRef,
  stream,
}: VideoThumbnailProps) {
  const peerVideoRef = useRef<HTMLVideoElement>(null);

  // Handle peer stream
  useEffect(() => {
    if (!isLocal && stream && peerVideoRef.current) {
      peerVideoRef.current.srcObject = stream;
    }
  }, [isLocal, stream]);

  const hasVideo = isLocal ? videoRef : (stream && peerVideoRef);
  const showPlaceholder = isVideoOff || !hasVideo;

  return (
    <div
      className="relative aspect-video rounded-lg overflow-hidden bg-muted dark:bg-muted group"
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
            playsInline
            className="w-full h-full object-cover"
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
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white truncate flex items-center gap-1">
            {gender && <span>{gender === "male" ? "👨" : "👩"}</span>}
            {username} {isLocal && "(You)"}
          </span>
          
          {/* Muted Indicator */}
          {isMuted && (
            <div className="flex items-center gap-1">
              <MicOff className="w-3 h-3 text-red-400" />
            </div>
          )}
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
    </div>
  );
}
