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
    async (peerId: string, username: string, initiator: boolean, gender?: "male" | "female") => {
      console.log(`Creating peer for ${username} (initiator: ${initiator})`);

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
          console.log(`Sending ICE candidate to ${username}`);
          onSignal(peerId, "ice-candidate", {
            candidate: event.candidate,
          });
        }
      };

      // Handle incoming stream
      peerConnection.ontrack = (event) => {
        console.log(`Received REMOTE stream from ${username}`);
        const [remoteStream] = event.streams;
        console.log(`Remote stream ID: ${remoteStream.id}, tracks:`, remoteStream.getTracks());
        console.log(`Is this the local stream? ${remoteStream === localStream}`);
        
        streamRef.current.set(peerId, remoteStream);
        
        setPeers((prev) => {
          const existing = prev.find((p) => p.id === peerId);
          if (existing) {
            return prev.map((p) =>
              p.id === peerId ? { ...p, stream: remoteStream } : p
            );
          }
          return [
            ...prev,
            {
              id: peerId,
              username,
              gender,
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
        console.log(`Connection state for ${username}:`, peerConnection.connectionState);
        if (peerConnection.connectionState === "failed" || 
            peerConnection.connectionState === "disconnected" ||
            peerConnection.connectionState === "closed") {
          removePeer(peerId);
        }
      };

      peersRef.current.set(peerId, peerConnection);

      // If initiator, create offer
      if (initiator) {
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          console.log(`Sending offer to ${username}`);
          onSignal(peerId, "offer", {
            type: "offer",
            sdp: offer.sdp,
          });
        } catch (error) {
          console.error(`Error creating offer for ${username}:`, error);
        }
      }

      // Add to peers list
      setPeers((prev) => {
        const existing = prev.find((p) => p.id === peerId);
        if (existing) return prev;
        return [
          ...prev,
          {
            id: peerId,
            username,
            gender,
            peer: peerConnection as any,
            isMuted: false,
            isVideoOff: false,
          },
        ];
      });

      return peerConnection;
    },
    [localStream, onSignal]
  );

  const handleSignal = useCallback(
    async (from: string, username: string, data: any, type: string, gender?: "male" | "female") => {
      console.log(`Handling ${type} from ${username}`);

      let peerConnection = peersRef.current.get(from);

      if (!peerConnection) {
        console.log(`Creating non-initiator peer for ${username}`);
        peerConnection = await createPeer(from, username, false, gender);
      }

      try {
        if (type === "offer") {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          console.log(`Sending answer to ${username}`);
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
        console.error(`Error handling signal from ${username}:`, error);
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
