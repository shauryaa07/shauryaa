import { IStorage, User } from "./storage";
import { Session, Room, Profile, Friend, Message } from "@shared/schema";
import { db } from "@shared/firebase-config";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc,
  deleteDoc, 
  query, 
  where,
  Timestamp,
  orderBy 
} from "firebase/firestore";

export class FirestoreStorage implements IStorage {
  private readonly usersCollection = "users";
  private readonly sessionsCollection = "sessions";
  private readonly roomsCollection = "rooms";
  private readonly profilesCollection = "profiles";
  private readonly friendsCollection = "friends";
  private readonly messagesCollection = "messages";

  async createUser(userData: { username: string; email: string; password?: string }): Promise<User> {
    const user: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      username: userData.username,
      email: userData.email,
      password: userData.password,
      createdAt: new Date(),
    };
    await setDoc(doc(db, this.usersCollection, user.id), {
      ...user,
      createdAt: Timestamp.fromDate(user.createdAt),
    });
    return user;
  }

  async upsertUser(userData: { username: string; email: string }): Promise<User> {
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      return existingUser;
    }
    return this.createUser(userData);
  }

  async getUser(userId: string): Promise<User | undefined> {
    const docRef = doc(db, this.usersCollection, userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    const data = docSnap.data();
    const { password, ...userWithoutPassword } = data;
    return {
      ...userWithoutPassword,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate(),
    } as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const q = query(collection(db, this.usersCollection), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return undefined;
    const data = querySnapshot.docs[0].data();
    const { password, ...userWithoutPassword } = data;
    return {
      ...userWithoutPassword,
      id: querySnapshot.docs[0].id,
      createdAt: data.createdAt?.toDate(),
    } as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const q = query(collection(db, this.usersCollection), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return undefined;
    const data = querySnapshot.docs[0].data();
    const { password, ...userWithoutPassword } = data;
    return {
      ...userWithoutPassword,
      id: querySnapshot.docs[0].id,
      createdAt: data.createdAt?.toDate(),
    } as User;
  }

  async getUserWithPassword(email: string): Promise<User | undefined> {
    const q = query(collection(db, this.usersCollection), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return undefined;
    const data = querySnapshot.docs[0].data();
    return {
      ...data,
      id: querySnapshot.docs[0].id,
      createdAt: data.createdAt?.toDate(),
    } as User;
  }

  async deleteUser(userId: string): Promise<void> {
    await deleteDoc(doc(db, this.usersCollection, userId));
  }

  async createSession(sessionData: Omit<Session, "id">): Promise<Session> {
    const session: Session = {
      ...sessionData,
      id: `session-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
    await setDoc(doc(db, this.sessionsCollection, session.userId), {
      ...session,
      createdAt: Timestamp.fromDate(session.createdAt),
    });
    return session;
  }

  async getSession(userId: string): Promise<Session | undefined> {
    const docRef = doc(db, this.sessionsCollection, userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate(),
    } as Session;
  }

  async removeSession(userId: string): Promise<void> {
    await deleteDoc(doc(db, this.sessionsCollection, userId));
  }

  async getAllSessions(): Promise<Session[]> {
    const querySnapshot = await getDocs(collection(db, this.sessionsCollection));
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    } as Session));
  }

  async createRoom(roomData: Omit<Room, "id">): Promise<Room> {
    const room: Room = {
      ...roomData,
      id: `room-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
    await setDoc(doc(db, this.roomsCollection, room.id), {
      ...room,
      createdAt: Timestamp.fromDate(room.createdAt),
    });
    return room;
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    const docRef = doc(db, this.roomsCollection, roomId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate(),
    } as Room;
  }

  async getAllRooms(): Promise<Room[]> {
    const querySnapshot = await getDocs(collection(db, this.roomsCollection));
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    } as Room));
  }

  async getPublicRooms(): Promise<Room[]> {
    const q = query(collection(db, this.roomsCollection), where("type", "==", "public"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    } as Room));
  }

  async getJoinableRooms(): Promise<Room[]> {
    const q = query(
      collection(db, this.roomsCollection), 
      where("type", "==", "public"),
      where("currentOccupancy", "<", 2)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    } as Room));
  }

  async updateRoomOccupancy(roomId: string, occupancy: number): Promise<void> {
    const docRef = doc(db, this.roomsCollection, roomId);
    await updateDoc(docRef, { currentOccupancy: occupancy });
  }

  async deleteRoom(roomId: string): Promise<void> {
    await deleteDoc(doc(db, this.roomsCollection, roomId));
  }

  async createProfile(profileData: Omit<Profile, "id">): Promise<Profile> {
    const profile: Profile = {
      ...profileData,
      id: `profile-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await setDoc(doc(db, this.profilesCollection, profile.userId), {
      ...profile,
      createdAt: Timestamp.fromDate(profile.createdAt!),
      updatedAt: Timestamp.fromDate(profile.updatedAt!),
    });
    return profile;
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const docRef = doc(db, this.profilesCollection, userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Profile;
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
    const docRef = doc(db, this.profilesCollection, userId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  }

  async createFriend(friendData: Omit<Friend, "id">): Promise<Friend> {
    const friend: Friend = {
      ...friendData,
      id: `friend-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
    };
    await setDoc(doc(db, this.friendsCollection, friend.id), {
      ...friend,
      createdAt: Timestamp.fromDate(friend.createdAt!),
    });
    return friend;
  }

  async getFriend(friendId: string): Promise<Friend | undefined> {
    const docRef = doc(db, this.friendsCollection, friendId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate(),
    } as Friend;
  }

  async getFriendRequests(userId: string): Promise<Friend[]> {
    const q = query(
      collection(db, this.friendsCollection),
      where("receiverId", "==", userId),
      where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate(),
    } as Friend));
  }

  async getFriends(userId: string): Promise<Friend[]> {
    const q1 = query(
      collection(db, this.friendsCollection),
      where("requesterId", "==", userId),
      where("status", "==", "accepted")
    );
    const q2 = query(
      collection(db, this.friendsCollection),
      where("receiverId", "==", userId),
      where("status", "==", "accepted")
    );
    const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const friends = [
      ...snapshot1.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate(),
      } as Friend)),
      ...snapshot2.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate(),
      } as Friend))
    ];
    return friends;
  }

  async updateFriendStatus(friendId: string, status: "accepted" | "declined"): Promise<void> {
    const docRef = doc(db, this.friendsCollection, friendId);
    await updateDoc(docRef, { status });
  }

  async createMessage(messageData: Omit<Message, "id">): Promise<Message> {
    const message: Message = {
      ...messageData,
      id: `message-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
    };
    await setDoc(doc(db, this.messagesCollection, message.id), {
      ...message,
      createdAt: Timestamp.fromDate(message.createdAt!),
    });
    return message;
  }

  async getMessages(userId1: string, userId2: string): Promise<Message[]> {
    const q = query(
      collection(db, this.messagesCollection),
      where("senderId", "in", [userId1, userId2]),
      where("receiverId", "in", [userId1, userId2]),
      orderBy("createdAt", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate(),
    } as Message));
  }
}

export const firestoreStorage = new FirestoreStorage();
