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

  // Track if we've already auto-entered PIP
  const [hasAutoEnteredPip, setHasAutoEnteredPip] = useState(false);

  useEffect(() => {
    console.log("Room connected:", room.name);
    console.log("Total participants:", participants.length);
    console.log("Remote participants:", remoteParticipants.length);

    // Automatically try to start audio on room connection
    if (!room.canPlaybackAudio) {
      room.startAudio().catch(err => {
        console.log("Auto audio start blocked:", err);
        setNeedsAudioPermission(true);
      });
    }

    // AUTO-ENTER PIP when another user joins (only once per session)
    if (remoteParticipants.length > 0 && !hasAutoEnteredPip && !isPipActive) {
      setHasAutoEnteredPip(true);
      // Small delay to let video tracks initialize
      setTimeout(() => {
        togglePip();
        toast({
          title: "Study Partner Joined!",
          description: "Entered Picture-in-Picture mode. Use controls on main screen to adjust settings.",
        });
      }, 1000);
    }

    // Listen for PIP events
    const handlePipEnter = () => setIsPipActive(true);
    const handlePipExit = () => setIsPipActive(false);

    document.addEventListener('enterpictureinpicture', handlePipEnter);
    document.addEventListener('leavepictureinpicture', handlePipExit);

    return () => {
      document.removeEventListener('enterpictureinpicture', handlePipEnter);
      document.removeEventListener('leavepictureinpicture', handlePipExit);
    };
  }, [room, participants, remoteParticipants.length, hasAutoEnteredPip, isPipActive, toast]);
  
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

        // Create minimal PiP window (YouTube-style - just video, no controls)
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 400,
          height: 300,
        });

        pipWindowRef.current = pipWindow;
        setIsPipActive(true);

        // Create and populate minimal PiP window content (no controls!)
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
                  overflow: hidden;
                }
                .grid {
                  flex: 1;
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                  gap: 4px;
                  padding: 4px;
                  overflow: auto;
                }
                .participant {
                  background: #1a1a1a;
                  border-radius: 6px;
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
                  font-size: 32px;
                }
                .participant .name {
                  position: absolute;
                  bottom: 4px;
                  left: 4px;
                  background: rgba(0, 0, 0, 0.8);
                  padding: 2px 6px;
                  border-radius: 3px;
                  font-size: 10px;
                }
              </style>
            </head>
            <body>
              <div class="grid" id="grid"></div>
            </body>
          </html>
        `);
        doc.close();

        // Update PIP content function (minimal - no controls)
        const updatePipContent = () => {
          const grid = doc.getElementById('grid');
          if (!grid || pipWindow.closed) return;

          // Get fresh participant list
          const currentRemoteParticipants = remoteParticipantsRef.current;

          grid.innerHTML = '';

          // Add local participant
          if (localParticipant) {
            const localEl = doc.createElement('div');
            localEl.className = 'participant';
            localEl.innerHTML = `
              ${localParticipant.isCameraEnabled ? '<video id="local-video" autoplay playsinline muted></video>' : '<div class="placeholder">📹</div>'}
              <div class="name">You${!localParticipant.isMicrophoneEnabled ? ' 🔇' : ''}</div>
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

          // Add remote participants
          currentRemoteParticipants.forEach((participant, index) => {
            const participantEl = doc.createElement('div');
            participantEl.className = 'participant';
            
            participantEl.innerHTML = `
              ${participant.isCameraEnabled ? `<video id="video-${index}" autoplay playsinline></video>` : '<div class="placeholder">📹</div>'}
              <div class="name">${participant.identity}${!participant.isMicrophoneEnabled ? ' 🔇' : ''}</div>
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
          });
        };

        // Initial content
        updatePipContent();

        // Update content periodically
        const updateInterval = setInterval(() => {
          if (pipWindow.closed) {
            clearInterval(updateInterval);
            setIsPipActive(false);
            pipWindowRef.current = null;
            return;
          }
          updatePipContent();
        }, 1000);

        // Handle window close
        pipWindow.addEventListener('pagehide', () => {
          clearInterval(updateInterval);
          setIsPipActive(false);
          pipWindowRef.current = null;
        });

        toast({
          title: "PIP Activated",
          description: "All controls remain on the main screen. Close this toast to continue.",
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
