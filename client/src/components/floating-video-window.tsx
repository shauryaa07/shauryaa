import { useRef, useEffect, useState } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { X, Maximize2, Minimize2, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingVideoWindowProps {
  id: string;
  username: string;
  stream: MediaStream;
  isLocal: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onSizeChange: (id: string, size: { width: number; height: number }) => void;
  onClose: (id: string) => void;
}

export default function FloatingVideoWindow({
  id,
  username,
  stream,
  isLocal,
  isMuted,
  isVideoOff,
  position,
  size,
  onPositionChange,
  onSizeChange,
  onClose,
}: FloatingVideoWindowProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((error) => {
        console.warn(`Autoplay blocked for ${username}:`, error);
      });
    }
  }, [stream, username]);

  const handleDragStop = (_e: DraggableEvent, data: DraggableData) => {
    onPositionChange(id, { x: data.x, y: data.y });
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(200, Math.min(800, resizeStart.width + deltaX));
      const newHeight = Math.max(150, Math.min(600, resizeStart.height + deltaY));
      
      onSizeChange(id, { width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeStart, id, onSizeChange]);

  return (
    <Draggable
      handle=".drag-handle-pip"
      position={position}
      onStop={handleDragStop}
      bounds="parent"
    >
      <div
        ref={containerRef}
        className="fixed bg-card dark:bg-card border-2 border-border dark:border-border rounded-lg shadow-2xl overflow-hidden transition-all"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          zIndex: 100,
        }}
        data-testid={`floating-video-${id}`}
      >
        <div className="drag-handle-pip bg-muted/90 dark:bg-muted/50 px-3 py-2 flex items-center justify-between cursor-move border-b border-border dark:border-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-medium text-foreground dark:text-foreground truncate max-w-[150px]">
              {username}
            </span>
            {isMuted && (
              <MicOff className="w-3 h-3 text-destructive" data-testid={`muted-indicator-${id}`} />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onClose(id)}
            data-testid={`close-floating-video-${id}`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative w-full h-[calc(100%-40px)] bg-black">
          {isVideoOff ? (
            <div className="w-full h-full flex items-center justify-center bg-muted dark:bg-muted">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-primary/20 dark:bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl">
                    {username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Video off
                </p>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocal}
              className="w-full h-full object-cover"
              data-testid={`video-element-${id}`}
            />
          )}

          <div
            className="absolute bottom-2 right-2 w-4 h-4 cursor-nwse-resize bg-primary/50 dark:bg-primary/50 rounded-sm hover:bg-primary dark:hover:bg-primary transition-colors"
            onMouseDown={handleResizeStart}
            data-testid={`resize-handle-${id}`}
          >
            <Maximize2 className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>
      </div>
    </Draggable>
  );
}
