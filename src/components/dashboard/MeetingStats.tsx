import { useEffect, useState, useCallback } from 'react';
import { Calendar, Clock, CheckCircle2, TrendingUp, AlertCircle, RefreshCw, CalendarDays } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Stats {
  meetingsThisWeek: number;
  totalHours: number;
  completedPercentage: number;
}

interface UpcomingMeeting {
  id: string;
  title: string;
  meeting_date: string;
}

export function MeetingStats() {
  const [stats, setStats] = useState<Stats>({
    meetingsThisWeek: 0,
    totalHours: 0,
    completedPercentage: 0,
  });
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);

      // Get start of week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Fetch meetings this week
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('duration_minutes')
        .gte('meeting_date', startOfWeek.toISOString());

      if (meetingsError) throw new Error(meetingsError.message);

      const meetingsThisWeek = meetings?.length || 0;
      const totalMinutes = meetings?.reduce((sum, m) => sum + (m.duration_minutes || 0), 0) || 0;
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

      // Fetch action items completion rate
      const { data: allItems, error: itemsError } = await supabase
        .from('action_items')
        .select('status');

      if (itemsError) throw new Error(itemsError.message);

      const completedCount = allItems?.filter((item) => item.status === 'completed').length || 0;
      const totalCount = allItems?.length || 0;
      const completedPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      // Fetch upcoming meetings (future meetings)
      const { data: upcoming, error: upcomingError } = await supabase
        .from('meetings')
        .select('id, title, meeting_date')
        .gt('meeting_date', now.toISOString())
        .order('meeting_date', { ascending: true })
        .limit(3);

      if (upcomingError) throw new Error(upcomingError.message);

      setStats({
        meetingsThisWeek,
        totalHours,
        completedPercentage,
      });
      setUpcomingMeetings(upcoming || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stats';
      setError(message);
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statItems = [
    {
      icon: Calendar,
      label: 'Meetings This Week',
      value: stats.meetingsThisWeek,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      icon: Clock,
      label: 'Hours Saved',
      value: `${stats.totalHours}h`,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      icon: CheckCircle2,
      label: 'Completion Rate',
      value: `${stats.completedPercentage}%`,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg skeleton"></div>
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
            fetchStats();
          }}
          className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </button>
      </div>
    );
  }

  const formatUpcomingDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {statItems.map((item, idx) => (
        <div key={idx} className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CalendarDays className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-medium text-foreground">Upcoming Meetings</span>
          </div>
          <div className="space-y-2">
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="text-sm">
                <p className="font-medium text-foreground line-clamp-1">{meeting.title}</p>
                <p className="text-xs text-muted-foreground">{formatUpcomingDate(meeting.meeting_date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-lg p-4 border border-primary-200">
        <div className="flex items-center space-x-2 mb-2">
          <TrendingUp className="w-4 h-4 text-primary-600" />
          <span className="text-xs font-medium text-primary-700">Trending Up</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {stats.completedPercentage >= 50
            ? "Your team's productivity is improving! Keep up the great work."
            : 'Focus on completing action items to boost your productivity score.'}
        </p>
      </div>
    </div>
  );
}
