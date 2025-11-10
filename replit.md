# StudyConnect - Student Live Connect Overlay App

## Overview
StudyConnect is a peer-to-peer video chat application designed for students to connect with up to 4 study partners (5 people total) during live online classes. It features a floating, draggable video overlay that allows students to interact while watching lectures on various online learning platforms. The project aims to provide a private, scalable, and non-intrusive solution for collaborative online studying.

## User Preferences
I prefer iterative development with clear, concise explanations for each step. Please ask for confirmation before making significant architectural changes or adding new external dependencies. I value privacy-focused solutions and prefer direct, peer-to-peer communication where possible. I like clean code with good TypeScript practices and clear separation of concerns.

## System Architecture

### UI/UX Decisions
- **Minimalist Design**: Non-intrusive UI with a focus on functionality.
- **Draggable Overlay**: Floating, resizable video overlay with individual Picture-in-Picture windows for each participant.
- **Cross-Tab Persistence**: PiP windows follow the user across browser tabs.
- **Styling**: TailwindCSS with `shadcn/ui` components, featuring a custom design system including primary blue accents, high-contrast text, and subtle card elevations.
- **Typography**: Inter font family for readability.

### Technical Implementations
- **Frontend**: React with TypeScript, Wouter for routing, and TanStack Query for data fetching.
- **Backend**: Node.js with Express, handling authentication, matching, and WebSocket signaling.
- **WebRTC**: Utilizes `simple-peer` library for direct peer-to-peer video/audio connections, minimizing server load and ensuring privacy.
- **Authentication**: Secure registration and login with bcrypt hashing.
- **Smart Matching**: Algorithm connecting students based on subject, study mood, and partner preferences.
- **Real-time Communication**: WebSockets for signaling (SDP/ICE exchange) and direct messaging.
- **Session Management**: Tracks active users and rooms for matchmaking.

### Feature Specifications
- Secure Authentication with registration and login.
- Smart Matching based on user preferences.
- WebRTC P2P Video/Audio for up to 5 participants.
- Draggable Video Overlay with enhanced Picture-in-Picture for each partner.
- Real-time controls (mute/unmute, settings, disconnect).
- Profile management with photo and bio editing.
- Real-time direct messaging.
- Friend request management.

### System Design Choices
- **Storage**: In-memory storage (MemStorage) for user management and session data (data is lost on restart)
- **P2P Focus**: Emphasizes direct peer connections over central media servers for scalability and privacy.
- **Initiator Selection**: WebRTC initiator determined by the user with the lower `userId` to prevent deadlocks.
- **Media Stream Handling**: `getUserMedia` is called and stream is ready before WebSocket connection for robust WebRTC setup.
- **Separate Popup Windows**: Uses `window.open()` for PiP, created synchronously on user interaction to bypass browser popup blockers.

## External Dependencies
- **simple-peer**: JavaScript library for WebRTC peer-to-peer connections.
- **ws**: WebSocket library for Node.js backend.
- **bcrypt**: For password hashing (optimized to 8 rounds).
- **React**: Frontend UI library.
- **TypeScript**: For type safety across the codebase.
- **TailwindCSS**: For utility-first styling.
- **Wouter**: For client-side routing.
- **shadcn/ui**: UI component library.
- **TanStack Query**: For server state management in the frontend.
## Recent Changes

### November 10, 2025 - Multi-User WebRTC Matching & Video Thumbnail Fixes
- **Fixed critical multi-user video chat bug**: Users can now see each other's video streams
  - Implemented persistent `lobbyRoomMap` that survives socket disconnects
  - Second user joining a lobby now receives populated peers array with existing participants
  - Stale lobby mapping detection: Cleans up when WebRTC room deleted but mapping persists
  - Robust cleanup on disconnect: Iterates all lobby entries to remove WebSocket instances
- **Video thumbnail improvements**:
  - Removed all resize functionality (onResize prop, resize state, handlers)
  - Made thumbnails fixed size with `w-full aspect-video` classes
  - Removed Maximize2 icon and resize handle from UI
- **Occupancy tracking fixes**:
  - Uses authoritative lobby map size for accurate room occupancy
  - Only deletes lobby mapping when members.size === 0
  - Prevents memory leaks from stale WebSocket references
- **WebRTC room lifecycle**:
  - User 1 joins lobby → Creates WebRTC room → Gets matched with empty peers
  - User 2 joins same lobby → Finds existing room → Gets peers array with User 1
  - All users leave → Mapping and room cleaned up
  - New user joins after cleanup → Detects stale mapping → Creates fresh room
- **Architect approval**: All fixes passed final review, ready for multi-user testing

### November 2, 2025 - Storage Switch & DisplayName Cleanup
- **Switched to in-memory storage**: Replaced Firebase with MemStorage to simplify setup and avoid configuration errors
  - Updated `server/index.ts` to use MemStorage by default
  - All user data and sessions are now stored in-memory (data is lost on server restart)
  - Removed Firebase configuration complexity
- **Removed displayName field**: Simplified user registration to only require username, email, and password
  - Removed from schema (`shared/schema.ts`)
  - Removed from auth forms (`client/src/components/auth-form.tsx`)
  - Removed from app component (`client/src/pages/app.tsx`)
  - Removed from all backend routes (`server/routes.ts`)
  - Updated storage interface (`server/storage.ts`)
- **Optimized authentication speed**: Reduced bcrypt hash rounds from 10 to 8 for faster signup and login
  - Maintains strong security while significantly improving performance
  - Registration and login now complete in seconds instead of taking excessive time
- **Authentication form improvements**: 
  - Login now uses email instead of username for consistency
  - Registration collects username, email, and password (no displayName)
  - All TypeScript errors resolved

### October 31, 2025 - Email-Based Authentication System
- **Complete registration and login system** with username, email, and password fields
- **Sign Up Page**: Collects username, email, and password
- **Login Page**: Email and password authentication
- **Backend authentication routes**:
  - POST /api/auth/register - User registration with email uniqueness validation
  - POST /api/auth/login - Email-based login with password verification
  - POST /api/auth/logout - Logout functionality
- **Password security**: bcrypt hashing (optimized to 8 salt rounds)
- **Frontend authentication UI**: Clean, modern signup and login pages using shadcn/ui components
- **Session management**: AuthProvider context manages user sessions throughout the app
- **Landing page integration**: Updated to direct users to signup/login pages

### Database Schema Updates
- Added `email` field to User model with email validation
- Updated storage interface to support email-based operations:
  - `getUserByEmail()` - Find users by email address
  - `getUserWithPassword()` - Now uses email for authentication lookup
- Created `registerSchema` with username, email, and password validation
- Updated `loginSchema` to use email and password
- Both username and email must be unique during registration
- **Security**: Passwords never returned in regular API responses, only used for authentication

### Authentication Context
- Created `AuthProvider` and `useAuth` hook for global session management
- User state synchronized between AuthContext and localStorage
- Immediate session updates after login/signup without page reload
- Rehydrates user session on app load from localStorage

### Bug Fixes
- Fixed all Firebase-related errors by switching to in-memory storage
- Updated authentication forms to match the email-based login schema
- Fixed TypeScript errors related to displayName removal
- Fixed authentication flow to properly update user state

### Technical Improvements
- All authentication routes properly secured with input validation
- Consistent error handling with user-friendly toast notifications
- Type-safe authentication flows with Zod validation
- Clean separation of concerns between auth pages, context, and backend routes
- Simplified storage layer without external database dependencies
