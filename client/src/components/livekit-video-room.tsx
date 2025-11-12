import { useEffect, useRef, useState } from "react";
import {
  useParticipants,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
  AudioTrack,
} from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video as VideoIcon, VideoOff, Phone, PictureInPicture, Volume2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ParticipantTile from "./participant-tile";

interface LiveKitVideoRoomProps {
  onDisconnect: () => void;
}

export default function LiveKitVideoRoom({ onDisconnect }: LiveKitVideoRoomProps) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const { toast } = useToast();

  const isMuted = localParticipant?.isMicrophoneEnabled === false;
  const isVideoOff = localParticipant?.isCameraEnabled === false;

  // Filter out local participant from participants array to avoid duplicate display
  const remoteParticipants = participants.filter(
    (p) => p.identity !== localParticipant?.identity
  );

  // PIP state and ref
  const [isPipActive, setIsPipActive] = useState(false);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  
  // Audio playback state
  const [needsAudioPermission, setNeedsAudioPermission] = useState(false);
  
  // Control visibility state
  const [showLocalControls, setShowLocalControls] = useState(false);
  
  // Ref to store current participants for PiP updates
  const participantsRef = useRef(participants);
  const remoteParticipantsRef = useRef(remoteParticipants);
  
  useEffect(() => {
    participantsRef.current = participants;
    remoteParticipantsRef.current = remoteParticipants;
  }, [participants, remoteParticipants]);

  // Handle audio playback permissions
  useEffect(() => {
    const handleAudioPlaybackChanged = () => {
      setNeedsAudioPermission(!room.canPlaybackAudio);
    };

    room.on(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackChanged);
    
    // Check initial state
    setNeedsAudioPermission(!room.canPlaybackAudio);

    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackChanged);
    };
  }, [room]);

  useEffect(() => {
    console.log("Room connected:", room.name);
    console.log("Total participants:", participants.length);
    console.log("Remote participants:", remoteParticipants.length);

    // Listen for PIP events
    const handlePipEnter = () => setIsPipActive(true);
    const handlePipExit = () => setIsPipActive(false);

    document.addEventListener('enterpictureinpicture', handlePipEnter);
    document.addEventListener('leavepictureinpicture', handlePipExit);

    return () => {
      document.removeEventListener('enterpictureinpicture', handlePipEnter);
      document.removeEventListener('leavepictureinpicture', handlePipExit);
    };
  }, [room, participants, remoteParticipants.length]);
  
  const handleStartAudio = async () => {
    try {
      await room.startAudio();
      setNeedsAudioPermission(false);
      toast({
        title: "Audio Enabled",
        description: "You can now hear other participants",
      });
    } catch (error) {
      console.error("Failed to start audio:", error);
      toast({
        title: "Audio Error",
        description: "Failed to enable audio playback",
        variant: "destructive",
      });
    }
  };

  const toggleAudio = async () => {
    if (!localParticipant) return;
    await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  };

  const toggleVideo = async () => {
    if (!localParticipant) return;
    await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
  };
  
  const handleLocalVideoClick = () => {
    setShowLocalControls(!showLocalControls);
  };
  
  const handleFriendRequest = (participantId: string) => {
    toast({
      title: "Friend Request Sent",
      description: `Sent friend request to ${participantId}`,
    });
  };

  const togglePip = async () => {
    try {
      // Check if DocumentPictureInPicture is supported
      if ('documentPictureInPicture' in window) {
        if (isPipActive && pipWindowRef.current) {
          pipWindowRef.current.close();
          pipWindowRef.current = null;
          setIsPipActive(false);
          return;
        }

        // Create PiP window with all participants
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 600,
          height: 400,
        });

        pipWindowRef.current = pipWindow;
        setIsPipActive(true);

        // Create and populate PiP window content
        const doc = pipWindow.document;
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Study Session</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  background: #0a0a0a;
                  color: white;
                  height: 100vh;
                  display: flex;
                  flex-direction: column;
                  overflow: hidden;
                }
                .header {
                  background: rgba(0, 0, 0, 0.95);
                  padding: 12px 16px;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  flex-shrink: 0;
                }
                .title {
                  font-size: 14px;
                  font-weight: 600;
                }
                .controls {
                  display: flex;
                  gap: 8px;
                }
                .btn {
                  background: rgba(255, 255, 255, 0.1);
                  border: none;
                  color: white;
                  padding: 8px 12px;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 12px;
                  transition: background 0.2s;
                }
                .btn:hover {
                  background: rgba(255, 255, 255, 0.2);
                }
                .btn.active {
                  background: #ef4444;
                }
                .grid {
                  flex: 1;
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                  gap: 8px;
                  padding: 12px;
                  overflow: auto;
                }
                .participant {
                  background: #1a1a1a;
                  border-radius: 8px;
                  overflow: hidden;
                  position: relative;
                  aspect-ratio: 16 / 9;
                }
                .participant video {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                }
                .participant .placeholder {
                  width: 100%;
                  height: 100%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: #2a2a2a;
                }
                .participant .name {
                  position: absolute;
                  bottom: 8px;
                  left: 8px;
                  background: rgba(0, 0, 0, 0.8);
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 12px;
                }
                .participant .friend-btn {
                  position: absolute;
                  top: 8px;
                  right: 8px;
                  background: rgba(255, 255, 255, 0.2);
                  border: none;
                  color: white;
                  padding: 6px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">Study Session (${participants.length} participants)</div>
                <div class="controls">
                  <button class="btn" id="toggleMic">Mic</button>
                  <button class="btn" id="toggleCam">Camera</button>
                  <button class="btn" id="closeBtn">Close</button>
                </div>
              </div>
              <div class="grid" id="grid"></div>
            </body>
          </html>
        `);
        doc.close();

        // Wire up controls
        const toggleMicBtn = doc.getElementById('toggleMic');
        const toggleCamBtn = doc.getElementById('toggleCam');
        const closeBtn = doc.getElementById('closeBtn');

        toggleMicBtn?.addEventListener('click', async () => {
          await toggleAudio();
          // Update button state after toggle
          setTimeout(() => {
            const currentMuted = localParticipant?.isMicrophoneEnabled === false;
            toggleMicBtn.classList.toggle('active', currentMuted);
          }, 100);
        });

        toggleCamBtn?.addEventListener('click', async () => {
          await toggleVideo();
          // Update button state after toggle
          setTimeout(() => {
            const currentVideoOff = localParticipant?.isCameraEnabled === false;
            toggleCamBtn.classList.toggle('active', currentVideoOff);
          }, 100);
        });

        closeBtn?.addEventListener('click', () => {
          pipWindow.close();
        });

        // Track added friend button listeners to avoid duplicates
        const addedListeners = new Set<string>();

        // Modified updatePipContent to avoid duplicate listeners and use fresh participant data
        const updatePipContentWithListeners = () => {
          const grid = doc.getElementById('grid');
          if (!grid || pipWindow.closed) return;

          // Get fresh participant list from the ref (updated on each render)
          const currentRemoteParticipants = remoteParticipantsRef.current;

          // Update participant count in header
          const titleEl = doc.querySelector('.title');
          if (titleEl) {
            titleEl.textContent = `Study Session (${currentRemoteParticipants.length + 1} participants)`;
          }

          grid.innerHTML = '';
          addedListeners.clear();

          // Add local participant
          if (localParticipant) {
            const localEl = doc.createElement('div');
            localEl.className = 'participant';
            localEl.innerHTML = `
              ${localParticipant.isCameraEnabled ? '<video id="local-video" autoplay playsinline muted></video>' : '<div class="placeholder">📹 Camera Off</div>'}
              <div class="name">You ${!localParticipant.isMicrophoneEnabled ? '(Muted)' : ''}</div>
            `;
            grid.appendChild(localEl);

            // Attach video stream
            if (localParticipant.isCameraEnabled) {
              const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.track;
              if (videoTrack) {
                const videoEl = doc.getElementById('local-video') as HTMLVideoElement;
                if (videoEl && (videoTrack as any).mediaStreamTrack) {
                  const stream = new MediaStream([(videoTrack as any).mediaStreamTrack]);
                  videoEl.srcObject = stream;
                }
              }
            }
          }

          // Add remote participants using fresh data
          currentRemoteParticipants.forEach((participant, index) => {
            const participantEl = doc.createElement('div');
            participantEl.className = 'participant';
            
            const btnId = `friend-btn-${participant.identity}`;
            participantEl.innerHTML = `
              ${participant.isCameraEnabled ? `<video id="video-${index}" autoplay playsinline></video>` : '<div class="placeholder">📹 Camera Off</div>'}
              <div class="name">${participant.identity} ${!participant.isMicrophoneEnabled ? '(Muted)' : ''}</div>
              <button class="friend-btn" id="${btnId}">👤+</button>
            `;
            grid.appendChild(participantEl);

            // Attach video stream
            if (participant.isCameraEnabled) {
              const videoTrack = participant.getTrackPublication(Track.Source.Camera)?.track;
              if (videoTrack) {
                const videoEl = doc.getElementById(`video-${index}`) as HTMLVideoElement;
                if (videoEl && (videoTrack as any).mediaStreamTrack) {
                  const stream = new MediaStream([(videoTrack as any).mediaStreamTrack]);
                  videoEl.srcObject = stream;
                }
              }
            }

            // Add single event listener per button
            const friendBtn = doc.getElementById(btnId);
            if (friendBtn && !addedListeners.has(btnId)) {
              friendBtn.addEventListener('click', () => {
                handleFriendRequest(participant.identity);
              });
              addedListeners.add(btnId);
            }
          });
        };

        // Initial content
        updatePipContentWithListeners();

        // Update content periodically with fresh participant data
        const updateInterval = setInterval(() => {
          if (pipWindow.closed) {
            clearInterval(updateInterval);
            setIsPipActive(false);
            pipWindowRef.current = null;
            return;
          }
          updatePipContentWithListeners();
        }, 1000);

        // Handle window close
        pipWindow.addEventListener('pagehide', () => {
          clearInterval(updateInterval);
          setIsPipActive(false);
          pipWindowRef.current = null;
        });

        toast({
          title: "PIP Activated",
          description: "You can now browse other websites while studying together",
        });
      } else {
        // Fallback to simple PIP
        const allVideoElements = Array.from(document.querySelectorAll('video[data-lk-source="camera"]')) as HTMLVideoElement[];
        
        if (allVideoElements.length === 0) {
          toast({
            title: "No Video Available",
            description: "No active video stream found for Picture-in-Picture",
            variant: "destructive",
          });
          return;
        }

        const videoElement = allVideoElements[0];

        if (!document.pictureInPictureElement) {
          await videoElement.requestPictureInPicture();
          toast({
            title: "PIP Activated",
            description: "You can now browse other websites while studying together",
          });
        } else {
          await document.exitPictureInPicture();
          toast({
            title: "PIP Deactivated",
            description: "Returned to normal view",
          });
        }
      }
    } catch (error) {
      console.error("PIP error:", error);
      toast({
        title: "PIP Error",
        description: "Your browser may not support Picture-in-Picture",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-4 z-50 flex flex-col" data-testid="livekit-video-room">
      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto p-4">
        {/* Local Participant */}
        {localParticipant && (
          <ParticipantTile
            participant={localParticipant}
            isLocal={true}
            onClick={handleLocalVideoClick}
            showControls={showLocalControls}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
          />
        )}

        {/* Remote Participants */}
        {remoteParticipants.map((participant) => (
          <ParticipantTile
            key={participant.identity}
            participant={participant}
            isLocal={false}
            onFriendRequest={() => handleFriendRequest(participant.identity)}
          />
        ))}
      </div>

      {/* Audio Permission Overlay */}
      {needsAudioPermission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="p-6 max-w-md text-center">
            <Volume2 className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Enable Audio</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click the button below to hear other participants. This is required by your browser's security policy.
            </p>
            <Button onClick={handleStartAudio} size="lg" data-testid="button-enable-audio">
              Enable Audio
            </Button>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-background/95 border-t">
        <Button
          size="icon"
          variant={isMuted ? "destructive" : "default"}
          onClick={toggleAudio}
          data-testid="button-toggle-audio"
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

        <Button
          size="icon"
          variant={isVideoOff ? "destructive" : "default"}
          onClick={toggleVideo}
          data-testid="button-toggle-video"
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
        </Button>

        <Button
          size="icon"
          variant={isPipActive ? "secondary" : "outline"}
          onClick={togglePip}
          data-testid="button-toggle-pip"
        >
          <PictureInPicture className="w-5 h-5" />
        </Button>

        <Button
          size="icon"
          variant="destructive"
          onClick={onDisconnect}
          data-testid="button-disconnect"
        >
          <Phone className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
