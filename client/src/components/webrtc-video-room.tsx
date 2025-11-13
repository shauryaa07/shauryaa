import { useEffect, useRef, useState } from 'react';
import { useWebRTC } from '@/hooks/use-webrtc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from 'lucide-react';

interface WebRTCVideoRoomProps {
  roomId: string;
  userId: string;
  username: string;
  onDisconnect: () => void;
}

export function WebRTCVideoRoom({ roomId, userId, username, onDisconnect }: WebRTCVideoRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const {
    localStream,
    remoteStream,
    isConnecting,
    isConnected,
    error,
    toggleAudio,
    toggleVideo
  } = useWebRTC({
    roomId,
    userId,
    username,
    onDisconnected: onDisconnect
  });

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleToggleAudio = () => {
    toggleAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoEnabled(!isVideoEnabled);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={onDisconnect} variant="outline" data-testid="button-back-to-lobby">
            Back to Lobby
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Video Grid */}
      <div className="h-screen flex flex-col">
        {/* Main Video Area */}
        <div className="flex-1 relative p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local Video */}
          <div className="relative bg-muted rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              data-testid="video-local"
            />
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-md">
              <span className="text-white text-sm">You</span>
            </div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <VideoOff className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Remote Video */}
          <div className="relative bg-muted rounded-lg overflow-hidden">
            {isConnecting ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Waiting for peer...</p>
              </div>
            ) : remoteStream ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  data-testid="video-remote"
                />
                <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-md">
                  <span className="text-white text-sm">Peer</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Video className="w-12 h-12 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No peer connected</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="border-t bg-card p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <Button
              size="icon"
              variant={isAudioEnabled ? "default" : "destructive"}
              onClick={handleToggleAudio}
              className="h-12 w-12 rounded-full"
              data-testid="button-toggle-audio"
            >
              {isAudioEnabled ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </Button>

            <Button
              size="icon"
              variant={isVideoEnabled ? "default" : "destructive"}
              onClick={handleToggleVideo}
              className="h-12 w-12 rounded-full"
              data-testid="button-toggle-video"
            >
              {isVideoEnabled ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </Button>

            <Button
              size="icon"
              variant="destructive"
              onClick={onDisconnect}
              className="h-12 w-12 rounded-full"
              data-testid="button-disconnect"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Room: <span className="font-mono">{roomId}</span>
              {isConnected && (
                <span className="ml-4 text-green-600 dark:text-green-400">● Connected</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
