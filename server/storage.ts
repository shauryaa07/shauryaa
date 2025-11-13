import { Session, Room, Profile, Friend, Message } from "@shared/schema";

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // Hashed password
  createdAt: Date;
}

export interface IStorage {
  // User methods
  createUser(user: { username: string; email: string; password?: string }): User | Promise<User>;
  upsertUser(user: { username: string; email: string }): User | Promise<User>;
  getUser(userId: string): User | undefined | Promise<User | undefined>;
  getUserByUsername(username: string): User | undefined | Promise<User | undefined>;
  getUserByEmail(email: string): User | undefined | Promise<User | undefined>;
  getUserWithPassword(email: string): User | undefined | Promise<User | undefined>; // Get user with password for authentication using email
  deleteUser(userId: string): void | Promise<void>;
  
  // Session methods
  createSession(session: Omit<Session, "id">): Session | Promise<Session>;
  getSession(userId: string): Session | undefined | Promise<Session | undefined>;
  removeSession(userId: string): void | Promise<void>;
  getAllSessions(): Session[] | Promise<Session[]>;
  
  // Room methods - Rooms are temporary and auto-delete when empty
  createRoom(room: Omit<Room, "id">): Room | Promise<Room>;
  getRoom(roomId: string): Room | undefined | Promise<Room | undefined>;
  getAllRooms(): Room[] | Promise<Room[]>;
  getPublicRooms(): Room[] | Promise<Room[]>;
  getJoinableRooms(): Room[] | Promise<Room[]>;
  updateRoomOccupancy(roomId: string, occupancy: number): void | Promise<void>;
  deleteRoom(roomId: string): void | Promise<void>;
  
  // Profile methods
  createProfile(profile: Omit<Profile, "id">): Profile | Promise<Profile>;
  getProfile(userId: string): Profile | undefined | Promise<Profile | undefined>;
  updateProfile(userId: string, updates: Partial<Profile>): void | Promise<void>;
  
  // Friend methods
  createFriend(friend: Omit<Friend, "id">): Friend | Promise<Friend>;
  getFriend(friendId: string): Friend | undefined | Promise<Friend | undefined>;
  getFriendRequests(userId: string): Friend[] | Promise<Friend[]>;
  getFriends(userId: string): Friend[] | Promise<Friend[]>;
  updateFriendStatus(friendId: string, status: "accepted" | "declined"): void | Promise<void>;
  
  // Message methods
  createMessage(message: Omit<Message, "id">): Message | Promise<Message>;
  getMessages(userId1: string, userId2: string): Message[] | Promise<Message[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private rooms: Map<string, Room>;
  private profiles: Map<string, Profile>;
  private friends: Map<string, Friend>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.rooms = new Map();
    this.profiles = new Map();
    this.friends = new Map();
    this.messages = new Map();
  }

  // User methods
  createUser(userData: { username: string; email: string; password?: string }): User {
    const user: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      username: userData.username,
      email: userData.email,
      password: userData.password, // Store hashed password
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  upsertUser(userData: { username: string; email: string }): User {
    const existingUser = this.getUserByEmail(userData.email);
    if (existingUser) {
      return existingUser;
    }
    return this.createUser(userData);
  }

  getUser(userId: string): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;
    // Don't return password in regular user queries
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  getUserByUsername(username: string): User | undefined {
    const user = Array.from(this.users.values()).find(u => u.username === username);
    if (!user) return undefined;
    // Don't return password in regular user queries
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  getUserByEmail(email: string): User | undefined {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (!user) return undefined;
    // Don't return password in regular user queries
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  getUserWithPassword(email: string): User | undefined {
    // This method includes the password for authentication purposes using email
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  deleteUser(userId: string): void {
    this.users.delete(userId);
  }

  // Session methods
  createSession(sessionData: Omit<Session, "id">): Session {
    const session: Session = {
      ...sessionData,
      id: `session-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
    this.sessions.set(sessionData.userId, session);
    return session;
  }

  getSession(userId: string): Session | undefined {
    return this.sessions.get(userId);
  }

  removeSession(userId: string): void {
    this.sessions.delete(userId);
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
  
  // Room methods
  createRoom(roomData: Omit<Room, "id">): Room {
    const room: Room = {
      ...roomData,
      id: `room-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
    this.rooms.set(room.id, room);
    return room;
  }
  
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }
  
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }
  
  getPublicRooms(): Room[] {
    return Array.from(this.rooms.values()).filter(room => room.type === "public");
  }
  
  getJoinableRooms(): Room[] {
    return Array.from(this.rooms.values()).filter(
      room => room.type === "public" && room.currentOccupancy < room.maxOccupancy
    );
  }
  
  updateRoomOccupancy(roomId: string, occupancy: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.currentOccupancy = occupancy;
    }
  }
  
  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  // Profile methods
  createProfile(profileData: Omit<Profile, "id">): Profile {
    const profile: Profile = {
      ...profileData,
      id: `profile-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.profiles.set(profileData.userId, profile);
    return profile;
  }

  getProfile(userId: string): Profile | undefined {
    return this.profiles.get(userId);
  }

  updateProfile(userId: string, updates: Partial<Profile>): void {
    const profile = this.profiles.get(userId);
    if (profile) {
      Object.assign(profile, updates, { updatedAt: new Date() });
    }
  }

  // Friend methods
  createFriend(friendData: Omit<Friend, "id">): Friend {
    const friend: Friend = {
      ...friendData,
      id: `friend-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
    };
    this.friends.set(friend.id, friend);
    return friend;
  }

  getFriend(friendId: string): Friend | undefined {
    return this.friends.get(friendId);
  }

  getFriendRequests(userId: string): Friend[] {
    return Array.from(this.friends.values()).filter(
      (f) => f.receiverId === userId && f.status === "pending"
    );
  }

  getFriends(userId: string): Friend[] {
    return Array.from(this.friends.values()).filter(
      (f) =>
        ((f.requesterId === userId || f.receiverId === userId) &&
        f.status === "accepted")
    );
  }

  updateFriendStatus(friendId: string, status: "accepted" | "declined"): void {
    const friend = this.friends.get(friendId);
    if (friend) {
      friend.status = status;
    }
  }

  // Message methods
  createMessage(messageData: Omit<Message, "id">): Message {
    const message: Message = {
      ...messageData,
      id: `message-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
    };
    this.messages.set(message.id, message);
    return message;
  }

  getMessages(userId1: string, userId2: string): Message[] {
    return Array.from(this.messages.values())
      .filter(
        (m) =>
          (m.senderId === userId1 && m.receiverId === userId2) ||
          (m.senderId === userId2 && m.receiverId === userId1)
      )
      .sort((a, b) => (a.createdAt && b.createdAt ? a.createdAt.getTime() - b.createdAt.getTime() : 0));
  }
}

// Export storage instance based on environment configuration
// If Firebase is configured, use Firestore for persistent storage
// Otherwise, use in-memory storage (default)
const isFirebaseConfigured = process.env.VITE_FIREBASE_PROJECT_ID && process.env.VITE_FIREBASE_API_KEY && process.env.VITE_FIREBASE_APP_ID;

if (isFirebaseConfigured) {
  console.log("📊 Firebase configured - Firestore storage available for persistent data");
  console.log("📊 To use Firestore, set USE_FIRESTORE=true environment variable");
}

// For now, always use in-memory storage unless explicitly enabled via USE_FIRESTORE
const useFirestore = process.env.USE_FIRESTORE === "true" && isFirebaseConfigured;

if (useFirestore) {
  console.log("📊 Using Firebase Firestore for persistent data storage");
} else {
  console.log("📊 Using in-memory storage (data will be lost on restart)");
  console.log("📊 To enable persistent storage, configure Firebase and set USE_FIRESTORE=true");
}

// Note: To enable Firestore, import firestoreStorage from "./firestore-storage"
// and conditionally export it here based on USE_FIRESTORE environment variable
export const storage = new MemStorage();
