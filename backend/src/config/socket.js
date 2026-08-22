/**
 * Socket.IO real-time collaboration layer.
 * Events:
 *   join_section    { sectionId }              — join a section room
 *   leave_section   { sectionId }              — leave a section room
 *   diff_update     { sectionId, diff }        — broadcast incoming diff to room
 *   element_patched { sectionId, fieldId, ... } — live CMS edit broadcast
 */
export function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join_section', ({ sectionId }) => {
      socket.join(`section:${sectionId}`);
      socket.emit('joined', { sectionId });
    });

    socket.on('leave_section', ({ sectionId }) => {
      socket.leave(`section:${sectionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

/**
 * Emit a diff update to all collaborators in a section room.
 */
export function emitDiffUpdate(io, sectionId, diff) {
  io.to(`section:${sectionId}`).emit('diff_update', { sectionId, diff, timestamp: Date.now() });
}

/**
 * Emit an element patch event to collaborators.
 */
export function emitElementPatch(io, sectionId, patchData) {
  io.to(`section:${sectionId}`).emit('element_patched', { sectionId, ...patchData, timestamp: Date.now() });
}
