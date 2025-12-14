import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Edit2,
  Check,
  X,
  CheckCircle2,
  Circle,
  Hash,
  AlertCircle,
  RefreshCw,
  FileText,
  Lightbulb,
  BarChart3,
  Link2,
  Play,
  MessageSquare,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import {
  getMeetingById,
  updateMeetingTitle,
  MeetingWithDetails,
  MeetingParticipantWithUser,
} from '../services/meetings.service';
import { markActionItemCompleted } from '../services/actionItems.service';
import { useRealtimeActionItems } from '../hooks/useRealtimeActionItems';
import { useRealtimeMeetings } from '../hooks/useRealtimeMeetings';
import { ProcessMeetingButton } from '../components/meeting/ProcessMeetingButton';
import type { ActionItem, Decision, Topic } from '../types/database';

// ============================================
// TYPES
// ============================================

interface HighlightedMoment {
  timestamp: string;
  text: string;
  type: 'action_item' | 'decision' | 'key_point' | 'question';
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface TalkTimeData {
  userId: string;
  userName: string;
  minutes: number;
  percentage: number;
  color: string;
}

interface TopicBreakdown {
  topic: string;
  mentions: number;
  percentage: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-red-500',
];

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'ready':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'processing':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'failed':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function extractHighlightedMoments(
  transcript: string | null,
  actionItems: ActionItem[],
  decisions: Decision[]
): HighlightedMoment[] {
  const moments: HighlightedMoment[] = [];

  // Add action items as highlighted moments
  actionItems.forEach((item, index) => {
    moments.push({
      timestamp: `${Math.floor(index * 5)}:00`,
      text: item.description,
      type: 'action_item',
      sentiment: 'neutral',
    });
  });

  // Add decisions as highlighted moments
  decisions.forEach((decision, index) => {
    moments.push({
      timestamp: `${Math.floor((actionItems.length + index) * 5)}:00`,
      text: decision.decision_text,
      type: 'decision',
      sentiment: 'positive',
    });
  });

  return moments;
}

function calculateTalkTime(
  participants: MeetingParticipantWithUser[],
  totalDuration: number | null
): TalkTimeData[] {
  const total = participants.reduce((sum, p) => sum + (p.talk_time_minutes || 0), 0) || totalDuration || 1;
  
  return participants.map((p, index) => ({
    userId: p.users?.id || p.id,
    userName: p.users?.full_name || 'Unknown',
    minutes: p.talk_time_minutes || 0,
    percentage: Math.round(((p.talk_time_minutes || 0) / total) * 100),
    color: COLORS[index % COLORS.length],
  }));
}

function calculateTopicBreakdown(
  topics: Array<{ topic_id: string; topics: Topic | null }>
): TopicBreakdown[] {
  const totalMentions = topics.reduce(
    (sum, t) => sum + (t.topics?.meeting_count || 1),
    0
  );
  
  return topics.map((t) => ({
    topic: t.topics?.name || 'Unknown',
    mentions: t.topics?.meeting_count || 1,
    percentage: Math.round(((t.topics?.meeting_count || 1) / totalMentions) * 100),
  }));
}

// ============================================
// LOADING SKELETON COMPONENTS
// ============================================

function HeaderSkeleton() {
  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="skeleton h-8 w-96 mb-4"></div>
        <div className="flex items-center gap-4">
          <div className="skeleton h-5 w-32"></div>
          <div className="skeleton h-5 w-24"></div>
          <div className="skeleton h-5 w-20"></div>
        </div>
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton h-24 rounded-lg"></div>
      ))}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface EditableTitleProps {
  title: string;
  onSave: (newTitle: string) => Promise<void>;
  isLoading: boolean;
}

function EditableTitle({ title, onSave, isLoading }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editedTitle.trim() && editedTitle !== title) {
      await onSave(editedTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-2xl font-bold h-12 max-w-lg"
          disabled={isLoading}
        />
        <Button size="icon" variant="ghost" onClick={handleSave} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5 text-green-600" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={handleCancel} disabled={isLoading}>
          <X className="w-5 h-5 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface ParticipantAvatarsProps {
  participants: MeetingParticipantWithUser[];
}

function ParticipantAvatars({ participants }: ParticipantAvatarsProps) {
  const displayCount = 5;
  const displayed = participants.slice(0, displayCount);
  const remaining = participants.length - displayCount;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {displayed.map((p, index) => (
          <div
            key={p.id}
            className={`w-8 h-8 rounded-full ${COLORS[index % COLORS.length]} flex items-center justify-center text-white text-xs font-medium border-2 border-card`}
            title={p.users?.full_name || 'Unknown'}
          >
            {p.users?.full_name?.charAt(0).toUpperCase() || '?'}
          </div>
        ))}
        {remaining > 0 && (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-card">
            +{remaining}
          </div>
        )}
      </div>
      <span className="ml-3 text-sm text-muted-foreground">
        {participants.length} participant{participants.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

interface ActionItemListProps {
  actionItems: ActionItem[];
  onMarkComplete: (id: string) => Promise<void>;
  completingId: string | null;
}

function ActionItemList({ actionItems, onMarkComplete, completingId }: ActionItemListProps) {
  if (actionItems.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">No action items for this meeting</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionItems.map((item) => (
        <div
          key={item.id}
          className={`p-4 rounded-lg border transition-all ${
            item.status === 'completed'
              ? 'bg-muted/50 border-muted'
              : 'bg-card border-border hover:shadow-soft'
          }`}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={() => onMarkComplete(item.id)}
              disabled={completingId === item.id || item.status === 'completed'}
              className="mt-0.5 text-muted-foreground hover:text-primary-600 transition-colors disabled:opacity-50"
            >
              {completingId === item.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : item.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  item.status === 'completed'
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground'
                }`}
              >
                {item.description}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {item.due_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.due_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full border text-xs ${getPriorityColor(item.priority)}`}>
                  {item.priority}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface DecisionListProps {
  decisions: Decision[];
}

function DecisionList({ decisions }: DecisionListProps) {
  if (decisions.length === 0) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">No decisions recorded for this meeting</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {decisions.map((decision) => (
        <div key={decision.id} className="p-4 bg-card rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{decision.decision_text}</p>
              {decision.context && (
                <p className="text-xs text-muted-foreground mt-2">{decision.context}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(decision.decided_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                {decision.tags && decision.tags.length > 0 && (
                  <div className="flex gap-1">
                    {decision.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface TranscriptViewProps {
  transcript: string | null;
  highlights: HighlightedMoment[];
}

function TranscriptView({ transcript, highlights }: TranscriptViewProps) {
  if (!transcript) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">Transcript not available yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          The transcript will appear here once processing is complete
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Highlighted Moments */}
      {highlights.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-primary-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            AI Highlighted Moments
          </h4>
          <div className="space-y-2">
            {highlights.slice(0, 5).map((moment, index) => (
              <div
                key={index}
                className="flex items-start gap-3 text-sm bg-white rounded-md p-2"
              >
                <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                  {moment.timestamp}
                </span>
                <div className="flex-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs mr-2 ${
                      moment.type === 'action_item'
                        ? 'bg-orange-100 text-orange-700'
                        : moment.type === 'decision'
                        ? 'bg-blue-100 text-blue-700'
                        : moment.type === 'question'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {moment.type.replace('_', ' ')}
                  </span>
                  <span className="text-foreground">{moment.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Transcript */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
            {transcript}
          </pre>
        </div>
      </div>
    </div>
  );
}

interface InsightsViewProps {
  talkTime: TalkTimeData[];
  topicBreakdown: TopicBreakdown[];
  actionItems: ActionItem[];
  decisions: Decision[];
}

function InsightsView({ talkTime, topicBreakdown, actionItems, decisions }: InsightsViewProps) {
  const completedItems = actionItems.filter((i) => i.status === 'completed').length;
  const totalItems = actionItems.length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Talk Time Distribution */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Talk Time Distribution
        </h4>
        {talkTime.length > 0 ? (
          <div className="space-y-3">
            {talkTime.map((data) => (
              <div key={data.userId}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground">{data.userName}</span>
                  <span className="text-muted-foreground">
                    {data.minutes}m ({data.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${data.color} rounded-full transition-all`}
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No talk time data available</p>
        )}
      </div>

      {/* Topic Breakdown */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Topic Breakdown
        </h4>
        {topicBreakdown.length > 0 ? (
          <div className="space-y-3">
            {topicBreakdown.map((topic, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground">{topic.topic}</span>
                  <span className="text-muted-foreground">{topic.percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${COLORS[index % COLORS.length]} rounded-full transition-all`}
                    style={{ width: `${topic.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No topics identified</p>
        )}
      </div>

      {/* Meeting Stats */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Meeting Stats
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-3xl font-bold text-foreground">{actionItems.length}</p>
            <p className="text-xs text-muted-foreground">Action Items</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-3xl font-bold text-foreground">{decisions.length}</p>
            <p className="text-xs text-muted-foreground">Decisions</p>
          </div>
        </div>
      </div>

      {/* Action Item Completion */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Action Item Progress
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Completion Rate</span>
            <span className="text-muted-foreground">
              {completedItems}/{totalItems} ({completionRate}%)
            </span>
          </div>
          <Progress value={completionRate} className="h-3" />
        </div>
      </div>
    </div>
  );
}

interface RelatedMeetingsViewProps {
  topics: Array<{ topic_id: string; topics: Topic | null }>;
}

function RelatedMeetingsView({ topics }: RelatedMeetingsViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Related Topics
        </h4>
        {topics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <Badge
                key={t.topic_id}
                variant="secondary"
                className="px-3 py-1 text-sm cursor-pointer hover:bg-primary-100"
              >
                <Hash className="w-3 h-3 mr-1" />
                {t.topics?.name || 'Unknown'}
                <span className="ml-2 text-xs text-muted-foreground">
                  {t.topics?.meeting_count || 0} meetings
                </span>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No topics linked to this meeting</p>
        )}
      </div>

      <div className="bg-muted/50 rounded-lg border border-border p-6 text-center">
        <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">
          Related meetings based on shared topics will appear here
        </p>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [meeting, setMeeting] = useState<MeetingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [completingItemId, setCompletingItemId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch meeting data
  const fetchMeeting = useCallback(async () => {
    if (!meetingId) {
      setError('Meeting ID is required');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getMeetingById(meetingId);
      setMeeting(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch meeting';
      setError(message);
      console.error('Error fetching meeting:', err);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  // Realtime subscriptions
  useRealtimeMeetings({
    onUpdate: (updatedMeeting) => {
      if (updatedMeeting.id === meetingId) {
        setMeeting((prev) => (prev ? { ...prev, ...updatedMeeting } : prev));
      }
    },
    onMeetingReady: (readyMeeting) => {
      if (readyMeeting.id === meetingId) {
        toast({
          title: 'Meeting Ready',
          description: 'The meeting has finished processing.',
        });
        fetchMeeting();
      }
    },
    onMeetingFailed: (failedMeeting) => {
      if (failedMeeting.id === meetingId) {
        toast({
          title: 'Processing Failed',
          description: 'Failed to process the meeting. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  useRealtimeActionItems({
    onUpdate: (item) => {
      setMeeting((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          action_items: prev.action_items.map((ai) =>
            ai.id === item.id ? { ...ai, ...item } : ai
          ),
        };
      });
    },
    onInsert: (item) => {
      if (item.meeting_id === meetingId) {
        setMeeting((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            action_items: [...prev.action_items, item],
          };
        });
      }
    },
    onDelete: (oldItem) => {
      setMeeting((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          action_items: prev.action_items.filter((ai) => ai.id !== oldItem.id),
        };
      });
    },
  });

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  // Handle title update
  const handleTitleUpdate = async (newTitle: string) => {
    if (!meetingId) return;
    setIsSavingTitle(true);
    try {
      await updateMeetingTitle(meetingId, newTitle);
      setMeeting((prev) => (prev ? { ...prev, title: newTitle } : prev));
      toast({
        title: 'Title Updated',
        description: 'Meeting title has been updated successfully.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update title';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Handle action item completion
  const handleMarkComplete = async (itemId: string) => {
    setCompletingItemId(itemId);
    try {
      await markActionItemCompleted(itemId);
      setMeeting((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          action_items: prev.action_items.map((ai) =>
            ai.id === itemId ? { ...ai, status: 'completed' } : ai
          ),
        };
      });
      toast({
        title: 'Action Item Completed',
        description: 'The action item has been marked as complete.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete action item';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setCompletingItemId(null);
    }
  };

  // Computed data
  const highlights = meeting
    ? extractHighlightedMoments(meeting.transcript, meeting.action_items, meeting.decisions)
    : [];
  const talkTime = meeting
    ? calculateTalkTime(meeting.meeting_participants, meeting.duration_minutes)
    : [];
  const topicBreakdown = meeting ? calculateTopicBreakdown(meeting.meeting_topics) : [];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <HeaderSkeleton />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ContentSkeleton />
        </main>
      </div>
    );
  }

  // Error state
  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4 opacity-70" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {error || 'Meeting not found'}
            </h2>
            <p className="text-muted-foreground mb-6">
              We couldn't load the meeting details. Please try again.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <Button onClick={() => { setLoading(true); fetchMeeting(); }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Meeting Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back link */}
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>

          {/* Title */}
          <div className="mb-4">
            <EditableTitle
              title={meeting.title}
              onSave={handleTitleUpdate}
              isLoading={isSavingTitle}
            />
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(meeting.meeting_date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formatTime(meeting.meeting_date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Play className="w-4 h-4" />
              <span>{formatDuration(meeting.duration_minutes)}</span>
            </div>
            <Badge className={`${getStatusColor(meeting.status)}`}>
              {meeting.status}
            </Badge>
            {/* AI Process Button */}
            <ProcessMeetingButton
              meetingId={meeting.id}
              meetingTitle={meeting.title}
              audioUrl={meeting.video_url}
              currentStatus={meeting.status}
              onProcessingComplete={() => {
                // Refetch to get properly typed data with relations
                fetchMeeting();
              }}
              onStatusChange={(updatedMeeting) => {
                setMeeting((prev) =>
                  prev ? { ...prev, status: updatedMeeting.status } : prev
                );
              }}
              variant="outline"
              size="sm"
            />
          </div>

          {/* Participants */}
          <div className="mt-4">
            <ParticipantAvatars participants={meeting.meeting_participants} />
          </div>

          {/* Tags/Topics */}
          {meeting.meeting_topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {meeting.meeting_topics.map((t) => (
                <Badge key={t.topic_id} variant="outline" className="text-xs">
                  <Hash className="w-3 h-3 mr-1" />
                  {t.topics?.name || 'Unknown'}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content with Tabs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="transcript" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="transcript" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="related" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Related
            </TabsTrigger>
          </TabsList>

          {/* Transcript Tab */}
          <TabsContent value="transcript">
            <TranscriptView transcript={meeting.transcript} highlights={highlights} />
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Summary */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Meeting Summary</h3>
                {meeting.summary ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {meeting.summary}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">
                      Summary will be available after processing
                    </p>
                  </div>
                )}
              </div>

              {/* Action Items */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-orange-600" />
                  Action Items ({meeting.action_items.length})
                </h3>
                <ActionItemList
                  actionItems={meeting.action_items}
                  onMarkComplete={handleMarkComplete}
                  completingId={completingItemId}
                />
              </div>

              {/* Decisions */}
              <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  Key Decisions ({meeting.decisions.length})
                </h3>
                <DecisionList decisions={meeting.decisions} />
              </div>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights">
            <InsightsView
              talkTime={talkTime}
              topicBreakdown={topicBreakdown}
              actionItems={meeting.action_items}
              decisions={meeting.decisions}
            />
          </TabsContent>

          {/* Related Tab */}
          <TabsContent value="related">
            <RelatedMeetingsView topics={meeting.meeting_topics} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
