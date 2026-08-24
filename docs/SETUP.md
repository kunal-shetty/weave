# Promptify — Setup Guide

## Prerequisites

| Requirement | Version | Why |
|-------------|---------|-----|
| Node.js | ≥ 20 | Backend runtime + Next.js |
| npm | ≥ 9 | Package manager |
| MongoDB | ≥ 6.0 | Primary data store (local or Atlas) |
| Supabase account | — | Auth + metadata mirroring (free tier works) |
| AWS account | — | S3 for wireframe storage (free tier works) |
| Anthropic API key | — | Claude for JSX generation |
| Google AI API key | — | Gemini for HTML generation + wireframe analysis |

---

## Step 1: Clone & Install

```bash
git clone <repo-url> codex
cd codex

# Install all dependencies
npm run install:all

# Or install individually:
cd backend && npm install
cd ../frontend && npm install
```

---

## Step 2: Environment Variables

### Backend (`backend/.env`)

Copy the template and fill in your values:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Description | How to get |
|----------|----------|-------------|------------|
| `PORT` | No | Backend port (default: 4000) | — |
| `MONGODB_URI` | Yes | MongoDB connection string | `mongodb://localhost:27017/codex` for local, or MongoDB Atlas URI |
| `SUPABASE_URL` | Yes | Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key | Supabase Dashboard → Settings → API → service_role key |
| `AWS_REGION` | Yes | S3 bucket region | AWS Console → S3 → bucket → Properties |
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key | AWS Console → IAM → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key | Same as above |
| `AWS_S3_BUCKET` | Yes | S3 bucket name | Create bucket in AWS S3 console |
| `ANTHROPIC_API_KEY` | Yes | Claude API key | console.anthropic.com → API Keys |
| `GOOGLE_AI_API_KEY` | Yes | Gemini API key | aistudio.google.com → API Keys |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: http://localhost:3000) | — |

### Frontend (`frontend/.env`)

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend API URL (default: http://localhost:4000) |
| `NEXT_PUBLIC_SOCKET_URL` | No | Socket.IO URL (default: http://localhost:4000) |
| `NEXT_PUBLIC_STORAGE_URL` | No | S3 public URL for wireframe images |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |

---

## Step 3: MongoDB

### Option A: Local MongoDB

```bash
# Install MongoDB Community Edition
# https://www.mongodb.com/docs/manual/installation/

# Start the service
mongod --dbpath /data/db

# Verify it's running
mongosh --eval "db.runCommand({ ping: 1 })"
```

### Option B: MongoDB Atlas (Free Tier)

1. Create account at mongodb.com/atlas
2. Create a free M0 cluster
3. Set database access (username + password)
4. Set network access (allow localhost: `0.0.0.0/0`)
5. Get connection string: Drivers → Connect → Node.js → Copy URL
6. Paste as `MONGODB_URI` in `backend/.env`

---

## Step 4: Supabase

1. Create a project at supabase.com (free tier)
2. Go to **Settings → API** and copy:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role secret)
   - `SUPABASE_ANON_KEY` (anon public key)
3. Go to **Authentication → Providers** and enable:
   - Google (requires OAuth credentials from Google Cloud Console)
   - GitHub (requires OAuth credentials from GitHub Settings)
4. Go to **SQL Editor** and run the migration:

```sql
-- Section metadata
CREATE TABLE IF NOT EXISTS section_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id text UNIQUE NOT NULL,
  page_name text,
  section_name text,
  status text,
  wireframe_url text,
  s3_key text,
  created_at timestamptz DEFAULT now(),
  meta jsonb
);

-- Element metadata
CREATE TABLE IF NOT EXISTS element_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id text UNIQUE NOT NULL,
  section_id text,
  page_name text,
  element_name text,
  content_type text,
  created_at timestamptz DEFAULT now()
);

-- Live content KV store
CREATE TABLE IF NOT EXISTS field_kv (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id text UNIQUE NOT NULL,
  section_id text,
  page_name text,
  content text,
  css text,
  updated_at timestamptz DEFAULT now()
);

-- Workspace members (if not using MongoDB for this)
-- Note: WorkspaceMember uses MongoDB, not Supabase
```

---

## Step 5: AWS S3

1. Create an S3 bucket (e.g., `codex-wireframes`)
2. Set bucket policy for public read access (for wireframe images):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::codex-wireframes/*"
    }
  ]
}
```

3. Set CORS configuration:

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

4. Create IAM user with `AmazonS3FullAccess` (or restricted policy)
5. Get access key ID and secret access key

---

## Step 6: Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# 🚀 Promptify API running on http://localhost:4000

# Terminal 2 — Frontend
cd frontend
npm run dev
# ▲ Next.js 15.2.4
#   - Local: http://localhost:3000
```

---

## Step 7: Demo Script (5-8 minutes)

### Demo 1: Prompt Mode (Studio)

1. Open http://localhost:3000/generate
2. Click "Prompt" mode (should be default)
3. Type: *"Create a fitness hero for Pulse Fit. Left athlete image, right red badge, bold headline, 3 stat cards, red CTA."*
4. Click "Generate" → watch progress messages
5. Click "Preview" → opens `/preview/Home`
6. Show: section renders from Redux, DOM has fieldIds
7. Open CMS Editor → edit headline → preview updates without regenerating

### Demo 2: Wireframe Mode (Studio)

1. Upload a wireframe PNG (boxes labelled Hero/Badge/Headline/Stats/CTA)
2. Click "Generate"
3. Show wireframe overlay comparison in preview

### Demo 3: Real-Time Collaboration (Workspace)

1. Open http://localhost:3000 → type a prompt → hit Enter
2. Copy the workspace URL
3. Open in incognito window (different user)
4. Show: both tabs see the same preview, chat messages sync
5. Generate in one tab → other tab sees progressive HTML update

### Demo 4: Review Queue

1. In workspace, click "Reviews" tab in left panel
2. Show review items with confidence scores
3. Click "Claim" → "Approve" on an item
4. Show other tab sees the update live

---

## Troubleshooting

### MongoDB connection refused

```bash
# Make sure MongoDB is running
mongod --dbpath /data/db
# Or for Atlas: check MONGODB_URI format
```

### Gemini API error

```bash
# Check GOOGLE_AI_API_KEY is set
# Get one free at: aistudio.google.com/apikey
```

### Anthropic API error

```bash
# Check ANTHROPIC_API_KEY is set
# Get one at: console.anthropic.com
```

### Supabase auth not working

```bash
# Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# Make sure Google/GitHub OAuth providers are enabled
```

### Port 4000 already in use

```bash
# Find and kill the process
lsof -i :4000
kill -9 <PID>
```

### Socket.IO connection issues

```bash
# Make sure CORS is configured correctly
# Check FRONTEND_URL matches your frontend URL
# Check NEXT_PUBLIC_SOCKET_URL matches backend URL
```

---

## Seed Data (Optional)

```bash
cd backend
npm run seed
```

This creates sample sections and elements matching the problem statement's fitness brand scenario.

---

## Available Scripts

### Root (`codex/`)

| Script | Description |
|--------|-------------|
| `npm run dev:backend` | Start backend in dev mode |
| `npm run dev:frontend` | Start frontend in dev mode |
| `npm run install:all` | Install all dependencies |
| `npm run seed` | Seed demo data |

### Backend (`codex/backend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start in production mode |
| `npm run seed` | Seed demo data |

### Frontend (`codex/frontend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
