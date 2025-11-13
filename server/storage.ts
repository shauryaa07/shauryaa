import { Session, Room } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private rooms: Map<string, Room>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.rooms = new Map();
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
}

export const storage = new MemStorage();
