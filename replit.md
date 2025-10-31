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
- **Database**: PostgreSQL (Neon-backed) managed by Drizzle ORM for persistent storage of users, profiles, messages, and rooms.
- **P2P Focus**: Emphasizes direct peer connections over central media servers for scalability and privacy.
- **Initiator Selection**: WebRTC initiator determined by the user with the lower `userId` to prevent deadlocks.
- **Media Stream Handling**: `getUserMedia` is called and stream is ready before WebSocket connection for robust WebRTC setup.
- **Separate Popup Windows**: Uses `window.open()` for PiP, created synchronously on user interaction to bypass browser popup blockers.

## External Dependencies
- **PostgreSQL**: Primary database for all persistent data, utilizing Drizzle ORM.
- **Neon**: Serverless PostgreSQL provider used for the database.
- **simple-peer**: JavaScript library for WebRTC peer-to-peer connections.
- **ws**: WebSocket library for Node.js backend.
- **bcrypt**: For password hashing.
- **React**: Frontend UI library.
- **TypeScript**: For type safety across the codebase.
- **TailwindCSS**: For utility-first styling.
- **Wouter**: For client-side routing.
- **shadcn/ui**: UI component library.
- **TanStack Query**: For server state management in the frontend.
## Recent Changes (October 31, 2025)

### Secure Authentication System Implemented
- **Complete registration and login system** with name, username, and password fields
- **Backend authentication routes**:
  - POST /api/auth/register - User registration with input validation
  - POST /api/auth/login - User login with password verification
  - POST /api/auth/logout - Logout functionality with localStorage cleanup
- **Password security**: bcrypt hashing with 10 salt rounds
- **Frontend authentication UI**: Beautiful tabbed login/signup form using shadcn/ui components
- **Session persistence**: User credentials stored in localStorage after successful authentication
- **Logout functionality**: Added logout button to navigation bar with proper cleanup
- **App flow integration**: Authentication now required before accessing any features

### Database Schema Updates
- Added `password` field to User model (stores bcrypt-hashed passwords)
- Created `registerSchema` and `loginSchema` for input validation
- Added `getUserWithPassword` method to storage interface for authentication lookup
- **Security**: Passwords never returned in regular API responses, only used for authentication

### Bug Fixes
- Fixed Firestore undefined value errors in all storage operations
- Added `removeUndefinedValues` helper to prevent Firestore rejections
- Fixed password filtering in createUser, createRoom, createProfile, and updateProfile methods

### Technical Improvements
- Firebase credentials properly configured for the project
- All authentication routes properly secured with input validation
- Consistent error handling with user-friendly toast notifications
