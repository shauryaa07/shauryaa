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

const STORAGE_KEY = "studyconnect_pip_windows";

export default function FloatingPiPManager({
  participants,
  isActive,
  onDeactivate,
}: FloatingPiPManagerProps) {
  const pipWindowRef = useRef<Window | null>(null);
  const pipContainerRef = useRef<HTMLDivElement | null>(null);
  const pipEventHandlersRef = useRef<Map<string, { mousemove: (e: MouseEvent) => void; mouseup: (e: MouseEvent) => void }>>(new Map());

  useEffect(() => {
    if (!isActive) {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
        pipContainerRef.current = null;
      }
      return;
    }

    const openDocumentPiP = async () => {
      try {
        if ('documentPictureInPicture' in window) {
          const totalVideos = participants.length;
          const cols = Math.min(3, Math.ceil(Math.sqrt(totalVideos)));
          const rows = Math.ceil(totalVideos / cols);
          
          const videoWidth = 320;
          const videoHeight = 240;
          const margin = 20;
          
          const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
            width: margin + cols * (videoWidth + margin * 2),
            height: margin + rows * (videoHeight + margin * 2),
          });

          pipWindowRef.current = pipWindow;

          const styleSheets = Array.from(document.styleSheets);
          styleSheets.forEach((sheet) => {
            try {
              const css = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
              const style = pipWindow.document.createElement('style');
              style.textContent = css;
              pipWindow.document.head.appendChild(style);
            } catch (e) {
              const link = pipWindow.document.createElement('link');
              link.rel = 'stylesheet';
              link.href = (sheet as any).href;
              pipWindow.document.head.appendChild(link);
            }
          });

          const container = pipWindow.document.createElement('div');
          container.style.cssText = 'width: 100%; height: 100%; background: #0a0a0a; position: relative; overflow: visible;';
          pipWindow.document.body.appendChild(container);
          pipWindow.document.body.style.margin = '0';
          pipWindow.document.body.style.background = '#0a0a0a';
          pipWindow.document.body.style.overflow = 'visible';

          pipContainerRef.current = container;

          updatePiPContent();

          pipWindow.addEventListener('pagehide', () => {
            pipEventHandlersRef.current.forEach((handlers) => {
              pipWindow.document.removeEventListener('mousemove', handlers.mousemove);
              pipWindow.document.removeEventListener('mouseup', handlers.mouseup);
            });
            pipEventHandlersRef.current.clear();
            
            pipWindowRef.current = null;
            pipContainerRef.current = null;
            onDeactivate();
          });
        }
      } catch (error) {
        console.error('Failed to open Document PiP:', error);
        onDeactivate();
      }
    };

    openDocumentPiP();

    return () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
    };
  }, [isActive, onDeactivate]);

  useEffect(() => {
    if (isActive && pipContainerRef.current && pipWindowRef.current && !pipWindowRef.current.closed) {
      updatePiPContent();
    }
  }, [participants, isActive]);

  const updatePiPContent = () => {
    if (!pipContainerRef.current || !pipWindowRef.current || pipWindowRef.current.closed) return;

    const container = pipContainerRef.current;
    const pipWindow = pipWindowRef.current;

    pipEventHandlersRef.current.forEach((handlers, id) => {
      pipWindow.document.removeEventListener('mousemove', handlers.mousemove);
      pipWindow.document.removeEventListener('mouseup', handlers.mouseup);
    });
    pipEventHandlersRef.current.clear();

    const existingVideos = Array.from(container.querySelectorAll('[data-participant-id]'));
    existingVideos.forEach(el => el.remove());

    const savedStates = sessionStorage.getItem(STORAGE_KEY);
    const participantStates = savedStates ? JSON.parse(savedStates) : {};

    participants.forEach((participant, index) => {
      const videoBox = createPiPVideoBox(
        pipWindow,
        participant.stream,
        participant.username,
        participant.isLocal,
        participant.isMuted,
        participant.isVideoOff,
        participant.id,
        index,
        participants.length,
        participantStates
      );
      container.appendChild(videoBox);
    });
  };

  const createPiPVideoBox = (
    pipWindow: Window,
    stream: MediaStream,
    username: string,
    isLocal: boolean,
    isMuted: boolean,
    isVideoOff: boolean,
    id: string,
    videoIndex: number,
    totalVideos: number,
    savedStates: any
  ) => {
    const box = pipWindow.document.createElement('div');
    box.style.cssText = 'background: #1a1a1a; border-radius: 12px; padding: 0; position: absolute; cursor: move; min-width: 200px; min-height: 150px; border: 2px solid transparent; transition: border-color 0.2s; box-shadow: 0 8px 24px rgba(0,0,0,0.5); overflow: hidden;';
    box.setAttribute('data-participant-id', id);

    const cols = Math.min(3, Math.ceil(Math.sqrt(totalVideos)));
    const col = videoIndex % cols;
    const row = Math.floor(videoIndex / cols);
    
    const defaultWidth = 320;
    const defaultHeight = 240;
    const margin = 20;
    
    const savedState = savedStates[id];
    const left = savedState?.left ?? margin + col * (defaultWidth + margin * 2);
    const top = savedState?.top ?? margin + row * (defaultHeight + margin * 2);
    const width = savedState?.width ?? defaultWidth;
    const height = savedState?.height ?? defaultHeight;

    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;

    const header = pipWindow.document.createElement('div');
    header.style.cssText = 'background: rgba(0,0,0,0.8); padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; cursor: move; border-bottom: 1px solid rgba(255,255,255,0.1);';
    
    const usernameLabel = pipWindow.document.createElement('span');
    usernameLabel.style.cssText = 'color: white; font-size: 12px; font-weight: 500; font-family: system-ui, -apple-system, sans-serif;';
    usernameLabel.textContent = username;
    header.appendChild(usernameLabel);

    if (isMuted) {
      const muteIcon = pipWindow.document.createElement('span');
      muteIcon.style.cssText = 'color: #ef4444; font-size: 11px; margin-left: 8px;';
      muteIcon.textContent = '🔇 Muted';
      header.appendChild(muteIcon);
    }

    box.appendChild(header);

    const videoContainer = pipWindow.document.createElement('div');
    videoContainer.style.cssText = 'width: 100%; height: calc(100% - 36px); background: #000; position: relative;';

    if (isVideoOff) {
      const placeholder = pipWindow.document.createElement('div');
      placeholder.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #1a1a1a;';
      const icon = pipWindow.document.createElement('div');
      icon.style.cssText = 'text-align: center; color: #888;';
      icon.innerHTML = `<div style="font-size: 48px; margin-bottom: 8px;">${username.charAt(0).toUpperCase()}</div><div style="font-size: 12px;">Video Off</div>`;
      placeholder.appendChild(icon);
      videoContainer.appendChild(placeholder);
    } else {
      const videoElement = pipWindow.document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.muted = isLocal;
      videoElement.playsInline = true;
      videoElement.style.cssText = 'width: 100%; height: 100%; object-fit: cover; pointer-events: none;';
      videoContainer.appendChild(videoElement);
      
      if (!isLocal) {
        videoElement.play().catch((error) => {
          console.warn(`PiP audio/video autoplay blocked for ${username}:`, error);
        });
      }
    }

    box.appendChild(videoContainer);

    const resizeHandle = pipWindow.document.createElement('div');
    resizeHandle.style.cssText = 'position: absolute; bottom: 4px; right: 4px; width: 24px; height: 24px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 0%, transparent 50%, rgba(59,130,246,0.8) 50%, rgba(59,130,246,0.8) 100%); border-radius: 0 0 10px 0; z-index: 10;';
    box.appendChild(resizeHandle);

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

    header.addEventListener('mousedown', (e: MouseEvent) => {
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

    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        const deltaX = e.clientX - dragState.dragStartX;
        const deltaY = e.clientY - dragState.dragStartY;
        const newLeft = Math.max(0, Math.min(pipWindow.innerWidth - parseInt(box.style.width), dragState.boxStartLeft + deltaX));
        const newTop = Math.max(0, Math.min(pipWindow.innerHeight - parseInt(box.style.height), dragState.boxStartTop + deltaY));
        
        box.style.left = `${newLeft}px`;
        box.style.top = `${newTop}px`;
        
        const states = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        states[id] = { left: newLeft, top: newTop, width: parseInt(box.style.width), height: parseInt(box.style.height) };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(states));
      } else if (dragState.isResizing) {
        const deltaX = e.clientX - dragState.dragStartX;
        const deltaY = e.clientY - dragState.dragStartY;
        const newWidth = Math.max(200, Math.min(pipWindow.innerWidth - parseInt(box.style.left), dragState.boxStartWidth + deltaX));
        const newHeight = Math.max(150, Math.min(pipWindow.innerHeight - parseInt(box.style.top), dragState.boxStartHeight + deltaY));
        
        box.style.width = `${newWidth}px`;
        box.style.height = `${newHeight}px`;
        
        const states = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        states[id] = { left: parseInt(box.style.left), top: parseInt(box.style.top), width: newWidth, height: newHeight };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(states));
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

    pipEventHandlersRef.current.set(id, { mousemove: handleMouseMove, mouseup: handleMouseUp });

    return box;
  };

  return null;
}
