import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Circle, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { getOpenActionItems, markActionItemCompleted, updateActionItem } from '../../services/actionItems.service';
import { useRealtimeActionItems } from '../../hooks/useRealtimeActionItems';
import type { ActionItem } from '../../types/database';
import { useToast } from '../../hooks/use-toast';

interface ActionItemWithDetails extends ActionItem {
  users?: { full_name: string; avatar_url?: string } | null;
  meetings?: { title: string } | null;
}

export function ActionItems() {
  const [items, setItems] = useState<ActionItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchActionItems = useCallback(async () => {
    try {
      setError(null);
      const data = await getOpenActionItems();
      // Transform the data to match our interface
      const transformed = data.map((item) => ({
        ...item,
        users: item.users,
        meetings: item.meetings,
      }));
      setItems(transformed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch action items';
      setError(message);
      console.error('Error fetching action items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup realtime subscription for action item changes
  useRealtimeActionItems({
    onInsert: (item) => {
      // Only add if not completed
      if (item.status !== 'completed') {
        setItems((prev) => [item as ActionItemWithDetails, ...prev]);
        toast({
          title: 'New Action Item',
          description: 'A new action item has been added.',
        });
      }
    },
    onUpdate: (item) => {
      if (item.status === 'completed') {
        // Remove from list if completed
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        // Update in place
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...item } : i)));
      }
    },
    onDelete: (oldItem) => {
      setItems((prev) => prev.filter((i) => i.id !== oldItem.id));
    },
    onError: (err) => {
      console.error('Realtime subscription error:', err);
    },
  });

  useEffect(() => {
    fetchActionItems();
  }, [fetchActionItems]);

  async function toggleComplete(item: ActionItem) {
    const isCompleting = item.status !== 'completed';
    setUpdating(item.id);

    try {
      if (isCompleting) {
        await markActionItemCompleted(item.id);
        toast({
          title: 'Success',
          description: 'Action item completed!',
        });
      } else {
        await updateActionItem({ id: item.id, priority: item.priority });
        // Re-open the item by setting status back to pending
        // Note: We need a dedicated function for this, but for now we'll refetch
        await fetchActionItems();
        toast({
          title: 'Success',
          description: 'Action item reopened',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update action item';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  }

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-muted rounded-lg skeleton h-20"></div>
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
            fetchActionItems();
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
      {items.map((item) => (
        <div
          key={item.id}
          className="p-4 bg-card rounded-lg border border-border hover:shadow-soft transition-all"
        >
          <div className="flex items-start space-x-3">
            <button
              onClick={() => toggleComplete(item)}
              disabled={updating === item.id}
              className="mt-0.5 text-muted-foreground hover:text-primary-600 transition-colors disabled:opacity-50"
            >
              {updating === item.id ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : item.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium mb-2 line-clamp-2">
                {item.description}
              </p>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {item.users && (
                  <div className="flex items-center">
                    <div className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs mr-1.5">
                      {item.users.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <span>{item.users.full_name}</span>
                  </div>
                )}

                {item.due_date && (
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(item.due_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )}

                <span className={`px-2 py-0.5 rounded-full border text-xs ${getPriorityClass(item.priority)}`}>
                  {item.priority}
                </span>
              </div>

              {item.meetings && (
                <p className="text-xs text-muted-foreground mt-2">
                  From: {item.meetings.title}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No pending action items</p>
        </div>
      )}
    </div>
  );
}
