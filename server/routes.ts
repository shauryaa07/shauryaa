import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema } from "@shared/schema";
import { generateLiveKitToken, getLiveKitConfig, validateLiveKitConfig } from "./livekit";

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

const tokenRequestSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  userId: z.string().min(1, "User ID is required"),
  username: z.string().min(1, "Username is required"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Check LiveKit configuration on startup
  const livekitConfig = validateLiveKitConfig();
  if (!livekitConfig.valid) {
    console.warn(`⚠️  LiveKit Warning: ${livekitConfig.message}`);
    console.warn("⚠️  For production use, set environment variables:");
    console.warn("   - LIVEKIT_URL (e.g., wss://your-livekit-server.com)");
    console.warn("   - LIVEKIT_API_KEY");
    console.warn("   - LIVEKIT_API_SECRET");
  } else {
    console.log("✅ LiveKit configured successfully");
  }

  app.get("/api/health", async (req, res) => {
    try {
      await storage.getAllSessions();
      const config = getLiveKitConfig();
      res.json({ 
        status: "ok", 
        database: "connected",
        livekit: {
          url: config.url,
          configured: livekitConfig.valid
        }
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({ 
        status: "error", 
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // LiveKit Token Generation - SECURED with session authentication
  app.post("/api/livekit/token", async (req, res) => {
    try {
      // SECURITY: Verify user is authenticated via session
      if (!req.session.userId || !req.session.username) {
        return res.status(401).json({ error: "Unauthorized: Please log in first" });
      }

      // Get roomId from request body
      const { roomId } = req.body;
      if (!roomId) {
        return res.status(400).json({ error: "Room ID is required" });
      }

      // SECURITY: Use userId and username from session (server-side, trusted)
      const userId = req.session.userId;
      const username = req.session.username;

      // SECURITY: Verify the user still exists in storage
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized: User not found" });
      }

      // SECURITY: Check if room exists and user is authorized to join
      const allRooms = await storage.getPublicRooms();
      const room = allRooms.find(r => r.id === roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      // Check if room is full
      if (room.currentOccupancy >= room.maxOccupancy) {
        return res.status(403).json({ error: "Room is full" });
      }

      // For private rooms, ensure user has already passed password validation at join endpoint
      // This endpoint assumes authorization has been granted

      // Generate LiveKit access token with session-authenticated user info
      const token = await generateLiveKitToken(
        roomId, 
        userId, // From session, not request
        JSON.stringify({ username }) // From session, not request
      );
      const config = getLiveKitConfig();

      res.json({ 
        token,
        url: config.url,
        roomId
      });
    } catch (error) {
      console.error("Error generating LiveKit token:", error);
      res.status(500).json({ error: "Failed to generate access token" });
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
      
      // Store user session
      req.session.userId = user.id;
      req.session.username = user.username;

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
      
      // Store user session
      req.session.userId = user.id;
      req.session.username = user.username;

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
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.json({ message: "Logout successful" });
      });
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
      
      // Store user session
      req.session.userId = user.id;
      req.session.username = user.username;

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
      
      res.json(room);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  app.get("/api/rooms/public", async (req, res) => {
    try {
      const rooms = await storage.getPublicRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching public rooms:", error);
      res.status(500).json({ error: "Failed to fetch public rooms" });
    }
  });

  app.post("/api/rooms/random/join", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Get all available public rooms
      const rooms = await storage.getPublicRooms();
      const availableRooms = rooms.filter(r => r.currentOccupancy < r.maxOccupancy);

      if (availableRooms.length === 0) {
        return res.status(404).json({ error: "No available rooms found" });
      }

      // Pick a random room
      const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];

      res.json(randomRoom);
    } catch (error) {
      console.error("Error finding random room:", error);
      res.status(500).json({ error: "Failed to find random room" });
    }
  });

  app.get("/api/rooms/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: "Search query is required" });
      }

      // Get all public rooms and filter by name
      const allRooms = await storage.getPublicRooms();
      const rooms = allRooms.filter(room => 
        room.name.toLowerCase().includes(query.trim().toLowerCase())
      );
      res.json(rooms);
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

      // Get all rooms and find the one with matching ID
      const allRooms = await storage.getPublicRooms();
      const room = allRooms.find(r => r.id === roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      // Check if room is full
      if (room.currentOccupancy >= room.maxOccupancy) {
        return res.status(403).json({ error: "Room is full" });
      }

      // Validate password for private rooms
      if (room.type === "private" && room.password !== password) {
        return res.status(401).json({ error: "Invalid password" });
      }

      res.json({ success: true, room });
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ error: "Failed to join room" });
    }
  });

  // Profile Routes
  app.post("/api/profiles", async (req, res) => {
    try {
      const { userId, bio, photoUrl } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
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
      // For now, return a basic profile structure
      // In production, implement storage.getProfileByUserId
      const profile = {
        userId,
        bio: "",
        photoUrl: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
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

      const profile = await storage.updateProfile(userId, {
        bio,
        photoUrl,
        updatedAt: new Date(),
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Friend Routes
  app.post("/api/friends/request", async (req, res) => {
    try {
      const { requesterId, receiverId } = req.body;
      
      if (!requesterId || !receiverId) {
        return res.status(400).json({ error: "Both requester ID and receiver ID are required" });
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
      
      if (!status || !["accepted", "declined"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'accepted' or 'declined'" });
      }

      // For now, return a basic response
      // In production, implement storage.updateFriendRequest
      const updatedRequest = {
        id: requestId,
        requesterId: "",
        receiverId: "",
        status,
        createdAt: new Date(),
      };
      
      res.json(updatedRequest);
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
      // For now, return empty array
      // In production, implement storage.getFriendRequests
      const requests: any[] = [];
      res.json(requests);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      res.status(500).json({ error: "Failed to fetch friend requests" });
    }
  });

  // Message Routes
  app.post("/api/messages", async (req, res) => {
    try {
      const { senderId, receiverId, content } = req.body;
      
      if (!senderId || !receiverId || !content) {
        return res.status(400).json({ error: "Sender ID, receiver ID, and content are required" });
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
      const message = await storage.markMessageAsRead(messageId);
      res.json(message);
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

  app.get('/api/stats', (req, res) => {
    res.json({
      status: "ok",
      livekit: livekitConfig.valid,
    });
  });

  return httpServer;
}
