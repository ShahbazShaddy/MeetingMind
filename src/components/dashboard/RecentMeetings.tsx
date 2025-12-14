import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getRecentMeetings } from '../../services/meetings.service';
import { useRealtimeMeetings } from '../../hooks/useRealtimeMeetings';
import { useToast } from '../../hooks/use-toast';
import type { Meeting } from '../../types/database';

interface MeetingWithParticipants extends Meeting {
  participant_count: number;
}

export function RecentMeetings() {
  const [meetings, setMeetings] = useState<MeetingWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMeetings = useCallback(async () => {
    try {
      setError(null);
      const data = await getRecentMeetings(10);

      // Fetch participant counts separately
      const meetingsWithCounts = await Promise.all(
        data.map(async (meeting) => {
          const { count } = await supabase
            .from('meeting_participants')
            .select('*', { count: 'exact', head: true })
            .eq('meeting_id', meeting.id);
          return { ...meeting, participant_count: count || 0 };
        })
      );

      setMeetings(meetingsWithCounts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch meetings';
      setError(message);
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup realtime subscription for meeting updates
  useRealtimeMeetings({
    onUpdate: () => {
      fetchMeetings();
    },
    onMeetingReady: (meeting) => {
      toast({
        title: 'Meeting Ready',
        description: `"${meeting.title}" has been processed and is ready to view.`,
      });
      fetchMeetings();
    },
    onMeetingFailed: (meeting) => {
      toast({
        title: 'Processing Failed',
        description: `Failed to process "${meeting.title}". Please try again.`,
        variant: 'destructive',
      });
      fetchMeetings();
    },
    onError: (err) => {
      console.error('Realtime subscription error:', err);
    },
  });

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'processing':
        return 'status-processing';
      case 'ready':
        return 'status-ready';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-muted rounded-lg skeleton h-24"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3 opacity-70" />
        <p className="text-sm text-muted-foreground mb-3">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchMeetings();
          }}
          className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <Link
          key={meeting.id}
          to={`/meetings/${meeting.id}`}
          className="block p-4 bg-card rounded-lg border border-border hover:shadow-soft transition-all group"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-foreground group-hover:text-primary-600 transition-colors line-clamp-1">
              {meeting.title}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full border ${getStatusClass(meeting.status)}`}>
              {meeting.status}
            </span>
          </div>

          <div className="flex items-center text-xs text-muted-foreground space-x-4">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(meeting.meeting_date)}
            </div>
            {meeting.duration_minutes && (
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {meeting.duration_minutes}m
              </div>
            )}
            <div className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {meeting.participant_count}
            </div>
          </div>
        </Link>
      ))}

      {meetings.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No meetings yet</p>
        </div>
      )}
    </div>
  );
}
