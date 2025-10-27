import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";

interface WSClient extends WebSocket {
  userId?: string;
  username?: string;
  roomId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for signaling - using /ws path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Active sessions waiting to be matched
  const waitingUsers: Map<string, WSClient> = new Map();
  
  // Track when each user started waiting (for 1-minute delay)
  const waitingStartTimes: Map<string, number> = new Map();
  
  // Active rooms (each room has 2-3 users)
  const rooms: Map<string, Set<WSClient>> = new Map();
  
  // Search timeout in milliseconds (1 minute)
  const SEARCH_TIMEOUT = 60000;

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
    const { userId, username } = message;
    
    ws.userId = userId;
    ws.username = username;

    console.log(`User ${username} (${userId}) joining`);

    // Store session
    storage.createSession({
      userId,
      username,
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
        waitingStartTimes.delete(matchedUser.userId!);
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
      // No match found - add to waiting list and start searching
      waitingUsers.set(userId, ws);
      const startTime = Date.now();
      waitingStartTimes.set(userId, startTime);
      
      console.log(`User ${username} added to waiting list. Total waiting: ${waitingUsers.size}`);
      
      // Always show "searching" message initially
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'waiting',
          message: 'Looking for study partners...',
        }));
      }
      
      // Start periodic retry with 1-minute timeout
      startPeriodicRetry(ws, userId, username);
    }
  }

  function startPeriodicRetry(ws: WSClient, userId: string, username: string) {
    // Retry matching every 5 seconds
    const retryInterval = setInterval(() => {
      // Check if user is still waiting
      if (!waitingUsers.has(userId)) {
        clearInterval(retryInterval);
        return;
      }
      
      // Check if 1 minute has passed
      const startTime = waitingStartTimes.get(userId);
      const elapsed = Date.now() - (startTime || 0);
      
      if (elapsed >= SEARCH_TIMEOUT) {
        // 1 minute passed - show "no one available" message
        clearInterval(retryInterval);
        
        const message = 'No one is available at this time';
        
        console.log(`Search timeout for ${username} after 1 minute`);
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'waiting',
            message,
          }));
        }
        return;
      }
      
      // Try to find a match again
      const match = findMatch(ws);
      
      if (match) {
        clearInterval(retryInterval);
        
        // Create a room with matched users
        const roomId = `room-${Date.now()}`;
        ws.roomId = roomId;
        
        const roomUsers = new Set<WSClient>([ws]);
        
        // Add all matched users to the room
        match.forEach(matchedUser => {
          matchedUser.roomId = roomId;
          roomUsers.add(matchedUser);
          waitingUsers.delete(matchedUser.userId!);
          waitingStartTimes.delete(matchedUser.userId!);
        });
        
        // Remove current user from waiting
        waitingUsers.delete(userId);
        waitingStartTimes.delete(userId);
        
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

        console.log(`Room ${roomId} created with ${roomUsers.size} users (from periodic retry)`);
      } else {
        console.log(`Still searching for match for ${username}... (${Math.floor(elapsed / 1000)}s elapsed)`);
      }
    }, 5000); // Retry every 5 seconds
  }

  function findMatch(newUser: WSClient): WSClient[] | null {
    const maxRoomSize = 5; // Up to 5 users per room

    console.log(`Finding match for ${newUser.username}`);

    // Find compatible waiting users (anyone!)
    const compatibleUsers: WSClient[] = [];
    
    for (const [userId, waitingUser] of Array.from(waitingUsers.entries())) {
      if (userId === newUser.userId) continue;
      
      // Anyone can match with anyone
      compatibleUsers.push(waitingUser);
      if (compatibleUsers.length >= maxRoomSize - 1) break;
    }

    return compatibleUsers.length >= 1 ? compatibleUsers : null;
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
      waitingStartTimes.delete(ws.userId);
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
