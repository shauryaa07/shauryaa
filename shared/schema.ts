import { z } from "zod";

// User schema - simple username-based authentication
export const userSchema = z.object({
  id: z.string(),
  username: z.string().min(2).max(20),
  displayName: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;

// Session/Room information
export const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  createdAt: z.date(),
});

export type Session = z.infer<typeof sessionSchema>;

// WebRTC signaling messages
export const signalingMessageSchema = z.object({
  type: z.enum(["offer", "answer", "ice-candidate", "join", "leave", "user-joined", "user-left"]),
  from: z.string().optional(),
  to: z.string().optional(),
  data: z.any().optional(),
});

export type SignalingMessage = z.infer<typeof signalingMessageSchema>;

// Peer connection state
export interface PeerConnection {
  id: string;
  username: string;
  stream?: MediaStream;
  peer?: any; // SimplePeer instance
  isMuted: boolean;
  isVideoOff: boolean;
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
export const roomSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  type: z.enum(["public", "private"]),
  password: z.string().optional(),
  createdBy: z.string(),
  currentOccupancy: z.number().min(0).max(5).default(0),
  maxOccupancy: z.number().default(5),
  createdAt: z.date(),
});

export type Room = z.infer<typeof roomSchema>;

// Profile schema - for user profiles
export const profileSchema = z.object({
  userId: z.string(),
  bio: z.string().max(500).optional(),
  photoUrl: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Profile = z.infer<typeof profileSchema>;

// Friend schema - for friend relationships
export const friendSchema = z.object({
  id: z.string(),
  requesterId: z.string(),
  receiverId: z.string(),
  status: z.enum(["pending", "accepted", "declined"]),
  createdAt: z.date(),
});

export type Friend = z.infer<typeof friendSchema>;

// Message schema - for DM messaging
export const messageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  content: z.string().min(1).max(1000),
  read: z.boolean().default(false),
  createdAt: z.date(),
});

export type Message = z.infer<typeof messageSchema>;
