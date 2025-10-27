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
