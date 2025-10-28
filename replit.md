# StudyConnect - Student Live Connect Overlay App

## Overview
StudyConnect is a peer-to-peer video chat application designed for students to connect with up to 4 study partners (5 people total) during live online classes. The app features a floating, draggable video overlay that allows students to see and talk to each other while watching lectures on platforms like Physics Wallah, Unacademy, and other online learning platforms.

**Status:** MVP Complete - All phases implemented and tested

## Core Features
- **Simple Authentication**: Username-based entry (no registration required)
- **Smart Matching**: Connect students based on subject, study mood, and partner preferences (up to 5 people per room)
- **WebRTC P2P Video/Audio**: Direct peer-to-peer connections for privacy and zero-cost scaling
- **Draggable Overlay**: Floating window that can be moved anywhere on screen
- **Enhanced Picture-in-Picture**: Each study partner appears in their own separate popup window
- **Cross-Tab Persistence**: PiP windows follow across browser tabs and websites
- **Minimal UI**: Non-intrusive design that doesn't interfere with online classes
- **Real-time Controls**: Mute/unmute audio/video, settings, disconnect
- **Privacy-First**: No data storage, all video/audio goes directly between peers
- **Scalable**: Supports up to 5 simultaneous participants with mesh peer-to-peer connections

## Project Architecture

### Frontend (React + TypeScript)
- **Landing Page**: Hero section, features, how it works, testimonials, CTA
- **Authentication**: Simple username entry screen
- **Preference Selection**: Subject, mood, partner type selection
- **Matching State**: Loading state while finding study partners
- **Video Overlay**: Draggable floating window with video thumbnails and controls
- **Settings Modal**: Configure video/audio preferences

### Backend (Node.js + Express)
- **WebSocket Signaling Server**: Handles WebRTC peer connection setup and SDP/ICE exchange
- **Matching Algorithm**: Connects students based on preferences (subject, mood, partner type)
- **Session Management**: Tracks active users, rooms, and matching queue

### Tech Stack
- **Frontend**: React, TypeScript, TailwindCSS, Wouter (routing), shadcn/ui
- **Backend**: Express, WebSocket (ws package), Socket.io (planned)
- **WebRTC**: simple-peer library for P2P connections
- **Styling**: TailwindCSS with custom design system
- **UI Components**: shadcn/ui components with custom theming

## Data Models (shared/schema.ts)

### User
```typescript
{
  id: string;
  username: string;
  displayName?: string;
}
```

### Preference
```typescript
{
  subject: "mathematics" | "physics" | "chemistry" | ... | "general";
  mood: "focus" | "chill" | "balanced";
  partnerType: "any" | "male" | "female";
}
```

### Session
```typescript
{
  id: string;
  userId: string;
  username: string;
  preferences: Preference;
  createdAt: Date;
}
```

### Settings
```typescript
{
  videoEnabled: boolean;
  audioEnabled: boolean;
  videoQuality: "low" | "medium" | "high";
  autoHideOverlay: boolean;
}
```

## User Flow
1. **Landing Page** → User views features and clicks "Get Started"
2. **Username Entry** → User enters a username (2-20 characters)
3. **Preference Selection** → User selects subject, mood, and partner type
4. **Matching** → System finds 1-4 similar students (up to 5 people total in a room)
5. **Connected** → Draggable video overlay appears with video chat controls
6. **Study Together** → Users can talk, mute, toggle video, adjust settings
7. **Disconnect** → End session and return to preferences

## Design System

### Colors
- Primary: Blue (#33a3dc) - Used for CTAs, active states, brand elements
- Background: White (light) / Dark gray (dark mode)
- Cards: Subtle elevation with borders
- Text: High contrast for readability

### Typography
- Font: Inter (primary sans-serif)
- Sizes: text-xs to text-5xl following design guidelines
- Weights: Regular (400), Medium (500), Semibold (600)

### Spacing
- Consistent use of Tailwind spacing: 1, 2, 3, 4, 6, 8, 12, 16
- Generous padding on cards (p-6, p-8)
- Tight spacing on controls (p-1, p-2)

### Components
- Buttons: Multiple variants (primary, secondary, outline, destructive)
- Inputs: Clean, accessible form controls
- Cards: Rounded corners, subtle shadows, border
- Modals: Backdrop blur, centered, fade-in animation

## Implementation Complete

### ✅ Phase 1: Schema & Frontend
- All data models defined in shared/schema.ts
- Complete UI: landing page, username entry, preference selection, video overlay
- Draggable overlay with video thumbnails and controls
- Settings modal with video/audio preferences
- Full dark mode support and responsive design

### ✅ Phase 2: Backend Implementation
- WebSocket signaling server in server/routes.ts
- Auto-matching algorithm based on preferences
- Session management for active users and rooms
- WebSocket message handlers for offer/answer/ICE signaling

### ✅ Phase 3: Integration & Testing
- WebRTC peer-to-peer connections using simple-peer
- Real-time video/audio streaming between 2-3 peers
- Fixed critical timing issues (media stream initialization)
- Proper initiator selection (userId-based)
- ICE candidate exchange via WebSocket signaling
- Error handling for media device access

## Development Notes

### Current State (Phase 1 Complete)
✅ All data models defined in shared/schema.ts
✅ Complete landing page with hero, features, testimonials
✅ Username entry screen with validation
✅ Preference selection with subject, mood, partner type
✅ Matching state with loading animation
✅ Draggable video overlay component
✅ Video thumbnail components with mute indicators
✅ Settings modal for preferences
✅ Full responsive design (mobile & desktop)
✅ Dark mode support throughout
✅ Accessibility features (ARIA labels, focus states)

### WebRTC Implementation
- Real peer-to-peer video/audio using simple-peer
- WebSocket signaling for SDP offer/answer exchange
- ICE candidate exchange for NAT traversal
- Initiator selection based on userId comparison (lower ID initiates)
- Media stream attached before peer creation (critical timing fix)
- Supports 2-3 simultaneous peer connections

### Browser Compatibility
- Requires modern browser with WebRTC support
- getUserMedia API for camera/microphone access
- Draggable API for overlay positioning

## Environment Variables
None required for current phase (frontend only)

## File Structure
```
client/
  src/
    pages/
      landing.tsx          # Landing page with hero, features, etc.
      app.tsx              # Main app state management
      not-found.tsx        # 404 page
    components/
      username-entry.tsx   # Username input screen
      preference-selection.tsx  # Preference selection UI
      matching-state.tsx   # Loading/matching state
      video-overlay.tsx    # Main draggable overlay
      video-thumbnail.tsx  # Individual video tile
      settings-modal.tsx   # Settings configuration
      ui/                  # shadcn/ui components
    App.tsx              # Router setup
    index.css            # Global styles
    
shared/
  schema.ts              # TypeScript types and Zod schemas
  
server/
  routes.ts              # Backend routes (to be implemented)
  storage.ts             # In-memory storage (to be implemented)
```

## Recent Changes
- 2025-10-27: **Enhanced PiP Feature** - Each participant now has a separate popup window
  - Popups created synchronously in click handler to avoid browser blocking
  - Automatic popup blocker detection with user-friendly toast notifications
  - Each window follows across tabs and can be moved/resized using native browser controls
  - Proper cleanup when windows are closed or PiP mode is deactivated
- 2025-10-27: **MVP Complete** - All phases implemented
- 2025-10-27: Fixed critical WebRTC timing issues (media stream initialization)
- 2025-10-27: Implemented WebSocket signaling server with auto-matching
- 2025-10-27: Added ICE candidate exchange for reliable P2P connections
- 2025-10-27: Implemented userId-based initiator selection (prevents dual-initiator deadlock)
- 2025-10-27: Complete frontend with draggable overlay, controls, settings
- 2025-10-27: Design system setup with custom colors and animations

## Critical Technical Details

### WebRTC Flow
1. User enters matching state → getUserMedia called → localStream initialized
2. WebSocket connects only after localStream is ready
3. Matching algorithm finds 2-3 peers with similar preferences
4. Initiator (lower userId) creates peer with initiator=true → sends SDP offer
5. Non-initiator receives offer → creates peer with initiator=false → sends SDP answer
6. Both peers exchange ICE candidates via WebSocket
7. P2P connection established → video/audio streams flow directly between peers

### Key Design Decisions
- **No Firebase**: Uses simple username-based authentication
- **In-memory storage**: No database required (sessions are ephemeral)
- **WebRTC P2P**: Direct peer connections (no media server needed)
- **Simple Peer**: Uses simple-peer library with global polyfill for Vite compatibility
- **Initiator selection**: Lower userId always initiates to prevent deadlock
- **Media-first**: WebSocket connection delayed until getUserMedia succeeds
- **Separate Popup Windows**: Uses window.open() for PiP, created synchronously during user click to avoid browser blocking
- **Cross-tab Persistence**: Popup windows persist as long as main window is open, following user across tabs
- **Popup Blocker Handling**: Detects blocked popups and shows helpful toast notification to users
