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
- **Video Infrastructure**: LiveKit for real-time video/audio communication.
- **Authentication**: Session-based with express-session, bcrypt password hashing.
- **Smart Matching**: Algorithm connecting students based on subject, study mood, and partner preferences.
- **Session Management**: Express sessions with MemoryStore.

### Feature Specifications
- Secure Authentication with registration and login.
- Smart Matching based on user preferences.
- LiveKit video chat for 2 participants (1 host + 1 partner) with ultra-low bandwidth (180p @ 20fps, 250kbps video, 50kbps audio).
- Draggable Video Overlay with enhanced Picture-in-Picture for each partner.
- Real-time controls (mute/unmute, settings, disconnect).
- Profile management with photo and bio editing.
- Real-time direct messaging.
- Friend request management.

### System Design Choices
- **Storage**: In-memory storage (MemStorage) for user management and session data (data is lost on restart).
- **Video Architecture**: LiveKit Cloud (centralized media server) with token-based authentication (10-minute TTL).
- **Bandwidth Optimization**: Ultra-low bandwidth with fixed quality (adaptive streaming disabled), max 2 users per room.
- **Session Security**: HttpOnly cookies, secure in production, 7-day expiry.
- **Media Stream Handling**: LiveKit SDK handles getUserMedia automatically.

## External Dependencies
- **livekit-client**: LiveKit JavaScript SDK for video/audio connections.
- **@livekit/components-react**: Pre-built React components for video UI.
- **livekit-server-sdk**: Server-side token generation.
- **express-session**: Session management middleware.
- **memorystore**: In-memory session store.
- **bcrypt**: Password hashing.
- **React**: Frontend UI library.
- **TypeScript**: Type safety across the codebase.
- **TailwindCSS**: Utility-first styling.
- **Wouter**: Client-side routing.
- **shadcn/ui**: UI component library.
- **TanStack Query**: Server state management.