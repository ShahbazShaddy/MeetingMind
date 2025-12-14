import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import { getRecentDecisions, DecisionWithMeetingInfo } from '../../services/decisions.service';
import { useRealtimeDecisions } from '../../hooks/useRealtimeDecisions';
import { useToast } from '../../hooks/use-toast';

interface DecisionWithMeeting extends DecisionWithMeetingInfo {
  meeting?: { title: string };
}

export function KeyDecisions() {
  const [decisions, setDecisions] = useState<DecisionWithMeeting[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDecisions = useCallback(async () => {
    try {
      setError(null);
      const data = await getRecentDecisions(7);
      // Transform to include meeting property for template compatibility
      const transformed = data.map((d) => ({
        ...d,
        meeting: d.meetings ? { title: d.meetings.title } : undefined,
      }));
      setDecisions(transformed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch decisions';
      setError(message);
      console.error('Error fetching decisions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup realtime subscription for new decisions
  useRealtimeDecisions({
    onInsert: (decision) => {
      // Check if decision is within last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const decidedAt = new Date(decision.decided_at);
      
      if (decidedAt >= sevenDaysAgo) {
        setDecisions((prev) => [{ ...decision, meeting: undefined }, ...prev]);
        toast({
          title: 'New Decision',
          description: 'A new decision has been recorded.',
        });
      }
    },
    onError: (err) => {
      console.error('Realtime subscription error:', err);
    },
  });

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
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
            fetchDecisions();
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
      {decisions.map((decision) => (
        <div
          key={decision.id}
          className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-soft transition-all"
        >
          <div className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1 line-clamp-2">
                  {decision.decision_text}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(decision.decided_at)}
                  </span>

                  {decision.context && (
                    <button
                      onClick={() => setExpanded(expanded === decision.id ? null : decision.id)}
                      className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      {expanded === decision.id ? (
                        <>
                          <span>Less</span>
                          <ChevronUp className="w-3 h-3 ml-1" />
                        </>
                      ) : (
                        <>
                          <span>More</span>
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {decision.meeting && (
                  <p className="text-xs text-muted-foreground mt-1">
                    From: {decision.meeting.title}
                  </p>
                )}

                {decision.tags && decision.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {decision.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {expanded === decision.id && decision.context && (
            <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/50">
              <p className="text-xs text-muted-foreground">{decision.context}</p>
            </div>
          )}
        </div>
      ))}

      {decisions.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No decisions this week</p>
        </div>
      )}
    </div>
  );
}
