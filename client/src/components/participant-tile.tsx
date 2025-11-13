import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoTrack, AudioTrack } from "@livekit/components-react";
import { Track, Participant } from "livekit-client";
import { VideoOff, UserPlus, Mic, MicOff, Video as VideoIcon } from "lucide-react";

interface ParticipantTileProps {
  participant: Participant;
  isLocal: boolean;
  onFriendRequest?: () => void;
  onClick?: () => void;
  showControls?: boolean;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
}

export default function ParticipantTile({
  participant,
  isLocal,
  onFriendRequest,
  onClick,
  showControls = false,
  onToggleAudio,
  onToggleVideo,
}: ParticipantTileProps) {
  const isMuted = !participant.isMicrophoneEnabled;
  const isVideoOff = !participant.isCameraEnabled;

  return (
    <Card
      className="relative aspect-video overflow-hidden bg-muted cursor-pointer hover-elevate"
      data-testid={isLocal ? "video-local" : `video-${participant.identity}`}
      onClick={onClick}
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

      {/* Participant Info */}
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 rounded-md text-sm">
        {isLocal ? "You" : participant.identity}
        {isMuted && " (Muted)"}
        {isVideoOff && " (Video Off)"}
      </div>

      {/* Local Controls (shown when clicked) */}
      {isLocal && showControls && onToggleAudio && onToggleVideo && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon"
            variant={isMuted ? "destructive" : "default"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleAudio();
            }}
            data-testid="tile-button-toggle-audio"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            size="icon"
            variant={isVideoOff ? "destructive" : "default"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVideo();
            }}
            data-testid="tile-button-toggle-video"
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </Button>
        </div>
      )}

      {/* Friend Request Button (only for remote participants) */}
      {!isLocal && onFriendRequest && (
        <div className="absolute top-2 right-2">
          <Button
            size="icon"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onFriendRequest();
            }}
            className="h-8 w-8"
            data-testid={`button-friend-request-${participant.identity}`}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Audio Track for ALL participants - CRITICAL for audio circulation */}
      {participant.getTrackPublication(Track.Source.Microphone)?.track && (
        <AudioTrack
          trackRef={{
            participant,
            source: Track.Source.Microphone,
            publication: participant.getTrackPublication(Track.Source.Microphone)!,
          }}
          volume={isLocal ? 0 : 1}
        />
      )}
    </Card>
  );
}
