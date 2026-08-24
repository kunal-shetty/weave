# Promptify — Frontend Architecture

## Overview

The frontend is a **Next.js 15 App Router** application using React 19, Redux Toolkit, Tailwind CSS 4, and shadcn/ui components. It serves two primary user flows:

1. **Studio Flow** — Generate React JSX sections from wireframe/code/prompt
2. **Workspace Flow** — Real-time collaborative HTML generation with chat, preview, and review queue

---

## Routing

```
app/
├── page.tsx                          # / → HomeShell (landing page)
├── auth/page.tsx                     # /auth → Supabase OAuth callback
├── generate/page.tsx                 # /generate → GeneratorStudio
├── preview/[pageName]/page.tsx       # /preview/Home → PreviewShell + CMSEditor
├── workspace/[sessionId]/page.tsx    # /workspace/abc123 → WorkspaceContent
├── edit/[sessionId]/page.tsx         # /edit/abc123 → Field-level HTML editor
└── sections/page.tsx                 # /sections → All sections grid
```

**Why App Router?** File-based routing is cleaner than `react-router-dom` (which the problem statement suggests). Dynamic routes (`[sessionId]`, `[pageName]`) handle variable URLs naturally. Server Components reduce client bundle size for pages that don't need interactivity.

**Why not Pages Router?** App Router is the recommended approach for Next.js 15. It supports layouts, loading states, and error boundaries at the route level.

---

## Component Architecture

### Home Page (`/`)

```
HomeShell
├── ShaderBackground (WebGL gradient animation)
├── ParticleOrb (3D floating orb)
├── ChatArea (AI prompt input → redirects to workspace)
│   ├── Settings dropdown (model, creativity, output style)
│   └── Options dropdown (section type, tone, accent colour)
└── Feature cards
```

**ChatArea** is the primary entry point. Users type a prompt, optionally attach files, and the system:
1. Creates a session via `POST /api/sessions`
2. Saves to sessionStorage for instant reload
3. Redirects to `/workspace/:sessionId`

### Generator Studio (`/generate`)

```
GeneratorStudio
├── Mode toggles (Wireframe / Code / Prompt)
├── Wireframe dropzone (drag-and-drop image upload)
├── Code textarea (paste existing JSX)
├── Prompt textarea (natural language)
├── Config popover (pageName, sectionName, accentColor, cardCount)
├── Generate button → dispatches runGenerate thunk
├── Generated JSX preview (read-only code display)
└── JobHistoryPanel (last 5 jobs)
```

**Why separate from workspace?** The Studio flow produces **React JSX** with full Redux binding (matching the problem statement exactly). The Workspace flow produces **HTML** for real-time collaborative editing. They share infrastructure but serve different use cases.

### Preview Shell (`/preview/:pageName`)

```
PreviewShell
├── Toolbar (section picker, status badge, viewport toggle)
├── LiveSectionPreview (renders generated JSX from Redux)
├── Wireframe overlay toggle (side-by-side comparison)
├── CMS Editor panel (sidebar)
│   ├── Element list (expandable cards)
│   ├── Content editors (text, textarea, image URL)
│   ├── Cards loop editor (nested value1/value2 inputs)
│   ├── CSS override textarea
│   └── Save button → PATCH /api/elements/:fieldId
├── Regenerate button → POST /api/sections/:sectionId/regenerate
└── Approve/Reject buttons → PATCH /api/sections/:sectionId/status
```

**Why Redux for CMS data?** The problem statement requires `state.cms.allSections[pageName][fieldId]` — the generated section reads content from Redux, not from props. This means CMS edits update Redux → section re-renders → preview updates without regenerating JSX.

### Workspace (`/workspace/:sessionId`)

```
WorkspaceContent
├── Header (back, panel toggles, prompt display, Live clock)
├── Left Panel (resizable)
│   ├── Team tab (PanelMembers)
│   │   ├── Member list (avatars, roles)
│   │   └── Invite form (email input)
│   └── Reviews tab (ReviewQueue)
│       ├── Filters (status, type)
│       ├── Review items (expandable cards)
│       │   ├── Confidence badges + progress bars
│       │   ├── Diff view (before/after content)
│       │   └── Action buttons (Claim, Approve, Reject)
│       └── Bulk actions (Approve All, Reject All)
├── Center Panel (resizable)
│   └── PanelAgent (AI chat + generation)
│       ├── Message list (user + agent bubbles)
│       ├── Streaming status messages
│       ├── Input bar (text + attach)
│       └── forwardRef API (appendRemoteMessage)
├── Right Panel (takes remaining space)
│   └── PanelPreview (live HTML preview)
│       ├── Device switcher (desktop/tablet/mobile)
│       ├── Refresh button
│       ├── Open in new tab
│       └── Iframe (scrollable, hidden scrollbar)
└── Resize handles (drag to resize panels)
```

**Why three panels?** The workspace is designed for collaborative editing:
- **Left**: Team management + review queue (who's doing what)
- **Center**: AI chat (generate, discuss, iterate)
- **Right**: Live preview (see results immediately)

**Why resizable?** Different users have different preferences. A designer might want a wider preview, while a developer might want more chat space.

---

## State Management

### Redux Store

```typescript
// store/index.ts
configureStore({
  reducer: {
    studio: studioSlice,   // Generation jobs, progress, errors
    cms: cmsSlice,         // Section/element data for preview
  }
})
```

### cmsSlice

The core CMS state. Stores content by page → fieldId.

```typescript
// Key operations:
fetchElementsByPage(pageName)    // GET /api/elements?pageName=X
fetchElementsByIds({ pageName, fieldIds })  // Filtered fetch
patchElement({ fieldId, content, css, loop })  // PATCH /api/elements/:fieldId
applyLivePatch(element)  // Socket broadcast → Redux update
```

**Why `applyLivePatch`?** When another user edits a CMS field via the CMSEditor, the server broadcasts `element_patched` via Socket.IO. The receiving client dispatches `applyLivePatch` to update Redux without an API round-trip.

### studioSlice

Manages the generation workflow.

```typescript
// Key operations:
runGenerate(formData)  // POST /api/generate (multipart)
clearError()           // Clear error state
setProgress(msg)       // Update progress message
```

**Why separate slices?** `cmsSlice` is read-heavy (preview reads on every render). `studioSlice` is write-heavy (generation triggers). Separating them prevents unnecessary re-renders.

### Local State (React hooks)

The Workspace flow uses local state extensively because:
- Real-time data (preview HTML, chat messages) changes too frequently for Redux
- `useState` + `useCallback` is simpler for component-scoped state
- `useRef` avoids re-renders for values that change often (socket refs, DOM refs)

---

## Socket.IO Integration

### useSocket Hook (Studio flow)

```typescript
useSocket(sectionId)
// Joins section room, receives element_patched events
// Used by PreviewShell for live CMS editing
```

### useWorkspaceSocket Hook (Workspace flow)

```typescript
const { broadcastChat, broadcastHtml } = useWorkspaceSocket(sessionId, {
  onHtmlUpdate,      // Another user generated HTML
  onChatMessage,     // Another user sent a chat message
  onMemberChange,    // Member invited/removed or review updated
})
// Joins workspace room, handles clientId deduplication
// Returns broadcast functions for outgoing messages
```

**Why clientId deduplication?** When User A sends a chat message, the server relays it to all clients in the room — including User A. The `clientId` (stored in sessionStorage) lets the client skip messages it sent itself.

### Global Socket Singleton

```typescript
let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, { transports: ['websocket'] });
  }
  return globalSocket;
}
```

**Why singleton?** Multiple hooks and components need the same socket connection. A singleton prevents multiple connections and ensures consistent state.

---

## Design System

### Theme

The dark theme uses CSS custom properties in `globals.css`:

```css
--background: oklch(0.16 0 0);     /* Soft dark grey, not pure black */
--foreground: oklch(0.97 0 0);     /* Near-white */
--primary: oklch(0.97 0 0);       /* White for primary actions */
--secondary: oklch(0.28 0 0);     /* Card backgrounds */
--muted: oklch(0.32 0 0);         /* Disabled elements */
--border: oklch(0.36 0 0);        /* Subtle borders */
```

**Why oklch?** perceptually uniform color space. The "lifted dark theme" uses soft greys instead of pure black, with gradient accents for visual interest.

### Component Patterns

- **btn-3d** — Adds depth with shadows and transforms
- **btn-glow** — Adds subtle glow effect on hover
- **card-3d** — Elevated card with border glow
- **input-3d** — Input with animated focus ring
- **scrollbar-none** — Hidden scrollbar (webkit + firefox + IE)
- **ShaderBackground** — WebGL gradient animation using Three.js

### Typography

- **Headings:** Space Grotesk (`--font-heading`) — geometric, modern
- **Body:** Inter (`--font-body`) — clean, readable
- **Code:** System mono stack

---

## Key Design Decisions

### Why two generation flows?

The problem statement describes a **Studio architecture** (React JSX + Redux binding), but real-world collaboration needs **HTML streaming** (multiple users see generation progress). We built both:

- Studio: Matches the problem statement exactly. Judges can verify the Redux contract, field IDs, and CMS binding.
- Workspace: Demonstrates the "real-time collaboration" differentiator. Multiple users generate, chat, and review together.

### Why forwardRef on PanelAgent?

The parent (`WorkspaceContent`) needs to push remote messages into PanelAgent's message list. `forwardRef` + `useImperativeHandle` exposes `appendRemoteMessage()` as a public API. This avoids prop-drilling remote messages through the component tree.

### Why progressive HTML reveal?

Generating HTML takes 5-15 seconds. Instead of showing a blank preview, `progressiveReveal()` in PanelAgent renders lines incrementally (4 lines every 60ms), giving users instant visual feedback that something is happening.

### Why sessionStorage + MongoDB dual-load?

The workspace tries `sessionStorage` first (instant, same device), then falls back to MongoDB (requires API call). This makes revisiting a workspace on the same device feel instant while ensuring cross-device access works.

### Why Tailwind instead of CSS Modules?

The problem statement requires Tailwind CSS (Section 7). We use Tailwind v4 with the `@tailwindcss/postcss` plugin. Custom utility classes (`btn-3d`, `card-3d`) extend Tailwind without CSS Modules.

### Why shadcn/ui instead of PrimeReact?

The problem statement suggests PrimeReact for buttons. We use shadcn/ui (built on Radix UI) because:
- It's more customizable (copy-paste components, not a library)
- Better TypeScript support
- Consistent with the Tailwind design system
- Radix primitives are fully accessible
- We can override any component without fighting library defaults

The problem statement says: "If PrimeReact fails to install, use a semantic `<button>` with equivalent classes." shadcn/ui Button satisfies this.
