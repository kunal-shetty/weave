'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { applyLivePatch, CMSElement } from '@/store/slices/cmsSlice';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
  }
  return globalSocket;
}

/**
 * useSocket — joins a section room and listens for live patches.
 * Automatically cleans up on unmount.
 */
export function useSocket(sectionId: string | null) {
  const dispatch = useDispatch<AppDispatch>();
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sectionId) return;
    const socket = getSocket();

    // Join room
    socket.emit('join_section', { sectionId });
    joinedRef.current = sectionId;

    // Live element patch from another collaborator
    const onPatch = (data: CMSElement) => {
      dispatch(applyLivePatch(data));
    };

    // Diff update (regeneration by another user)
    const onDiff = (data: { sectionId: string; diff: unknown }) => {
      console.info('[CodeX] diff_update received for', data.sectionId, data.diff);
    };

    socket.on('element_patched', onPatch);
    socket.on('diff_update', onDiff);

    return () => {
      socket.emit('leave_section', { sectionId });
      socket.off('element_patched', onPatch);
      socket.off('diff_update', onDiff);
      joinedRef.current = null;
    };
  }, [sectionId, dispatch]);
}

/**
 * useSocketStatus — returns connected/disconnected status.
 */
export function useSocketStatus(): 'connected' | 'disconnected' {
  const socket = getSocket();
  return socket.connected ? 'connected' : 'disconnected';
}
