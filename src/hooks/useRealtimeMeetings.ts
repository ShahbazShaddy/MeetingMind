import { useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Meeting } from '../types/database';

/**
 * Payload type for realtime meeting update events
 */
export type MeetingUpdatePayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown;
}> & {
  eventType: 'UPDATE';
  new: Meeting;
  old: Partial<Meeting>;
};

/**
 * Meeting status types for status change detection
 */
export type MeetingStatus = 'processing' | 'ready' | 'failed';

/**
 * Callback handlers for realtime meeting events
 */
export interface UseRealtimeMeetingsCallbacks {
  /** Called when any meeting is updated */
  onUpdate?: (meeting: Meeting, oldMeeting: Partial<Meeting>) => void;
  /** Called specifically when a meeting status changes to 'ready' */
  onMeetingReady?: (meeting: Meeting) => void;
  /** Called when a meeting status changes to 'failed' */
  onMeetingFailed?: (meeting: Meeting) => void;
  /** Called when any status change occurs */
  onStatusChange?: (meeting: Meeting, oldStatus: string | undefined, newStatus: string) => void;
  /** Called on subscription errors */
  onError?: (error: Error) => void;
}

/**
 * Hook for subscribing to realtime meeting updates
 *
 * Primarily monitors the status field to notify when meetings become ready.
 * RLS ensures only relevant meetings for the authenticated user are received.
 *
 * @param callbacks - Event handlers for meeting updates and status changes
 * @returns Object with unsubscribe function and subscription status
 *
 * @example
 * const { isSubscribed } = useRealtimeMeetings({
 *   onMeetingReady: (meeting) => {
 *     toast.success(`Meeting "${meeting.title}" is ready!`);
 *     refetchMeetings();
 *   },
 *   onMeetingFailed: (meeting) => {
 *     toast.error(`Processing failed for "${meeting.title}"`);
 *   },
 *   onStatusChange: (meeting, oldStatus, newStatus) => {
 *     console.log(`Meeting ${meeting.id}: ${oldStatus} → ${newStatus}`);
 *   }
 * });
 */
export function useRealtimeMeetings(callbacks: UseRealtimeMeetingsCallbacks) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef(callbacks);

  // Keep callbacks ref updated to avoid stale closures
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const handleUpdate = useCallback((payload: MeetingUpdatePayload) => {
    const newMeeting = payload.new;
    const oldMeeting = payload.old || {};

    if (!newMeeting) return;

    // Call generic update handler
    if (callbacksRef.current.onUpdate) {
      callbacksRef.current.onUpdate(newMeeting, oldMeeting);
    }

    // Check for status changes
    const oldStatus = oldMeeting.status;
    const newStatus = newMeeting.status;

    if (oldStatus !== newStatus) {
      // Call generic status change handler
      if (callbacksRef.current.onStatusChange) {
        callbacksRef.current.onStatusChange(newMeeting, oldStatus, newStatus);
      }

      // Call specific status handlers
      if (newStatus === 'ready' && callbacksRef.current.onMeetingReady) {
        callbacksRef.current.onMeetingReady(newMeeting);
      }

      if (newStatus === 'failed' && callbacksRef.current.onMeetingFailed) {
        callbacksRef.current.onMeetingFailed(newMeeting);
      }
    }
  }, []);

  useEffect(() => {
    // Create channel for meeting updates
    const channel = supabase
      .channel('meetings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meetings',
        },
        handleUpdate as (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void
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
  }, [handleUpdate]);

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
