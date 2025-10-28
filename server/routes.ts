import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";

interface WSClient extends WebSocket {
  userId?: string;
  username?: string;
  roomId?: string;
  lobbyRoomId?: string; // Track the original lobby/storage room ID separately
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Room API Routes
  app.post("/api/rooms", async (req, res) => {
    try {
      const { name, password, createdBy, type } = req.body;
      
      if (!name || !createdBy) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (!password) {
        return res.status(400).json({ error: "All rooms require a password" });
      }
      
      if (!type || (type !== "public" && type !== "private")) {
        return res.status(400).json({ error: "Invalid room type. Must be 'public' or 'private'" });
      }
      
      const room = storage.createRoom({
        name,
        type,
        password,
        createdBy,
        currentOccupancy: 0,
        maxOccupancy: 5,
        createdAt: new Date(),
      });
      
      res.json(room);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });
  
  app.get("/api/rooms/public", async (req, res) => {
    try {
      const allRooms = storage.getAllRooms();
      res.json(allRooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });
  
  app.post("/api/rooms/random/join", async (req, res) => {
    try {
      const joinableRooms = storage.getJoinableRooms();
      
      if (joinableRooms.length === 0) {
        return res.status(404).json({ error: "No available rooms to join" });
      }
      
      const randomIndex = Math.floor(Math.random() * joinableRooms.length);
      const randomRoom = joinableRooms[randomIndex];
      
      // Return room info without password for security
      // Occupancy will be tracked when user actually connects via WebSocket
      const { password, ...roomInfo } = randomRoom;
      res.json({ success: true, room: roomInfo });
    } catch (error) {
      console.error("Error finding random room:", error);
      res.status(500).json({ error: "Failed to find random room" });
    }
  });
  
  app.post("/api/rooms/:roomId/join", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { password } = req.body;
      
      const room = storage.getRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      if (room.currentOccupancy >= room.maxOccupancy) {
        return res.status(400).json({ error: "Room is full" });
      }
      
      if (room.password !== password) {
        return res.status(401).json({ error: "Incorrect password" });
      }
      
      // Occupancy will be tracked when user actually connects via WebSocket
      res.json({ success: true, room });
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ error: "Failed to join room" });
    }
  });
  
  // Profile API Routes
  app.post("/api/profiles", async (req, res) => {
    try {
      const { userId, bio, photoUrl } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const profile = storage.createProfile({
        userId,
        bio,
        photoUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ error: "Failed to create profile" });
    }
  });
  
  app.get("/api/profiles/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const profile = storage.getProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });
  
  app.patch("/api/profiles/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { bio, photoUrl } = req.body;
      
      const profile = storage.updateProfile(userId, { bio, photoUrl });
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  
  // Friend API Routes
  app.post("/api/friends/request", async (req, res) => {
    try {
      const { requesterId, receiverId } = req.body;
      
      if (!requesterId || !receiverId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const friendRequest = storage.createFriendRequest({
        requesterId,
        receiverId,
        status: "pending",
        createdAt: new Date(),
      });
      
      res.json(friendRequest);
    } catch (error) {
      console.error("Error creating friend request:", error);
      res.status(500).json({ error: "Failed to create friend request" });
    }
  });
  
  app.patch("/api/friends/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status } = req.body;
      
      if (status !== "accepted" && status !== "declined") {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const friendRequest = storage.updateFriendRequestStatus(requestId, status);
      
      if (!friendRequest) {
        return res.status(404).json({ error: "Friend request not found" });
      }
      
      res.json(friendRequest);
    } catch (error) {
      console.error("Error updating friend request:", error);
      res.status(500).json({ error: "Failed to update friend request" });
    }
  });
  
  app.get("/api/friends/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const friends = storage.getFriends(userId);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  });
  
  app.get("/api/friends/:userId/requests", async (req, res) => {
    try {
      const { userId } = req.params;
      const requests = storage.getFriendRequestsByUser(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      res.status(500).json({ error: "Failed to fetch friend requests" });
    }
  });
  
  // Message API Routes
  app.post("/api/messages", async (req, res) => {
    try {
      const { senderId, receiverId, content } = req.body;
      
      if (!senderId || !receiverId || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const message = storage.createMessage({
        senderId,
        receiverId,
        content,
        read: false,
        createdAt: new Date(),
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });
  
  app.get("/api/messages/:userId1/:userId2", async (req, res) => {
    try {
      const { userId1, userId2 } = req.params;
      const messages = storage.getMessages(userId1, userId2);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.patch("/api/messages/:messageId/read", async (req, res) => {
    try {
      const { messageId } = req.params;
      storage.markMessageAsRead(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });
  
  app.get("/api/messages/:userId/unread-count", async (req, res) => {
    try {
      const { userId } = req.params;
      const count = storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

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
    const { userId, username, roomId } = message;
    
    ws.userId = userId;
    ws.username = username;
    if (roomId) {
      // Check if room has capacity before joining
      const storedRoom = storage.getRoom(roomId);
      if (storedRoom) {
        if (storedRoom.currentOccupancy >= storedRoom.maxOccupancy) {
          console.log(`Room ${roomId} is full (${storedRoom.currentOccupancy}/${storedRoom.maxOccupancy})`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Room is full',
            }));
          }
          return; // Don't allow join
        }
        
        ws.lobbyRoomId = roomId; // Store as lobby room ID
        ws.roomId = roomId; // Also set as current room ID for matching
        
        // Increment occupancy when user joins via WebSocket
        storage.updateRoomOccupancy(roomId, storedRoom.currentOccupancy + 1);
        console.log(`Incremented occupancy for lobby room ${roomId} to ${storedRoom.currentOccupancy + 1}`);
      } else {
        ws.lobbyRoomId = roomId;
        ws.roomId = roomId;
      }
    }

    console.log(`User ${username} (${userId}) joining${roomId ? ` lobby room ${roomId}` : ''}`);

    // Store session
    storage.createSession({
      userId,
      username,
      createdAt: new Date(),
    });

    // Try to find a match
    const match = findMatch(ws);

    if (match) {
      // Create a WebRTC room with matched users (keep lobbyRoomId intact)
      const webrtcRoomId = `webrtc-${Date.now()}`;
      ws.roomId = webrtcRoomId;
      
      const roomUsers = new Set<WSClient>([ws]);
      
      // Add all matched users to the WebRTC room
      match.forEach(matchedUser => {
        matchedUser.roomId = webrtcRoomId;
        roomUsers.add(matchedUser);
        waitingUsers.delete(matchedUser.userId!);
        waitingStartTimes.delete(matchedUser.userId!);
      });
      
      rooms.set(webrtcRoomId, roomUsers);

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
        
        // Create a WebRTC room with matched users (keep lobbyRoomId intact)
        const webrtcRoomId = `webrtc-${Date.now()}`;
        ws.roomId = webrtcRoomId;
        
        const roomUsers = new Set<WSClient>([ws]);
        
        // Add all matched users to the WebRTC room
        match.forEach(matchedUser => {
          matchedUser.roomId = webrtcRoomId;
          roomUsers.add(matchedUser);
          waitingUsers.delete(matchedUser.userId!);
          waitingStartTimes.delete(matchedUser.userId!);
        });
        
        // Remove current user from waiting
        waitingUsers.delete(userId);
        waitingStartTimes.delete(userId);
        
        rooms.set(webrtcRoomId, roomUsers);

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
              roomId: webrtcRoomId,
              peers,
            }));
          }
        });

        console.log(`WebRTC room ${webrtcRoomId} created with ${roomUsers.size} users (from periodic retry)`);
      } else {
        console.log(`Still searching for match for ${username}... (${Math.floor(elapsed / 1000)}s elapsed)`);
      }
    }, 5000); // Retry every 5 seconds
  }

  function findMatch(newUser: WSClient): WSClient[] | null {
    const maxRoomSize = 5; // Up to 5 users per room

    console.log(`Finding match for ${newUser.username}${newUser.roomId ? ` in room ${newUser.roomId}` : ''}`);

    // If user specified a room, only match with users in the same room
    const compatibleUsers: WSClient[] = [];
    
    for (const [userId, waitingUser] of Array.from(waitingUsers.entries())) {
      if (userId === newUser.userId) continue;
      
      // If user specified a room, only match with users in the same room
      if (newUser.roomId && waitingUser.roomId !== newUser.roomId) {
        continue;
      }
      
      // If user didn't specify a room, only match with others who didn't specify a room
      if (!newUser.roomId && waitingUser.roomId) {
        continue;
      }
      
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

    // Decrement occupancy for the lobby room if user was in one
    if (ws.lobbyRoomId) {
      const storedRoom = storage.getRoom(ws.lobbyRoomId);
      if (storedRoom) {
        storage.updateRoomOccupancy(ws.lobbyRoomId, Math.max(0, storedRoom.currentOccupancy - 1));
        console.log(`Decremented occupancy for lobby room ${ws.lobbyRoomId} to ${Math.max(0, storedRoom.currentOccupancy - 1)}`);
      }
    }

    // Remove from WebRTC room and notify others
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

        // Clean up empty WebRTC rooms
        if (room.size === 0) {
          rooms.delete(ws.roomId);
          console.log(`WebRTC room ${ws.roomId} deleted`);
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
