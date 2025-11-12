# StudyConnect - Student Live Connect Overlay App

## Overview
StudyConnect is a video chat application designed for students to connect with one study partner (2 people total) during live online classes using ultra-low bandwidth streaming. It features optimized video quality for minimal data usage while allowing students to interact while watching lectures on various online learning platforms. The project aims to provide a private, bandwidth-efficient solution for collaborative online studying.

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
- **Backend**: Node.js with Express, handling authentication and room management.
- **Video Infrastructure**: LiveKit for real-time video/audio communication (replaced WebRTC)
  - Server-side token generation with session authentication
  - Pre-built React components for video UI
  - Automatic reconnection and connection state management
- **Authentication**: Session-based with express-session, bcrypt password hashing.
- **Smart Matching**: Algorithm connecting students based on subject, study mood, and partner preferences.
- **Session Management**: Express sessions with MemoryStore (configurable for production).

### Feature Specifications
- Secure Authentication with registration and login.
- Smart Matching based on user preferences.
- LiveKit video chat for 2 participants (1 host + 1 partner) with ultra-low bandwidth.
- Draggable Video Overlay with enhanced Picture-in-Picture for each partner.
- Real-time controls (mute/unmute, settings, disconnect).
- Profile management with photo and bio editing.
- Real-time direct messaging.
- Friend request management.

### System Design Choices
- **Storage**: In-memory storage (MemStorage) for user management and session data (data is lost on restart)
- **Video Architecture**: LiveKit Cloud (centralized media server)
  - Token-based authentication with 10-minute TTL
  - Server-side session validation for security
  - Ultra-low bandwidth optimization: 180p @ 20fps, 200kbps video, 50kbps audio
  - Fixed quality (adaptive streaming disabled)
  - Maximum 2 users per room (1 host + 1 participant)
- **Session Security**: HttpOnly cookies, secure in production, 7-day expiry
- **Media Stream Handling**: LiveKit SDK handles getUserMedia automatically
- **Bandwidth Optimization**: Designed for minimal data usage with fixed low-quality streaming

## External Dependencies
- **livekit-client**: LiveKit JavaScript SDK for video/audio connections
- **@livekit/components-react**: Pre-built React components for video UI
- **livekit-server-sdk**: Server-side token generation
- **express-session**: Session management middleware
- **memorystore**: In-memory session store (configurable)
- **bcrypt**: Password hashing (optimized to 8 rounds)
- **React**: Frontend UI library
- **TypeScript**: Type safety across the codebase
- **TailwindCSS**: Utility-first styling
- **Wouter**: Client-side routing
- **shadcn/ui**: UI component library
- **TanStack Query**: Server state management
## Recent Changes

### November 12, 2025 - Critical Bug Fixes & LiveKit Configuration
- **Fixed duplicate video display bug**: Users no longer see themselves twice in the video grid
  - Modified `client/src/components/livekit-video-room.tsx` to filter local participant from remote participants array
  - Prevents local participant from being displayed in both local and remote video sections
- **Fixed audio configuration**: Corrected audio bitrate to enforce 50kbps limit
  - Changed from AudioPresets.music (48kbps) to custom AudioPreset with 50kbps maxBitrate
  - Proper TypeScript structure: `{ maxBitrate: 50_000 }` without invalid properties
  - Updated `client/src/lib/livekit-provider.tsx` with correctly typed AudioPreset
- **Added Picture-in-Picture (PIP) functionality**:
  - New PIP button in video controls for browsing other websites while in study session
  - Smart video selector prioritizes remote participant videos over local video
  - Fallback to local video if no remote participant available
  - Cross-browser compatibility with proper error handling
- **LiveKit credentials configured**: Added LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET to environment
  - Enables real-time video/audio streaming between study partners
  - Fixed connection issues preventing camera and microphone access
- **Updated bandwidth configuration**:
  - Video: 180p (320x180), 20fps, max 250kbps (increased from 200kbps for stability)
  - Audio: 50kbps fixed bitrate with DTX enabled
  - Total bandwidth: ~300kbps (250kbps video + 50kbps audio)
- **Configuration location**: client/src/lib/livekit-provider.tsx, client/src/components/livekit-video-room.tsx
- **Architect approved**: All fixes verified and approved

### November 11, 2025 - Ultra-Low Bandwidth Configuration & 2-User Room Limit
- **Reduced room capacity**: Changed from 5-user rooms to 2-user rooms (1 host + 1 participant)
  - Updated room schema (shared/schema.ts) to enforce maxOccupancy: 2
  - Updated room creation logic (server/routes.ts) to use 2-user limit
- **Ultra-low bandwidth video configuration**:
  - Fixed resolution: 180p (320x180 pixels)
  - Fixed frame rate: 20 fps
  - Video bitrate: 200 kbps maximum
  - Audio: AudioPresets.music (48 kbps) with discontinuous transmission (dtx)
  - Audio processing: Noise suppression and echo cancellation enabled
- **Disabled adaptive quality**:
  - adaptiveStream: false - prevents quality auto-adjustment
  - dynacast: false - disables dynamic broadcast
  - simulcast: false - single quality stream only
- **Bandwidth savings**: Configured for ~248 kbps total bandwidth (200 kbps video + 48 kbps audio)
- **LiveKit Cloud**: Connected to wss://ssss-fctk56o9.livekit.cloud
- **Configuration location**: client/src/lib/livekit-provider.tsx
- **Architect approved**: Final configuration verified for fixed quality with guaranteed bandwidth constraints

### November 11, 2025 - Complete Migration from WebRTC to LiveKit
- **Removed all WebRTC dependencies**: Eliminated simple-peer and ws packages (1100+ lines of signaling code)
- **Installed LiveKit SDKs**: Added livekit-client, @livekit/components-react, livekit-server-sdk
- **Implemented session-based authentication**: Added express-session with MemoryStore for secure token generation
- **Created LiveKit infrastructure**:
  - server/livekit.ts: Token generation with 10-minute TTL
  - LiveKitRoomProvider: Context-based room connection wrapper
  - LiveKitVideoRoom: Pre-built video UI components
- **Security improvements**:
  - Token endpoint requires authenticated session (no impersonation possible)
  - User identity derived from server-side session, not client request
  - Room authorization checks (capacity, existence) before token issuance
  - Session management on login/logout
- **Simplified state management**: Replaced WebRTC/WebSocket state machine with LiveKit connection states
- **Production ready**: Requires setting LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and SESSION_SECRET
- **Development mode**: Works without LiveKit server for testing (shows warnings)
- **Architecture change**: Direct peer-to-peer WebRTC replaced with centralized LiveKit server routing
- **Code reduction**: 1100+ lines of custom signaling code replaced with ~200 lines of LiveKit integration
- **Architect approved**: Security implementation passed final review

### November 10, 2025 - Multi-User WebRTC Matching & Video Thumbnail Fixes (DEPRECATED - WebRTC Removed)
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
