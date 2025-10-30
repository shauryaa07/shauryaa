import { Session, Room, Profile, Friend, Message } from "@shared/schema";

export interface User {
  id: string;
  username: string;
  displayName?: string;
  createdAt: Date;
}

export interface IStorage {
  // User methods
  createUser(user: { username: string; displayName?: string }): User | Promise<User>;
  getUser(userId: string): User | undefined | Promise<User | undefined>;
  getUserByUsername(username: string): User | undefined | Promise<User | undefined>;
  
  // Session methods
  createSession(session: Omit<Session, "id">): Session | Promise<Session>;
  getSession(userId: string): Session | undefined | Promise<Session | undefined>;
  removeSession(userId: string): void | Promise<void>;
  getAllSessions(): Session[] | Promise<Session[]>;
  
  // Room methods
  createRoom(room: Omit<Room, "id">): Room | Promise<Room>;
  getRoom(roomId: string): Room | undefined | Promise<Room | undefined>;
  getAllRooms(): Room[] | Promise<Room[]>;
  getPublicRooms(): Room[] | Promise<Room[]>;
  getJoinableRooms(): Room[] | Promise<Room[]>;
  updateRoomOccupancy(roomId: string, occupancy: number): void | Promise<void>;
  deleteRoom(roomId: string): void | Promise<void>;
  
  // Profile methods
  createProfile(profile: Profile): Profile | Promise<Profile>;
  getProfile(userId: string): Profile | undefined | Promise<Profile | undefined>;
  updateProfile(userId: string, updates: Partial<Omit<Profile, "userId" | "createdAt">>): Profile | undefined | Promise<Profile | undefined>;
  
  // Friend methods
  createFriendRequest(friend: Omit<Friend, "id">): Friend | Promise<Friend>;
  getFriendRequest(requestId: string): Friend | undefined | Promise<Friend | undefined>;
  getFriendRequestsByUser(userId: string): Friend[] | Promise<Friend[]>;
  updateFriendRequestStatus(requestId: string, status: "accepted" | "declined"): Friend | undefined | Promise<Friend | undefined>;
  getFriends(userId: string): Friend[] | Promise<Friend[]>;
  
  // Message methods
  createMessage(message: Omit<Message, "id">): Message | Promise<Message>;
  getMessages(userId1: string, userId2: string): Message[] | Promise<Message[]>;
  markMessageAsRead(messageId: string): void | Promise<void>;
  getUnreadMessageCount(userId: string): number | Promise<number>;
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
  createUser(userData: { username: string; displayName?: string }): User {
    const user: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      username: userData.username,
      displayName: userData.displayName,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.username === username);
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
  createProfile(profile: Profile): Profile {
    this.profiles.set(profile.userId, profile);
    return profile;
  }
  
  getProfile(userId: string): Profile | undefined {
    return this.profiles.get(userId);
  }
  
  updateProfile(userId: string, updates: Partial<Omit<Profile, "userId" | "createdAt">>): Profile | undefined {
    const profile = this.profiles.get(userId);
    if (profile) {
      const updatedProfile = {
        ...profile,
        ...updates,
        updatedAt: new Date(),
      };
      this.profiles.set(userId, updatedProfile);
      return updatedProfile;
    }
    return undefined;
  }
  
  // Friend methods
  createFriendRequest(friendData: Omit<Friend, "id">): Friend {
    const friend: Friend = {
      ...friendData,
      id: `friend-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
    this.friends.set(friend.id, friend);
    return friend;
  }
  
  getFriendRequest(requestId: string): Friend | undefined {
    return this.friends.get(requestId);
  }
  
  getFriendRequestsByUser(userId: string): Friend[] {
    return Array.from(this.friends.values()).filter(
      friend => friend.requesterId === userId || friend.receiverId === userId
    );
  }
  
  updateFriendRequestStatus(requestId: string, status: "accepted" | "declined"): Friend | undefined {
    const friend = this.friends.get(requestId);
    if (friend) {
      friend.status = status;
      return friend;
    }
    return undefined;
  }
  
  getFriends(userId: string): Friend[] {
    return Array.from(this.friends.values()).filter(
      friend => 
        (friend.requesterId === userId || friend.receiverId === userId) && 
        friend.status === "accepted"
    );
  }
  
  // Message methods
  createMessage(messageData: Omit<Message, "id">): Message {
    const message: Message = {
      ...messageData,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
    this.messages.set(message.id, message);
    return message;
  }
  
  getMessages(userId1: string, userId2: string): Message[] {
    return Array.from(this.messages.values())
      .filter(msg => 
        (msg.senderId === userId1 && msg.receiverId === userId2) ||
        (msg.senderId === userId2 && msg.receiverId === userId1)
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  markMessageAsRead(messageId: string): void {
    const message = this.messages.get(messageId);
    if (message) {
      message.read = true;
    }
  }
  
  getUnreadMessageCount(userId: string): number {
    return Array.from(this.messages.values()).filter(
      msg => msg.receiverId === userId && !msg.read
    ).length;
  }
}

export const storage = new MemStorage();
