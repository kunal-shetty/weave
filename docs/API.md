# CodeX — API Reference

All endpoints are prefixed with the backend URL (default: `http://localhost:4000`).

---

## Table of Contents

- [Generation](#generation)
- [Sessions (Workspace)](#sessions-workspace)
- [Sections](#sections)
- [Elements](#elements)
- [Workspace Members](#workspace-members)
- [Reviews](#reviews)
- [Wireframe Analysis](#wireframe-analysis)
- [Gemini (Workspace Generation)](#gemini-workspace-generation)
- [Health](#health)

---

## Generation

### POST `/api/generate`

Generate a new CMS-bound React section. Accepts wireframe image, existing code, and/or prompt.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `wireframe` | File | one of three | — | PNG/JPG/WebP wireframe image (max 10MB) |
| `code` | text | one of three | — | Existing React/JSX code to analyse |
| `prompt` | text | one of three | — | Natural language description |
| `pageName` | text | no | `Home` | Page this section belongs to |
| `sectionName` | text | no | `HeroSection` | Logical section name |
| `accentColor` | text | no | `#ef4444` | Accent colour for the section |
| `cardCount` | number | no | `3` | Number of stat cards |

**Response `201`:**
```json
{
  "sectionId": "7001234567",
  "sectionName": "HeroSection",
  "pageName": "Home",
  "generatedJsx": "const HeroSection = ({ pageName = 'Home' }) => { ... }",
  "ids": {
    "heroImage": "2000000001",
    "brandBadge": "2000000002",
    "headlineMain": "2000000003",
    "headlineSub": "2000000004",
    "description": "2000000005",
    "ctaButton": "2000000006",
    "cardsContainer": "2000000007",
    "cards": [
      { "fieldId1": "2000000008", "fieldId2": "2000000009" },
      { "fieldId1": "2000000010", "fieldId2": "2000000011" },
      { "fieldId1": "2000000012", "fieldId2": "2000000013" }
    ]
  },
  "warnings": [],
  "diff": { "unchanged": [], "added": ["heroImage", ...], "removed": [], "reordered": false },
  "wireframeUrl": "https://s3.amazonaws.com/codex-wireframes/wireframes/7001234567.png",
  "elements": [...]
}
```

**Error `400`:** Missing all inputs
**Error `422`:** LLM generation failed

---

## Sessions (Workspace)

### POST `/api/sessions`

Create a new workspace session.

**Body (JSON):**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "avatarUrl": "https://...",
  "prompt": "Create a hero section...",
  "htmlContent": "<div>...</div>",
  "files": [],
  "fileCount": 0
}
```

**Response `201`:** Session object with `sessionId`, `prompt`, `htmlContent`, `files`, etc.

### POST `/api/sessions/:sessionId`

Update an existing session (save generated HTML, add chat message, etc.). Broadcasts `workspace:html_updated` to all collaborators.

**Body (JSON):**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "htmlContent": "<div>...</div>",
  "prompt": "user message",
  "clientId": "socket-client-id"
}
```

**Response `201`:** Updated session object.

### PATCH `/api/sessions/:sessionId`

Partial update of session content. Broadcasts `workspace:html_updated`.

**Body (JSON):**
```json
{
  "htmlContent": "<div>updated...</div>",
  "status": "edited",
  "clientId": "socket-client-id"
}
```

### GET `/api/sessions/:sessionId`

Fetch a session by ID. Returns the full session object including `htmlContent`.

---

## Sections

### GET `/api/sections`

List all sections, sorted by `createdAt` descending.

**Response `200`:** Array of section objects.

### GET `/api/sections/:sectionId`

Get a single section by ID.

**Response `200`:** Section object.
**Response `404`:** `{ "error": "Section not found" }`

### POST `/api/sections/:sectionId/regenerate`

Regenerate a section with a new LLM call. Performs diff-merge against existing elements, broadcasts diff, and auto-creates review items.

**Body (JSON):**
```json
{
  "prompt": "Make the headline bolder",
  "accentColor": "#3b82f6"
}
```

**Response `200`:**
```json
{
  "sectionId": "...",
  "generatedJsx": "...",
  "ids": {...},
  "diff": { "unchanged": [...], "added": [...], "removed": [...] },
  "warnings": [],
  "elements": [...]
}
```

### PATCH `/api/sections/:sectionId/status`

Update section approval status.

**Body (JSON):**
```json
{ "sectionStatus": "Approved" }
```

Valid values: `"Pending"`, `"Approved"`, `"Rejected"`

---

## Elements

### GET `/api/elements`

List elements, filtered by section or page.

**Query params:**
- `sectionId` — filter by section
- `pageName` — filter by page

**Response `200`:** Array of element objects.

### GET `/api/elements/:fieldId`

Get a single element by fieldId.

### PATCH `/api/elements/:fieldId`

Update an element's content, CSS, or loop data. Broadcasts `element_patched` via Socket.IO.

**Body (JSON):**
```json
{
  "content": "New headline text",
  "css": "color: blue; font-size: 24px;",
  "loop": [
    { "fieldId1": "...", "fieldId2": "...", "value1": "1000+", "value2": "Members" }
  ]
}
```

---

## Workspace Members

### GET `/api/workspace-members/:sessionId`

List all members of a workspace session.

**Response `200`:** Array of member objects with `userId`, `email`, `fullName`, `role`, `status`.

### POST `/api/workspace-members/:sessionId`

Invite a member to a workspace.

**Body (JSON):**
```json
{
  "userId": "uuid",
  "email": "collaborator@example.com",
  "fullName": "Jane Doe",
  "role": "member"
}
```

Valid roles: `"owner"`, `"member"`. Enforces single-owner rule.

### PATCH `/api/workspace-members/:sessionId/:userId`

Update a member's role.

**Body (JSON):**
```json
{ "role": "member" }
```

### DELETE `/api/workspace-members/:sessionId/:userId`

Remove a member from the workspace.

---

## Reviews

### GET `/api/reviews/:sessionId`

List review items for a workspace.

**Query params:**
- `status` — filter by status (`pending`, `assigned`, `approved`, `rejected`, `needs_changes`)
- `type` — filter by type (`wireframe_region`, `field_change`, `new_element`, `removed_element`, `reordered`)

**Response `200`:** Array of review item objects.

### POST `/api/reviews/:sessionId`

Bulk create review items.

**Body (JSON):**
```json
{
  "items": [
    {
      "type": "new_element",
      "confidence": 70,
      "elementName": "ctaButton",
      "newContent": "Sign Up Now"
    },
    {
      "type": "wireframe_region",
      "confidence": 85,
      "wireframeLabel": "hero-banner",
      "wireframeSuggestion": "Main hero image area",
      "region": { "x": 0, "y": 0, "width": 0.5, "height": 0.6 }
    }
  ]
}
```

**Response `201`:** Array of created review items.

### PATCH `/api/reviews/:sessionId/:reviewId`

Update a review item (assign, approve, reject).

**Body (JSON):**
```json
{
  "status": "approved",
  "assignedTo": "user-uuid",
  "assignedName": "Jane Doe",
  "notes": "Looks good"
}
```

### DELETE `/api/reviews/:sessionId/:reviewId`

Delete a review item.

### POST `/api/reviews/:sessionId/bulk`

Bulk approve or reject all pending items.

**Body (JSON):**
```json
{
  "status": "approved",
  "filter": { "type": "new_element" }
}
```

---

## Wireframe Analysis

### POST `/api/reviews/analyze-wireframe`

Analyse a wireframe image using Gemini Vision. Returns confidence-scored UI regions.

**Body (JSON):**
```json
{
  "imageBase64": "data:image/png;base64,...",
  "mimeType": "image/png",
  "sessionId": "optional-session-id"
}
```

**Response `200`:**
```json
{
  "regions": [
    {
      "label": "hero-banner",
      "confidence": 95,
      "region": { "x": 0, "y": 0, "width": 1.0, "height": 0.6 },
      "suggestion": "Main hero image with athlete"
    },
    {
      "label": "cta-button",
      "confidence": 88,
      "region": { "x": 0.55, "y": 0.7, "width": 0.3, "height": 0.06 },
      "suggestion": "Primary call-to-action button"
    }
  ],
  "sessionId": "abc123"
}
```

**Error `400`:** Missing `imageBase64`
**Error `502`:** Gemini API error

---

## Gemini (Workspace Generation)

### POST `/api/gemini/generate`

Stream HTML generation from Gemini. Returns Server-Sent Events (SSE).

**Body (JSON):**
```json
{
  "prompt": "Create a dark-themed hero section with 3 stat cards",
  "images": ["base64-encoded-images"],
  "model": "gemini-3.6-flash"
}
```

**Response:** `text/event-stream`

Each event:
```
data: {"text": "<div...", "done": false}
data: {"text": "", "done": true}
data: [DONE]
```

### GET `/api/gemini/models`

List available Gemini models.

**Response `200`:**
```json
{
  "models": [
    { "id": "gemini-3.6-flash", "name": "Gemini 3.6 Flash", "description": "Fast and efficient" }
  ]
}
```

---

## Health

### GET `/api/health`

Check service connectivity.

**Response `200`:**
```json
{
  "status": "ok",
  "mongodb": "connected",
  "supabase": "connected",
  "timestamp": "2026-08-23T10:00:00.000Z"
}
```

---

## Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_section` | `{ sectionId }` | Join a CMS section room (legacy) |
| `leave_section` | `{ sectionId }` | Leave a section room |
| `join_workspace` | `{ sessionId }` | Join a workspace room |
| `leave_workspace` | `{ sessionId }` | Leave a workspace room |
| `workspace:chat_message` | `{ sessionId, role, content, clientId }` | Send chat message (relayed to others) |
| `workspace:member_change` | `{ sessionId, action, member }` | Member change notification (relayed) |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `element_patched` | `{ sectionId, fieldId, content, css, loop }` | Live CMS element update |
| `diff_update` | `{ sectionId, diff, timestamp }` | Diff result from regeneration |
| `workspace:html_updated` | `{ sessionId, htmlContent, clientId, user }` | HTML preview update |
| `workspace:chat_message` | `{ sessionId, role, content, clientId, user }` | Chat message from another user |
| `workspace:member_change` | `{ sessionId, action, member }` | Member invited/removed or review updated |
