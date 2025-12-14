import { supabase } from '../lib/supabase';
import {
  processMeeting,
  transcribeMeeting,
  extractMeetingInsights,
  updateTopicsAndEmbeddings,
  MeetingInsightsResult,
} from './ai.service';
import {
  answerMeetingQuestion,
  QAResult,
  AnswerSource,
} from './qa.service';
import { ActionItem, Decision, Meeting } from '../types/database';

// ============================================
// TYPES
// ============================================

/**
 * Processing status for meetings
 */
export type ProcessingStatus = 'processing' | 'ready' | 'failed';

/**
 * Processing step in the pipeline
 */
export type ProcessingStep =
  | 'started'
  | 'transcribing'
  | 'extracting_insights'
  | 'updating_topics'
  | 'generating_embeddings'
  | 'completed'
  | 'failed';

/**
 * Progress update for meeting processing
 */
export interface ProcessingProgress {
  meetingId: string;
  step: ProcessingStep;
  progress: number; // 0-100
  message: string;
  timestamp: string;
}

/**
 * Result of processing a new meeting
 */
export interface MeetingProcessingResult {
  success: boolean;
  meetingId: string;
  transcript?: string;
  actionItems: ActionItem[];
  decisions: Decision[];
  error?: string;
}

/**
 * Q&A response with sources
 */
export interface QuestionAnswerResult {
  answer: string;
  sources: AnswerSource[];
}

// ============================================
// PROGRESS LOGGING
// ============================================

/**
 * Log processing progress
 */
function logProgress(
  meetingId: string,
  step: ProcessingStep,
  progress: number,
  message: string
): ProcessingProgress {
  const progressUpdate: ProcessingProgress = {
    meetingId,
    step,
    progress,
    message,
    timestamp: new Date().toISOString(),
  };

  console.log(
    `[Orchestrator] Meeting ${meetingId} - ${step} (${progress}%): ${message}`
  );

  return progressUpdate;
}

// ============================================
// MEETING STATUS UPDATES
// ============================================

/**
 * Update meeting status in database
 */
async function updateMeetingStatus(
  meetingId: string,
  status: ProcessingStatus
): Promise<void> {
  const { error } = await supabase
    .from('meetings')
    .update({ status })
    .eq('id', meetingId);

  if (error) {
    console.error(`Failed to update meeting status to ${status}:`, error.message);
  }
}

/**
 * Get meeting by ID
 */
async function getMeeting(meetingId: string): Promise<Meeting | null> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single();

  if (error) {
    console.error(`Failed to fetch meeting ${meetingId}:`, error.message);
    return null;
  }

  return data;
}

// ============================================
// CLEANUP FUNCTIONS
// ============================================

/**
 * Delete existing action items for a meeting (for reprocessing)
 */
async function deleteExistingActionItems(meetingId: string): Promise<void> {
  const { error } = await supabase
    .from('action_items')
    .delete()
    .eq('meeting_id', meetingId);

  if (error) {
    console.error(`Failed to delete existing action items:`, error.message);
  }
}

/**
 * Delete existing decisions for a meeting (for reprocessing)
 */
async function deleteExistingDecisions(meetingId: string): Promise<void> {
  const { error } = await supabase
    .from('decisions')
    .delete()
    .eq('meeting_id', meetingId);

  if (error) {
    console.error(`Failed to delete existing decisions:`, error.message);
  }
}

/**
 * Delete existing meeting topics for a meeting (for reprocessing)
 */
async function deleteExistingMeetingTopics(meetingId: string): Promise<void> {
  const { error } = await supabase
    .from('meeting_topics')
    .delete()
    .eq('meeting_id', meetingId);

  if (error) {
    console.error(`Failed to delete existing meeting topics:`, error.message);
  }
}

/**
 * Delete existing embeddings for a meeting (for reprocessing)
 */
async function deleteExistingEmbeddings(meetingId: string): Promise<void> {
  const { error } = await supabase
    .from('meeting_embeddings')
    .delete()
    .eq('meeting_id', meetingId);

  if (error) {
    console.error(`Failed to delete existing embeddings:`, error.message);
  }
}

// ============================================
// MAIN ORCHESTRATION FUNCTIONS
// ============================================

/**
 * Handle processing of a new meeting
 *
 * Orchestrates the complete AI pipeline:
 * 1. Updates meeting status to 'processing'
 * 2. Transcribes audio using AssemblyAI
 * 3. Extracts action items and decisions using Gemini
 * 4. Updates topics and generates embeddings
 * 5. Updates meeting status to 'ready' or 'failed'
 *
 * Real-time updates are automatically triggered via Supabase
 * when data is inserted/updated in the database.
 *
 * @param meetingId - The ID of the meeting to process
 * @param audioUrl - Public URL to the audio/video file
 * @returns Processing result with extracted data
 *
 * @example
 * try {
 *   const result = await handleNewMeeting(
 *     'meeting-uuid',
 *     'https://storage.example.com/meeting.mp3'
 *   );
 *   console.log(`Extracted ${result.actionItems.length} action items`);
 * } catch (error) {
 *   console.error('Processing failed:', error);
 * }
 */
export async function handleNewMeeting(
  meetingId: string,
  audioUrl: string
): Promise<MeetingProcessingResult> {
  logProgress(meetingId, 'started', 0, 'Starting meeting processing');

  try {
    // Step 1: Update status to processing
    await updateMeetingStatus(meetingId, 'processing');
    logProgress(meetingId, 'started', 5, 'Status updated to processing');

    // Step 2: Process the meeting using the AI pipeline
    logProgress(meetingId, 'transcribing', 10, 'Starting transcription');

    const result = await processMeeting(meetingId, audioUrl);

    logProgress(meetingId, 'completed', 100, 'Processing completed successfully');

    return {
      success: true,
      meetingId,
      transcript: result.transcript,
      actionItems: result.actionItems,
      decisions: result.decisions,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown processing error';
    logProgress(meetingId, 'failed', 0, `Processing failed: ${errorMessage}`);

    // Ensure status is set to failed
    await updateMeetingStatus(meetingId, 'failed');

    return {
      success: false,
      meetingId,
      actionItems: [],
      decisions: [],
      error: errorMessage,
    };
  }
}

/**
 * Handle reprocessing of an updated meeting
 *
 * Cleans up existing extracted data and re-runs the AI pipeline.
 * Use this when:
 * - Meeting transcript needs to be regenerated
 * - AI extraction needs to be re-run
 * - Meeting content has been manually edited
 *
 * @param meetingId - The ID of the meeting to reprocess
 * @param newAudioUrl - Optional new audio URL (if not provided, uses existing transcript)
 * @returns Processing result with newly extracted data
 *
 * @example
 * // Reprocess with new audio
 * const result = await handleUpdatedMeeting(
 *   'meeting-uuid',
 *   'https://storage.example.com/new-audio.mp3'
 * );
 *
 * // Reprocess using existing transcript
 * const result = await handleUpdatedMeeting('meeting-uuid');
 */
export async function handleUpdatedMeeting(
  meetingId: string,
  newAudioUrl?: string
): Promise<MeetingProcessingResult> {
  logProgress(meetingId, 'started', 0, 'Starting meeting reprocessing');

  try {
    // Step 1: Get the existing meeting
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
      throw new Error(`Meeting ${meetingId} not found`);
    }

    // Step 2: Update status to processing
    await updateMeetingStatus(meetingId, 'processing');
    logProgress(meetingId, 'started', 5, 'Status updated to processing');

    // Step 3: Clean up existing extracted data
    logProgress(meetingId, 'started', 10, 'Cleaning up existing data');
    await Promise.all([
      deleteExistingActionItems(meetingId),
      deleteExistingDecisions(meetingId),
      deleteExistingMeetingTopics(meetingId),
      deleteExistingEmbeddings(meetingId),
    ]);

    let transcript: string;
    let insights: MeetingInsightsResult;

    // Step 4: Determine if we need to re-transcribe
    if (newAudioUrl) {
      // Re-transcribe with new audio
      logProgress(meetingId, 'transcribing', 20, 'Transcribing new audio');
      transcript = await transcribeMeeting(meetingId, newAudioUrl);
    } else if (meeting.transcript) {
      // Use existing transcript
      logProgress(meetingId, 'transcribing', 30, 'Using existing transcript');
      transcript = meeting.transcript;
    } else {
      throw new Error('No audio URL provided and no existing transcript found');
    }

    // Step 5: Extract insights
    logProgress(meetingId, 'extracting_insights', 50, 'Extracting action items and decisions');
    insights = await extractMeetingInsights(meetingId, transcript);

    // Step 6: Update topics and embeddings
    logProgress(meetingId, 'updating_topics', 70, 'Updating topics');
    logProgress(meetingId, 'generating_embeddings', 85, 'Generating embeddings');
    await updateTopicsAndEmbeddings(meetingId, transcript);

    // Step 7: Mark as ready
    await updateMeetingStatus(meetingId, 'ready');
    logProgress(meetingId, 'completed', 100, 'Reprocessing completed successfully');

    return {
      success: true,
      meetingId,
      transcript,
      actionItems: insights.actionItems,
      decisions: insights.decisions,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown reprocessing error';
    logProgress(meetingId, 'failed', 0, `Reprocessing failed: ${errorMessage}`);

    // Ensure status is set to failed
    await updateMeetingStatus(meetingId, 'failed');

    return {
      success: false,
      meetingId,
      actionItems: [],
      decisions: [],
      error: errorMessage,
    };
  }
}

/**
 * Get an answer to a question about meetings
 *
 * Wraps the Q&A service with additional error handling
 * and structured output formatting.
 *
 * @param question - The question to answer
 * @param topK - Number of relevant chunks to consider (default: 5)
 * @returns Structured response with answer and source references
 *
 * @example
 * const result = await getAnswerForQuestion(
 *   'What were the main decisions from last week?',
 *   5
 * );
 * console.log('Answer:', result.answer);
 * result.sources.forEach(s => console.log(`Source: ${s.meetingId}`));
 */
export async function getAnswerForQuestion(
  question: string,
  topK: number = 5
): Promise<QuestionAnswerResult> {
  if (!question || question.trim().length === 0) {
    return {
      answer: 'Please provide a valid question.',
      sources: [],
    };
  }

  try {
    console.log(`[Orchestrator] Answering question: "${question}" (topK: ${topK})`);

    const result: QAResult = await answerMeetingQuestion(question, topK);

    console.log(`[Orchestrator] Answer generated with ${result.sources.length} sources`);

    return {
      answer: result.answer,
      sources: result.sources,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown Q&A error';
    console.error(`[Orchestrator] Q&A failed: ${errorMessage}`);

    return {
      answer: `I encountered an error while trying to answer your question: ${errorMessage}. Please try again.`,
      sources: [],
    };
  }
}

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Process multiple meetings in batch
 *
 * Processes meetings sequentially to avoid rate limiting.
 * Returns results for all meetings, including failures.
 *
 * @param meetings - Array of meeting IDs and audio URLs
 * @returns Array of processing results
 *
 * @example
 * const results = await batchProcessMeetings([
 *   { meetingId: 'uuid-1', audioUrl: 'https://...' },
 *   { meetingId: 'uuid-2', audioUrl: 'https://...' },
 * ]);
 */
export async function batchProcessMeetings(
  meetings: Array<{ meetingId: string; audioUrl: string }>
): Promise<MeetingProcessingResult[]> {
  console.log(`[Orchestrator] Starting batch processing of ${meetings.length} meetings`);

  const results: MeetingProcessingResult[] = [];

  for (let i = 0; i < meetings.length; i++) {
    const { meetingId, audioUrl } = meetings[i];
    console.log(`[Orchestrator] Processing meeting ${i + 1}/${meetings.length}: ${meetingId}`);

    const result = await handleNewMeeting(meetingId, audioUrl);
    results.push(result);

    // Add a small delay between meetings to avoid rate limiting
    if (i < meetings.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(
    `[Orchestrator] Batch processing complete: ${successCount}/${meetings.length} successful`
  );

  return results;
}

/**
 * Reprocess all meetings that are in 'failed' status
 *
 * Fetches all failed meetings and attempts to reprocess them.
 *
 * @returns Array of reprocessing results
 */
export async function reprocessFailedMeetings(): Promise<MeetingProcessingResult[]> {
  console.log('[Orchestrator] Fetching failed meetings for reprocessing');

  const { data: failedMeetings, error } = await supabase
    .from('meetings')
    .select('id, video_url')
    .eq('status', 'failed');

  if (error) {
    console.error('[Orchestrator] Failed to fetch failed meetings:', error.message);
    return [];
  }

  if (!failedMeetings || failedMeetings.length === 0) {
    console.log('[Orchestrator] No failed meetings found');
    return [];
  }

  console.log(`[Orchestrator] Found ${failedMeetings.length} failed meetings`);

  const results: MeetingProcessingResult[] = [];

  for (const meeting of failedMeetings) {
    if (meeting.video_url) {
      const result = await handleNewMeeting(meeting.id, meeting.video_url);
      results.push(result);
    } else {
      // Try reprocessing with existing transcript
      const result = await handleUpdatedMeeting(meeting.id);
      results.push(result);
    }

    // Add delay between retries
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Check the health of the orchestration services
 *
 * Verifies that all required services are accessible.
 *
 * @returns Health check result
 */
export async function checkOrchestratorHealth(): Promise<{
  healthy: boolean;
  services: Record<string, boolean>;
  timestamp: string;
}> {
  const services: Record<string, boolean> = {
    supabase: false,
    geminiApiKey: false,
    assemblyaiApiKey: false,
  };

  // Check Supabase connection
  try {
    const { error } = await supabase.from('meetings').select('id').limit(1);
    services.supabase = !error;
  } catch {
    services.supabase = false;
  }

  // Check Gemini API key
  services.geminiApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  // Check AssemblyAI API key
  services.assemblyaiApiKey = !!import.meta.env.VITE_ASSEMBLYAI_API_KEY;

  const healthy = Object.values(services).every(s => s);

  return {
    healthy,
    services,
    timestamp: new Date().toISOString(),
  };
}
