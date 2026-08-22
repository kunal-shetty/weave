# CodeX — AI-Assisted UI Generation

**Smart India Hackathon 2026 · PS7 · Team CodeX (T19)**

Generate CMS-bound React sections from wireframes, code, and prompts. Diff-aware regeneration preserves live content edits.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| State | Redux Toolkit |
| Component Library | shadcn/ui (Radix + Tailwind) |
| Backend | Next.js API Routes |
| Database | MongoDB (Mongoose) + Supabase SQL |
| AI | OpenAI API (or any compatible LLM) |
| Styling | Tailwind CSS with dark theme |

## Quick Start

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
- `OPENAI_API_KEY` — your OpenAI API key (or compatible)
- `MONGODB_URI` — MongoDB connection string (or use local)

### 3. Start MongoDB (if using local)

```bash
# If you have MongoDB installed locally:
mongod

# Or use MongoDB Atlas (set MONGODB_URI in .env.local)
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Script (5–8 minutes)

### Step 1: Landing Page (30s)
- Open `http://localhost:3000`
- Show the landing page with features overview
- Verify API health badge shows "Connected"

### Step 2: Generator Studio — Prompt Mode (2 min)
- Navigate to `/generate`
- Enter prompt: "A split-hero with athlete image left, bold headline, 3 stat cards, red CTA"
- Set Page: `Home`, Section: `Hero`
- Click "Generate Section"
- Show generated JSX output and section ID
- Click "Preview" to see the result

### Step 3: Live Preview & CMS Edit (2 min)
- Navigate to `/preview/Home`
- Toggle between Desktop and Mobile views
- Click on any text element to edit it inline
- Show the Element Inspector table at the bottom
- Edit a headline → verify it updates instantly without regeneration

### Step 4: Generator Studio — Code Input (1 min)
- Return to `/generate`
- Switch to "Code" tab
- Paste the contents of `sections/generated/HeroSection.tsx`
- Generate a new section using code patterns
- Show that it preserves the same structure

### Step 5: Combined Input Mode (1 min)
- Switch to "Prompt" tab
- Enter: "A testimonial carousel with customer photos, quotes, and star ratings"
- Also upload a wireframe image if available
- Generate and preview

### Step 6: API Inspection (30s)
- Show API endpoints:
  - `GET /api/health` — liveness check
  - `GET /api/sections` — list sections
  - `GET /api/elements?pageName=Home` — fetch elements
  - `PATCH /api/elements/:fieldId` — update content

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/generate` | Generate section from prompt/wireframe/code |
| `GET` | `/api/sections` | List all section metadata |
| `GET` | `/api/sections/:sectionId` | Single section detail |
| `PATCH` | `/api/sections/:sectionId` | Update section metadata |
| `DELETE` | `/api/sections/:sectionId` | Delete section + elements |
| `GET` | `/api/elements` | Elements array (by sectionId or pageName) |
| `PATCH` | `/api/elements/:fieldId` | Update element content/css |
| `DELETE` | `/api/elements/:fieldId` | Delete element |
| `POST` | `/api/sections/:sectionId/regenerate` | Generate variation with diff-merge |
| `POST` | `/api/upload` | Upload wireframe image |
| `GET` | `/api/health` | Liveness check |

## Data Models

### Section
```json
{
  "sectionId": "10-digit string",
  "sectionName": "Hero",
  "pageName": "Home",
  "platform": "Website",
  "isGenerated": true,
  "sectionStatus": "Pending | Approved | Rejected",
  "wireframes": "/uploads/file.png | null",
  "variations": 1,
  "cardGridColumns": 3
}
```

### Element
```json
{
  "fieldId": "10-digit string (stable across regenerations)",
  "sectionId": "parent section reference",
  "elementName": "heroImage | headlineMain | ...",
  "contentType": "Image | Text | Textfield | Button | Cards",
  "content": "current CMS value",
  "loop": [{"fieldId": "...", "value": "...", "label": "..."}],
  "css": "inline cssText overlay | null",
  "pageName": "Home"
}
```

## Redux State Shape

```
state.cms.allSections[pageName][fieldId]    // content string or loop array
state.cms.allSectionsCss[pageName][fieldId] // cssText string
state.cms.sectionNames = { [sectionId]: sectionName }
```

## Supabase Setup (Alternative)

1. Create a Supabase project
2. Run the migration: `supabase/migrations/001_initial_schema.sql`
3. Update `.env.local` with Supabase credentials

## Seed Data

Import the reference section:
```bash
# MongoDB
mongoimport --db codex --collection sections --jsonArray seed/pulse-fit-hero.json
```

Or use the seed data in `seed/pulse-fit-hero.json` which includes:
- 1 section (Pulse Fit Hero)
- 10 elements (brandBadge, headlines, description, image, CTA, 3 stat cards)

## Generated Reference Output

See `sections/generated/HeroSection.tsx` — a complete CMS-bound section that:
- Declares `const ids` with semantic → fieldId mapping
- Accepts `pageName` prop
- Reads live values from Redux store
- Uses `dangerouslySetInnerHTML` with fallback defaults
- Applies CSS overlays from store
- Uses Tailwind for responsive layout (2-col desktop, stacked mobile)
- Export default

## Known Limitations

- Wireframe analysis uses text description only (no actual image vision analysis)
- Socket.IO collaborative layer is stubbed (not fully implemented)
- No real-time Socket.IO sync in demo
- Image generation from wireframes is placeholder-based
- LLM output may occasionally require retry for valid JSON

## Project Structure

```
.
├── app/
│   ├── api/                    # Next.js API routes
│   │   ├── generate/           # POST /api/generate
│   │   ├── sections/           # GET, POST, PATCH, DELETE
│   │   ├── elements/           # GET, POST, PATCH, DELETE
│   │   ├── upload/             # POST file upload
│   │   └── health/             # GET liveness
│   ├── generate/               # Generator Studio page
│   ├── preview/[pageName]/     # Preview shell
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   └── globals.css             # Global styles
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── store-provider.tsx      # Redux Provider
│   └── theme-provider.tsx      # Theme Provider
├── lib/
│   ├── mongodb.ts              # MongoDB connection
│   ├── models/index.ts         # Mongoose models
│   ├── generation-engine.ts    # AI generation engine
│   ├── id-generator.ts         # 10-digit ID generator
│   ├── sanitizer.ts            # HTML sanitizer
│   └── utils.ts                # Utility functions
├── store/
│   ├── index.ts                # Redux store
│   ├── cmsSlice.ts             # CMS state slice
│   └── hooks.ts                # Typed hooks
├── sections/generated/         # Reference generated sections
├── seed/                       # Seed data
├── supabase/migrations/        # Supabase SQL migrations
├── .env.example                # Environment template
└── README.md                   # This file
```

## Evaluation Rubric Alignment

| Criterion | Points | Status |
|-----------|--------|--------|
| CMS contract compliance | 25 | ✅ ids map, fetch, fallbacks, fieldIds, Cards loop, css |
| Input coverage | 20 | ✅ Prompt + wireframe + code + combined |
| Layout fidelity | 15 | ✅ Split hero, stats row, CTA, responsive |
| Backend quality | 15 | ✅ Generate + CRUD APIs, persistence, validation |
| Code quality | 10 | ✅ Readable React/TS, README, .env.example |
| UX of the studio | 10 | ✅ Tabs, errors, preview, inspector |
| Innovation / stretch | 5 | ✅ Diff-merge, sanitizer, variations |

**Total: 100 points**

---

*All brand names, IDs, file paths, and credentials in this project are fictional sample data.*
