import { useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Decision } from '../types/database';

/**
 * Payload type for realtime decision insert events
 */
export type DecisionInsertPayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown;
}> & {
  eventType: 'INSERT';
  new: Decision;
};

/**
 * Callback handlers for realtime decision events
 */
export interface UseRealtimeDecisionsCallbacks {
  /** Called when a new decision is inserted */
  onInsert?: (decision: Decision) => void;
  /** Called on subscription errors */
  onError?: (error: Error) => void;
}

/**
 * Hook for subscribing to realtime decision inserts
 *
 * Subscribes to INSERT events on the decisions table to notify
 * when new decisions are added to meetings.
 * RLS ensures only relevant decisions for the authenticated user are received.
 *
 * @param callbacks - Event handlers for INSERT events and errors
 * @returns Object with unsubscribe function and subscription status
 *
 * @example
 * const { isSubscribed } = useRealtimeDecisions({
 *   onInsert: (decision) => {
 *     toast.info(`New decision recorded: "${decision.decision_text}"`);
 *     setDecisions(prev => [decision, ...prev]);
 *   },
 *   onError: (error) => console.error('Realtime error:', error)
 * });
 */
export function useRealtimeDecisions(callbacks: UseRealtimeDecisionsCallbacks) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef(callbacks);

  // Keep callbacks ref updated to avoid stale closures
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const handleInsert = useCallback((payload: DecisionInsertPayload) => {
    if (payload.new && callbacksRef.current.onInsert) {
      callbacksRef.current.onInsert(payload.new);
    }
  }, []);

  useEffect(() => {
    // Create channel for decision inserts
    const channel = supabase
      .channel('decisions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'decisions',
        },
        handleInsert as (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void
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
  }, [handleInsert]);

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
