import { supabase } from '../lib/supabase';
import { ActionItem, User, Meeting } from '../types/database';

/**
 * Action item with assigned user and meeting details
 */
export interface ActionItemWithMeetingAndUser extends Omit<ActionItem, 'meeting_id' | 'assigned_to'> {
  meeting_id: string;
  assigned_to: string | null;
  meetings: Omit<Meeting, 'transcript' | 'summary' | 'video_url'> | null;
  users: Omit<User, 'team_id' | 'email' | 'created_at'> | null;
}

/**
 * Fetch open (non-completed) action items ordered by due date
 *
 * Retrieves action items with status other than 'completed' and joins:
 * - Assigned user information (id, full_name, avatar_url)
 * - Related meeting (id, title)
 *
 * Ordered by due_date ascending (nearest due dates first)
 *
 * @returns Array of open action items with user and meeting details
 * @throws Error if the query fails
 *
 * @example
 * const items = await getOpenActionItems();
 * items.forEach(item => {
 *   console.log(`Task: ${item.description} for ${item.meetings?.title}`);
 *   console.log(`Assigned to: ${item.users?.full_name}`);
 * });
 */
export async function getOpenActionItems(): Promise<ActionItemWithMeetingAndUser[]> {
  try {
    const { data, error } = await supabase
      .from('action_items')
      .select(
        `
        *,
        meetings:meeting_id(id, title, meeting_date, duration_minutes, status, created_by, created_at),
        users:assigned_to(id, full_name, avatar_url)
        `
      )
      .neq('status', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to fetch open action items: ${error.message}`);
    }

    return data || [];
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching open action items';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Payload for creating a new action item
 */
export interface CreateActionItemPayload {
  meeting_id: string;
  description: string;
  assigned_to?: string | null;
  due_date?: string | null;
  priority?: string;
}

/**
 * Create a new action item
 *
 * @param payload - Action item data
 * @returns Created action item
 * @throws Error if query fails
 *
 * @example
 * const item = await createActionItem({
 *   meeting_id: 'meeting-uuid',
 *   description: 'Follow up with client',
 *   assigned_to: 'user-uuid',
 *   due_date: '2025-12-20',
 *   priority: 'high'
 * });
 */
export async function createActionItem(payload: CreateActionItemPayload): Promise<ActionItem> {
  try {
    const { data, error } = await supabase
      .from('action_items')
      .insert({
        meeting_id: payload.meeting_id,
        description: payload.description,
        assigned_to: payload.assigned_to || null,
        due_date: payload.due_date || null,
        priority: payload.priority || 'medium',
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create action item: ${error.message}`);
    }

    if (!data) {
      throw new Error('Created action item not returned from database');
    }

    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error creating action item';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Mark an action item as completed
 *
 * @param actionItemId - The ID of the action item to mark as completed
 * @returns Updated action item
 * @throws Error if query fails
 *
 * @example
 * const completed = await markActionItemCompleted('action-item-uuid');
 */
export async function markActionItemCompleted(actionItemId: string): Promise<ActionItem> {
  try {
    const { data, error } = await supabase
      .from('action_items')
      .update({ status: 'completed' })
      .eq('id', actionItemId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark action item as completed: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Action item with ID ${actionItemId} not found`);
    }

    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : `Unknown error marking action item ${actionItemId} as completed`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Payload for updating an action item
 */
export interface UpdateActionItemPayload {
  id: string;
  description?: string;
  assigned_to?: string | null;
  due_date?: string | null;
  priority?: string;
}

/**
 * Update an action item with new details
 *
 * @param payload - Action item update data (only modified fields needed)
 * @returns Updated action item
 * @throws Error if query fails
 *
 * @example
 * const updated = await updateActionItem({
 *   id: 'action-item-uuid',
 *   description: 'Updated description',
 *   priority: 'low'
 * });
 */
export async function updateActionItem(payload: UpdateActionItemPayload): Promise<ActionItem> {
  try {
    const { id, description, assigned_to, due_date, priority } = payload;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (description !== undefined) updateData.description = description;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (priority !== undefined) updateData.priority = priority;

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    const { data, error } = await supabase
      .from('action_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update action item: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Action item with ID ${id} not found`);
    }

    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error updating action item';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Delete an action item
 *
 * @param actionItemId - The ID of the action item to delete
 * @throws Error if query fails
 *
 * @example
 * await deleteActionItem('action-item-uuid');
 */
export async function deleteActionItem(actionItemId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('action_items')
      .delete()
      .eq('id', actionItemId);

    if (error) {
      throw new Error(`Failed to delete action item: ${error.message}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : `Unknown error deleting action item ${actionItemId}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}
