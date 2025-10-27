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
}

export default function FloatingPiPManager({
  participants,
  isActive,
  onDeactivate,
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
        const width = 400;
        const height = 320;

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
            .header {
              background: rgba(0, 0, 0, 0.9);
              padding: 12px 16px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              flex-shrink: 0;
            }
            .username {
              color: white;
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .status {
              width: 8px;
              height: 8px;
              background: #22c55e;
              border-radius: 50%;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            .mute-indicator {
              color: #ef4444;
              font-size: 12px;
              padding: 4px 8px;
              background: rgba(239, 68, 68, 0.1);
              border-radius: 4px;
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
              font-size: 64px;
              margin-bottom: 12px;
              width: 80px;
              height: 80px;
              margin: 0 auto 12px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .placeholder-text {
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="username">
              <span class="status"></span>
              <span id="username">${participant.username}</span>
            </div>
            ${participant.isMuted ? '<div class="mute-indicator">🔇 Muted</div>' : ''}
          </div>
          <div class="video-container" id="videoContainer">
            ${participant.isVideoOff ? `
              <div class="placeholder">
                <div class="placeholder-icon">${participant.username.charAt(0).toUpperCase()}</div>
                <div class="placeholder-text">Video Off</div>
              </div>
            ` : '<video id="video" autoplay playsinline></video>'}
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
  };

  const updatePopupContent = (popup: Window, participant: ParticipantData) => {
    if (popup.closed) return;

    const doc = popup.document;
    const usernameEl = doc.getElementById('username');
    if (usernameEl) {
      usernameEl.textContent = participant.username;
    }

    const videoContainer = doc.getElementById('videoContainer');
    if (videoContainer) {
      if (participant.isVideoOff) {
        videoContainer.innerHTML = `
          <div class="placeholder">
            <div class="placeholder-icon">${participant.username.charAt(0).toUpperCase()}</div>
            <div class="placeholder-text">Video Off</div>
          </div>
        `;
      } else {
        const existingVideo = doc.getElementById('video') as HTMLVideoElement;
        if (existingVideo && existingVideo.srcObject !== participant.stream) {
          existingVideo.srcObject = participant.stream;
          existingVideo.muted = participant.isLocal;
          existingVideo.play().catch(err => console.warn('Autoplay blocked:', err));
        } else if (!existingVideo && participant.stream) {
          videoContainer.innerHTML = '<video id="video" autoplay playsinline></video>';
          const video = doc.getElementById('video') as HTMLVideoElement;
          if (video) {
            video.srcObject = participant.stream;
            video.muted = participant.isLocal;
            video.play().catch(err => console.warn('Autoplay blocked:', err));
          }
        }
      }
    }
  };

  return null;
}
