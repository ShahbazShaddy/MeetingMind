import { supabase } from '../lib/supabase';
import { Meeting, MeetingParticipant, User, ActionItem, Decision, Topic } from '../types/database';

/**
 * Participant in a meeting with user details
 */
export interface MeetingParticipantWithUser extends Omit<MeetingParticipant, 'user_id'> {
  users: Omit<User, 'team_id' | 'created_at'> | null;
}

/**
 * Action item with assigned user and meeting details
 */
export interface ActionItemWithDetails extends Omit<ActionItem, 'meeting_id' | 'assigned_to'> {
  meeting_id: string;
  assigned_to: string | null;
}

/**
 * Decision with meeting details
 */
export interface DecisionWithMeeting extends Decision {
  meetings: Omit<Meeting, 'transcript' | 'summary' | 'video_url'> | null;
}

/**
 * Topic associated with a meeting
 */
export interface TopicWithId extends Topic {}

/**
 * Complete meeting with all related data
 */
export interface MeetingWithDetails extends Meeting {
  meeting_participants: MeetingParticipantWithUser[];
  action_items: ActionItemWithDetails[];
  decisions: DecisionWithMeeting[];
  meeting_topics: Array<{
    topic_id: string;
    topics: TopicWithId | null;
  }>;
}

/**
 * Fetch recent meetings with participant information
 *
 * @param limit - Maximum number of meetings to return (default: 10)
 * @returns Array of recent meetings ordered by date descending
 * @throws Error if the query fails
 *
 * @example
 * const meetings = await getRecentMeetings(5);
 */
export async function getRecentMeetings(limit: number = 10): Promise<Meeting[]> {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('meeting_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent meetings: ${error.message}`);
    }

    return data || [];
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching recent meetings';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Fetch a single meeting with all related data
 *
 * @param meetingId - The ID of the meeting to fetch
 * @returns Meeting with all related data (participants, action items, decisions, topics)
 * @throws Error if the query fails or meeting is not found
 *
 * @example
 * const meeting = await getMeetingById('meeting-uuid');
 * // Returns meeting with:
 * // - meeting_participants (with user details)
 * // - action_items
 * // - decisions
 * // - meeting_topics (with topic details)
 */
export async function getMeetingById(meetingId: string): Promise<MeetingWithDetails> {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select(
        `
        *,
        meeting_participants(
          *,
          users:user_id(id, email, full_name, avatar_url)
        ),
        action_items(*),
        decisions(
          *,
          meetings:meeting_id(id, title, meeting_date, duration_minutes, status, created_by, created_at)
        ),
        meeting_topics(
          topic_id,
          topics(*)
        )
        `
      )
      .eq('id', meetingId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch meeting: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Meeting with ID ${meetingId} not found`);
    }

    return data as MeetingWithDetails;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : `Unknown error fetching meeting ${meetingId}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Payload for creating a new meeting
 */
export interface CreateMeetingPayload {
  title: string;
  meeting_date: string;
  duration_minutes: number;
}

/**
 * Create a new meeting for the authenticated user
 *
 * @param payload - Meeting data (title, meeting_date, duration_minutes)
 * @returns Created meeting with id, status set to 'processing'
 * @throws Error if user is not authenticated or query fails
 *
 * @example
 * const meeting = await createMeeting({
 *   title: 'Q4 Planning',
 *   meeting_date: '2025-12-15T14:00:00Z',
 *   duration_minutes: 60
 * });
 */
export async function createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
  try {
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User is not authenticated');
    }

    const { data, error } = await supabase
      .from('meetings')
      .insert({
        title: payload.title,
        meeting_date: payload.meeting_date,
        duration_minutes: payload.duration_minutes,
        created_by: user.id,
        status: 'processing',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create meeting: ${error.message}`);
    }

    if (!data) {
      throw new Error('Created meeting not returned from database');
    }

    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error creating meeting';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Update the title of an existing meeting
 *
 * @param meetingId - The ID of the meeting to update
 * @param title - The new title
 * @returns Updated meeting
 * @throws Error if query fails or meeting not found
 *
 * @example
 * const updated = await updateMeetingTitle('meeting-uuid', 'New Title');
 */
export async function updateMeetingTitle(meetingId: string, title: string): Promise<Meeting> {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .update({ title })
      .eq('id', meetingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update meeting title: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Meeting with ID ${meetingId} not found`);
    }

    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : `Unknown error updating meeting ${meetingId}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Delete a meeting and all related data (via CASCADE)
 *
 * @param meetingId - The ID of the meeting to delete
 * @throws Error if query fails
 *
 * @example
 * await deleteMeeting('meeting-uuid');
 */
export async function deleteMeeting(meetingId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (error) {
      throw new Error(`Failed to delete meeting: ${error.message}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : `Unknown error deleting meeting ${meetingId}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}
