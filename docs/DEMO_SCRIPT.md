# Promptify — Demo Script (5–8 minutes)

> **Purpose:** Walk through Promptify's three input modes (wireframe, prompt, code) and core features.  
> **Prerequisites:** Backend running on `localhost:4000`, frontend on `localhost:3000`, MongoDB running, API keys configured.

---

## Pre-Demo Setup (30 seconds)

1. Open two browser windows side by side
2. Navigate to `http://localhost:3000` in the main window
3. Ensure MongoDB is running: `mongosh --eval "db.runCommand({ping:1})"`
4. Verify backend is running: `curl http://localhost:4000/api/health` (or just open `/generate`)

---

## Part 1: Prompt Mode — Studio Flow (2 minutes)

### What to show:
- Natural language → React JSX generation
- CMS field binding with stable IDs
- Live CMS editing without regeneration

### Script:

1. **Navigate to Generator Studio**  
   Go to `http://localhost:3000/generate`  
   *Narrate: "This is the Generator Studio. It accepts three input modes — wireframe, code, or prompt. Today we'll start with prompt mode."*

2. **Enter a prompt**  
   Click the "Prompt" button (should be selected by default)  
   Type:  
   > "Create a fitness hero section for Pulse Fit. Left side: athlete workout image. Right side: red brand badge 'PULSE FIT', bold headline 'CHALLENGE YOUR LIMITS', sub-headline, description text, red CTA button, and 3 stat cards showing 1000+ Community Members, 40+ Fitness Programmes, 150+ Fitness Channels."

3. **Generate**  
   Click "Generate"  
   *Narrate: "The engine sends the prompt to Claude, which generates React JSX with server-allocated field IDs, Redux data binding, and responsive layout."*

4. **Preview**  
   Click "Preview" → opens `/preview/Home`  
   *Narrate: "The section renders from the Redux store. Each text, image, and button has a unique fieldId that survives regeneration."*

5. **CMS Editing**  
   Click "CMS Editor" in the toolbar  
   Expand the "headlineMain" element  
   Change "CHALLENGE YOUR LIMITS" to "BREAK YOUR LIMITS"  
   Click "Save"  
   *Narrate: "Notice the preview updated instantly — no regeneration needed. The CMS editor patches individual elements while preserving field IDs."*

6. **Show the DOM**  
   Open browser DevTools → Elements tab  
   Search for `id="7001234003"`  
   *Narrate: "This 10-digit ID was allocated server-side, never by the LLM. It persists across regenerations."*

---

## Part 2: Wireframe Mode (1.5 minutes)

### What to show:
- Image upload → UI generation
- Wireframe overlay comparison

### Script:

1. **Switch to Wireframe mode**  
   Go back to `/generate`  
   Click "Wireframe" mode button (alongside Prompt)

2. **Upload a wireframe**  
   *Have a wireframe PNG ready — a simple black-and-white layout with boxes labelled "Image", "Badge", "Headline", "Stats", "CTA"*  
   Drag and drop or click to upload

3. **Generate**  
   Click "Generate"  
   *Narrate: "Claude Vision analyses the wireframe image, identifies UI regions, and generates JSX that matches the layout."*

4. **Preview with overlay**  
   Open `/preview/Home`  
   Click "Wireframe" toggle in the toolbar  
   *Narrate: "The wireframe overlay shows how closely the generated output matches your original layout."*

---

## Part 3: Real-Time Collaboration — Workspace Flow (2 minutes)

### What to show:
- Multi-user workspace with live preview
- Chat-based generation
- Member management
- Review queue

### Script:

1. **Create a workspace**  
   Go to `http://localhost:3000`  
   In the chat area, type:  
   > "A modern pricing section with 3 tiers: Basic, Pro, Enterprise. Dark theme, gradient accents."  
   Press Enter  
   *Narrate: "This creates a collaborative workspace with live preview, chat, and team features."*

2. **Show the workspace**  
   The page redirects to `/workspace/:sessionId`  
   *Narrate: "On the left: team members and reviews. Center: AI chat. Right: live preview."*

3. **Show live generation**  
   Watch as the AI generates HTML  
   *Narrate: "The preview updates progressively as the AI generates — you can see the section build in real-time."*

4. **Invite a second user (optional)**  
   Click "Team" tab → copy invite link  
   Open in incognito window or second browser  
   *Narrate: "Both users see the same preview, chat, and member list updating in real-time via Socket.IO."*

5. **Review Queue**  
   Click "Reviews" tab in the left panel  
   *Narrate: "The review queue shows AI-analysed wireframe regions with confidence scores. Team members can claim, approve, or reject items."*

---

## Part 4: Code Input Mode (1 minute)

### What to show:
- Existing React code → preserved patterns
- Combined mode (code + prompt)

### Script:

1. **Switch to Code mode**  
   Go to `/generate`  
   Click "Code" mode button

2. **Paste existing code**  
   Paste a simple React component snippet  
   *Narrate: "When you provide existing code, the engine preserves your Redux selectors, class conventions, and component patterns."*

3. **Combined mode**  
   Click both "Code" and "Prompt" buttons  
   *Narrate: "You can combine inputs — paste code and describe what you want to change. The engine merges both contexts."*

---

## Part 5: Section Management (30 seconds)

### Script:

1. **All Sections page**  
   Go to `/sections`  
   *Narrate: "This grid shows all generated sections with their status — Pending, Approved, or Rejected."*

2. **Approve/Reject**  
   Click the green checkmark on a Pending section  
   *Narrate: "Section owners can approve or reject generated output. This status feeds into the review queue."*

---

## Closing (30 seconds)

*Summarize:*

> "Promptify accepts three input modes — wireframe, code, and prompt — and generates CMS-bound React sections with stable field IDs, Redux data binding, and live content editing. The workspace flow adds real-time collaboration, chat, and a review queue with AI confidence scoring. Regeneration is a merge, not a rewrite, so live content edits are never wiped out."

---

## Backup Talking Points

If time permits or questions arise:

- **Diff-Merge Engine:** "When you regenerate, unchanged elements keep their IDs. Only new/removed elements are flagged."
- **Dual AI Models:** "Claude for JSX (better React code), Gemini for HTML (faster streaming)."
- **Server-Side ID Allocation:** "The LLM never assigns field IDs — the server allocates them to prevent collisions."
- **Responsive Design:** "The entire UI is responsive — works on mobile, tablet, and desktop."

---

## Quick Reference: URLs

| Page | URL |
|------|-----|
| Home / Chat | `http://localhost:3000` |
| Generator Studio | `http://localhost:3000/generate` |
| All Sections | `http://localhost:3000/sections` |
| Preview | `http://localhost:3000/preview/Home` |
| Workspace | `http://localhost:3000/workspace/:sessionId` |
| Edit | `http://localhost:3000/edit/:sessionId` |

---

## Quick Reference: Sample Prompts

| Mode | Prompt |
|------|--------|
| Prompt | "Create a fitness hero section with athlete image left, red badge, bold headline, 3 stat cards, red CTA" |
| Wireframe | Upload a black-and-white layout diagram with labelled regions |
| Code | Paste a React component and describe modifications |
| Combined | Paste code + "Add a newsletter signup form at the bottom" |
