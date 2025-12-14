import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Hash, AlertCircle, RefreshCw } from 'lucide-react';
import { getTrendingTopics } from '../../services/topics.service';
import type { Topic } from '../../types/database';

export function TrendingTopics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    try {
      setError(null);
      const data = await getTrendingTopics(8);
      setTopics(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch topics';
      setError(message);
      console.error('Error fetching topics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-24 bg-muted rounded-lg skeleton"></div>
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
            fetchTopics();
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
    <div>
      {topics.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <button
              key={topic.id}
              className="px-3 py-2 bg-accent-100 text-accent-700 rounded-lg hover:bg-accent-200 transition-colors group flex items-center space-x-2"
            >
              <Hash className="w-4 h-4" />
              <span className="text-sm font-medium">{topic.name}</span>
              <span className="text-xs bg-accent-200 group-hover:bg-accent-300 px-2 py-0.5 rounded-full">
                {topic.meeting_count}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No topics yet</p>
        </div>
      )}
    </div>
  );
}
