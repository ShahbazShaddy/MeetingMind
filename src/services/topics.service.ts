import { supabase } from '../lib/supabase';
import { Topic } from '../types/database';

/**
 * Fetch trending topics ordered by discussion frequency
 *
 * Retrieves topics sorted by meeting_count in descending order,
 * showing which topics are most frequently discussed.
 *
 * @param limit - Maximum number of topics to return (default: 10)
 * @returns Array of trending topics ordered by meeting count
 * @throws Error if the query fails
 *
 * @example
 * // Get top 10 trending topics
 * const trending = await getTrendingTopics();
 *
 * // Get top 5 trending topics
 * const topFive = await getTrendingTopics(5);
 *
 * trending.forEach(topic => {
 *   console.log(`${topic.name}: discussed ${topic.meeting_count} times`);
 * });
 */
export async function getTrendingTopics(limit: number = 10): Promise<Topic[]> {
  try {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .order('meeting_count', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch trending topics: ${error.message}`);
    }

    return data || [];
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching trending topics';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}
