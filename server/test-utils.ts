// Test data management utilities
// This file provides utilities for creating and cleaning up test data

import { storage } from "./pg-storage";
import type { IStorage } from "./storage";

export interface TestUser {
  id: string;
  username: string;
  displayName?: string;
}

export class TestDataManager {
  private testUserIds: string[] = [];
  private testRoomIds: string[] = [];
  private testProfileIds: string[] = [];
  private testFriendIds: string[] = [];
  private testMessageIds: string[] = [];
  public storage: IStorage = storage;

  // Create a test user
  async createTestUser(username: string): Promise<TestUser> {
    const user = await this.storage.createUser({
      username,
      displayName: `Test User ${username}`,
    });
    this.testUserIds.push(user.id);
    console.log(`✅ Created test user: ${username} (ID: ${user.id})`);
    return user;
  }

  // Create a test room
  async createTestRoom(createdBy: string, name: string, type: "public" | "private" = "public", password?: string) {
    const room = await this.storage.createRoom({
      name,
      type,
      password,
      createdBy,
      currentOccupancy: 0,
      maxOccupancy: 5,
      createdAt: new Date(),
    });
    this.testRoomIds.push(room.id);
    console.log(`✅ Created test room: ${name} (ID: ${room.id})`);
    return room;
  }

  // Create a test profile
  async createTestProfile(userId: string, bio?: string, photoUrl?: string) {
    const profile = await this.storage.createProfile({
      userId,
      bio: bio || `Test bio for user ${userId}`,
      photoUrl: photoUrl || "https://via.placeholder.com/150",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Created test profile for user: ${userId}`);
    return profile;
  }

  // Create a test friend request
  async createTestFriendRequest(requesterId: string, receiverId: string) {
    const friendRequest = await this.storage.createFriendRequest({
      requesterId,
      receiverId,
      status: "pending",
      createdAt: new Date(),
    });
    this.testFriendIds.push(friendRequest.id);
    console.log(`✅ Created test friend request: ${requesterId} → ${receiverId}`);
    return friendRequest;
  }

  // Create a test message
  async createTestMessage(senderId: string, receiverId: string, content: string) {
    const message = await this.storage.createMessage({
      senderId,
      receiverId,
      content,
      read: false,
      createdAt: new Date(),
    });
    this.testMessageIds.push(message.id);
    console.log(`✅ Created test message: ${senderId} → ${receiverId}`);
    return message;
  }

  // Clean up all test data
  async cleanup() {
    console.log("\n🧹 Starting cleanup of test data...");

    // Delete rooms first (due to foreign key constraints)
    for (const roomId of this.testRoomIds) {
      try {
        await this.storage.deleteRoom(roomId);
        console.log(`  ✅ Deleted test room: ${roomId}`);
      } catch (error) {
        console.error(`  ❌ Failed to delete room ${roomId}:`, error);
      }
    }

    // Delete users (will cascade delete sessions, profiles, friends, messages)
    for (const userId of this.testUserIds) {
      try {
        await this.storage.deleteUser(userId);
        console.log(`  ✅ Deleted test user: ${userId}`);
      } catch (error) {
        console.error(`  ❌ Failed to delete user ${userId}:`, error);
      }
    }
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   - Deleted ${this.testRoomIds.length} rooms`);
    console.log(`   - Deleted ${this.testUserIds.length} users (cascade deleted profiles, friends, messages)`);
    
    // Reset tracking arrays
    this.testUserIds = [];
    this.testRoomIds = [];
    this.testProfileIds = [];
    this.testFriendIds = [];
    this.testMessageIds = [];
  }

  // Get all test user IDs
  getTestUserIds(): string[] {
    return [...this.testUserIds];
  }

  // Display summary
  displaySummary() {
    console.log("\n📊 Test Data Summary:");
    console.log(`   - Test Users: ${this.testUserIds.length}`);
    console.log(`   - Test Rooms: ${this.testRoomIds.length}`);
    console.log(`   - Test Friend Requests: ${this.testFriendIds.length}`);
    console.log(`   - Test Messages: ${this.testMessageIds.length}`);
  }
}

// Helper function to run a test suite
export async function runTestSuite(name: string, testFn: (manager: TestDataManager) => Promise<void>) {
  const manager = new TestDataManager();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧪 Running Test Suite: ${name}`);
  console.log("=".repeat(60));
  
  try {
    await testFn(manager);
    console.log(`\n✅ Test Suite "${name}" completed successfully!`);
    manager.displaySummary();
  } catch (error) {
    console.error(`\n❌ Test Suite "${name}" failed:`, error);
    throw error;
  } finally {
    await manager.cleanup();
  }
}
