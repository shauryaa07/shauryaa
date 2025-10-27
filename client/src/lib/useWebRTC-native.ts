import { useEffect, useRef, useState, useCallback } from "react";
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
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const streamRef = useRef<Map<string, MediaStream>>(new Map());

  const createPeer = useCallback(
    async (peerId: string, username: string, initiator: boolean) => {
      console.log(`Creating peer for ${username} (peerId: ${peerId}, initiator: ${initiator})`);

      const peerConnection = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });

      // Add local stream tracks to the peer connection
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Sending ICE candidate to ${username} (${peerId})`);
          onSignal(peerId, "ice-candidate", {
            candidate: event.candidate,
          });
        }
      };

      // Handle incoming stream
      peerConnection.ontrack = (event) => {
        console.log(`Received REMOTE stream from peer ${peerId} (${username})`);
        const [remoteStream] = event.streams;
        console.log(`Remote stream ID: ${remoteStream.id}, tracks:`, remoteStream.getTracks());
        
        streamRef.current.set(peerId, remoteStream);
        
        setPeers((prev) => {
          const existing = prev.find((p) => p.id === peerId);
          if (existing) {
            console.log(`Updating existing peer ${peerId} with stream, username: ${existing.username}`);
            return prev.map((p) =>
              p.id === peerId ? { ...p, stream: remoteStream } : p
            );
          }
          console.log(`Creating new peer in ontrack for ${peerId}, username: ${username}`);
          return [
            ...prev,
            {
              id: peerId,
              username,
              stream: remoteStream,
              peer: peerConnection as any,
              isMuted: false,
              isVideoOff: false,
            },
          ];
        });
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state for ${username} (${peerId}):`, peerConnection.connectionState);
        if (peerConnection.connectionState === "failed" || 
            peerConnection.connectionState === "disconnected" ||
            peerConnection.connectionState === "closed") {
          removePeer(peerId);
        }
      };

      peersRef.current.set(peerId, peerConnection);

      // Add to peers list FIRST before creating offer
      setPeers((prev) => {
        const existing = prev.find((p) => p.id === peerId);
        if (existing) {
          console.log(`Peer ${peerId} already exists with username: ${existing.username}, keeping existing`);
          return prev;
        }
        console.log(`Adding new peer ${peerId} with username: ${username}`);
        return [
          ...prev,
          {
            id: peerId,
            username,
            peer: peerConnection as any,
            isMuted: false,
            isVideoOff: false,
          },
        ];
      });

      // If initiator, create offer
      if (initiator) {
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          console.log(`Sending offer to ${username} (${peerId})`);
          onSignal(peerId, "offer", {
            type: "offer",
            sdp: offer.sdp,
          });
        } catch (error) {
          console.error(`Error creating offer for ${username}:`, error);
        }
      }

      return peerConnection;
    },
    [localStream, onSignal]
  );

  const handleSignal = useCallback(
    async (from: string, username: string, data: any, type: string) => {
      console.log(`Handling ${type} from peer ${from} (username: ${username})`);

      let peerConnection = peersRef.current.get(from);

      if (!peerConnection) {
        console.log(`Creating non-initiator peer for ${from} (username: ${username})`);
        peerConnection = await createPeer(from, username, false);
      }

      try {
        if (type === "offer") {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          console.log(`Sending answer to ${username} (${from})`);
          onSignal(from, "answer", {
            type: "answer",
            sdp: answer.sdp,
          });
        } else if (type === "answer") {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        } else if (type === "ice-candidate" && data.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (error) {
        console.error(`Error handling signal from ${username} (${from}):`, error);
      }
    },
    [createPeer, onSignal]
  );

  const removePeer = useCallback((peerId: string) => {
    const peerConnection = peersRef.current.get(peerId);
    if (peerConnection) {
      peerConnection.close();
      peersRef.current.delete(peerId);
    }
    streamRef.current.delete(peerId);
    setPeers((prev) => prev.filter((p) => p.id !== peerId));
  }, []);

  const cleanup = useCallback(() => {
    peersRef.current.forEach((peerConnection) => peerConnection.close());
    peersRef.current.clear();
    streamRef.current.clear();
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
    cleanup,
  };
}
