# StudyConnect - Student Live Connect Overlay App

## Overview
StudyConnect is a peer-to-peer video chat application designed for students to connect with 2-3 study partners during live online classes. The app features a floating, draggable video overlay that allows students to see and talk to each other while watching lectures on platforms like Physics Wallah, Unacademy, and other online learning platforms.

**Status:** MVP Development - Phase 1 (Schema & Frontend) Complete

## Core Features
- **Simple Authentication**: Username-based entry (no registration required)
- **Smart Matching**: Connect students based on subject, study mood, and partner preferences
- **WebRTC P2P Video/Audio**: Direct peer-to-peer connections for privacy and zero-cost scaling
- **Draggable Overlay**: Floating window that can be moved anywhere on screen
- **Minimal UI**: Non-intrusive design that doesn't interfere with online classes
- **Real-time Controls**: Mute/unmute audio/video, settings, disconnect
- **Privacy-First**: No data storage, all video/audio goes directly between peers

## Project Architecture

### Frontend (React + TypeScript)
- **Landing Page**: Hero section, features, how it works, testimonials, CTA
- **Authentication**: Simple username entry screen
- **Preference Selection**: Subject, mood, partner type selection
- **Matching State**: Loading state while finding study partners
- **Video Overlay**: Draggable floating window with video thumbnails and controls
- **Settings Modal**: Configure video/audio preferences

### Backend (Node.js + Express)
- **WebSocket Signaling Server**: Handles WebRTC peer connection setup (not implemented yet)
- **Matching Algorithm**: Connects students based on preferences (not implemented yet)
- **Session Management**: Tracks active users and rooms (not implemented yet)

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
4. **Matching** → System finds 2-3 similar students (simulated for now)
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

## Next Steps (Phase 2 & 3)

### Phase 2: Backend Implementation
- [ ] Set up WebSocket signaling server in server/routes.ts
- [ ] Implement matching algorithm to connect students
- [ ] Create session management system
- [ ] Add WebSocket message handlers for signaling

### Phase 3: Integration & Testing
- [ ] Connect WebRTC peer connections using simple-peer
- [ ] Implement real-time video/audio streaming
- [ ] Add proper error handling for media device access
- [ ] Test matching and connection flow
- [ ] Add reconnection logic
- [ ] Test across different browsers and devices

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

### Mock Data (Temporary)
- Currently using 2 simulated peers ("Rahul" and "Priya")
- Matching happens after 2-second delay
- Video streams use getUserMedia for local camera
- Peer videos will be connected in Phase 3

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

## Recent Changes (Phase 1)
- 2025-10-27: Complete frontend implementation with all components
- 2025-10-27: Design system setup with custom colors and animations
- 2025-10-27: Data models defined in shared/schema.ts
- 2025-10-27: Landing page with full marketing content
- 2025-10-27: Draggable video overlay with controls
