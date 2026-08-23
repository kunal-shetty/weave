# CodeX — Real-Time Collaboration Layer

## Overview

CodeX uses **Socket.IO** for real-time collaboration. The system supports two types of rooms:

1. **Section rooms** (`section:<id>`) — Legacy CMS live editing (element patches)
2. **Workspace rooms** (`workspace:<id>`) — Full collaborative workspace (HTML preview, chat, members, reviews)

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Client A   │     │  Client B   │     │  Client C   │
│  (Creator)  │     │ (Joining)   │     │ (Joining)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       │  emit('join_workspace')                 │
       │  ────────────────────►                  │
       │                    │                    │
       │         ┌──────────┴──────────┐         │
       │         │   Socket.IO Server  │         │
       │         │                     │         │
       │         │  Room: workspace:X  │         │
       │         │  ├── Client A       │         │
       │         │  ├── Client B       │         │
       │         │  └── Client C       │         │
       │         └──────────┬──────────┘         │
       │                    │                    │
       │  workspace:html_updated                 │
       │  ◄─────────────────┤                    │
       │                    ├──────────────────► │
       │                    │                    │
```

---

## Room Management

### Joining a Room

```javascript
// Client emits
socket.emit('join_workspace', { sessionId: 'abc123' });

// Server handler
socket.on('join_workspace', ({ sessionId }) => {
  if (!sessionId) return;
  socket.join(`workspace:${sessionId}`);
  socket.emit('workspace:joined', { sessionId });
});
```

### Leaving a Room

```javascript
// Client emits (on unmount or navigation)
socket.emit('leave_workspace', { sessionId: 'abc123' });

// Server handler
socket.on('leave_workspace', ({ sessionId }) => {
  if (!sessionId) return;
  socket.leave(`workspace:${sessionId}`);
});
```

### Auto-Join on Connect

The `useWorkspaceSocket` hook handles auto-join:

```typescript
useEffect(() => {
  const socket = getSocket();
  const join = () => socket.emit('join_workspace', { sessionId });

  if (socket.connected) join();
  else socket.once('connect', join);

  return () => {
    socket.emit('leave_workspace', { sessionId });
  };
}, [sessionId]);
```

---

## Event Flow

### HTML Preview Sync

```
User A generates HTML
  → PanelAgent streams from Gemini API
  → onPreviewReady(html) fires
  → saveToDb(html) → POST /api/sessions/:sessionId
  → Server calls emitWorkspaceUpdate()
  → io.to('workspace:sessionId').emit('workspace:html_updated', {...})
  → User B receives event
  → onHtmlUpdate callback fires
  → setPreviewHtml(html) → iframe updates
```

**Deduplication:** `lastHtmlRef` tracks the last HTML received. If the socket delivers the same HTML (e.g., echo from own save), it's skipped.

### Chat Message Sync

```
User A sends chat message
  → PanelAgent.sendMessage()
  → broadcastChatRef.current({ role: 'user', content: msg, user: {...} })
  → Socket emits 'workspace:chat_message' directly (client-side)
  → Server relays to all OTHER clients in the room
  → User B receives event
  → onChatMessage callback fires
  → panelAgentRef.current.appendRemoteMessage(...)
  → Message appears in User B's PanelAgent chat
```

**Why client-side emit?** Chat messages don't need server-side processing — they're just relayed. This is faster than going through a REST endpoint.

### Member Change Sync

```
User A invites User B
  → POST /api/workspace-members/:sessionId
  → Server calls emitMemberChange()
  → io.to('workspace:sessionId').emit('workspace:member_change', {...})
  → All clients receive event
  → PanelMembers re-fetches member list
```

### Review Queue Sync

```
System auto-creates review items from diff
  → POST /api/reviews/:sessionId (bulk insert)
  → Server calls emitMemberChange({ action: 'review_created' })
  → All clients receive event
  → ReviewQueue re-fetches items
  → New items appear instantly for all team members
```

---

## Client ID Deduplication

Every client generates a unique ID stored in `sessionStorage`:

```typescript
const CLIENT_ID_KEY = 'codex:clientId';

function getOrCreateClientId(): string {
  let id = sessionStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    sessionStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}
```

When receiving events, the client checks:

```typescript
const onHtml = (payload) => {
  if (payload.clientId && payload.clientId === clientId.current) return; // Skip own messages
  handlersRef.current.onHtmlUpdate?.(payload);
};
```

**Why sessionStorage?** Persists across page reloads within a tab but resets when the tab closes. This prevents stale IDs from previous sessions.

---

## Server-Side Relay

The server relays two event types that clients emit directly:

```javascript
// Chat messages — relay to all others in the room
socket.on('workspace:chat_message', (payload) => {
  if (!payload?.sessionId) return;
  socket.to(`workspace:${payload.sessionId}`).emit('workspace:chat_message', payload);
});

// Member changes — relay to all others in the room
socket.on('workspace:member_change', (payload) => {
  if (!payload?.sessionId) return;
  socket.to(`workspace:${payload.sessionId}`).emit('workspace:member_change', payload);
});
```

**Why relay instead of broadcast?** `socket.to()` excludes the sender. The sender already processed the event locally (added the message to their own state). Relaying only to others avoids duplicate processing.

---

## Server-Side Broadcast

Some events are emitted by the server (not relayed from clients):

### HTML Updates (REST-triggered)

```javascript
// Called by POST /api/sessions/:sessionId and PATCH /api/sessions/:sessionId
export function emitWorkspaceUpdate(io, sessionId, payload) {
  if (!io || !sessionId) return;
  io.to(`workspace:${sessionId}`).emit('workspace:html_updated', {
    sessionId,
    timestamp: Date.now(),
    ...payload,
  });
}
```

### Element Patches (REST-triggered)

```javascript
// Called by PATCH /api/elements/:fieldId
export function emitElementPatch(io, sectionId, patchData) {
  io.to(`section:${sectionId}`).emit('element_patched', {
    sectionId,
    ...patchData,
    timestamp: Date.now(),
  });
}
```

### Diff Updates (REST-triggered)

```javascript
// Called by POST /api/sections/:sectionId/regenerate
export function emitDiffUpdate(io, sectionId, diff) {
  io.to(`section:${sectionId}`).emit('diff_update', {
    sectionId,
    diff,
    timestamp: Date.now(),
  });
}
```

---

## Connection Management

### Global Singleton

```typescript
let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      transports: ['websocket'],  // Prefer WebSocket over long-polling
      autoConnect: true,
    });
  }
  return globalSocket;
}
```

**Why WebSocket-only?** Long-polling adds latency. WebSocket is faster for real-time collaboration. The `transports: ['websocket']` option skips the HTTP polling fallback.

### Reconnection

Socket.IO handles reconnection automatically. When a client reconnects:
1. The socket emits `join_workspace` again (if the hook is still mounted)
2. The client receives the current state via REST (session load, element fetch)
3. Socket events resume from the reconnection point

---

## Why Socket.IO Instead of alternatives?

| Alternative | Why Not |
|-------------|---------|
| **WebSocket API** | No room management, no automatic reconnection, no fallback. Socket.IO wraps WebSocket with these features. |
| **Supabase Realtime** | We already use Supabase for auth and KV, but its realtime is limited to PostgreSQL changes. Socket.IO gives us full control over custom events. |
| **Pusher/Ably** | Third-party services with usage limits. For a hackathon, self-hosted Socket.IO is free and has no restrictions. |
| **Server-Sent Events** | One-way (server → client). We need bidirectional communication for chat and member management. |

---

## Performance Considerations

1. **Room-scoped broadcasting** — Events only go to clients in the same workspace room, not all connected clients
2. **ClientId deduplication** — Prevents unnecessary state updates from echo events
3. **Debounced saves** — HTML preview saves go through REST (debounced by the generation pipeline), not every keystroke
4. **Binary data excluded** — Only JSON payloads are sent over Socket.IO; large data (HTML, images) goes through REST
5. **Connection reuse** — Global singleton socket is shared across all hooks and components
