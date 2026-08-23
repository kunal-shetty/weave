'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
  }
  return globalSocket;
}

const CLIENT_ID_KEY = 'codex:clientId';

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = sessionStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;
    sessionStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export interface WorkspaceHtmlUpdate {
  sessionId: string;
  htmlContent: string;
  status: string;
  clientId?: string;
  prompt?: string;
  user?: { id: string; email: string; fullName?: string | null; avatarUrl?: string | null };
  timestamp: number;
}

export interface WorkspaceChatMessage {
  sessionId: string;
  role: 'user' | 'agent';
  content: string;
  type?: 'status' | 'error' | 'thinking';
  clientId?: string;
  user?: { id: string; email: string; fullName?: string | null; avatarUrl?: string | null };
  timestamp: number;
}

export interface WorkspaceMemberChange {
  sessionId: string;
  action: 'invited' | 'removed';
  member: unknown;
  timestamp: number;
}

/**
 * Join a workspace room and receive live HTML/chat/member updates.
 * Excludes events emitted by this same client (loop avoidance via clientId).
 */
export function useWorkspaceSocket(
  sessionId: string | null,
  handlers: {
    onHtmlUpdate?: (payload: WorkspaceHtmlUpdate) => void;
    onChatMessage?: (payload: WorkspaceChatMessage) => void;
    onMemberChange?: (payload: WorkspaceMemberChange) => void;
  }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const clientId = useRef<string>('');
  if (!clientId.current) clientId.current = getOrCreateClientId();

  useEffect(() => {
    if (!sessionId) return;
    const socket = getSocket();

    const join = () => socket.emit('join_workspace', { sessionId });

    if (socket.connected) join();
    else socket.once('connect', join);

    const onHtml = (p: WorkspaceHtmlUpdate) => {
      if (p.clientId && p.clientId === clientId.current) return;
      handlersRef.current.onHtmlUpdate?.(p);
    };
    const onChat = (p: WorkspaceChatMessage) => {
      if (p.clientId && p.clientId === clientId.current) return;
      handlersRef.current.onChatMessage?.(p);
    };
    const onMember = (p: WorkspaceMemberChange) => handlersRef.current.onMemberChange?.(p);

    socket.on('workspace:html_updated', onHtml);
    socket.on('workspace:chat_message', onChat);
    socket.on('workspace:member_change', onMember);

    return () => {
      socket.emit('leave_workspace', { sessionId });
      socket.off('workspace:html_updated', onHtml);
      socket.off('workspace:chat_message', onChat);
      socket.off('workspace:member_change', onMember);
    };
  }, [sessionId]);

  const broadcastChat = useCallback((payload: Omit<WorkspaceChatMessage, 'sessionId' | 'timestamp' | 'clientId'>) => {
    const socket = getSocket();
    if (!sessionId) return;
    socket.emit('workspace:chat_message', {
      ...payload,
      sessionId,
      clientId: clientId.current,
      timestamp: Date.now(),
    });
  }, [sessionId]);

  const broadcastHtml = useCallback((payload: { htmlContent: string; status?: string; prompt?: string; user?: WorkspaceHtmlUpdate['user'] }) => {
    const socket = getSocket();
    if (!sessionId) return;
    socket.emit('workspace:html_updated', {
      ...payload,
      sessionId,
      clientId: clientId.current,
      timestamp: Date.now(),
    });
  }, [sessionId]);

  return { clientId: clientId.current, broadcastChat, broadcastHtml };
}

/**
 * Hook used by PanelAgent to send chat broadcasts and receive echoes from others.
 */
export function useSocket(sectionId: string | null) {
  // Legacy CMS use — kept for backward compat but unused by workspace flow.
  // (Returning no-op to avoid tree-shaking the global socket.)
  useEffect(() => {
    if (!sectionId) return;
    const socket = getSocket();
    socket.emit('join_section', { sectionId });
    return () => {
      socket.emit('leave_section', { sectionId });
    };
  }, [sectionId]);
}

/**
 * Returns the connected status of the global socket.
 */
export function useSocketStatus(): 'connected' | 'disconnected' {
  const socket = getSocket();
  return socket.connected ? 'connected' : 'disconnected';
}

/**
 * Returns the singleton socket (so non-hook code can emit directly).
 */
export function getClientSocket(): Socket {
  return getSocket();
}

export { getOrCreateClientId };
