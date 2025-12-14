import { supabase } from '../lib/supabase';
import { Decision, Meeting } from '../types/database';

/**
 * Decision with related meeting information
 */
export interface DecisionWithMeetingInfo extends Omit<Decision, 'meeting_id'> {
  meeting_id: string;
  meetings: Omit<Meeting, 'transcript' | 'summary' | 'video_url'> | null;
}

/**
 * Fetch recent decisions from the past N days with meeting details
 *
 * Retrieves decisions made within the specified number of days and joins:
 * - Related meeting (id, title)
 *
 * Ordered by decided_at descending (most recent first)
 *
 * @param days - Number of days to look back (default: 7)
 * @returns Array of recent decisions with meeting details
 * @throws Error if the query fails
 *
 * @example
 * // Get decisions from the past 7 days
 * const decisions = await getRecentDecisions();
 *
 * // Get decisions from the past 30 days
 * const monthDecisions = await getRecentDecisions(30);
 *
 * decisions.forEach(decision => {
 *   console.log(`Decision: ${decision.decision_text}`);
 *   console.log(`Meeting: ${decision.meetings?.title}`);
 *   console.log(`Date: ${new Date(decision.decided_at).toLocaleDateString()}`);
 * });
 */
export async function getRecentDecisions(days: number = 7): Promise<DecisionWithMeetingInfo[]> {
  try {
    // Calculate the date from N days ago
    const nDaysAgo = new Date();
    nDaysAgo.setDate(nDaysAgo.getDate() - days);
    const nDaysAgoISO = nDaysAgo.toISOString();

    const { data, error } = await supabase
      .from('decisions')
      .select(
        `
        *,
        meetings:meeting_id(id, title, meeting_date, duration_minutes, status, created_by, created_at)
        `
      )
      .gte('decided_at', nDaysAgoISO)
      .order('decided_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch recent decisions: ${error.message}`);
    }

    return data || [];
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching recent decisions';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Payload for creating a new decision
 */
export interface CreateDecisionPayload {
  meeting_id: string;
  decision_text: string;
  context?: string | null;
  tags?: string[] | null;
}

/**
 * Create a new decision for a meeting
 *
 * @param payload - Decision data (meeting_id, decision_text, context, tags)
 * @returns Created decision with decided_at timestamp
 * @throws Error if query fails
 *
 * @example
 * const decision = await createDecision({
 *   meeting_id: 'meeting-uuid',
 *   decision_text: 'Move launch date to Q2 2026',
 *   context: 'Due to resource constraints',
 *   tags: ['product', 'timeline']
 * });
 */
export async function createDecision(payload: CreateDecisionPayload): Promise<Decision> {
  try {
    const { data, error } = await supabase
      .from('decisions')
      .insert({
        meeting_id: payload.meeting_id,
        decision_text: payload.decision_text,
        context: payload.context || null,
        tags: payload.tags || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create decision: ${error.message}`);
    }

    if (!data) {
      throw new Error('Created decision not returned from database');
    }

    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error creating decision';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}
