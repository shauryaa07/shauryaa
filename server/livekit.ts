import { AccessToken } from "livekit-server-sdk";

// LiveKit configuration
// For development: Use environment variables or defaults
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "ws://localhost:7880";

export function getLiveKitConfig() {
  return {
    url: LIVEKIT_URL,
    apiKey: LIVEKIT_API_KEY,
    apiSecret: LIVEKIT_API_SECRET,
  };
}

/**
 * Generates a LiveKit access token for a user to join a room
 * @param roomName - The name of the room to join
 * @param participantName - The name/identity of the participant
 * @param participantMetadata - Optional metadata for the participant
 * @returns Access token string
 */
export async function generateLiveKitToken(
  roomName: string,
  participantName: string,
  participantMetadata?: string
): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
    name: participantName,
    metadata: participantMetadata,
  });

  // Grant permissions
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

/**
 * Validates LiveKit configuration
 */
export function validateLiveKitConfig(): { valid: boolean; message?: string } {
  if (!LIVEKIT_API_KEY || LIVEKIT_API_KEY === "devkey") {
    return {
      valid: false,
      message: "LIVEKIT_API_KEY not configured. Using development defaults.",
    };
  }

  if (!LIVEKIT_API_SECRET || LIVEKIT_API_SECRET === "secret") {
    return {
      valid: false,
      message: "LIVEKIT_API_SECRET not configured. Using development defaults.",
    };
  }

  if (!LIVEKIT_URL || LIVEKIT_URL === "ws://localhost:7880") {
    return {
      valid: false,
      message: "LIVEKIT_URL not configured. Using development defaults.",
    };
  }

  return { valid: true };
}
