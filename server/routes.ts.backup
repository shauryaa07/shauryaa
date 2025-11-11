import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema } from "@shared/schema";

// Request validation schemas
const createRoomSchema = z.object({
  name: z.string().min(1, "Room name is required").max(50, "Room name too long"),
  password: z.string().optional(),
  createdBy: z.string().min(1, "Creator ID is required"),
  type: z.enum(["public", "private"], { errorMap: () => ({ message: "Type must be 'public' or 'private'" }) }),
});

const joinRoomSchema = z.object({
  password: z.string().optional(),
  userId: z.string().min(1, "User ID is required"),
});

interface WSClient extends WebSocket {
  userId?: string;
  username?: string;
  roomId?: string;
  lobbyRoomId?: string; // Track the original lobby/storage room ID separately
  isAlive?: boolean;
  isMessagingClient?: boolean; // Track if client is connected for messaging
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  app.get("/api/health", async (req, res) => {
    try {
      await storage.getAllSessions();
      res.json({ status: "ok", database: "connected" });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({ 
        status: "error", 
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validationResult = registerSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const { username, email, password } = validationResult.data;
      
      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(409).json({ error: "Username already exists" });
      }
      
      // Check if email already exists
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(409).json({ error: "Email already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 8);
      
      // Create user with hashed password
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
      });
      
      // Store user session (you can add session management later)
      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        message: "Registration successful"
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const { email, password } = validationResult.data;
      
      // Get user with password for authentication using email
      const user = await storage.getUserWithPassword(email);
      
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      // Return user without password
      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        message: "Login successful"
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      // For now, just send success response
      // In the future, you can invalidate sessions here
      res.json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  app.post("/api/auth/test-account", async (req, res) => {
    try {
      const testUsername = "TestUser";
      const testEmail = "test@heybuddy.app";
      const testPassword = "test123";
      
      // Try to get existing test user
      let user = await storage.getUserByEmail(testEmail);
      
      // If test user doesn't exist, create it
      if (!user) {
        const hashedPassword = await bcrypt.hash(testPassword, 8);
        user = await storage.createUser({
          username: testUsername,
          email: testEmail,
          password: hashedPassword,
        });
      }
      
      // Return user without password
      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        message: "Test account login successful"
      });
    } catch (error) {
      console.error("Error with test account:", error);
      res.status(500).json({ error: "Failed to login with test account" });
    }
  });

  app.post("/api/users/upsert", async (req, res) => {
    try {
      const { username, email } = req.body;
      
      if (!username || username.trim().length < 2 || username.trim().length > 20) {
        return res.status(400).json({ error: "Username must be between 2 and 20 characters" });
      }
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Valid email is required" });
      }
      
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim();
      
      const user = await storage.upsertUser({
        username: trimmedUsername,
        email: trimmedEmail,
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error upserting user:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ 
        error: "Failed to create or get user",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // Room API Routes
  app.post("/api/rooms", async (req, res) => {
    try {
      const validationResult = createRoomSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const { name, password, createdBy, type } = validationResult.data;
      
      // Only require password for private rooms
      if (type === "private" && !password) {
        return res.status(400).json({ error: "Private rooms require a password" });
      }
      
      const room = await storage.createRoom({
        name,
        type,
        password: type === "private" ? password : undefined,
        createdBy,
        currentOccupancy: 0,
        maxOccupancy: 5,
        createdAt: new Date(),
      });
      
      // Strip password from response for security
      const { password: _, ...roomWithoutPassword } = room;
      res.json(roomWithoutPassword);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });
  
  app.get("/api/rooms/public", async (req, res) => {
    try {
      const publicRooms = await storage.getPublicRooms();
      const roomsWithoutPasswords = publicRooms.map(({ password, ...room }) => room);
      res.json(roomsWithoutPasswords);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });
  
  app.post("/api/rooms/random/join", async (req, res) => {
    try {
      const joinableRooms = await storage.getJoinableRooms();
      
      if (joinableRooms.length === 0) {
        return res.status(200).json({ 
          success: false, 
          error: "No rooms available right now. Please create a new room or try again later." 
        });
      }
      
      const randomIndex = Math.floor(Math.random() * joinableRooms.length);
      const randomRoom = joinableRooms[randomIndex];
      
      // Return room info without password for security
      const { password: _, ...roomInfo } = randomRoom;
      res.json({ success: true, room: roomInfo });
    } catch (error) {
      console.error("Error finding random room:", error);
      res.status(500).json({ error: "Failed to find random room" });
    }
  });
  
  // Search rooms by ID (both public and private can be found by ID)
  app.get("/api/rooms/search", async (req, res) => {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: "Room ID is required" });
      }
      
      // Search all rooms by room.name (which contains the user-friendly room ID)
      // The "name" field is set to the generated 8-character room ID from the frontend
      const allRooms = await storage.getAllRooms();
      const searchQuery = (id as string).toUpperCase();
      const matchingRooms = allRooms.filter(room => 
        room.name.toUpperCase() === searchQuery
      );
      
      // Remove passwords from response for security
      const roomsWithoutPasswords = matchingRooms.map(({ password, ...room }) => room);
      res.json(roomsWithoutPasswords);
    } catch (error) {
      console.error("Error searching rooms:", error);
      res.status(500).json({ error: "Failed to search rooms" });
    }
  });
  
  app.post("/api/rooms/:roomId/join", async (req, res) => {
    try {
      const { roomId } = req.params;
      
      const validationResult = joinRoomSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const { password, userId } = validationResult.data;
      
      const room = await storage.getRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      // Check capacity but don't reserve yet (WebSocket will do atomic check-and-increment)
      if (room.currentOccupancy >= room.maxOccupancy) {
        return res.status(400).json({ error: "Room is full" });
      }
      
      // Only check password for private rooms
      if (room.type === "private" && room.password !== password) {
        return res.status(401).json({ error: "Incorrect password" });
      }
      
      // Validation passed, create pending join reservation
      pendingJoins.set(userId, roomId);
      console.log(`Created pending join for user ${userId} to room ${roomId}`);
      
      // Auto-expire reservation after 30 seconds if WebSocket doesn't connect
      setTimeout(() => {
        if (pendingJoins.get(userId) === roomId) {
          pendingJoins.delete(userId);
          console.log(`Expired pending join for user ${userId} to room ${roomId}`);
        }
      }, 30000);
      
      // Return room info without password
      const { password: _, ...roomWithoutPassword } = room;
      res.json({ success: true, room: roomWithoutPassword });
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
      
      const profile = await storage.createProfile({
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
      const profile = await storage.getProfile(userId);
      
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
      
      const profile = await storage.updateProfile(userId, { bio, photoUrl });
      
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
      
      const friendRequest = await storage.createFriendRequest({
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
      
      const friendRequest = await storage.updateFriendRequestStatus(requestId, status);
      
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
      const friends = await storage.getFriends(userId);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  });
  
  app.get("/api/friends/:userId/requests", async (req, res) => {
    try {
      const { userId } = req.params;
      const requests = await storage.getFriendRequestsByUser(userId);
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
      
      const message = await storage.createMessage({
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
      const messages = await storage.getMessages(userId1, userId2);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.patch("/api/messages/:messageId/read", async (req, res) => {
    try {
      const { messageId } = req.params;
      await storage.markMessageAsRead(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });
  
  app.get("/api/messages/:userId/unread-count", async (req, res) => {
    try {
      const { userId } = req.params;
      const count = await storage.getUnreadMessageCount(userId);
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
  
  // Persistent mapping from lobby room ID to WebRTC room info
  // This survives socket disconnects so new users can find existing rooms
  const lobbyRoomMap: Map<string, { webrtcRoomId: string, members: Set<WSClient> }> = new Map();
  
  // Pending join reservations: userId → roomId
  // Created by REST API validation, consumed by WebSocket join
  const pendingJoins: Map<string, string> = new Map();
  
  // Search timeout in milliseconds (1 minute)
  const SEARCH_TIMEOUT = 60000;

  // Ping clients every 30 seconds to detect dead connections
  const pingInterval = setInterval(() => {
    wss.clients.forEach((client: any) => {
      const wsClient = client as WSClient;
      
      if (wsClient.isAlive === false) {
        console.log(`Terminating dead connection for user ${wsClient.username || 'unknown'}`);
        handleLeave(wsClient);
        return wsClient.terminate();
      }
      
      wsClient.isAlive = false;
      wsClient.ping();
    });
  }, 30000);
  
  // Cleanup interval on server shutdown
  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  wss.on('connection', (ws: WSClient) => {
    console.log('New WebSocket connection');
    
    // Set up ping/pong for connection health monitoring
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data.toString());
        if (process.env.NODE_ENV === 'development') {
          console.log('Received message:', message);
        }

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
          case 'dm-message':
            handleDirectMessage(ws, message);
            break;
          case 'register-messaging':
            handleMessagingRegistration(ws, message);
            break;
          case 'participant-state':
            handleParticipantState(ws, message);
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

  async function handleJoin(ws: WSClient, message: any) {
    const { userId, username, roomId } = message;
    
    ws.userId = userId;
    ws.username = username;
    if (roomId) {
      // Validate pending join reservation
      const reservedRoomId = pendingJoins.get(userId);
      if (reservedRoomId !== roomId) {
        console.log(`No valid reservation for user ${userId} to join room ${roomId}`);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unauthorized join - please use the join room API first',
          }));
        }
        return;
      }
      
      // Remove pending join after validation
      pendingJoins.delete(userId);
      console.log(`Consumed pending join reservation for user ${userId} to room ${roomId}`);
      
      const storedRoom = await storage.getRoom(roomId);
      if (!storedRoom) {
        console.log(`Room ${roomId} not found`);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Room not found',
          }));
        }
        return;
      }
      
      // Atomically check capacity and increment (synchronous operations are atomic in Node.js)
      if (storedRoom.currentOccupancy >= storedRoom.maxOccupancy) {
        console.log(`Room ${roomId} is full (${storedRoom.currentOccupancy}/${storedRoom.maxOccupancy})`);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Room is full',
          }));
        }
        return;
      }
      
      // Increment occupancy atomically
      await storage.updateRoomOccupancy(roomId, storedRoom.currentOccupancy + 1);
      console.log(`User joined room ${roomId}, occupancy now ${storedRoom.currentOccupancy + 1}/${storedRoom.maxOccupancy}`);
      
      ws.lobbyRoomId = roomId;
    }

    console.log(`User ${username} (${userId}) joining${roomId ? ` lobby room ${roomId}` : ''}`);

    // Store session
    await storage.createSession({
      userId,
      username,
      createdAt: new Date(),
    });

    // Check if there's an existing WebRTC room for this lobby room using persistent map
    let lobbyInfo = roomId ? lobbyRoomMap.get(roomId) : null;
    
    if (lobbyInfo) {
      // Check if the WebRTC room still exists
      const existingWebrtcRoom = rooms.get(lobbyInfo.webrtcRoomId);
      
      if (existingWebrtcRoom) {
        // Join the existing WebRTC room
        const existingWebrtcRoomId = lobbyInfo.webrtcRoomId;
        ws.roomId = existingWebrtcRoomId;
        existingWebrtcRoom.add(ws);
        lobbyInfo.members.add(ws); // Also add to persistent tracking
        
        // Remove from waiting list if present
        waitingUsers.delete(userId);
        waitingStartTimes.delete(userId);
        
        console.log(`User ${username} joined existing WebRTC room ${existingWebrtcRoomId} (lobby room: ${roomId})`);
        
        // Notify all users in the room about the updated peer list
        existingWebrtcRoom.forEach(user => {
          const peers = Array.from(existingWebrtcRoom)
            .filter(u => u.userId !== user.userId)
            .map(u => ({
              userId: u.userId,
              username: u.username,
            }));

          if (user.readyState === WebSocket.OPEN) {
            user.send(JSON.stringify({
              type: user.userId === userId ? 'matched' : 'user-joined',
              roomId: existingWebrtcRoomId,
              peers,
            }));
          }
        });

        console.log(`WebRTC room ${existingWebrtcRoomId} now has ${existingWebrtcRoom.size} users`);
      } else {
        // Stale mapping - WebRTC room was deleted but lobby mapping persisted
        console.log(`Stale lobby mapping detected for ${roomId}, cleaning up and creating new room`);
        lobbyRoomMap.delete(roomId);
        lobbyInfo = null; // Fall through to create new room
      }
    }
    
    if (!lobbyInfo) {
      // Create a new WebRTC room for this user
      const webrtcRoomId = `webrtc-${Date.now()}`;
      ws.roomId = webrtcRoomId;
      
      const roomUsers = new Set<WSClient>([ws]);
      rooms.set(webrtcRoomId, roomUsers);
      
      // If this is a lobby room, add to persistent map so future joins can find it
      if (roomId) {
        lobbyRoomMap.set(roomId, {
          webrtcRoomId,
          members: new Set<WSClient>([ws])
        });
        console.log(`Created lobby mapping: ${roomId} → ${webrtcRoomId}`);
      }
      
      // Immediately send matched event with empty peers list
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'matched',
          roomId: webrtcRoomId,
          peers: [], // No peers yet
        }));
      }
      
      console.log(`User ${username} created new WebRTC room ${webrtcRoomId} (lobby room: ${roomId || 'none'}), waiting for others...`);
      
      // Add to waiting list so others can find them (only for random matching, not lobby rooms)
      if (!roomId) {
        waitingUsers.set(userId, ws);
        const startTime = Date.now();
        waitingStartTimes.set(userId, startTime);
        
        // Start periodic retry to find more users
        startPeriodicRetry(ws, userId, username);
      }
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
      
      if (match && match.length > 0) {
        clearInterval(retryInterval);
        
        // Find the existing WebRTC room for this user
        const existingWebrtcRoomId = ws.roomId;
        const existingRoom = existingWebrtcRoomId ? rooms.get(existingWebrtcRoomId) : null;
        
        if (existingRoom) {
          // User is already in a room, add new users to their room
          match.forEach(matchedUser => {
            matchedUser.roomId = existingWebrtcRoomId;
            existingRoom.add(matchedUser);
            waitingUsers.delete(matchedUser.userId!);
            waitingStartTimes.delete(matchedUser.userId!);
          });
          
          // Remove current user from waiting
          waitingUsers.delete(userId);
          waitingStartTimes.delete(userId);
          
          // Notify all users in the room about the new peers
          existingRoom.forEach(user => {
            const peers = Array.from(existingRoom)
              .filter(u => u.userId !== user.userId)
              .map(u => ({
                userId: u.userId,
                username: u.username,
              }));

            if (user.readyState === WebSocket.OPEN) {
              user.send(JSON.stringify({
                type: 'user-joined',
                peers,
              }));
            }
          });

          console.log(`Added ${match.length} user(s) to existing room. Room now has ${existingRoom.size} users (from periodic retry)`);
        }
      } else {
        console.log(`Still searching for match for ${username}... (${Math.floor(elapsed / 1000)}s elapsed)`);
      }
    }, 5000); // Retry every 5 seconds
  }

  function findMatch(newUser: WSClient): WSClient[] | null {
    const maxRoomSize = 5; // Up to 5 users per room

    console.log(`Finding match for ${newUser.username}${newUser.lobbyRoomId ? ` in lobby room ${newUser.lobbyRoomId}` : ''}`);

    // If user specified a room, only match with users in the same lobby room
    const compatibleUsers: WSClient[] = [];
    
    for (const [userId, waitingUser] of Array.from(waitingUsers.entries())) {
      if (userId === newUser.userId) continue;
      
      // If user specified a lobby room, only match with users in the same lobby room
      if (newUser.lobbyRoomId && waitingUser.lobbyRoomId !== newUser.lobbyRoomId) {
        continue;
      }
      
      // If user didn't specify a lobby room, only match with others who didn't specify a lobby room
      if (!newUser.lobbyRoomId && waitingUser.lobbyRoomId) {
        continue;
      }
      
      compatibleUsers.push(waitingUser);
      if (compatibleUsers.length >= maxRoomSize - 1) break;
    }

    return compatibleUsers.length >= 1 ? compatibleUsers : null;
  }

  function handleSignaling(ws: WSClient, message: any) {
    const { to, data, type } = message;
    
    console.log(`[SERVER SIGNAL DEBUG] Received signaling message:`, JSON.stringify(message, null, 2));
    console.log(`[SERVER SIGNAL DEBUG] Extracted: to=${to}, type=${type}, data=`, data);

    // Validate that we have a proper signal type
    if (!type || !['offer', 'answer', 'ice-candidate'].includes(type)) {
      console.error(`[SERVER SIGNAL ERROR] Invalid or missing signal type: ${type}`);
      return;
    }

    // Validate sender has userId and username set
    if (!ws.userId || !ws.username) {
      console.error(`[SERVER SIGNAL ERROR] Sender missing userId or username: userId=${ws.userId}, username=${ws.username}`);
      return;
    }

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
    
    // CRITICAL: Never send signals back to the sender (prevent loopback connections)
    if (targetUser && targetUser.userId === ws.userId) {
      console.warn(`[SERVER SIGNAL DEBUG] Prevented loopback: user ${ws.userId} tried to signal themselves`);
      return;
    }
    
    if (targetUser && targetUser.readyState === WebSocket.OPEN) {
      // CRITICAL: Ensure we forward the exact signal type so the client can route to correct handler
      // Include both userId (from) and username so client can properly identify the peer
      const forwardedMessage = {
        type: type,  // Explicitly forward the signal type (offer/answer/ice-candidate)
        from: ws.userId,
        username: ws.username,  // Include username for client-side peer identification
        data: data,
      };
      console.log(`[SERVER SIGNAL DEBUG] Forwarding message to ${targetUser.username}:`, JSON.stringify(forwardedMessage, null, 2));
      targetUser.send(JSON.stringify(forwardedMessage));
      console.log(`Forwarded ${type} from ${ws.username} (${ws.userId}) to ${targetUser.username} (${targetUser.userId})`);
    } else {
      console.error(`Target user ${to} not found or not connected`);
    }
  }

  async function handleLeave(ws: WSClient) {
    console.log(`User ${ws.username} (${ws.userId}) leaving`);

    // Remove from waiting list
    if (ws.userId) {
      waitingUsers.delete(ws.userId);
      waitingStartTimes.delete(ws.userId);
      storage.removeSession(ws.userId);
    }

    // Remove from WebRTC room first and get the actual room size
    let actualRoomSize = 0;
    if (ws.roomId) {
      const room = rooms.get(ws.roomId);
      if (room) {
        room.delete(ws);
        actualRoomSize = room.size;

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
        if (actualRoomSize === 0) {
          rooms.delete(ws.roomId);
          console.log(`WebRTC room ${ws.roomId} deleted (no participants remaining)`);
        } else {
          console.log(`WebRTC room ${ws.roomId} still has ${actualRoomSize} participant(s)`);
        }
      }
    }

    // Update lobby room tracking and occupancy based on actual WebRTC room size
    // Clean up from persistent lobby map - search all mappings to ensure we remove this ws
    for (const [lobbyId, lobbyInfo] of Array.from(lobbyRoomMap.entries())) {
      if (lobbyInfo.members.has(ws)) {
        lobbyInfo.members.delete(ws);
        console.log(`Removed ${ws.username} from lobby ${lobbyId} members (${lobbyInfo.members.size} remaining)`);
        
        // Only delete lobby mapping when no members remain
        if (lobbyInfo.members.size === 0) {
          lobbyRoomMap.delete(lobbyId);
          console.log(`Deleted lobby mapping for ${lobbyId} (no members remaining)`);
        }
      }
    }
    
    if (ws.lobbyRoomId) {
      const lobbyInfo = lobbyRoomMap.get(ws.lobbyRoomId);
      
      const storedRoom = await storage.getRoom(ws.lobbyRoomId);
      if (storedRoom) {
        // Persist the actual room size to storage (use lobby map size for accuracy)
        const actualOccupancy = lobbyInfo ? lobbyInfo.members.size : actualRoomSize;
        await storage.updateRoomOccupancy(ws.lobbyRoomId, actualOccupancy);
        console.log(`Updated lobby room ${ws.lobbyRoomId} occupancy to ${actualOccupancy}`);
        
        // Only delete room if both the WebRTC room is empty AND no one is waiting
        const hasWaitingUsers = Array.from(waitingUsers.values()).some(
          waitingUser => waitingUser.lobbyRoomId === ws.lobbyRoomId
        );
        
        if (actualOccupancy === 0 && !hasWaitingUsers) {
          await storage.deleteRoom(ws.lobbyRoomId);
          console.log(`Deleted empty lobby room ${ws.lobbyRoomId} (no participants or waiting users)`);
        } else if (actualOccupancy > 0) {
          console.log(`Keeping lobby room ${ws.lobbyRoomId} - still has ${actualOccupancy} active participant(s)`);
        } else if (hasWaitingUsers) {
          console.log(`Keeping lobby room ${ws.lobbyRoomId} - has waiting users`);
        }
      }
    }
  }

  function handleMessagingRegistration(ws: WSClient, message: any) {
    const { userId, username } = message;
    ws.userId = userId;
    ws.username = username;
    ws.isMessagingClient = true;
    console.log(`User ${username} (${userId}) registered for messaging`);
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'messaging-registered',
        success: true,
      }));
    }
  }

  function handleParticipantState(ws: WSClient, message: any) {
    const { isMuted, isVideoOff } = message;
    
    if (!ws.roomId) {
      console.error('Participant state update from user not in a room');
      return;
    }

    const room = rooms.get(ws.roomId);
    if (!room) {
      console.error('Room not found for participant state update');
      return;
    }

    room.forEach(user => {
      if (user.userId !== ws.userId && user.readyState === WebSocket.OPEN) {
        user.send(JSON.stringify({
          type: 'participant-state-update',
          userId: ws.userId,
          username: ws.username,
          isMuted,
          isVideoOff,
        }));
      }
    });

    console.log(`Broadcasted state update from ${ws.username}: muted=${isMuted}, videoOff=${isVideoOff}`);
  }

  function handleDirectMessage(ws: WSClient, message: any) {
    const { receiverId, content } = message;
    
    if (!ws.userId) {
      console.error('Direct message from unregistered client');
      return;
    }

    // Find the receiver's WebSocket connection
    const receiverClient = Array.from(wss.clients).find((client) => {
      const wsClient = client as WSClient;
      return wsClient.userId === receiverId && wsClient.isMessagingClient;
    }) as WSClient | undefined;

    if (receiverClient && receiverClient.readyState === WebSocket.OPEN) {
      receiverClient.send(JSON.stringify({
        type: 'dm-message',
        senderId: ws.userId,
        content,
        timestamp: new Date().toISOString(),
      }));
      console.log(`Direct message sent from ${ws.userId} to ${receiverId}`);
    } else {
      console.log(`Receiver ${receiverId} not connected or not available for messaging`);
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
