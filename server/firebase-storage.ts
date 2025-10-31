import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  updateDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "../shared/firebase-config";
import { IStorage, User } from "./storage";
import type { Session, Room, Profile, Friend, Message } from "@shared/schema";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function timestampToDate(timestamp: any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
}

export class FirebaseStorage implements IStorage {
  async createUser(userData: { username: string; displayName?: string }): Promise<User> {
    const userId = generateId();
    const user: User = {
      id: userId,
      username: userData.username,
      displayName: userData.displayName,
      createdAt: new Date(),
    };
    
    await setDoc(doc(db, "users", userId), {
      ...user,
      createdAt: serverTimestamp(),
    });
    
    return user;
  }

  async upsertUser(userData: { username: string; displayName?: string }): Promise<User> {
    const existingUser = await this.getUserByUsername(userData.username);
    
    if (existingUser) {
      if (userData.displayName && userData.displayName !== existingUser.displayName) {
        await updateDoc(doc(db, "users", existingUser.id), {
          displayName: userData.displayName,
        });
        existingUser.displayName = userData.displayName;
      }
      return existingUser;
    }
    
    return this.createUser(userData);
  }

  async getUser(userId: string): Promise<User | undefined> {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return undefined;
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      username: data.username,
      displayName: data.displayName,
      createdAt: timestampToDate(data.createdAt),
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return undefined;
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      username: data.username,
      displayName: data.displayName,
      createdAt: timestampToDate(data.createdAt),
    };
  }

  async deleteUser(userId: string): Promise<void> {
    await deleteDoc(doc(db, "users", userId));
  }

  async createSession(sessionData: Omit<Session, "id">): Promise<Session> {
    const sessionId = generateId();
    const session: Session = {
      id: sessionId,
      ...sessionData,
      createdAt: new Date(),
    };
    
    await setDoc(doc(db, "sessions", sessionId), {
      ...session,
      createdAt: serverTimestamp(),
    });
    
    return session;
  }

  async getSession(userId: string): Promise<Session | undefined> {
    const q = query(collection(db, "sessions"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return undefined;
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      username: data.username,
      createdAt: timestampToDate(data.createdAt),
    };
  }

  async removeSession(userId: string): Promise<void> {
    const q = query(collection(db, "sessions"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    for (const doc of querySnapshot.docs) {
      await deleteDoc(doc.ref);
    }
  }

  async getAllSessions(): Promise<Session[]> {
    const querySnapshot = await getDocs(collection(db, "sessions"));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        username: data.username,
        createdAt: timestampToDate(data.createdAt),
      };
    });
  }

  async createRoom(roomData: Omit<Room, "id">): Promise<Room> {
    const roomId = generateId();
    const room: Room = {
      id: roomId,
      ...roomData,
    };
    
    // Filter out undefined values - Firestore doesn't accept them
    const roomDataToSave: Record<string, any> = {
      id: room.id,
      name: room.name,
      type: room.type,
      createdBy: room.createdBy,
      currentOccupancy: room.currentOccupancy,
      maxOccupancy: room.maxOccupancy,
      createdAt: serverTimestamp(),
    };
    
    // Only add password if it's defined
    if (room.password !== undefined) {
      roomDataToSave.password = room.password;
    }
    
    await setDoc(doc(db, "rooms", roomId), roomDataToSave);
    
    return room;
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    const docRef = doc(db, "rooms", roomId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return undefined;
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      type: data.type,
      password: data.password,
      createdBy: data.createdBy,
      currentOccupancy: data.currentOccupancy,
      maxOccupancy: data.maxOccupancy,
      createdAt: timestampToDate(data.createdAt),
    };
  }

  async getAllRooms(): Promise<Room[]> {
    const querySnapshot = await getDocs(collection(db, "rooms"));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        password: data.password,
        createdBy: data.createdBy,
        currentOccupancy: data.currentOccupancy,
        maxOccupancy: data.maxOccupancy,
        createdAt: timestampToDate(data.createdAt),
      };
    });
  }

  async getPublicRooms(): Promise<Room[]> {
    const q = query(collection(db, "rooms"), where("type", "==", "public"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        password: data.password,
        createdBy: data.createdBy,
        currentOccupancy: data.currentOccupancy,
        maxOccupancy: data.maxOccupancy,
        createdAt: timestampToDate(data.createdAt),
      };
    });
  }

  async getJoinableRooms(): Promise<Room[]> {
    const querySnapshot = await getDocs(collection(db, "rooms"));
    return querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          type: data.type,
          password: data.password,
          createdBy: data.createdBy,
          currentOccupancy: data.currentOccupancy,
          maxOccupancy: data.maxOccupancy,
          createdAt: timestampToDate(data.createdAt),
        };
      })
      .filter(room => room.currentOccupancy < room.maxOccupancy);
  }

  async updateRoomOccupancy(roomId: string, occupancy: number): Promise<void> {
    await updateDoc(doc(db, "rooms", roomId), {
      currentOccupancy: occupancy,
    });
  }

  async deleteRoom(roomId: string): Promise<void> {
    await deleteDoc(doc(db, "rooms", roomId));
  }

  async createProfile(profileData: Profile): Promise<Profile> {
    await setDoc(doc(db, "profiles", profileData.userId), {
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return profileData;
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const docRef = doc(db, "profiles", userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return undefined;
    
    const data = docSnap.data();
    return {
      userId: data.userId,
      bio: data.bio,
      photoUrl: data.photoUrl,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    };
  }

  async updateProfile(userId: string, updates: Partial<Omit<Profile, "userId" | "createdAt">>): Promise<Profile | undefined> {
    const profile = await this.getProfile(userId);
    if (!profile) return undefined;
    
    await updateDoc(doc(db, "profiles", userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    return {
      ...profile,
      ...updates,
      updatedAt: new Date(),
    };
  }

  async createFriendRequest(friendData: Omit<Friend, "id">): Promise<Friend> {
    const friendId = generateId();
    const friend: Friend = {
      id: friendId,
      ...friendData,
    };
    
    await setDoc(doc(db, "friends", friendId), {
      ...friend,
      createdAt: serverTimestamp(),
    });
    
    return friend;
  }

  async getFriendRequest(requestId: string): Promise<Friend | undefined> {
    const docRef = doc(db, "friends", requestId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return undefined;
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      requesterId: data.requesterId,
      receiverId: data.receiverId,
      status: data.status,
      createdAt: timestampToDate(data.createdAt),
    };
  }

  async getFriendRequestsByUser(userId: string): Promise<Friend[]> {
    const q = query(
      collection(db, "friends"),
      where("receiverId", "==", userId),
      where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        requesterId: data.requesterId,
        receiverId: data.receiverId,
        status: data.status,
        createdAt: timestampToDate(data.createdAt),
      };
    });
  }

  async updateFriendRequestStatus(requestId: string, status: "accepted" | "declined"): Promise<Friend | undefined> {
    const friend = await this.getFriendRequest(requestId);
    if (!friend) return undefined;
    
    await updateDoc(doc(db, "friends", requestId), { status });
    
    return {
      ...friend,
      status,
    };
  }

  async getFriends(userId: string): Promise<Friend[]> {
    const q1 = query(
      collection(db, "friends"),
      where("requesterId", "==", userId),
      where("status", "==", "accepted")
    );
    const q2 = query(
      collection(db, "friends"),
      where("receiverId", "==", userId),
      where("status", "==", "accepted")
    );
    
    const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const friends = [...snapshot1.docs, ...snapshot2.docs].map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        requesterId: data.requesterId,
        receiverId: data.receiverId,
        status: data.status,
        createdAt: timestampToDate(data.createdAt),
      };
    });
    
    return friends;
  }

  async createMessage(messageData: Omit<Message, "id">): Promise<Message> {
    const messageId = generateId();
    const message: Message = {
      id: messageId,
      ...messageData,
    };
    
    await setDoc(doc(db, "messages", messageId), {
      ...message,
      createdAt: serverTimestamp(),
    });
    
    return message;
  }

  async getMessages(userId1: string, userId2: string): Promise<Message[]> {
    const querySnapshot = await getDocs(collection(db, "messages"));
    
    const messages = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content,
          read: data.read,
          createdAt: timestampToDate(data.createdAt),
        };
      })
      .filter(msg => 
        (msg.senderId === userId1 && msg.receiverId === userId2) ||
        (msg.senderId === userId2 && msg.receiverId === userId1)
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    return messages;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await updateDoc(doc(db, "messages", messageId), { read: true });
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", userId),
      where("read", "==", false)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  }
}

export const storage = new FirebaseStorage();
