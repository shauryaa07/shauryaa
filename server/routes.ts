import type { Express } from "express";
import { createServer, type Server } from "http";
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

const tokenRequestSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  userId: z.string().min(1, "User ID is required"),
  username: z.string().min(1, "Username is required"),
});

// Profile request schemas
const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

// Friend request schemas
const createFriendRequestSchema = z.object({
  receiverId: z.string().min(1, "Receiver ID is required"),
});

const updateFriendStatusSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

// Message schemas
const createMessageSchema = z.object({
  receiverId: z.string().min(1, "Receiver ID is required"),
  content: z.string().min(1, "Message content is required").max(1000, "Message too long"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  app.get("/api/health", async (req, res) => {
    try {
      await storage.getAllSessions();
      res.json({ 
        status: "ok", 
        database: "connected"
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

  // Profile API Routes
  app.get("/api/profiles/:userId", async (req, res) => {
    try {
      // AUTHENTICATION: Verify user is logged in
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: Please log in" });
      }

      const { userId } = req.params;
      
      // AUTHORIZATION: Users can only view their own profile
      if (req.session.userId !== userId) {
        return res.status(403).json({ error: "Forbidden: You can only view your own profile" });
      }
      
      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

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

  app.post("/api/profiles/:userId", async (req, res) => {
    try {
      // AUTHENTICATION: Verify user is logged in
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: Please log in" });
      }

      const { userId } = req.params;
      
      // AUTHORIZATION: Users can only update their own profile
      if (req.session.userId !== userId) {
        return res.status(403).json({ error: "Forbidden: You can only update your own profile" });
      }

      // VALIDATION: Validate request body
      const validationResult = updateProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }

      const { bio, photoUrl } = validationResult.data;
      
      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const existingProfile = await storage.getProfile(userId);
      
      if (existingProfile) {
        await storage.updateProfile(userId, { bio, photoUrl });
        const updatedProfile = await storage.getProfile(userId);
        res.json(updatedProfile);
      } else {
        const newProfile = await storage.createProfile({
          userId,
          username: user.username,
          bio,
          photoUrl,
        });
        res.json(newProfile);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Friend API Routes
  app.post("/api/friends/request", async (req, res) => {
    try {
      // AUTHENTICATION: Verify user is logged in
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: Please log in" });
      }

      // VALIDATION: Validate request body
      const validationResult = createFriendRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }

      const { receiverId } = validationResult.data;
      const requesterId = req.session.userId; // Use session userId, not from body
      
      // Verify receiver exists
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ error: "Receiver user not found" });
      }
      
      // Prevent sending friend request to yourself
      if (requesterId === receiverId) {
        return res.status(400).json({ error: "Cannot send friend request to yourself" });
      }
      
      const friend = await storage.createFriend({
        requesterId,
        receiverId,
        status: "pending",
      });
      
      res.json(friend);
    } catch (error) {
      console.error("Error creating friend request:", error);
      res.status(500).json({ error: "Failed to create friend request" });
    }
  });

  app.get("/api/friends/:userId/requests", async (req, res) => {
    try {
      // AUTHENTICATION: Verify user is logged in
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: Please log in" });
      }

      const { userId } = req.params;
      
      // AUTHORIZATION: Users can only view their own friend requests
      if (req.session.userId !== userId) {
        return res.status(403).json({ error: "Forbidden: You can only view your own friend requests" });
      }
      
      const requests = await storage.getFriendRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      res.status(500).json({ error: "Failed to fetch friend requests" });
    }
  });

  app.get("/api/friends/:userId", async (req, res) => {
    try {
      // AUTHENTICATION: Verify user is logged in
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: Please log in" });
      }

      const { userId } = req.params;
      
      // AUTHORIZATION: Users can only view their own friends list
      if (req.session.userId !== userId) {
        return res.status(403).json({ error: "Forbidden: You can only view your own friends" });
      }
      
      const friends = await storage.getFriends(userId);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  });

  app.patch("/api/friends/:friendId", async (req, res) => {
    try {
      // AUTHENTICATION: Verify user is logged in
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: Please log in" });
      }

      const { friendId } = req.params;
      
      // VALIDATION: Validate request body
      const validationResult = updateFriendStatusSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }

      const { status } = validationResult.data;
      
      // Fetch the friend request to verify authorization
      const friendRequest = await storage.getFriend(friendId);
      if (!friendRequest) {
        return res.status(404).json({ error: "Friend request not found" });
      }
      
      // AUTHORIZATION: Only the receiver can accept/decline a friend request
      if (friendRequest.receiverId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden: You can only respond to friend requests sent to you" });
      }
      
      await storage.updateFriendStatus(friendId, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating friend status:", error);
      res.status(500).json({ error: "Failed to update friend status" });
    }
  });

  // Message API Routes
  app.post("/api/messages", async (req, res) => {
    try {
      // AUTHENTICATION: Verify user is logged in
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: Please log in" });
      }

      // VALIDATION: Validate request body
      const validationResult = createMessageSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }

      const { receiverId, content } = validationResult.data;
      const senderId = req.session.userId; // Use session userId, not from body
      
      // Verify receiver exists
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ error: "Receiver user not found" });
      }
      
      // Prevent sending message to yourself
      if (senderId === receiverId) {
        return res.status(400).json({ error: "Cannot send message to yourself" });
      }
      
      const message = await storage.createMessage({
        senderId,
        receiverId,
        content,
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/messages/:userId/:friendId", async (req, res) => {
    try {
      // AUTHENTICATION: Verify user is logged in
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized: Please log in" });
      }

      const { userId, friendId } = req.params;
      
      // AUTHORIZATION: Users can only view their own messages
      if (req.session.userId !== userId) {
        return res.status(403).json({ error: "Forbidden: You can only view your own messages" });
      }
      
      // Verify friend exists
      const friend = await storage.getUser(friendId);
      if (!friend) {
        return res.status(404).json({ error: "Friend user not found" });
      }
      
      const messages = await storage.getMessages(userId, friendId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
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
        maxOccupancy: 2,
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

      // Increment occupancy
      await storage.updateRoomOccupancy(roomId, room.currentOccupancy + 1);

      res.json({ success: true, room });
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ error: "Failed to join room" });
    }
  });

  // Room disconnect endpoint - decrements occupancy and cleans up empty rooms
  app.post("/api/rooms/:roomId/disconnect", async (req, res) => {
    try {
      const { roomId } = req.params;

      // Get the room directly by ID (more efficient than fetching all rooms)
      const room = await storage.getRoom(roomId);
      
      if (!room) {
        // Room might have already been deleted, treat as success
        return res.json({ success: true, deleted: true, message: "Room not found or already deleted" });
      }

      // Decrement occupancy
      const newOccupancy = Math.max(0, room.currentOccupancy - 1);
      await storage.updateRoomOccupancy(roomId, newOccupancy);

      // If room is now empty, delete it
      if (newOccupancy === 0) {
        await storage.deleteRoom(roomId);
        console.log(`Room ${roomId} deleted - occupancy reached zero`);
        return res.json({ success: true, deleted: true, message: "Room deleted" });
      }

      res.json({ success: true, deleted: false, currentOccupancy: newOccupancy });
    } catch (error) {
      console.error("Error disconnecting from room:", error);
      res.status(500).json({ error: "Failed to disconnect from room" });
    }
  });

  app.get('/api/stats', (req, res) => {
    res.json({
      status: "ok",
      webrtc: true,
    });
  });

  return httpServer;
}
