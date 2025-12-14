import { useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ActionItem } from '../types/database';

/**
 * Payload types for realtime action item events
 */
export type ActionItemInsertPayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown;
}> & {
  eventType: 'INSERT';
  new: ActionItem;
};

export type ActionItemUpdatePayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown;
}> & {
  eventType: 'UPDATE';
  new: ActionItem;
  old: Partial<ActionItem>;
};

export type ActionItemDeletePayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown;
}> & {
  eventType: 'DELETE';
  old: Partial<ActionItem>;
};

/**
 * Callback handlers for realtime action item events
 */
export interface UseRealtimeActionItemsCallbacks {
  onInsert?: (item: ActionItem) => void;
  onUpdate?: (item: ActionItem, oldItem: Partial<ActionItem>) => void;
  onDelete?: (oldItem: Partial<ActionItem>) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for subscribing to realtime action item changes
 *
 * Subscribes to INSERT, UPDATE, and DELETE events on the action_items table.
 * RLS ensures only relevant items for the authenticated user are received.
 *
 * @param callbacks - Event handlers for INSERT, UPDATE, DELETE, and errors
 * @returns Object with unsubscribe function and subscription status
 *
 * @example
 * const { isSubscribed } = useRealtimeActionItems({
 *   onInsert: (item) => setItems(prev => [...prev, item]),
 *   onUpdate: (item) => setItems(prev =>
 *     prev.map(i => i.id === item.id ? item : i)
 *   ),
 *   onDelete: (oldItem) => setItems(prev =>
 *     prev.filter(i => i.id !== oldItem.id)
 *   ),
 *   onError: (error) => console.error('Realtime error:', error)
 * });
 */
export function useRealtimeActionItems(callbacks: UseRealtimeActionItemsCallbacks) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef(callbacks);

  // Keep callbacks ref updated to avoid stale closures
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const handleInsert = useCallback((payload: ActionItemInsertPayload) => {
    if (payload.new && callbacksRef.current.onInsert) {
      callbacksRef.current.onInsert(payload.new);
    }
  }, []);

  const handleUpdate = useCallback((payload: ActionItemUpdatePayload) => {
    if (payload.new && callbacksRef.current.onUpdate) {
      callbacksRef.current.onUpdate(payload.new, payload.old || {});
    }
  }, []);

  const handleDelete = useCallback((payload: ActionItemDeletePayload) => {
    if (payload.old && callbacksRef.current.onDelete) {
      callbacksRef.current.onDelete(payload.old);
    }
  }, []);

  useEffect(() => {
    // Create channel with unique name
    const channel = supabase
      .channel('action_items_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'action_items',
        },
        handleInsert as (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'action_items',
        },
        handleUpdate as (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'action_items',
        },
        handleDelete as (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void
      )
      .subscribe((status, error) => {
        if (error && callbacksRef.current.onError) {
          callbacksRef.current.onError(new Error(`Subscription error: ${error.message}`));
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [handleInsert, handleUpdate, handleDelete]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  return {
    unsubscribe,
    isSubscribed: channelRef.current !== null,
  };
}
