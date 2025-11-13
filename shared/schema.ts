import { z } from "zod";

// User schema - with password authentication
export const userSchema = z.object({
  id: z.string(),
  username: z.string().min(2).max(20),
  email: z.string().email(),
  password: z.string().optional(), // Optional because we don't return it in API responses
  createdAt: z.date().optional(),
});

export type User = z.infer<typeof userSchema>;

// Registration schema - for creating new users
export const registerSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(20, "Username must be less than 20 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Login schema - using email and password
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Session/Room information
export const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  createdAt: z.date(),
});

export type Session = z.infer<typeof sessionSchema>;

// WebRTC participant info
export interface ParticipantInfo {
  id: string;
  username: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking?: boolean;
}

// Settings
export const settingsSchema = z.object({
  videoEnabled: z.boolean().default(true),
  audioEnabled: z.boolean().default(true),
  videoQuality: z.enum(["low", "medium", "high"]).default("medium"),
  autoHideOverlay: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;

// Room schema - for managing study rooms (public and private)
// LIMIT: Maximum 2 users per room (1 host + 1 participant)
// Rooms are TEMPORARY - automatically deleted when empty (occupancy = 0)
export const roomSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  type: z.enum(["public", "private"]),
  password: z.string().optional(),
  createdBy: z.string(),
  currentOccupancy: z.number().min(0).max(2).default(0),
  maxOccupancy: z.number().default(2),
  createdAt: z.date(),
});

export type Room = z.infer<typeof roomSchema>;

// Profile schema
export const profileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Profile = z.infer<typeof profileSchema>;

// Friend schema
export const friendSchema = z.object({
  id: z.string(),
  requesterId: z.string(),
  receiverId: z.string(),
  status: z.enum(["pending", "accepted", "declined"]),
  createdAt: z.date().optional(),
});

export type Friend = z.infer<typeof friendSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  content: z.string(),
  createdAt: z.date().optional(),
});

export type Message = z.infer<typeof messageSchema>;
