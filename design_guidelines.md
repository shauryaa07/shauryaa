# Design Guidelines: Student Live Connect Overlay App

## Design Approach

**Reference-Based Approach** - Drawing inspiration from modern communication platforms (Discord, Zoom, Google Meet) that excel at minimal, functional video interfaces. The design prioritizes clarity, accessibility, and non-intrusive presentation since this overlay must coexist with educational content.

**Core Design Principles:**
- Minimal visual footprint - the overlay enhances rather than distracts from learning
- Instant clarity - all controls immediately understandable
- Efficient interactions - every element serves a clear purpose
- Privacy-first presentation - respect for user comfort and control

---

## Typography

**Font Family:**
- Primary: Inter or SF Pro Display (via Google Fonts CDN)
- Fallback: System fonts (-apple-system, BlinkMacSystemFont, "Segoe UI")

**Type Scale:**
- **Small labels**: text-xs (0.75rem) - for timestamps, status indicators
- **Body/UI text**: text-sm (0.875rem) - for names, buttons, most UI elements
- **Section headers**: text-base (1rem) - for modal titles, settings headings
- **Large CTAs**: text-lg (1.125rem) - for primary action buttons

**Font Weights:**
- Regular (400): Body text, labels
- Medium (500): Button text, active states
- Semibold (600): Headings, emphasis elements

---

## Layout System

**Spacing Primitives:**
Core spacing units using Tailwind: **1, 2, 3, 4, 6, 8, 12, 16**

**Application:**
- Tight spacing (p-1, p-2): Icon buttons, compact controls
- Standard spacing (p-3, p-4, m-4): Card padding, form elements, video thumbnails
- Generous spacing (p-6, p-8): Modal content, section separation
- Major spacing (p-12, p-16): Landing page sections

**Container Widths:**
- Overlay window: 320px - 400px (adjustable)
- Video thumbnails: 120px - 160px each
- Modal dialogs: max-w-md (28rem)
- Landing page content: max-w-6xl with px-4 mobile padding

---

## Component Library

### A. Overlay Components

**Floating Video Window**
- Draggable container with rounded-xl corners
- Drop shadow (shadow-2xl) for depth and separation from background
- Default position: bottom-right corner with m-4 margin from viewport edges
- Resize handle in bottom-right corner (8x8 touch target)
- Collapse/expand toggle button in top-right (32x32 touch target)

**Video Thumbnail Grid**
- 2-3 participant tiles arranged vertically or in compact grid
- Each tile: aspect-ratio-square or aspect-ratio-video (16:9)
- Rounded-lg corners on individual tiles
- 2px gap between tiles (gap-2)
- Username overlay at bottom with semi-transparent backdrop blur
- Status indicator (speaking, muted) as 8px dot in top-right

**Control Bar**
- Positioned at bottom of overlay
- Contains 3-4 icon buttons (32x32 each)
- Buttons: Mute/unmute audio, toggle video, end connection, settings
- Icons from Heroicons (outline style for inactive, solid for active)
- Horizontal arrangement with gap-3 spacing

### B. Main Application UI

**Authentication Screen**
- Centered card layout (max-w-md)
- Logo/app name at top with mb-8
- Google sign-in button: full width, h-12, rounded-lg
- Privacy notice below in text-xs with mt-4
- Optional "Continue as Guest" secondary button

**Preference Selection Screen**
- Full-screen or modal overlay (max-w-2xl)
- Three selection cards arranged vertically with gap-4
- Each card: p-6, rounded-xl, includes icon, heading, description
- Selections: Subject (dropdown or chip selection), Mood (button group), Partner Type (toggle buttons)
- Large "Find Study Partners" CTA at bottom (w-full, h-14, rounded-lg)

**Matching/Connecting State**
- Centered content with loading animation
- Status text: "Finding your study partners..."
- Animated dots or subtle spinner (12x12 size)
- Cancel button below (h-10, text-sm)

### C. Settings Modal

**Structure:**
- Modal overlay with backdrop blur
- Content card: max-w-lg, p-6, rounded-2xl
- Header with title (text-lg, font-semibold) and close button (top-right)
- Settings grouped in sections with mb-6 spacing
- Each setting: label above, control below, helper text in text-xs

**Setting Controls:**
- Toggle switches for boolean options (h-6, w-11)
- Dropdown selects for choices (h-10, rounded-lg)
- Slider for video quality (full width)
- Action buttons at bottom (gap-3, h-10)

### D. Landing Page Components

**Hero Section (80vh)**
- Two-column layout on desktop (grid-cols-1 lg:grid-cols-2)
- Left column: Headline (text-4xl lg:text-5xl, font-bold, leading-tight), subheading (text-lg, mt-4), CTA buttons (mt-8, gap-4)
- Right column: Hero image or demo video (rounded-2xl, shadow-2xl)
- Container: max-w-6xl, px-4, py-12 lg:py-20

**Features Section**
- Grid of 3 feature cards (grid-cols-1 md:grid-cols-3, gap-6)
- Each card: p-6, rounded-xl, includes 48x48 icon, heading (text-xl, font-semibold, mt-4), description (text-sm, mt-2)
- Section padding: py-16 lg:py-24

**How It Works Section**
- 4-step vertical timeline on mobile, horizontal on desktop
- Each step: numbered circle (w-12 h-12, rounded-full, flex items-center justify-center), title (text-lg, font-semibold), description (text-sm, mt-2)
- Steps connected with lines (2px width, vertical on mobile, horizontal on desktop)

**Social Proof Section**
- 2-column testimonial grid (grid-cols-1 md:grid-cols-2, gap-6)
- Each testimonial: p-6, rounded-xl, includes quote (text-base), author info (mt-4, flex items-center gap-3)
- Author: 40x40 avatar (rounded-full), name + role (text-sm)

**CTA Section**
- Centered content: max-w-3xl, text-center
- Heading (text-3xl lg:text-4xl, font-bold), description (text-lg, mt-4), button group (mt-8, gap-4)

**Footer**
- Three-column layout on desktop (grid-cols-1 md:grid-cols-3, gap-8)
- Column 1: Logo + tagline
- Column 2: Quick links (vertical list, gap-2)
- Column 3: Social links + newsletter signup (h-10 input + button combo)
- Copyright notice at bottom (pt-8, text-xs, text-center)

---

## Animations

**Minimal Motion Philosophy:**
- Entry animations only for modal overlays (fade + scale from 95% to 100%, 200ms)
- Hover states use transform scale(1.05) on cards, 150ms transition
- Button press: transform scale(0.98), 100ms
- Overlay drag: cursor-move, no additional animation
- Video tile speaking indicator: subtle pulse animation (1s duration, infinite)
- NO scroll animations, NO parallax, NO complex transitions

---

## Images

**Hero Section:**
- Large hero image showing students using the overlay during a class
- Dimensions: 800x600 minimum, optimized for web
- Style: Screenshot or mockup of the product in action, showing overlay on top of educational content
- Position: Right column of hero section on desktop, below headline on mobile

**Feature Icons:**
- 48x48 icon illustrations for each feature (Privacy, Connection, Focus)
- Use Heroicons or similar icon library
- Consistent outline style across all icons

**Testimonial Avatars:**
- 40x40 circular student photos
- Placeholder option: colored initials on solid background if photos unavailable

---

## Accessibility Implementation

- All interactive elements minimum 44x44 touch target
- Focus visible states on all clickable elements (ring-2 ring-offset-2)
- Proper heading hierarchy (h1 → h2 → h3)
- Alt text for all images
- ARIA labels for icon-only buttons
- Keyboard navigation support for overlay dragging (arrow keys)
- Screen reader announcements for connection status changes
- Color contrast ratios meet WCAG AA standards (will be verified in color implementation phase)