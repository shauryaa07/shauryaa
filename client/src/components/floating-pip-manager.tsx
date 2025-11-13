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
  const popupWindowsRef = useRef<Map<string, Window>>(new Map());

  useEffect(() => {
    if (!isActive) {
      popupWindowsRef.current.forEach((popup) => {
        if (popup && !popup.closed) {
          popup.close();
        }
      });
      popupWindowsRef.current.clear();
      return;
    }

    const openPopupWindows = () => {
      participants.forEach((participant, index) => {
        if (popupWindowsRef.current.has(participant.id)) {
          const existingWindow = popupWindowsRef.current.get(participant.id);
          if (existingWindow && !existingWindow.closed) {
            updatePopupContent(existingWindow, participant);
            return;
          }
        }

        const offsetX = 100 + (index * 50);
        const offsetY = 100 + (index * 50);
        const width = 320;
        const height = 180;

        const popup = window.open(
          '',
          `pip_${participant.id}`,
          `width=${width},height=${height},left=${offsetX},top=${offsetY},resizable=yes,scrollbars=no,status=no,location=no,toolbar=no,menubar=no`
        );

        if (popup) {
          popupWindowsRef.current.set(participant.id, popup);
          setupPopupWindow(popup, participant);

          popup.addEventListener('beforeunload', () => {
            popupWindowsRef.current.delete(participant.id);
            if (popupWindowsRef.current.size === 0) {
              onDeactivate();
            }
          });
        }
      });

      const participantIds = new Set(participants.map(p => p.id));
      popupWindowsRef.current.forEach((popup, id) => {
        if (!participantIds.has(id)) {
          if (popup && !popup.closed) {
            popup.close();
          }
          popupWindowsRef.current.delete(id);
        }
      });
    };

    openPopupWindows();

    return () => {
      popupWindowsRef.current.forEach((popup) => {
        if (popup && !popup.closed) {
          popup.close();
        }
      });
      popupWindowsRef.current.clear();
    };
  }, [isActive, participants, onDeactivate]);

  const setupPopupWindow = (popup: Window, participant: ParticipantData) => {
    const doc = popup.document;
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${participant.username}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #0a0a0a;
              overflow: hidden;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            .video-container {
              flex: 1;
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
              margin-bottom: 8px;
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
              background: rgba(0, 0, 0, 0.7);
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
              background: ${participant.isMuted ? '#ef4444' : '#22c55e'};
              color: white;
            }
            .control-btn.video {
              background: ${participant.isVideoOff ? '#ef4444' : '#3b82f6'};
              color: white;
            }
            .control-btn.disconnect {
              background: #dc2626;
              color: white;
            }
            .username-label {
              position: absolute;
              top: 8px;
              left: 8px;
              background: rgba(0, 0, 0, 0.7);
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
              backdrop-filter: blur(8px);
            }
          </style>
        </head>
        <body>
          <div class="video-container" id="videoContainer">
            ${participant.isVideoOff ? `
              <div class="placeholder">
                <div class="placeholder-icon">${participant.username.charAt(0).toUpperCase()}</div>
                <div class="placeholder-text">Video Off</div>
              </div>
            ` : '<video id="video" autoplay playsinline></video>'}
            <div class="username-label">${participant.username}</div>
            ${participant.isLocal ? `
              <div class="controls">
                <button class="control-btn mic" id="micBtn" title="Toggle Microphone">
                  ${participant.isMuted ? '🔇' : '🎤'}
                </button>
                <button class="control-btn video" id="videoBtn" title="Toggle Camera">
                  ${participant.isVideoOff ? '📹' : '🎥'}
                </button>
                <button class="control-btn disconnect" id="disconnectBtn" title="Disconnect">
                  ✕
                </button>
              </div>
            ` : ''}
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
        video.play().catch(err => console.warn('Autoplay blocked:', err));
      }
    }

    if (participant.isLocal) {
      const micBtn = doc.getElementById('micBtn');
      const videoBtn = doc.getElementById('videoBtn');
      const disconnectBtn = doc.getElementById('disconnectBtn');

      if (micBtn && onToggleAudio) {
        micBtn.addEventListener('click', () => {
          onToggleAudio();
        });
      }

      if (videoBtn && onToggleVideo) {
        videoBtn.addEventListener('click', () => {
          onToggleVideo();
        });
      }

      if (disconnectBtn && onDisconnect) {
        disconnectBtn.addEventListener('click', () => {
          onDisconnect();
        });
      }
    }
  };

  const updatePopupContent = (popup: Window, participant: ParticipantData) => {
    if (popup.closed) return;

    const doc = popup.document;
    
    // Update username label
    const usernameLabel = doc.querySelector('.username-label');
    if (usernameLabel) {
      usernameLabel.textContent = participant.username;
    }

    // Update video/placeholder without destroying controls
    const existingVideo = doc.getElementById('video') as HTMLVideoElement;
    const existingPlaceholder = doc.querySelector('.placeholder');
    const videoContainer = doc.getElementById('videoContainer');
    
    if (!videoContainer) return;

    if (participant.isVideoOff) {
      // Remove video if exists, add placeholder if not exists
      if (existingVideo) {
        existingVideo.remove();
      }
      if (!existingPlaceholder) {
        const placeholder = doc.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.innerHTML = `
          <div class="placeholder-icon">${participant.username.charAt(0).toUpperCase()}</div>
          <div class="placeholder-text">Video Off</div>
        `;
        videoContainer.insertBefore(placeholder, videoContainer.firstChild);
      }
    } else {
      // Remove placeholder if exists, add/update video
      if (existingPlaceholder) {
        existingPlaceholder.remove();
      }
      if (existingVideo && existingVideo.srcObject !== participant.stream) {
        existingVideo.srcObject = participant.stream;
        existingVideo.muted = participant.isLocal;
        existingVideo.play().catch(err => console.warn('Autoplay blocked:', err));
      } else if (!existingVideo && participant.stream) {
        const video = doc.createElement('video');
        video.id = 'video';
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = participant.stream;
        video.muted = participant.isLocal;
        videoContainer.insertBefore(video, videoContainer.firstChild);
        video.play().catch(err => console.warn('Autoplay blocked:', err));
      }
    }

    // Update control button states if local participant
    if (participant.isLocal) {
      const micBtn = doc.getElementById('micBtn');
      const videoBtn = doc.getElementById('videoBtn');
      
      if (micBtn) {
        micBtn.style.background = participant.isMuted ? '#ef4444' : '#22c55e';
        micBtn.textContent = participant.isMuted ? '🔇' : '🎤';
      }
      
      if (videoBtn) {
        videoBtn.style.background = participant.isVideoOff ? '#ef4444' : '#3b82f6';
        videoBtn.textContent = participant.isVideoOff ? '📹' : '🎥';
      }
    }
  };

  return null;
}
