# Promptify — System Architecture

## Overview

Promptify is a dual-mode AI-assisted UI generation platform built for SIH 2026 (PS7). It accepts wireframe images, existing React code, and natural-language prompts — in any combination — and produces CMS-bound React sections with stable field IDs, Redux data binding, and live content editing.

The system has **two generation flows** that share infrastructure:

1. **Studio Flow** (React JSX) — The original architecture matching the problem statement exactly. Uses Claude for vision+code generation, produces React components with Redux binding, diff-merge engine, and a full CMS editor.

2. **Workspace Flow** (HTML) — A real-time collaborative flow where multiple users generate and edit HTML sections together in a shared workspace with live preview, chat, and member management.

Both flows share: MongoDB persistence, Supabase metadata mirroring, Socket.IO real-time events, and the review queue system.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Next.js 15 Frontend                      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Generator     │  │ Workspace    │  │ Preview Shell      │ │
│  │ Studio        │  │ Content      │  │ (CMS Editor)       │ │
│  │ /generate     │  │ /workspace/* │  │ /preview/*         │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘ │
│         │                  │                    │              │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌────────┴───────────┐ │
│  │ Redux Store   │  │ Socket.IO    │  │ Redux Store        │ │
│  │ studioSlice   │  │ Client       │  │ cmsSlice           │ │
│  │ cmsSlice      │  │ useSocket    │  │ (live patches)     │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘ │
└─────────┼──────────────────┼────────────────────┼─────────────┘
          │ REST             │ REST + WS           │ REST
          ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│                Express + Socket.IO Backend (port 4000)        │
│                                                               │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────────────┐ │
│  │ /api/generate│ │ /api/gemini  │ │ /api/reviews          │ │
│  │ (Claude)    │ │ (Gemini)     │ │ (Review Queue)        │ │
│  └──────┬──────┘ └──────┬───────┘ └───────────┬───────────┘ │
│         │                │                      │              │
│  ┌──────┴───────────────┴──────────────────────┴───────────┐ │
│  │                    Core Services                         │ │
│  │  • fieldId.js — Server-side ID allocation               │ │
│  │  • diffMerge.js — Diff-aware regeneration               │ │
│  │  • llmService.js — Claude API (vision + JSX)           │ │
│  │  • supabaseMeta.js — Supabase KV mirror                 │ │
│  │  • s3Upload.js — Wireframe upload to S3                 │ │
│  │  • socket.js — Socket.IO event handlers                 │ │
│  └──────┬───────────────┬──────────────────────┬───────────┘ │
└─────────┼───────────────────┼──────────────────────┼───────────┘
          │                   │                      │
    ┌─────┴─────┐      ┌─────┴─────┐          ┌─────┴─────┐
    │  MongoDB   │      │  Supabase │          │  AWS S3   │
    │  Sections  │      │  KV pairs │          │ Wireframes│
    │  Elements  │      │  metadata │          │           │
    │  Reviews   │      │  auth     │          │           │
    │  Sessions  │      │           │          │           │
    └───────────┘      └───────────┘          └───────────┘
```

---

## Why These Technologies

### Frontend: Next.js 15 + React 19

| Choice | Why |
|--------|-----|
| **Next.js 15** | File-based routing, App Router for clean route structure, SSR capability, built-in API routes as fallback. The `[sessionId]` dynamic routes make workspace URLs clean. |
| **React 19** | Latest concurrent features, `use()` hook, improved ref handling — needed for `forwardRef` on PanelAgent and real-time state updates without excessive re-renders. |
| **Redux Toolkit** | Required by the problem statement (Section 7). `cmsSlice` stores `allSections[pageName][fieldId]` — the exact runtime shape specified in Section 11.5. `studioSlice` manages generation job state. RTK's `createAsyncThunk` handles API calls cleanly. |
| **Tailwind CSS 4** | Required by the problem statement. Used for all layout. The `globals.css` custom theme defines CSS variables for the dark UI. |
| **Radix UI + shadcn/ui** | Accessible, unstyled primitives. We use shadcn/ui components (Button, Input, etc.) which wrap Radix. This gives us accessible dropdowns, dialogs, tooltips without writing custom ARIA logic. |
| **Socket.IO Client** | Real-time collaboration. The `useWorkspaceSocket` hook manages room join/leave and event subscriptions. `getClientSocket()` singleton avoids multiple connections. |
| **Supabase JS** | Auth (OAuth via Google/GitHub), real-time subscriptions, and KV storage. Used for user sessions and metadata mirroring. |

### Backend: Express + Socket.IO

| Choice | Why |
|--------|-----|
| **Express** | Lightweight, no overhead. The problem statement allows Express/Fastify/NestJS. Express was chosen for simplicity — the backend is mostly CRUD + LLM calls, not complex business logic. |
| **Socket.IO** | Bidirectional real-time events. Handles room-based broadcasting (workspace rooms, section rooms), automatic reconnection, and fallback to long-polling. |
| **Mongoose** | ODM for MongoDB. Schema validation ensures data integrity. The `timestamps: true` option gives us `createdAt`/`updatedAt` for free. Indexes on `sectionId`, `fieldId`, `sessionId` make queries fast. |
| **nanoid** | Generates unique 10-digit numeric IDs for `fieldId` and `reviewId`. Better than `Math.random()` — cryptographically random, URL-safe, and collision-resistant. |

### AI Models: Claude (Studio) + Gemini (Workspace)

| Choice | Why |
|--------|-----|
| **Anthropic Claude** | Used in the Studio flow for JSX generation. Claude Sonnet 4 has excellent vision capabilities (wireframe analysis) and produces high-quality React code. The `@anthropic-ai/sdk` handles streaming and error recovery. |
| **Google Gemini** | Used in two ways: (1) Workspace flow — generates HTML sections from prompts with streaming SSE, (2) Wireframe analysis — `gemini-2.0-flash` analyzes uploaded wireframes to detect UI regions with confidence scores. Gemini's free tier and fast response times make it ideal for the collaborative workspace. |

**Why two models?** Claude produces better React JSX with proper Redux binding (critical for the problem statement's CMS contract), while Gemini excels at rapid HTML generation with streaming — perfect for the real-time collaborative workspace where multiple users see generation progress live.

### Storage: MongoDB + Supabase + S3

| Choice | Why |
|--------|-----|
| **MongoDB** | Primary data store for Section, Element, ReviewItem, and GeneratedSession documents. Document model fits the heterogeneous schemas (Cards loop arrays, nested region coordinates). |
| **Supabase** | Mirrors lightweight metadata for fast lookups (`field_id → section_id`) without full MongoDB queries. Also provides auth (OAuth) and can serve as a real-time backend if needed. The `field_kv` table stores live content that CMS editors update. |
| **AWS S3** | Wireframe image storage. Files are uploaded via `multer` memory storage, then streamed to S3. URLs are stored in Section documents for preview overlay comparison. |

### Diff-Merge Engine

The `diffMerge.js` service is a **custom solution** because existing diff libraries (like `diff`, `deep-diff`) work on text or generic objects — they don't understand CMS element semantics. Our engine:

1. Matches elements by `elementName` (semantic key, not position)
2. Preserves `fieldId` and `content` for unchanged elements
3. Flags genuinely new/removed/reordered elements
4. Broadcasts the diff to collaborators via Socket.IO

This is the **core differentiator** described in the problem statement: "regeneration as a merge, not a rewrite."

---

## Dual-Flow Architecture

### Studio Flow (`/generate` → `/preview/:pageName`)

```
User → GeneratorStudio → POST /api/generate (multipart)
  → allocate fieldIds server-side
  → upload wireframe to S3
  → call Claude (vision + JSX prompt)
  → validate JSX (contains ids, fetchElementsByIds, etc.)
  → diffMerge against existing elements
  → persist Section + Elements to MongoDB
  → mirror to Supabase
  → broadcast diff via Socket.IO
  → return JSX + IDs + warnings

PreviewShell → GET /api/elements?pageName=Home
  → Redux hydrates allSections[pageName][fieldId]
  → Generated section reads from Redux store
  → CMSEditor PATCHes individual elements
  → Live socket broadcasts update to other collaborators
```

**Matches problem statement sections:** 8.1 (wireframe), 8.2 (code), 8.3 (prompt), 8.4 (combined), 12 (component contract), 13 (functional requirements)

### Workspace Flow (`/workspace/:sessionId`)

```
User → ChatArea → POST /api/sessions (create session)
  → store prompt + files in sessionStorage
  → redirect to /workspace/:sessionId

WorkspaceContent → load session from DB
  → PanelAgent streams prompt to Gemini → HTML output
  → progressive reveal in iframe preview
  → save HTML to MongoDB
  → broadcast via Socket.IO workspace room

Second user joins same URL →
  → loads same session from DB
  → receives live HTML updates via socket
  → receives live chat messages via socket
  → sees member list updates via socket

ReviewQueue → shows review items (auto-created from diff, wireframe analysis)
  → team members claim/approve/reject items
  → live updates via socket
```

**Adds beyond problem statement:** Real-time multi-user collaboration, chat-based generation, review queue with confidence scoring

---

## Security Considerations

1. **API keys never in git** — `.env` files in `.gitignore`
2. **Server-side ID allocation** — LLM never assigns fieldIds (Section 22, Risk: ID collision)
3. **No code execution** — User-pasted code is sent to Claude as text, never eval'd on the server
4. **S3 CORS** — Restricted to localhost:3000 during development
5. **Supabase RLS** — Row-level security can be enabled for production
6. **HTML sanitization** — The edit page uses `DOMPurify` to sanitize CMS content
7. **Client ID deduplication** — Socket.IO events include `clientId` to prevent self-receive loops

---

## File Structure

```
codex/
├── backend/
│   ├── src/
│   │   ├── config/           # MongoDB, Supabase, S3, Socket.IO setup
│   │   ├── controllers/      # Route handlers (generate, sections, elements)
│   │   ├── middleware/       # Error handler, async wrapper
│   │   ├── models/           # Mongoose schemas (Section, Element, ReviewItem, etc.)
│   │   ├── routes/           # Express route definitions
│   │   ├── services/         # Business logic (llmService, diffMerge, supabaseMeta)
│   │   └── utils/            # fieldId generator, seed data
│   └── .env
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx          # Home (HomeShell)
│   │   ├── auth/page.tsx     # Auth callback
│   │   ├── generate/page.tsx # Generator Studio
│   │   ├── preview/[pageName]/page.tsx # Preview Shell
│   │   ├── workspace/[sessionId]/page.tsx # Collaborative workspace
│   │   ├── edit/[sessionId]/page.tsx # CMS field editor
│   │   └── sections/page.tsx # All sections grid
│   ├── components/
│   │   ├── chat/             # ChatArea (home page AI chat)
│   │   ├── home/             # HomeShell (landing page)
│   │   ├── preview/          # PreviewShell, CMSEditor
│   │   ├── shared/           # ShaderBackground, ParticleOrb, etc.
│   │   ├── studio/           # GeneratorStudio, JobHistory, SectionsList
│   │   ├── ui/               # shadcn/ui components
│   │   └── workspace/        # WorkspaceContent, PanelAgent, PanelPreview, etc.
│   ├── hooks/                # useSocket, custom React hooks
│   ├── lib/                  # Supabase client, utils
│   ├── store/                # Redux store + slices
│   └── middleware.ts         # Supabase auth middleware
├── docs/                     # This documentation
└── README.md
```
