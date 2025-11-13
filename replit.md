# StudyConnect - Student Live Connect Overlay App

## Overview
StudyConnect is a video chat application designed for students to connect with one study partner (2 people total) during live online classes using ultra-low bandwidth streaming. It features optimized video quality for minimal data usage while allowing students to interact while watching lectures on various online learning platforms. The project aims to provide a private, bandwidth-efficient solution for collaborative online studying.

## User Preferences
I prefer iterative development with clear, concise explanations for each step. Please ask for confirmation before making significant architectural changes or adding new external dependencies. I value privacy-focused solutions and prefer direct, peer-to-peer communication where possible. I like clean code with good TypeScript practices and clear separation of concerns.

## System Architecture

### UI/UX Decisions
- **Minimalist Design**: Non-intrusive UI with a focus on functionality.
- **YouTube-Style Minimal PIP**: Picture-in-Picture window shows only video feeds and participant labels, no controls. All controls (mute, settings, disconnect) remain on the main screen.
- **Auto-PIP Activation**: Automatically enters PIP mode when the first remote participant joins (once per session).
- **Cross-Tab Persistence**: PiP windows follow the user across browser tabs.
- **Styling**: TailwindCSS with `shadcn/ui` components, featuring a custom design system including primary blue accents, high-contrast text, and subtle card elevations.
- **Typography**: Inter font family for readability.

### Technical Implementations
- **Frontend**: React with TypeScript, Wouter for routing, and TanStack Query for data fetching.
- **Backend**: Node.js with Express, handling authentication and room management.
- **Video Infrastructure**: WebRTC P2P with Socket.io signaling for real-time video/audio communication.
- **Authentication**: Session-based with express-session, bcrypt password hashing.
- **Smart Matching**: Algorithm connecting students based on subject, study mood, and partner preferences.
- **Session Management**: Express sessions with MemoryStore.

### Feature Specifications
- Secure Authentication with registration and login.
- Smart Matching based on user preferences.
- WebRTC P2P video chat for 2 participants (1 host + 1 partner) with direct peer-to-peer connection.
- **Real-time Video/Audio**: Local and remote video streams with toggle controls for audio/video.
- **Socket.io Signaling**: Lightweight signaling server relays WebRTC offer/answer/ICE candidates.
- **2-Participant Room Limit**: Enforced at signaling level, rooms support exactly 2 peers.
- **Automatic Room Cleanup**: Rooms are automatically deleted when occupancy reaches zero, including reliable tab-close handling.
- Real-time controls (mute/unmute, video toggle, disconnect).
- Profile management with photo and bio editing.
- Real-time direct messaging.
- Friend request management.

### System Design Choices
- **Storage**: In-memory storage (MemStorage) for user management and session data (data is lost on restart).
- **Video Architecture**: WebRTC P2P (direct peer-to-peer) with Socket.io signaling server. No media goes through the server.
- **Bandwidth**: Direct P2P connection, bandwidth managed by WebRTC's adaptive bitrate control. STUN servers for NAT traversal.
- **Session Security**: HttpOnly cookies, secure in production, 7-day expiry.
- **Media Stream Handling**: navigator.mediaDevices.getUserMedia in client-side hook.
- **WebRTC Connection**: RTCPeerConnection with ICE candidate exchange via Socket.io signaling.
- **Room Lifecycle**: Automatic cleanup with occupancy tracking and deletion when empty, using sendBeacon for reliability during tab close.
- **Signaling Events**: join, signal (offer/answer/ice), leave, peer-joined, peer-left, room-full.

## External Dependencies
- **socket.io**: WebRTC signaling server for relaying connection messages.
- **socket.io-client**: Client-side Socket.io for signaling connection.
- **uuid**: Generating unique identifiers for rooms and entities.
- **express-session**: Session management middleware.
- **memorystore**: In-memory session store.
- **bcrypt**: Password hashing.
- **React**: Frontend UI library.
- **TypeScript**: Type safety across the codebase.
- **TailwindCSS**: Utility-first styling.
- **Wouter**: Client-side routing.
- **shadcn/ui**: UI component library.
- **TanStack Query**: Server state management.