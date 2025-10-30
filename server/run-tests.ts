// Run comprehensive tests for all features
import { runTestSuite, TestDataManager } from "./test-utils";

async function testUserManagement(manager: TestDataManager) {
  console.log("\n📝 Testing User Management...");
  
  // Create users
  const user1 = await manager.createTestUser("testuser1");
  const user2 = await manager.createTestUser("testuser2");
  const user3 = await manager.createTestUser("testuser3");
  
  // Verify user creation
  const retrievedUser = await manager["storage"].getUser(user1.id);
  if (!retrievedUser) throw new Error("Failed to retrieve created user");
  console.log("  ✅ User retrieval works");
  
  // Test getUserByUsername
  const userByUsername = await manager["storage"].getUserByUsername("testuser1");
  if (!userByUsername || userByUsername.id !== user1.id) {
    throw new Error("getUserByUsername failed");
  }
  console.log("  ✅ getUserByUsername works");
  
  return { user1, user2, user3 };
}

async function testRoomManagement(manager: TestDataManager) {
  console.log("\n🏠 Testing Room Management...");
  
  // Create test user first
  const user = await manager.createTestUser("roomtester");
  
  // Create public room
  const publicRoom = await manager.createTestRoom(user.id, "TEST-PUBLIC", "public");
  console.log("  ✅ Public room creation works");
  
  // Create private room
  const privateRoom = await manager.createTestRoom(user.id, "TEST-PRIV", "private", "secret123");
  console.log("  ✅ Private room creation works");
  
  // Get all public rooms
  const publicRooms = await manager["storage"].getPublicRooms();
  const hasOurRoom = publicRooms.some(r => r.id === publicRoom.id);
  if (!hasOurRoom) throw new Error("Public room not found in getPublicRooms");
  console.log("  ✅ getPublicRooms works");
  
  // Get joinable rooms
  const joinableRooms = await manager["storage"].getJoinableRooms();
  const isJoinable = joinableRooms.some(r => r.id === publicRoom.id);
  if (!isJoinable) throw new Error("Room not found in getJoinableRooms");
  console.log("  ✅ getJoinableRooms works");
  
  // Update room occupancy
  await manager["storage"].updateRoomOccupancy(publicRoom.id, 2);
  const updatedRoom = await manager["storage"].getRoom(publicRoom.id);
  if (updatedRoom?.currentOccupancy !== 2) throw new Error("updateRoomOccupancy failed");
  console.log("  ✅ updateRoomOccupancy works");
}

async function testProfileManagement(manager: TestDataManager) {
  console.log("\n👤 Testing Profile Management...");
  
  const user = await manager.createTestUser("profiletester");
  
  // Create profile
  const profile = await manager.createTestProfile(
    user.id,
    "I love studying!",
    "https://example.com/photo.jpg"
  );
  console.log("  ✅ Profile creation works");
  
  // Get profile
  const retrievedProfile = await manager["storage"].getProfile(user.id);
  if (!retrievedProfile) throw new Error("Failed to retrieve profile");
  console.log("  ✅ Profile retrieval works");
  
  // Update profile
  const updatedProfile = await manager["storage"].updateProfile(user.id, {
    bio: "Updated bio!",
  });
  if (updatedProfile?.bio !== "Updated bio!") throw new Error("Profile update failed");
  console.log("  ✅ Profile update works");
}

async function testFriendSystem(manager: TestDataManager) {
  console.log("\n👥 Testing Friend System...");
  
  const user1 = await manager.createTestUser("friend1");
  const user2 = await manager.createTestUser("friend2");
  const user3 = await manager.createTestUser("friend3");
  
  // Send friend request
  const request1 = await manager.createTestFriendRequest(user1.id, user2.id);
  console.log("  ✅ Friend request creation works");
  
  // Get friend requests
  const requests = await manager["storage"].getFriendRequestsByUser(user2.id);
  if (!requests.some(r => r.id === request1.id)) {
    throw new Error("Friend request not found");
  }
  console.log("  ✅ getFriendRequestsByUser works");
  
  // Accept friend request
  const accepted = await manager["storage"].updateFriendRequestStatus(request1.id, "accepted");
  if (accepted?.status !== "accepted") throw new Error("Friend request acceptance failed");
  console.log("  ✅ Friend request acceptance works");
  
  // Get friends list
  const friends = await manager["storage"].getFriends(user1.id);
  if (!friends.some(f => f.id === request1.id)) {
    throw new Error("Accepted friend not in friends list");
  }
  console.log("  ✅ getFriends works");
  
  // Test declining a request
  const request2 = await manager.createTestFriendRequest(user1.id, user3.id);
  await manager["storage"].updateFriendRequestStatus(request2.id, "declined");
  console.log("  ✅ Friend request decline works");
}

async function testMessagingSystem(manager: TestDataManager) {
  console.log("\n💬 Testing Messaging System...");
  
  const user1 = await manager.createTestUser("messenger1");
  const user2 = await manager.createTestUser("messenger2");
  
  // Send messages
  const msg1 = await manager.createTestMessage(user1.id, user2.id, "Hello!");
  const msg2 = await manager.createTestMessage(user2.id, user1.id, "Hi there!");
  const msg3 = await manager.createTestMessage(user1.id, user2.id, "How are you?");
  console.log("  ✅ Message creation works");
  
  // Get conversation
  const messages = await manager["storage"].getMessages(user1.id, user2.id);
  if (messages.length !== 3) throw new Error("Message retrieval failed");
  console.log("  ✅ getMessages works");
  
  // Check message order (should be chronological)
  if (messages[0].content !== "Hello!") throw new Error("Message ordering incorrect");
  console.log("  ✅ Message ordering works");
  
  // Mark message as read
  await manager["storage"].markMessageAsRead(msg1.id);
  console.log("  ✅ markMessageAsRead works");
  
  // Get unread count
  const unreadCount = await manager["storage"].getUnreadMessageCount(user2.id);
  if (unreadCount !== 1) throw new Error(`Expected 1 unread message, got ${unreadCount}`);
  console.log("  ✅ getUnreadMessageCount works");
}

async function testSessionManagement(manager: TestDataManager) {
  console.log("\n🔐 Testing Session Management...");
  
  const user = await manager.createTestUser("sessiontester");
  
  // Create session
  const session = await manager["storage"].createSession({
    userId: user.id,
    username: user.username,
    createdAt: new Date(),
  });
  console.log("  ✅ Session creation works");
  
  // Get session
  const retrievedSession = await manager["storage"].getSession(user.id);
  if (!retrievedSession) throw new Error("Failed to retrieve session");
  console.log("  ✅ Session retrieval works");
  
  // Get all sessions
  const allSessions = await manager["storage"].getAllSessions();
  if (!allSessions.some(s => s.userId === user.id)) {
    throw new Error("Session not found in getAllSessions");
  }
  console.log("  ✅ getAllSessions works");
  
  // Remove session
  await manager["storage"].removeSession(user.id);
  const deletedSession = await manager["storage"].getSession(user.id);
  if (deletedSession) throw new Error("Session was not deleted");
  console.log("  ✅ Session deletion works");
}

// Main test runner
async function runAllTests() {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 STARTING COMPREHENSIVE FEATURE TESTS");
  console.log("=".repeat(80));
  
  try {
    // Test each feature independently
    await runTestSuite("User Management", async (m) => {
      // Access storage through type assertion for testing
      (m as any).storage = (await import("./pg-storage")).storage;
      await testUserManagement(m);
    });
    
    await runTestSuite("Room Management", async (m) => {
      (m as any).storage = (await import("./pg-storage")).storage;
      await testRoomManagement(m);
    });
    
    await runTestSuite("Profile Management", async (m) => {
      (m as any).storage = (await import("./pg-storage")).storage;
      await testProfileManagement(m);
    });
    
    await runTestSuite("Friend System", async (m) => {
      (m as any).storage = (await import("./pg-storage")).storage;
      await testFriendSystem(m);
    });
    
    await runTestSuite("Messaging System", async (m) => {
      (m as any).storage = (await import("./pg-storage")).storage;
      await testMessagingSystem(m);
    });
    
    await runTestSuite("Session Management", async (m) => {
      (m as any).storage = (await import("./pg-storage")).storage;
      await testSessionManagement(m);
    });
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ ALL TESTS PASSED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log("\n✨ All test data has been cleaned up automatically.");
    
  } catch (error) {
    console.error("\n" + "=".repeat(80));
    console.error("❌ TESTS FAILED!");
    console.error("=".repeat(80));
    console.error(error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(() => {
    console.log("\n✅ Test run complete. Exiting...");
    process.exit(0);
  }).catch((error) => {
    console.error("\n❌ Test run failed:", error);
    process.exit(1);
  });
}

export { runAllTests };
