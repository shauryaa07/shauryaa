import { useEffect, useRef } from "react";

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
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onDisconnect?: () => void;
}

export default function FloatingPiPManager({
  participants,
  isActive,
  onDeactivate,
  onToggleAudio,
  onToggleVideo,
  onDisconnect,
}: FloatingPiPManagerProps) {
  const popupWindowRef = useRef<Window | null>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Effect to open/close PIP window based on isActive state only
  useEffect(() => {
    if (!isActive) {
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
      }
      popupWindowRef.current = null;
      videoElementsRef.current.clear();
      return;
    }

    // Only create the window if it doesn't exist or is closed
    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      return; // Window already exists, don't recreate
    }

    const width = 800;
    const height = 500;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    const popup = window.open(
      '',
      'hey_buddy_pip',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,location=no,toolbar=no,menubar=no`
    );

    if (popup) {
      popupWindowRef.current = popup;
      setupSinglePiPWindow(popup);

      popup.addEventListener('beforeunload', () => {
        popupWindowRef.current = null;
        videoElementsRef.current.clear();
        onDeactivate();
      });
    }

    return () => {
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
      }
      popupWindowRef.current = null;
      videoElementsRef.current.clear();
    };
  }, [isActive, onDeactivate]);

  // Separate effect to update participants without recreating the window
  useEffect(() => {
    if (isActive && popupWindowRef.current && !popupWindowRef.current.closed) {
      updateAllParticipants();
    }
  }, [participants, isActive]);

  const setupSinglePiPWindow = (popup: Window) => {
    const doc = popup.document;
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hey Buddy - Study Together</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #020202;
              overflow: auto;
              min-height: 100vh;
              padding: 16px;
            }
            .participants-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 16px;
              width: 100%;
            }
            .participant-tile {
              background: #000;
              border-radius: 8px;
              overflow: hidden;
              position: relative;
              aspect-ratio: 16/9;
              min-height: 150px;
            }
            .video-container {
              width: 100%;
              height: 100%;
              background: #000;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            video {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .placeholder {
              text-align: center;
              color: #888;
            }
            .placeholder-icon {
              font-size: 32px;
              width: 48px;
              height: 48px;
              margin: 0 auto 8px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .placeholder-text {
              font-size: 12px;
              color: #666;
            }
            .controls {
              position: absolute;
              bottom: 8px;
              left: 50%;
              transform: translateX(-50%);
              display: flex;
              gap: 6px;
              background: rgba(0, 0, 0, 0.8);
              padding: 6px;
              border-radius: 8px;
              backdrop-filter: blur(8px);
            }
            .control-btn {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: none;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              transition: all 0.2s;
            }
            .control-btn:hover {
              transform: scale(1.1);
            }
            .control-btn.mic {
              background: #22c55e;
              color: white;
            }
            .control-btn.mic.muted {
              background: #ef4444;
            }
            .control-btn.video {
              background: #3b82f6;
              color: white;
            }
            .control-btn.video.off {
              background: #ef4444;
            }
            .control-btn.disconnect {
              background: #dc2626;
              color: white;
            }
            .username-label {
              position: absolute;
              top: 8px;
              left: 8px;
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
              backdrop-filter: blur(8px);
            }
            .muted-indicator {
              position: absolute;
              top: 8px;
              right: 8px;
              background: rgba(239, 68, 68, 0.9);
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="participants-grid" id="participantsGrid"></div>
        </body>
      </html>
    `);
    doc.close();
    
    updateAllParticipants();
  };

  const updateAllParticipants = () => {
    const popup = popupWindowRef.current;
    if (!popup || popup.closed) return;

    const doc = popup.document;
    const grid = doc.getElementById('participantsGrid');
    if (!grid) return;

    // Clear existing tiles
    grid.innerHTML = '';
    videoElementsRef.current.clear();

    // Create a tile for each participant
    participants.forEach((participant) => {
      const tile = doc.createElement('div');
      tile.className = 'participant-tile';
      tile.id = `participant-${participant.id}`;

      const videoContainer = doc.createElement('div');
      videoContainer.className = 'video-container';

      // Username label
      const usernameLabel = doc.createElement('div');
      usernameLabel.className = 'username-label';
      usernameLabel.textContent = participant.username;
      videoContainer.appendChild(usernameLabel);

      // Muted indicator for remote participants
      if (!participant.isLocal && participant.isMuted) {
        const mutedIndicator = doc.createElement('div');
        mutedIndicator.className = 'muted-indicator';
        mutedIndicator.textContent = '🔇 Muted';
        videoContainer.appendChild(mutedIndicator);
      }

      // Video or placeholder
      if (participant.isVideoOff) {
        const placeholder = doc.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.innerHTML = `
          <div class="placeholder-icon">${participant.username.charAt(0).toUpperCase()}</div>
          <div class="placeholder-text">Video Off</div>
        `;
        videoContainer.appendChild(placeholder);
      } else if (participant.stream) {
        const video = doc.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = participant.stream;
        video.muted = participant.isLocal; // Mute local video to prevent echo
        video.play().catch(err => console.warn('Autoplay blocked:', err));
        videoElementsRef.current.set(participant.id, video);
        videoContainer.appendChild(video);
      }

      // Controls (only for local participant)
      if (participant.isLocal) {
        const controls = doc.createElement('div');
        controls.className = 'controls';

        // Mic button
        const micBtn = doc.createElement('button');
        micBtn.className = `control-btn mic ${participant.isMuted ? 'muted' : ''}`;
        micBtn.textContent = participant.isMuted ? '🔇' : '🎤';
        micBtn.title = 'Toggle Microphone';
        if (onToggleAudio) {
          micBtn.addEventListener('click', () => onToggleAudio());
        }
        controls.appendChild(micBtn);

        // Video button
        const videoBtn = doc.createElement('button');
        videoBtn.className = `control-btn video ${participant.isVideoOff ? 'off' : ''}`;
        videoBtn.textContent = participant.isVideoOff ? '📹' : '🎥';
        videoBtn.title = 'Toggle Camera';
        if (onToggleVideo) {
          videoBtn.addEventListener('click', () => onToggleVideo());
        }
        controls.appendChild(videoBtn);

        // Disconnect button
        const disconnectBtn = doc.createElement('button');
        disconnectBtn.className = 'control-btn disconnect';
        disconnectBtn.textContent = '✕';
        disconnectBtn.title = 'Disconnect';
        if (onDisconnect) {
          disconnectBtn.addEventListener('click', () => onDisconnect());
        }
        controls.appendChild(disconnectBtn);

        videoContainer.appendChild(controls);
      }

      tile.appendChild(videoContainer);
      grid.appendChild(tile);
    });
  };

  return null;
}
