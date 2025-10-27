import { useState, useEffect } from "react";
import FloatingVideoWindow from "./floating-video-window";

interface VideoWindowState {
  visible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface ParticipantData {
  id: string;
  username: string;
  stream: MediaStream;
  isLocal: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface FloatingPiPManagerProps {
  participants: ParticipantData[];
  isActive: boolean;
  onDeactivate: () => void;
}

const STORAGE_KEY = "studyconnect_pip_windows";
const DEFAULT_WINDOW_SIZE = { width: 320, height: 240 };
const WINDOW_OFFSET = 40;

export default function FloatingPiPManager({
  participants,
  isActive,
  onDeactivate,
}: FloatingPiPManagerProps) {
  const [windowStates, setWindowStates] = useState<Record<string, VideoWindowState>>({});

  useEffect(() => {
    if (!isActive) return;

    const savedStates = sessionStorage.getItem(STORAGE_KEY);
    const initialStates: Record<string, VideoWindowState> = savedStates
      ? JSON.parse(savedStates)
      : {};

    const newStates: Record<string, VideoWindowState> = {};

    participants.forEach((participant, index) => {
      if (initialStates[participant.id]) {
        newStates[participant.id] = initialStates[participant.id];
      } else {
        const baseX = 100 + (index * WINDOW_OFFSET);
        const baseY = 100 + (index * WINDOW_OFFSET);
        
        newStates[participant.id] = {
          visible: true,
          position: { 
            x: Math.min(baseX, window.innerWidth - DEFAULT_WINDOW_SIZE.width - 50), 
            y: Math.min(baseY, window.innerHeight - DEFAULT_WINDOW_SIZE.height - 50) 
          },
          size: { ...DEFAULT_WINDOW_SIZE },
        };
      }
    });

    setWindowStates(newStates);
  }, [isActive, participants]);

  useEffect(() => {
    if (Object.keys(windowStates).length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(windowStates));
    }
  }, [windowStates]);

  const handlePositionChange = (id: string, position: { x: number; y: number }) => {
    setWindowStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        position,
      },
    }));
  };

  const handleSizeChange = (id: string, size: { width: number; height: number }) => {
    setWindowStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        size,
      },
    }));
  };

  const handleClose = (id: string) => {
    setWindowStates((prev) => {
      const newStates = { ...prev };
      delete newStates[id];
      return newStates;
    });

    if (Object.keys(windowStates).length <= 1) {
      onDeactivate();
    }
  };

  if (!isActive) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none" 
      style={{ zIndex: 50 }}
      data-testid="floating-pip-layer"
    >
      <div className="relative w-full h-full pointer-events-auto">
        {participants.map((participant) => {
          const state = windowStates[participant.id];
          if (!state?.visible) return null;

          return (
            <FloatingVideoWindow
              key={participant.id}
              id={participant.id}
              username={participant.username}
              stream={participant.stream}
              isLocal={participant.isLocal}
              isMuted={participant.isMuted}
              isVideoOff={participant.isVideoOff}
              position={state.position}
              size={state.size}
              onPositionChange={handlePositionChange}
              onSizeChange={handleSizeChange}
              onClose={handleClose}
            />
          );
        })}
      </div>
    </div>
  );
}
