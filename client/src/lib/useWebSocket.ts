import { useEffect, useRef, useState, useCallback } from "react";
import { User, SignalingMessage } from "@shared/schema";

interface UseWebSocketProps {
  user: User | null;
  onMatched?: (peers: Array<{ userId: string; username: string }>) => void;
  onUserLeft?: (userId: string) => void;
  onSignal?: (message: SignalingMessage) => void;
  onWaiting?: (data: { message: string }) => void;
}

export function useWebSocket({
  user,
  onMatched,
  onUserLeft,
  onSignal,
  onWaiting,
}: UseWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log("Connecting to WebSocket:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      // Send join message
      ws.send(
        JSON.stringify({
          type: "join",
          userId: user.id,
          username: user.username,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Received WebSocket message:", message);

        switch (message.type) {
          case "matched":
            setRoomId(message.roomId);
            onMatched?.(message.peers);
            break;
          case "waiting":
            console.log("Waiting for peers...", message);
            onWaiting?.(message);
            break;
          case "user-left":
            onUserLeft?.(message.userId);
            break;
          case "offer":
          case "answer":
          case "ice-candidate":
            onSignal?.(message);
            break;
          default:
            console.log("Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      setRoomId(null);
    };
  }, [user, onMatched, onUserLeft, onSignal]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "leave" }));
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setRoomId(null);
  }, []);

  const sendSignal = useCallback((to: string, type: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type,
          to,
          data,
        })
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    roomId,
    connect,
    disconnect,
    sendSignal,
  };
}
