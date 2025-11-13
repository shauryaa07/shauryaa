import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebRTCProps {
  roomId: string;
  userId: string;
  username: string;
  onDisconnected: () => void;
}

interface SignalData {
  type: 'offer' | 'answer' | 'ice';
  payload: any;
}

// Get the signaling server URL - in dev it's the same as the app
const getSignalingServerUrl = () => {
  if (typeof window === 'undefined') return '';
  
  // In development and production on Replit, Socket.io runs on same server
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  const host = window.location.host;
  return `${protocol}://${host}`;
};

// ICE servers for STUN (helps with NAT traversal)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export function useWebRTC({ roomId, userId, username, onDisconnected }: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const otherSocketIdRef = useRef<string | null>(null);

  // Get local media stream
  const getLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera/microphone';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    // Add local tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal', {
          room: roomId,
          to: otherSocketIdRef.current,
          data: {
            type: 'ice',
            payload: event.candidate
          }
        });
      }
    };

    // Handle remote track
    pc.ontrack = (event) => {
      console.log('📹 Received remote track');
      setRemoteStream(event.streams[0]);
      setIsConnected(true);
      setIsConnecting(false);
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('🔌 Connection state:', pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setIsConnected(false);
        onDisconnected();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [roomId, onDisconnected]);

  // Create and send offer
  const createOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !socketRef.current) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socketRef.current.emit('signal', {
        room: roomId,
        to: otherSocketIdRef.current,
        data: {
          type: 'offer',
          payload: pc.localDescription
        }
      });
    } catch (err) {
      console.error('Error creating offer:', err);
      setError('Failed to create connection offer');
    }
  }, [roomId]);

  // Initialize WebRTC connection
  useEffect(() => {
    let socket: Socket | null = null;
    let stream: MediaStream | null = null;

    const init = async () => {
      try {
        // Get local media
        stream = await getLocalMedia();

        // Connect to signaling server
        const serverUrl = getSignalingServerUrl();
        socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });
        socketRef.current = socket;

        // Socket event handlers
        socket.on('connect', () => {
          console.log('🔌 Connected to signaling server');
          socket!.emit('join', { room: roomId });
        });

        socket.on('joined', ({ room, id }) => {
          console.log(`✅ Joined room ${room} with ID ${id}`);
          createPeerConnection(stream!);
        });

        socket.on('peer-joined', ({ from }) => {
          console.log(`👤 Peer joined: ${from}`);
          otherSocketIdRef.current = from;
          
          if (!peerConnectionRef.current) {
            createPeerConnection(stream!);
          }
          
          // Create offer (we're the caller)
          createOffer();
        });

        socket.on('signal', async ({ from, data }: { from: string; data: SignalData }) => {
          otherSocketIdRef.current = from;
          
          const pc = peerConnectionRef.current;
          if (!pc) {
            createPeerConnection(stream!);
            return;
          }

          try {
            if (data.type === 'offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              
              socket!.emit('signal', {
                room: roomId,
                to: from,
                data: {
                  type: 'answer',
                  payload: pc.localDescription
                }
              });
            } else if (data.type === 'answer') {
              await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
            } else if (data.type === 'ice') {
              await pc.addIceCandidate(new RTCIceCandidate(data.payload));
            }
          } catch (err) {
            console.error('Error handling signal:', err);
          }
        });

        socket.on('room-full', ({ message }) => {
          console.error('❌ Room is full:', message);
          setError(message);
          setIsConnecting(false);
          onDisconnected();
        });

        socket.on('peer-left', () => {
          console.log('👋 Peer left the room');
          setIsConnected(false);
          setRemoteStream(null);
          onDisconnected();
        });

        socket.on('disconnect', () => {
          console.log('🔌 Disconnected from signaling server');
          setIsConnected(false);
        });

      } catch (err) {
        console.error('Error initializing WebRTC:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsConnecting(false);
      }
    };

    init();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up WebRTC connection');
      
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Stop local stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Disconnect socket
      if (socket) {
        socket.emit('leave', { room: roomId });
        socket.disconnect();
      }
    };
  }, [roomId, userId, username, getLocalMedia, createPeerConnection, createOffer, onDisconnected]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    isConnecting,
    isConnected,
    error,
    toggleAudio,
    toggleVideo
  };
}
