import { useEffect } from "react";
import {
  useParticipants,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
  AudioTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video as VideoIcon, VideoOff, Phone } from "lucide-react";

interface LiveKitVideoRoomProps {
  onDisconnect: () => void;
}

export default function LiveKitVideoRoom({ onDisconnect }: LiveKitVideoRoomProps) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const isMuted = localParticipant?.isMicrophoneEnabled === false;
  const isVideoOff = localParticipant?.isCameraEnabled === false;

  useEffect(() => {
    console.log("Room connected:", room.name);
    console.log("Participants:", participants.length);
  }, [room, participants]);

  const toggleAudio = async () => {
    if (!localParticipant) return;
    await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  };

  const toggleVideo = async () => {
    if (!localParticipant) return;
    await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
  };

  return (
    <div className="fixed inset-4 z-50 flex flex-col" data-testid="livekit-video-room">
      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto p-4">
        {/* Local Participant */}
        {localParticipant && (
          <Card className="relative aspect-video overflow-hidden bg-muted" data-testid="video-local">
            <div className="w-full h-full flex items-center justify-center">
              {localParticipant.getTrackPublication(Track.Source.Camera)?.track && (
                <VideoTrack
                  trackRef={{
                    participant: localParticipant,
                    source: Track.Source.Camera,
                    publication: localParticipant.getTrackPublication(Track.Source.Camera)!,
                  }}
                  className="w-full h-full object-cover"
                />
              )}
              {!localParticipant.isCameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <VideoOff className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 rounded-md text-sm">
              You {isMuted && "(Muted)"} {isVideoOff && "(Video Off)"}
            </div>
          </Card>
        )}

        {/* Remote Participants */}
        {participants.map((participant) => (
          <Card
            key={participant.identity}
            className="relative aspect-video overflow-hidden bg-muted"
            data-testid={`video-${participant.identity}`}
          >
            <div className="w-full h-full flex items-center justify-center">
              {participant.getTrackPublication(Track.Source.Camera)?.track && (
                <VideoTrack
                  trackRef={{
                    participant,
                    source: Track.Source.Camera,
                    publication: participant.getTrackPublication(Track.Source.Camera)!,
                  }}
                  className="w-full h-full object-cover"
                />
              )}
              {!participant.isCameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <VideoOff className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 rounded-md text-sm">
              {participant.identity}
              {!participant.isMicrophoneEnabled && " (Muted)"}
              {!participant.isCameraEnabled && " (Video Off)"}
            </div>
            {/* Audio Track for remote participants */}
            {participant.getTrackPublication(Track.Source.Microphone)?.track && (
              <AudioTrack
                trackRef={{
                  participant,
                  source: Track.Source.Microphone,
                  publication: participant.getTrackPublication(Track.Source.Microphone)!,
                }}
              />
            )}
          </Card>
        ))}
      </div>

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
