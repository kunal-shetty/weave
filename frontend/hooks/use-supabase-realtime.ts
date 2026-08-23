'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Returns the latest payload and a loading state.
 */
export function useSupabaseRealtime<T extends Record<string, unknown>>(
  table: string,
  filter?: { column: string; value: string },
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  const supabase = createClient();
  const [payload, setPayload] = useState<RealtimePostgresChangesPayload<T> | null>(null);
  const [status, setStatus] = useState<'SUBSCRIBED' | 'TIMED_OUT' | 'CHANNEL_ERROR' | 'CLOSED' | 'JOINING'>('JOINING');
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const setup = async () => {
      const filterStr = filter ? `${filter.column}=eq.${filter.value}` : undefined;

      channel = supabase
        .channel(`realtime:${table}:${filter?.value || 'all'}`)
        .on(
          'postgres_changes' as never,
          {
            event,
            schema: 'public',
            table,
            filter: filterStr,
          } as never,
          (p: RealtimePostgresChangesPayload<T>) => {
            setPayload(p);
          }
        )
        .subscribe((status) => {
          setStatus(status as 'SUBSCRIBED' | 'TIMED_OUT' | 'CHANNEL_ERROR' | 'CLOSED' | 'JOINING');
        });

      channelRef.current = channel;
    };

    setup();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase, table, filter?.column, filter?.value, event]);

  return { payload, status };
}

/**
 * Broadcast messages through a Supabase Realtime channel (no DB table needed).
 */
export function useSupabaseBroadcast(channelName: string) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: '*' }, (payload) => {
        // This is handled via the callback we register
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase, channelName]);

  const broadcast = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event,
          payload,
        });
      }
    },
    []
  );

  const onBroadcast = useCallback(
    (event: string, handler: (payload: Record<string, unknown>) => void) => {
      if (channelRef.current) {
        channelRef.current.on('broadcast', { event }, ({ payload }) => {
          handler(payload as Record<string, unknown>);
        });
      }
    },
    []
  );

  return { broadcast, onBroadcast, connected };
}

/**
 * Presence tracking for collaborative sessions.
 */
export function useSupabasePresence(channelName: string, userInfo: Record<string, unknown>) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [presenceState, setPresenceState] = useState<Record<string, unknown>[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setPresenceState(users);
        setOnlineCount(users.length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            ...userInfo,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase, channelName, JSON.stringify(userInfo)]);

  return { presenceState, onlineCount };
}
