import { db } from "./db";
import { eq, and, or } from "drizzle-orm";
import * as schema from "@shared/db-schema";
import { IStorage } from "./storage";
import type { Session, Room, Profile, Friend, Message } from "@shared/schema";

export class PgStorage implements IStorage {
  // Session methods
  async createSession(sessionData: Omit<Session, "id">): Promise<Session> {
    const [session] = await db.insert(schema.sessions).values({
      userId: sessionData.userId,
      username: sessionData.username,
    }).returning();
    return {
      ...session,
      createdAt: new Date(session.createdAt),
    };
  }

  async getSession(userId: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.userId, userId))
      .limit(1);
    
    if (!session) return undefined;
    
    return {
      ...session,
      createdAt: new Date(session.createdAt),
    };
  }

  async removeSession(userId: string): Promise<void> {
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  }

  async getAllSessions(): Promise<Session[]> {
    const sessions = await db.select().from(schema.sessions);
    return sessions.map(s => ({
      ...s,
      createdAt: new Date(s.createdAt),
    }));
  }

  // Room methods
  async createRoom(roomData: Omit<Room, "id">): Promise<Room> {
    const [room] = await db.insert(schema.rooms).values({
      ...roomData,
    }).returning();
    return {
      ...room,
      password: room.password ?? undefined,
      createdAt: new Date(room.createdAt),
    };
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    const [room] = await db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, roomId))
      .limit(1);
    
    if (!room) return undefined;
    
    return {
      ...room,
      password: room.password ?? undefined,
      createdAt: new Date(room.createdAt),
    };
  }

  async getAllRooms(): Promise<Room[]> {
    const rooms = await db.select().from(schema.rooms);
    return rooms.map(r => ({
      ...r,
      password: r.password ?? undefined,
      createdAt: new Date(r.createdAt),
    }));
  }

  async getPublicRooms(): Promise<Room[]> {
    const rooms = await db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.type, "public"));
    return rooms.map(r => ({
      ...r,
      password: r.password ?? undefined,
      createdAt: new Date(r.createdAt),
    }));
  }

  async getJoinableRooms(): Promise<Room[]> {
    const rooms = await db
      .select()
      .from(schema.rooms)
      .where(
        and(
          eq(schema.rooms.type, "public"),
        )
      );
    return rooms
      .filter(r => r.currentOccupancy < r.maxOccupancy)
      .map(r => ({
        ...r,
        password: r.password ?? undefined,
        createdAt: new Date(r.createdAt),
      }));
  }

  async updateRoomOccupancy(roomId: string, occupancy: number): Promise<void> {
    await db
      .update(schema.rooms)
      .set({ currentOccupancy: occupancy })
      .where(eq(schema.rooms.id, roomId));
  }

  async deleteRoom(roomId: string): Promise<void> {
    await db.delete(schema.rooms).where(eq(schema.rooms.id, roomId));
  }

  // Profile methods
  async createProfile(profile: Profile): Promise<Profile> {
    const [created] = await db.insert(schema.profiles).values({
      userId: profile.userId,
      bio: profile.bio,
      photoUrl: profile.photoUrl,
    }).returning();
    return {
      ...created,
      bio: created.bio ?? undefined,
      photoUrl: created.photoUrl ?? undefined,
      createdAt: new Date(created.createdAt),
      updatedAt: new Date(created.updatedAt),
    };
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId))
      .limit(1);
    
    if (!profile) return undefined;
    
    return {
      ...profile,
      bio: profile.bio ?? undefined,
      photoUrl: profile.photoUrl ?? undefined,
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt),
    };
  }

  async updateProfile(
    userId: string,
    updates: Partial<Omit<Profile, "userId" | "createdAt">>
  ): Promise<Profile | undefined> {
    const [updated] = await db
      .update(schema.profiles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.profiles.userId, userId))
      .returning();
    
    if (!updated) return undefined;
    
    return {
      ...updated,
      bio: updated.bio ?? undefined,
      photoUrl: updated.photoUrl ?? undefined,
      createdAt: new Date(updated.createdAt),
      updatedAt: new Date(updated.updatedAt),
    };
  }

  // Friend methods
  async createFriendRequest(friendData: Omit<Friend, "id">): Promise<Friend> {
    const [friend] = await db.insert(schema.friends).values({
      ...friendData,
    }).returning();
    return {
      ...friend,
      createdAt: new Date(friend.createdAt),
    };
  }

  async getFriendRequest(requestId: string): Promise<Friend | undefined> {
    const [friend] = await db
      .select()
      .from(schema.friends)
      .where(eq(schema.friends.id, requestId))
      .limit(1);
    
    if (!friend) return undefined;
    
    return {
      ...friend,
      createdAt: new Date(friend.createdAt),
    };
  }

  async getFriendRequestsByUser(userId: string): Promise<Friend[]> {
    const friends = await db
      .select()
      .from(schema.friends)
      .where(
        or(
          eq(schema.friends.requesterId, userId),
          eq(schema.friends.receiverId, userId)
        )
      );
    return friends.map(f => ({
      ...f,
      createdAt: new Date(f.createdAt),
    }));
  }

  async updateFriendRequestStatus(
    requestId: string,
    status: "accepted" | "declined"
  ): Promise<Friend | undefined> {
    const [updated] = await db
      .update(schema.friends)
      .set({ status })
      .where(eq(schema.friends.id, requestId))
      .returning();
    
    if (!updated) return undefined;
    
    return {
      ...updated,
      createdAt: new Date(updated.createdAt),
    };
  }

  async getFriends(userId: string): Promise<Friend[]> {
    const friends = await db
      .select()
      .from(schema.friends)
      .where(
        and(
          or(
            eq(schema.friends.requesterId, userId),
            eq(schema.friends.receiverId, userId)
          ),
          eq(schema.friends.status, "accepted")
        )
      );
    return friends.map(f => ({
      ...f,
      createdAt: new Date(f.createdAt),
    }));
  }

  // Message methods
  async createMessage(messageData: Omit<Message, "id">): Promise<Message> {
    const [message] = await db.insert(schema.messages).values({
      ...messageData,
    }).returning();
    return {
      ...message,
      createdAt: new Date(message.createdAt),
    };
  }

  async getMessages(userId1: string, userId2: string): Promise<Message[]> {
    const messages = await db
      .select()
      .from(schema.messages)
      .where(
        or(
          and(
            eq(schema.messages.senderId, userId1),
            eq(schema.messages.receiverId, userId2)
          ),
          and(
            eq(schema.messages.senderId, userId2),
            eq(schema.messages.receiverId, userId1)
          )
        )
      )
      .orderBy(schema.messages.createdAt);
    return messages.map(m => ({
      ...m,
      createdAt: new Date(m.createdAt),
    }));
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db
      .update(schema.messages)
      .set({ read: true })
      .where(eq(schema.messages.id, messageId));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const messages = await db
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.receiverId, userId),
          eq(schema.messages.read, false)
        )
      );
    return messages.length;
  }
}

export const storage = new PgStorage();
