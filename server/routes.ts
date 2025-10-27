import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { Session, Preference } from "@shared/schema";

interface WSClient extends WebSocket {
  userId?: string;
  username?: string;
  preferences?: Preference;
  roomId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for signaling - using /ws path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Active sessions waiting to be matched
  const waitingUsers: Map<string, WSClient> = new Map();
  
  // Active rooms (each room has 2-3 users)
  const rooms: Map<string, Set<WSClient>> = new Map();

  wss.on('connection', (ws: WSClient) => {
    console.log('New WebSocket connection');

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);

        switch (message.type) {
          case 'join':
            handleJoin(ws, message);
            break;
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            handleSignaling(ws, message);
            break;
          case 'leave':
            handleLeave(ws);
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      handleLeave(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  function handleJoin(ws: WSClient, message: any) {
    const { userId, username, preferences } = message;
    
    ws.userId = userId;
    ws.username = username;
    ws.preferences = preferences;

    console.log(`User ${username} (${userId}) joining with preferences:`, preferences);

    // Store session
    storage.createSession({
      userId,
      username,
      preferences,
      createdAt: new Date(),
    });

    // Try to find a match
    const match = findMatch(ws);

    if (match) {
      // Create a room with matched users
      const roomId = `room-${Date.now()}`;
      ws.roomId = roomId;
      
      const roomUsers = new Set<WSClient>([ws]);
      
      // Add all matched users to the room
      match.forEach(matchedUser => {
        matchedUser.roomId = roomId;
        roomUsers.add(matchedUser);
        waitingUsers.delete(matchedUser.userId!);
      });
      
      rooms.set(roomId, roomUsers);

      // Notify all users in the room about each other
      roomUsers.forEach(user => {
        const peers = Array.from(roomUsers)
          .filter(u => u.userId !== user.userId)
          .map(u => ({
            userId: u.userId,
            username: u.username,
          }));

        if (user.readyState === WebSocket.OPEN) {
          user.send(JSON.stringify({
            type: 'matched',
            roomId,
            peers,
          }));
        }
      });

      console.log(`Room ${roomId} created with ${roomUsers.size} users`);
    } else {
      // No match found, add to waiting list
      waitingUsers.set(userId, ws);
      console.log(`User ${username} added to waiting list. Total waiting: ${waitingUsers.size}`);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'waiting',
          message: 'Looking for study partners...',
        }));
      }
    }
  }

  function findMatch(newUser: WSClient): WSClient[] | null {
    const matches: WSClient[] = [];
    const maxRoomSize = 3; // 2-3 users per room

    // Find users with similar preferences
    for (const [userId, waitingUser] of waitingUsers.entries()) {
      if (userId === newUser.userId) continue;

      const isSimilar = 
        waitingUser.preferences?.subject === newUser.preferences?.subject ||
        waitingUser.preferences?.mood === newUser.preferences?.mood;

      if (isSimilar) {
        matches.push(waitingUser);
        if (matches.length >= maxRoomSize - 1) break; // -1 because newUser counts
      }
    }

    // If we have at least 1 match, create a room
    // Otherwise, wait for more users
    if (matches.length >= 1) {
      return matches;
    }

    // If no similar users, but we have 2+ waiting users, match anyway
    if (waitingUsers.size >= 2) {
      const anyMatches: WSClient[] = [];
      for (const [userId, waitingUser] of waitingUsers.entries()) {
        if (userId === newUser.userId) continue;
        anyMatches.push(waitingUser);
        if (anyMatches.length >= maxRoomSize - 1) break;
      }
      return anyMatches.length >= 1 ? anyMatches : null;
    }

    return null;
  }

  function handleSignaling(ws: WSClient, message: any) {
    const { to, data, type } = message;

    // Find the target user in the same room
    if (!ws.roomId) {
      console.error('User not in a room');
      return;
    }

    const room = rooms.get(ws.roomId);
    if (!room) {
      console.error('Room not found');
      return;
    }

    // Forward signaling message to the target peer
    const targetUser = Array.from(room).find(user => user.userId === to);
    
    if (targetUser && targetUser.readyState === WebSocket.OPEN) {
      targetUser.send(JSON.stringify({
        type,
        from: ws.userId,
        data,
      }));
      console.log(`Forwarded ${type} from ${ws.username} to ${targetUser.username}`);
    } else {
      console.error(`Target user ${to} not found or not connected`);
    }
  }

  function handleLeave(ws: WSClient) {
    console.log(`User ${ws.username} (${ws.userId}) leaving`);

    // Remove from waiting list
    if (ws.userId) {
      waitingUsers.delete(ws.userId);
      storage.removeSession(ws.userId);
    }

    // Remove from room and notify others
    if (ws.roomId) {
      const room = rooms.get(ws.roomId);
      if (room) {
        room.delete(ws);

        // Notify remaining users
        room.forEach(user => {
          if (user.readyState === WebSocket.OPEN) {
            user.send(JSON.stringify({
              type: 'user-left',
              userId: ws.userId,
              username: ws.username,
            }));
          }
        });

        // Clean up empty rooms
        if (room.size === 0) {
          rooms.delete(ws.roomId);
          console.log(`Room ${ws.roomId} deleted`);
        }
      }
    }
  }

  // API endpoint to get session stats (optional)
  app.get('/api/stats', (req, res) => {
    res.json({
      waitingUsers: waitingUsers.size,
      activeRooms: rooms.size,
      totalConnections: wss.clients.size,
    });
  });

  return httpServer;
}
