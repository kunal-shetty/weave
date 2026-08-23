# CodeX — AI-Assisted UI Generation Platform

### SIH 2026 · Problem Statement PS7 · Team CodeX

> A CMS-bound UI generator that treats regeneration as a **merge, not a rewrite** — so live content edits never get wiped out when a design changes.

---

## What CodeX Does

Give it a **wireframe image**, **existing React code**, or a **natural-language prompt** — or combine all three — and CodeX generates a production-ready, CMS-bound React section with:

- **Stable field IDs** — every editable text, image, and button has a unique `fieldId` that survives regeneration
- **Redux data binding** — sections read content from the Redux store, not hard-coded strings
- **Diff-aware regeneration** — when you regenerate, unchanged elements keep their IDs and live content. Only genuinely new/removed elements are flagged
- **Live CMS editing** — change a headline in the editor panel, and the preview updates instantly without regenerating code
- **Real-time collaboration** — multiple team members see the same workspace, chat, and preview updates live
- **Confidence-scored review queue** — wireframe regions are analysed by AI and flagged with confidence scores for team review

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> codex
cd codex
npm run install:all

# 2. Set up environment
cp backend/.env.example backend/.env    # Fill in API keys
cp frontend/.env.example frontend/.env  # Fill in Supabase keys

# 3. Start MongoDB (local or Atlas)

# 4. Run
npm run dev:backend    # Terminal 1 → http://localhost:4000
npm run dev:frontend   # Terminal 2 → http://localhost:3000
```

**Detailed setup:** [docs/SETUP.md](docs/SETUP.md)

---

## Architecture

```
User Input (Wireframe / Code / Prompt)
        │
        ▼
 ┌─────────────────┐
 │  Next.js 15      │  React 19 + Redux Toolkit + Tailwind CSS 4
 │  Generator Studio │  Socket.IO client (live collaboration)
 └────────┬────────┘
          │ REST / SSE
          ▼
 ┌─────────────────────────────────────────────┐
 │        Express + Socket.IO Backend           │
 │                                              │
 │  Claude (JSX generation)  Gemini (HTML +    │
 │  + wireframe vision)       wireframe analysis)│
 │                                              │
 │  Diff-Merge Engine · Review Queue · Member   │
 │  Management · Real-time Broadcasting         │
 └──────┬──────────────┬──────────────┬────────┘
        │              │              │
   MongoDB         Supabase        AWS S3
   (documents)    (KV + auth)   (wireframes)
```

**Full architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Two Generation Flows

### Studio Flow (`/generate` → `/preview/:pageName`)

The original architecture matching the problem statement. Generates **React JSX** with full Redux binding, CMS editor, and diff-merge engine.

**Routes:** `/generate`, `/preview/:pageName`, `/sections`

### Workspace Flow (`/workspace/:sessionId`)

A real-time collaborative flow. Generates **HTML** with streaming, live preview, chat, member management, and review queue.

**Routes:** `/workspace/:sessionId`, `/edit/:sessionId`

Both flows share: MongoDB persistence, Supabase metadata mirroring, Socket.IO real-time events, and the review queue.

---

## Features

| Feature | Studio | Workspace |
|---------|--------|-----------|
| Prompt generation | ✅ Claude | ✅ Gemini |
| Wireframe input | ✅ Claude Vision | ✅ Gemini Vision |
| Code input | ✅ Claude | — |
| Combined inputs | ✅ | — |
| React JSX output | ✅ | — |
| HTML output | — | ✅ |
| CMS field editing | ✅ CMSEditor | ✅ field-* editor |
| Diff-merge engine | ✅ | — |
| Real-time collab | ✅ (socket) | ✅ (full) |
| Chat | — | ✅ |
| Review queue | ✅ (auto-created) | ✅ (live) |
| Confidence scoring | ✅ | ✅ |
| Wireframe overlay | ✅ | — |
| Member management | — | ✅ |
| Approve/reject | ✅ (section) | ✅ (per-element) |

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full system architecture, technology choices, why each tool was chosen |
| [docs/API.md](docs/API.md) | Complete API reference for all endpoints |
| [docs/DATABASE.md](docs/DATABASE.md) | MongoDB models, Supabase tables, Redux store shape |
| [docs/FRONTEND.md](docs/FRONTEND.md) | Component architecture, state management, design system |
| [docs/REALTIME.md](docs/REALTIME.md) | Socket.IO architecture, room management, event flow |
| [docs/FEATURES.md](docs/FEATURES.md) | Feature matrix mapped to problem statement requirements |
| [docs/SETUP.md](docs/SETUP.md) | Detailed setup guide with troubleshooting |
| [docs/CHECKLIST.md](docs/CHECKLIST.md) | Acceptance checklist verification (Section 24) |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 15, React 19, Redux Toolkit | File-based routing, concurrent rendering, CMS state management |
| Styling | Tailwind CSS 4, shadcn/ui | Required by problem statement, accessible components |
| Backend | Express, Socket.IO | Lightweight API + real-time events |
| Database | MongoDB (Mongoose), Supabase | Document model for complex schemas, fast KV lookups |
| Storage | AWS S3 | Wireframe image hosting |
| AI | Claude (Anthropic), Gemini (Google) | Vision + code generation, fast HTML streaming |
| Auth | Supabase Auth (OAuth) | Google/GitHub login |

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate` | Generate React section (wireframe + code + prompt) |
| GET | `/api/sections` | List all sections |
| POST | `/api/sections/:id/regenerate` | Regenerate with diff-merge |
| PATCH | `/api/sections/:id/status` | Approve/reject section |
| GET | `/api/elements` | List CMS elements |
| PATCH | `/api/elements/:fieldId` | Edit element content |
| POST | `/api/sessions` | Create workspace session |
| POST | `/api/reviews/:sessionId` | Create review items |
| PATCH | `/api/reviews/:sessionId/:reviewId` | Assign/approve/reject review |
| POST | `/api/reviews/analyze-wireframe` | AI wireframe analysis |

**Full API docs:** [docs/API.md](docs/API.md)

---

## Problem Statement Compliance

CodeX addresses **PS7: AI-Assisted UI Generation from Wireframe, Code, and Prompt** with:

- ✅ All 4 primary objectives (Section 4.1)
- ✅ All 3 secondary objectives (Section 4.2)
- ✅ 6 of 8 stretch objectives (Section 4.3)
- ✅ All 14 mandatory component rules (Section 12.1)
- ✅ All 6 Generator Studio requirements (FR-G)
- ✅ All 8 Generation Engine requirements (FR-E)
- ✅ All 7 Preview/CMS requirements (FR-P)
- ✅ All 6 Persistence API requirements (FR-A)
- ✅ All 10 Non-Functional requirements (NFR)

**Full feature matrix:** [docs/FEATURES.md](docs/FEATURES.md)

---

## Team

**CodeX** — Smart India Hackathon 2026, Problem Statement PS7
