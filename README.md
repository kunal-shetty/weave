# CodeX — AI-Assisted UI Generation Platform
### SIH 2026 · Problem Statement PS7 · Team CodeX

Generate CMS-bound React sections from **wireframe images**, **existing code**, or a **natural language prompt** — or combine all three.

---

## Architecture Overview

```
User Input (Wireframe / Code / Prompt)
        │
        ▼
 ┌─────────────────┐
 │  Next.js Frontend│  Redux (CMS slice + Studio slice)
 │  Generator Studio│  Socket.IO client (live patches)
 └────────┬────────┘
          │ POST /api/generate (multipart)
          ▼
 ┌─────────────────────────────────────────────────────┐
 │              Express + Socket.IO Backend             │
 │                                                     │
 │  1. Allocate fieldIds server-side (never via LLM)   │
 │  2. Upload wireframe → AWS S3                       │
 │  3. Call Anthropic Claude (vision + text)           │
 │  4. Diff-merge against existing elements            │
 │  5. Save Section + Elements → MongoDB               │
 │  6. Mirror metadata + KV pairs → Supabase           │
 │  7. Broadcast diff via Socket.IO                    │
 └─────────────────────────────────────────────────────┘
          │
    ┌─────┴──────────────────┐
    │                        │
    ▼                        ▼
 MongoDB                 Supabase
 (documents)          (KV pairs + meta)
    │
    ▼
 AWS S3
 (wireframe images)
```

## Data Flow

| Store | What lives there |
|-------|-----------------|
| **MongoDB** | Full Section + Element documents (generated JSX, loops, CSS) |
| **Supabase** | `section_meta` (page-level lookup), `element_meta` (field-level lookup), `field_kv` (live content KV) |
| **AWS S3** | Wireframe PNG/JPG uploads (key = `wireframes/{sectionId}.{ext}`) |

---

## Prerequisites

- Node.js ≥ 20
- MongoDB (local or Atlas)
- Supabase project
- AWS account with an S3 bucket
- Anthropic API key

---

## Setup

### 1. Clone & install

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Environment variables

**Backend** — copy `.env.example` to `.env` and fill in:

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/codex
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=codex-wireframes
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://localhost:3000
```

**Frontend** — copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_STORAGE_URL=https://codex-wireframes.s3.us-east-1.amazonaws.com
```

### 3. Supabase migration

Run `supabase_migration.sql` in your Supabase SQL editor. This creates:
- `section_meta` — page-level section metadata
- `element_meta` — field-level element metadata  
- `field_kv` — live content key-value pairs

Optionally enable Realtime on `field_kv` for push-based CMS updates.

### 4. AWS S3 bucket

Create a bucket named `codex-wireframes` (or your chosen name). Configure CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": []
  }
]
```

### 5. Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:3000** → redirects to `/generate`.

### 6. Seed demo data (optional)

```bash
cd backend && npm run seed
```

---

## API Reference

### POST `/api/generate`
**Multipart form-data**

| Field | Type | Required |
|-------|------|----------|
| `wireframe` | File (PNG/JPG/WebP) | one of three |
| `code` | text | one of three |
| `prompt` | text | one of three |
| `pageName` | text | no (default: Home) |
| `sectionName` | text | no (default: HeroSection) |
| `accentColor` | text | no (default: #ef4444) |
| `cardCount` | number | no (default: 3) |

**Response** `201`
```json
{
  "sectionId": "7001234567",
  "sectionName": "HeroSection",
  "pageName": "Home",
  "generatedJsx": "...",
  "ids": { "heroImage": "...", "headlineMain": "...", ... },
  "warnings": [],
  "wireframeUrl": "https://...",
  "elements": [...]
}
```

### GET `/api/sections`
Returns all sections sorted by `createdAt` desc.

### POST `/api/sections/:sectionId/regenerate`
Body: `{ prompt?, accentColor? }` — Triggers a new LLM generation, diffs against existing elements, broadcasts via Socket.IO.

### PATCH `/api/sections/:sectionId/status`
Body: `{ sectionStatus: "Approved" | "Rejected" | "Pending" }`

### GET `/api/elements?sectionId=&pageName=`
Returns filtered elements.

### PATCH `/api/elements/:fieldId`
Body: `{ content?, css?, loop? }` — Live-syncs to Supabase KV and broadcasts Socket.IO `element_patched`.

### GET `/api/health`
Returns service connection status (MongoDB, Supabase, S3, LLM).

---

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/generate` | Generator Studio (wireframe + code + prompt) |
| `/preview/:pageName` | Live preview with CMS editor + status controls |
| `/sections` | All sections grid with filter and status management |

---

## Generated Section Contract

Every section the LLM outputs must follow these rules (validated server-side):

1. **`const ids = { ... }`** — references server-allocated fieldIds only
2. **`dangerouslySetInnerHTML`** — every text node, with fallback
3. **`fetchElementsByIds` dispatch** — on mount
4. **`useSelector`** — reads from `state.cms.allSections[pageName]`
5. **`applyCssOverrides(cssData)`** in `useEffect` on cssData change
6. **`export default`** — named component

See `sections/generated/HeroSection.tsx` for the reference implementation.

---

## Socket.IO Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_section` | Client → Server | `{ sectionId }` |
| `leave_section` | Client → Server | `{ sectionId }` |
| `element_patched` | Server → Client | `CMSElement` |
| `diff_update` | Server → Client | `{ sectionId, diff }` |

---

## Team

**CodeX** — SIH 2026, Problem Statement PS7: AI-Assisted UI Generation from Design Inputs
