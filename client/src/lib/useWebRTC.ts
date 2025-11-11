import { useEffect, useRef, useState, useCallback } from "react";
import SimplePeer from "simple-peer";
import { PeerConnection } from "@shared/schema";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface UseWebRTCProps {
  localStream: MediaStream | null;
  userId: string;
  onSignal: (to: string, type: string, data: any) => void;
}

export function useWebRTC({ localStream, userId, onSignal }: UseWebRTCProps) {
  const [peers, setPeers] = useState<PeerConnection[]>([]);
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());

  const createPeer = useCallback(
    (peerId: string, username: string, initiator: boolean) => {
      console.log(`Creating peer for ${username} (initiator: ${initiator})`);

      const peer = new SimplePeer({
        initiator,
        trickle: true,
        stream: localStream || undefined,
        config: {
          iceServers: ICE_SERVERS,
        },
      });

      peer.on("signal", (data: any) => {
        // SimplePeer sends different signal types: offer, answer, and ICE candidates
        // Check data.type to determine the correct signal type
        let signalType: string;
        if (data.type === "offer") {
          signalType = "offer";
        } else if (data.type === "answer") {
          signalType = "answer";
        } else if (data.candidate) {
          // ICE candidate
          signalType = "ice-candidate";
        } else {
          signalType = "offer"; // fallback
        }
        
        console.log(`Sending ${signalType} to ${username}`);
        onSignal(peerId, signalType, data);
      });

      peer.on("stream", (stream: MediaStream) => {
        console.log(`Received REMOTE stream from ${username}`);
        console.log(`Remote stream ID: ${stream.id}, tracks:`, stream.getTracks());
        console.log(`Is this the local stream? ${stream === localStream}`);
        setPeers((prev) => {
          const existing = prev.find((p) => p.id === peerId);
          if (existing) {
            return prev.map((p) =>
              p.id === peerId ? { ...p, stream } : p
            );
          }
          return [
            ...prev,
            {
              id: peerId,
              username,
              stream,
              peer,
              isMuted: false,
              isVideoOff: false,
            },
          ];
        });
      });

      peer.on("error", (err: Error) => {
        console.error(`Peer error with ${username}:`, err);
      });

      peer.on("close", () => {
        console.log(`Peer connection closed with ${username}`);
        removePeer(peerId);
      });

      peersRef.current.set(peerId, peer);

      setPeers((prev) => {
        const existing = prev.find((p) => p.id === peerId);
        if (existing) return prev;
        return [
          ...prev,
          {
            id: peerId,
            username,
            peer,
            isMuted: false,
            isVideoOff: false,
          },
        ];
      });

      return peer;
    },
    [localStream, onSignal]
  );

  const handleSignal = useCallback(
    (from: string, username: string, data: any, type: string) => {
      console.log(`Handling ${type} from ${username}`);

      let peer = peersRef.current.get(from);

      if (!peer) {
        // If we don't have a peer yet and we receive an offer, create one as non-initiator
        console.log(`Creating non-initiator peer for ${username}`);
        peer = createPeer(from, username, false);
      }

      try {
        peer.signal(data);
      } catch (error) {
        console.error(`Error signaling peer ${username}:`, error);
      }
    },
    [createPeer]
  );

  const removePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.destroy();
      peersRef.current.delete(peerId);
    }
    setPeers((prev) => prev.filter((p) => p.id !== peerId));
  }, []);

  const updatePeerState = useCallback((peerId: string, isMuted: boolean, isVideoOff: boolean) => {
    setPeers((prev) => {
      return prev.map((p) =>
        p.id === peerId ? { ...p, isMuted, isVideoOff } : p
      );
    });
  }, []);

  const cleanup = useCallback(() => {
    peersRef.current.forEach((peer) => peer.destroy());
    peersRef.current.clear();
    setPeers([]);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    peers,
    createPeer,
    handleSignal,
    removePeer,
    updatePeerState,
    cleanup,
  };
}
