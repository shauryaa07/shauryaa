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

interface BufferedSignal {
  from: string;
  username: string;
  data: any;
  type: string;
}

export function useWebRTC({ localStream, userId, onSignal }: UseWebRTCProps) {
  const [peers, setPeers] = useState<PeerConnection[]>([]);
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());
  const bufferedSignalsRef = useRef<BufferedSignal[]>([]);

  const createPeer = useCallback(
    (peerId: string, username: string, initiator: boolean) => {
      if (!localStream) {
        console.warn(`Cannot create peer for ${username} - localStream not ready yet`);
        return null;
      }

      console.log(`Creating peer for ${username} (initiator: ${initiator})`);

      const peer = new SimplePeer({
        initiator,
        trickle: true,
        stream: localStream,
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

  const addStreamToPeer = useCallback((peerId: string, stream: MediaStream) => {
    const peer = peersRef.current.get(peerId);
    if (peer && stream) {
      try {
        peer.addStream(stream);
        console.log(`Added stream to existing peer ${peerId}`);
      } catch (error) {
        console.error(`Error adding stream to peer ${peerId}:`, error);
      }
    }
  }, []);

  const handleSignal = useCallback(
    (from: string, username: string, data: any, type: string) => {
      console.log(`Handling ${type} from ${username}`);

      // If localStream is not ready yet, buffer the signal for later
      if (!localStream) {
        console.log(`LocalStream not ready, buffering ${type} from ${username}`);
        bufferedSignalsRef.current.push({ from, username, data, type });
        return;
      }

      let peer = peersRef.current.get(from);

      if (!peer) {
        // If we don't have a peer yet and we receive an offer, create one as non-initiator
        console.log(`Creating non-initiator peer for ${username}`);
        const newPeer = createPeer(from, username, false);
        if (!newPeer) {
          console.warn(`Cannot create peer for ${username} - localStream not ready`);
          return;
        }
        peer = newPeer;
      }

      try {
        peer.signal(data);
      } catch (error) {
        console.error(`Error signaling peer ${username}:`, error);
      }
    },
    [createPeer, localStream]
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

  // Process buffered signals when localStream becomes available
  useEffect(() => {
    if (localStream && bufferedSignalsRef.current.length > 0) {
      console.log(`LocalStream ready, processing ${bufferedSignalsRef.current.length} buffered signals`);
      const signals = [...bufferedSignalsRef.current];
      bufferedSignalsRef.current = [];
      
      signals.forEach(({ from, username, data, type }) => {
        handleSignal(from, username, data, type);
      });
    }
  }, [localStream, handleSignal]);

  return {
    peers,
    createPeer,
    handleSignal,
    removePeer,
    updatePeerState,
    cleanup,
    addStreamToPeer,
  };
}
