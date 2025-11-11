import { useEffect, useState, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  LocalParticipant,
  ConnectionState,
  createLocalTracks,
  VideoPresets,
} from "livekit-client";
import { ParticipantInfo } from "@shared/schema";

interface UseLiveKitProps {
  url: string;
  token: string | null;
  onDisconnected?: () => void;
}

export function useLiveKit({ url, token, onDisconnected }: UseLiveKitProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [localVideoTrack, setLocalVideoTrack] = useState<Track.Source | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<Track.Source | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!token || !url) {
      setError("Missing LiveKit URL or token");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const newRoom = new Room();

      // Set up event listeners before connecting
      newRoom
        .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log("Participant connected:", participant.identity);
          updateParticipants(newRoom);
        })
        .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          console.log("Participant disconnected:", participant.identity);
          updateParticipants(newRoom);
        })
        .on(RoomEvent.TrackMuted, () => {
          updateParticipants(newRoom);
        })
        .on(RoomEvent.TrackUnmuted, () => {
          updateParticipants(newRoom);
        })
        .on(RoomEvent.Disconnected, () => {
          console.log("Disconnected from room");
          onDisconnected?.();
        })
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          console.log("Connection state changed:", state);
        });

      // Connect to the room
      await newRoom.connect(url, token, {
        autoSubscribe: true,
      });

      console.log("Successfully connected to LiveKit room");

      setRoom(newRoom);
      updateParticipants(newRoom);
      setIsConnecting(false);
    } catch (err) {
      console.error("Failed to connect to LiveKit room:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnecting(false);
    }
  }, [url, token, onDisconnected]);

  const disconnect = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setParticipants([]);
    }
  }, [room]);

  const toggleAudio = useCallback(async () => {
    if (!room || !room.localParticipant) return;

    const enabled = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!enabled);
    updateParticipants(room);
  }, [room]);

  const toggleVideo = useCallback(async () => {
    if (!room || !room.localParticipant) return;

    const enabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!enabled);
    updateParticipants(room);
  }, [room]);

  function updateParticipants(currentRoom: Room) {
    const allParticipants: ParticipantInfo[] = [];

    // Add local participant
    if (currentRoom.localParticipant) {
      allParticipants.push({
        id: currentRoom.localParticipant.identity,
        username: currentRoom.localParticipant.identity,
        isMuted: !currentRoom.localParticipant.isMicrophoneEnabled,
        isVideoOff: !currentRoom.localParticipant.isCameraEnabled,
        isSpeaking: currentRoom.localParticipant.isSpeaking,
      });
    }

    // Add remote participants
    currentRoom.remoteParticipants.forEach((participant) => {
      allParticipants.push({
        id: participant.identity,
        username: participant.identity,
        isMuted: !participant.isMicrophoneEnabled,
        isVideoOff: !participant.isCameraEnabled,
        isSpeaking: participant.isSpeaking,
      });
    });

    setParticipants(allParticipants);
  }

  // Auto-connect when token is available
  useEffect(() => {
    if (token && url && !room && !isConnecting) {
      connect();
    }
  }, [token, url, room, isConnecting, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  return {
    room,
    participants,
    isConnecting,
    error,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
  };
}
