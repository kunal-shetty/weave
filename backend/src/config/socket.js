/**
 * Socket.IO real-time collaboration layer.
 *
 * Rooms:
 *   section:<id>     — CMS-element-level diffs (legacy, used by useSocket for element_patched)
 *   workspace:<id>   — whole-workspace events: html_updated, chat_message, member_change
 *
 * Events emitted by the server:
 *   workspace:html_updated  { sessionId, htmlContent, clientId, user, prompt?, status }
 *   workspace:chat_message  { sessionId, role, content, type, clientId, user }
 *   workspace:member_change { sessionId, action, member }
 *   element_patched         { sectionId, ...patchData }   (legacy CMS)
 *   diff_update             { sectionId, diff }            (legacy CMS)
 */
export function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Legacy CMS room (kept for backward compat with useSocket)
    socket.on('join_section', ({ sectionId }) => {
      socket.join(`section:${sectionId}`);
      socket.emit('joined', { sectionId });
    });

    socket.on('leave_section', ({ sectionId }) => {
      socket.leave(`section:${sectionId}`);
    });

    // Workspace-wide room for chat + HTML preview sync
    socket.on('join_workspace', ({ sessionId }) => {
      if (!sessionId) return;
      socket.join(`workspace:${sessionId}`);
      socket.emit('workspace:joined', { sessionId });
    });

    socket.on('leave_workspace', ({ sessionId }) => {
      if (!sessionId) return;
      socket.leave(`workspace:${sessionId}`);
    });

    // Relay chat messages from one client to every other client in the room
    socket.on('workspace:chat_message', (payload) => {
      if (!payload?.sessionId) return;
      socket.to(`workspace:${payload.sessionId}`).emit('workspace:chat_message', payload);
    });

    // Relay member-change notifications
    socket.on('workspace:member_change', (payload) => {
      if (!payload?.sessionId) return;
      socket.to(`workspace:${payload.sessionId}`).emit('workspace:member_change', payload);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

/**
 * Broadcast an HTML preview update to every collaborator in a workspace room.
 */
export function emitWorkspaceUpdate(io, sessionId, payload) {
  if (!io || !sessionId) return;
  io.to(`workspace:${sessionId}`).emit('workspace:html_updated', {
    sessionId,
    timestamp: Date.now(),
    ...payload,
  });
}

/**
 * Broadcast a chat message (user prompt or agent status) to every collaborator.
 */
export function emitChatMessage(io, sessionId, payload) {
  if (!io || !sessionId) return;
  io.to(`workspace:${sessionId}`).emit('workspace:chat_message', {
    sessionId,
    timestamp: Date.now(),
    ...payload,
  });
}

/**
 * Broadcast a member change (invite / remove) to every collaborator.
 */
export function emitMemberChange(io, sessionId, payload) {
  if (!io || !sessionId) return;
  io.to(`workspace:${sessionId}`).emit('workspace:member_change', {
    sessionId,
    timestamp: Date.now(),
    ...payload,
  });
}

/* ---- Legacy CMS helpers (kept) ---- */

export function emitDiffUpdate(io, sectionId, diff) {
  io.to(`section:${sectionId}`).emit('diff_update', { sectionId, diff, timestamp: Date.now() });
}

export function emitElementPatch(io, sectionId, patchData) {
  io.to(`section:${sectionId}`).emit('element_patched', { sectionId, ...patchData, timestamp: Date.now() });
}
