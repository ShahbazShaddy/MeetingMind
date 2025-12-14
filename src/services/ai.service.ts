import { supabase } from '../lib/supabase';
import { ActionItem, Decision, Topic } from '../types/database';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================
// TYPES
// ============================================

/**
 * Extracted action item from AI analysis
 */
export interface ExtractedActionItem {
  description: string;
  assigned_to?: string | null;
  due_date?: string | null;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Extracted decision from AI analysis
 */
export interface ExtractedDecision {
  decision_text: string;
  context?: string | null;
  tags?: string[];
}

/**
 * Result of meeting insights extraction
 */
export interface MeetingInsightsResult {
  actionItems: ActionItem[];
  decisions: Decision[];
}

/**
 * AssemblyAI transcript response
 */
interface AssemblyAITranscriptResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  error?: string;
}

/**
 * Gemini structured response for meeting insights
 */
interface GeminiInsightsResponse {
  actionItems: ExtractedActionItem[];
  decisions: ExtractedDecision[];
  topics: string[];
}

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================

const getAssemblyAIKey = (): string => {
  const key = import.meta.env.VITE_ASSEMBLYAI_API_KEY;
  if (!key) {
    throw new Error('VITE_ASSEMBLYAI_API_KEY environment variable is not set');
  }
  return key;
};

const getGeminiKey = (): string => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error('VITE_GEMINI_API_KEY environment variable is not set');
  }
  return key;
};

// ============================================
// ASSEMBLYAI TRANSCRIPTION
// ============================================

/**
 * Transcribe a meeting audio/video file using AssemblyAI
 *
 * @param meetingId - The ID of the meeting to update
 * @param audioUrl - Public URL to the audio/video file
 * @returns The generated transcript text
 * @throws Error if transcription fails or meeting update fails
 *
 * @example
 * const transcript = await transcribeMeeting(
 *   'meeting-uuid',
 *   'https://storage.example.com/meeting-audio.mp3'
 * );
 */
export async function transcribeMeeting(
  meetingId: string,
  audioUrl: string
): Promise<string> {
  const apiKey = getAssemblyAIKey();
  const baseUrl = 'https://api.assemblyai.com/v2';

  try {
    // Step 1: Submit transcription request
    const submitResponse = await fetch(`${baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_detection: true,
      }),
    });

    if (!submitResponse.ok) {
      const errorData = await submitResponse.json();
      throw new Error(`AssemblyAI submission failed: ${errorData.error || submitResponse.statusText}`);
    }

    const submitData: AssemblyAITranscriptResponse = await submitResponse.json();
    const transcriptId = submitData.id;

    // Step 2: Poll for completion
    let transcript: AssemblyAITranscriptResponse;
    const maxAttempts = 60; // 5 minutes max (5s intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      const pollResponse = await fetch(`${baseUrl}/transcript/${transcriptId}`, {
        headers: {
          'Authorization': apiKey,
        },
      });

      if (!pollResponse.ok) {
        throw new Error(`AssemblyAI polling failed: ${pollResponse.statusText}`);
      }

      transcript = await pollResponse.json();

      if (transcript.status === 'completed') {
        break;
      }

      if (transcript.status === 'error') {
        throw new Error(`AssemblyAI transcription error: ${transcript.error}`);
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!transcript! || transcript!.status !== 'completed') {
      throw new Error('Transcription timed out');
    }

    const transcriptText = transcript.text || '';

    // Step 3: Update meeting with transcript
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        transcript: transcriptText,
        status: 'ready',
      })
      .eq('id', meetingId);

    if (updateError) {
      throw new Error(`Failed to update meeting transcript: ${updateError.message}`);
    }

    return transcriptText;
  } catch (err) {
    // Update meeting status to failed
    await supabase
      .from('meetings')
      .update({ status: 'failed' })
      .eq('id', meetingId);

    const errorMessage = err instanceof Error ? err.message : 'Unknown transcription error';
    console.error(`Transcription failed for meeting ${meetingId}:`, errorMessage);
    throw new Error(errorMessage);
  }
}

// ============================================
// GEMINI INSIGHTS EXTRACTION
// ============================================

/**
 * Extract action items and decisions from a meeting transcript using Gemini
 *
 * @param meetingId - The ID of the meeting
 * @param transcript - The meeting transcript text
 * @returns Object containing arrays of created action items and decisions
 * @throws Error if AI extraction or database insertion fails
 *
 * @example
 * const { actionItems, decisions } = await extractMeetingInsights(
 *   'meeting-uuid',
 *   'Meeting transcript text here...'
 * );
 */
export async function extractMeetingInsights(
  meetingId: string,
  transcript: string
): Promise<MeetingInsightsResult> {
  const apiKey = getGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    const prompt = `Analyze the following meeting transcript and extract structured information.

Return a JSON object with the following structure:
{
  "actionItems": [
    {
      "description": "Clear description of the action item",
      "priority": "high" | "medium" | "low",
      "due_date": "YYYY-MM-DD or null if not mentioned"
    }
  ],
  "decisions": [
    {
      "decision_text": "The decision that was made",
      "context": "Context or reasoning behind the decision",
      "tags": ["relevant", "topic", "tags"]
    }
  ],
  "topics": ["main topics discussed in the meeting"]
}

Guidelines:
- Extract all actionable tasks mentioned
- Identify clear decisions that were made
- Set priority based on urgency mentioned
- Extract dates if mentioned, otherwise leave null
- Be concise but complete

Transcript:
${transcript}

Return ONLY valid JSON, no markdown or additional text.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    // Parse JSON response
    let insights: GeminiInsightsResponse;
    try {
      // Clean potential markdown code blocks
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      insights = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Insert action items
    const createdActionItems: ActionItem[] = [];
    if (insights.actionItems && insights.actionItems.length > 0) {
      for (const item of insights.actionItems) {
        const { data, error } = await supabase
          .from('action_items')
          .insert({
            meeting_id: meetingId,
            description: item.description,
            priority: item.priority || 'medium',
            due_date: item.due_date || null,
            status: 'pending',
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to insert action item:', error.message);
          continue;
        }

        if (data) {
          createdActionItems.push(data);
        }
      }
    }

    // Insert decisions
    const createdDecisions: Decision[] = [];
    if (insights.decisions && insights.decisions.length > 0) {
      for (const decision of insights.decisions) {
        const { data, error } = await supabase
          .from('decisions')
          .insert({
            meeting_id: meetingId,
            decision_text: decision.decision_text,
            context: decision.context || null,
            tags: decision.tags || null,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to insert decision:', error.message);
          continue;
        }

        if (data) {
          createdDecisions.push(data);
        }
      }
    }

    // Generate summary and update meeting
    const summary = await generateMeetingSummary(transcript, model);
    if (summary) {
      await supabase
        .from('meetings')
        .update({ summary })
        .eq('id', meetingId);
    }

    return {
      actionItems: createdActionItems,
      decisions: createdDecisions,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error extracting insights';
    console.error(`Insights extraction failed for meeting ${meetingId}:`, errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Generate a concise summary of the meeting
 */
async function generateMeetingSummary(
  transcript: string,
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>
): Promise<string | null> {
  try {
    const prompt = `Summarize the following meeting transcript in 2-3 concise paragraphs. 
Focus on key discussion points, decisions made, and next steps.

Transcript:
${transcript}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('Failed to generate summary:', err);
    return null;
  }
}

// ============================================
// TOPICS AND EMBEDDINGS
// ============================================

/**
 * Analyze transcript for topics, update topic tables, and generate embeddings
 *
 * @param meetingId - The ID of the meeting
 * @param transcript - The meeting transcript text
 * @throws Error if topic extraction or embedding generation fails
 *
 * @example
 * await updateTopicsAndEmbeddings('meeting-uuid', 'Meeting transcript...');
 */
export async function updateTopicsAndEmbeddings(
  meetingId: string,
  transcript: string
): Promise<void> {
  const apiKey = getGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    // Step 1: Extract topics using Gemini
    const topics = await extractTopics(transcript, model);

    // Step 2: Upsert topics and link to meeting
    for (const topicName of topics) {
      await upsertTopicAndLink(meetingId, topicName);
    }

    // Step 3: Generate and store embeddings
    await generateAndStoreEmbeddings(meetingId, transcript, genAI);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error updating topics and embeddings';
    console.error(`Topics/embeddings update failed for meeting ${meetingId}:`, errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Extract main topics from transcript using Gemini
 */
async function extractTopics(
  transcript: string,
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>
): Promise<string[]> {
  try {
    const prompt = `Extract the main topics discussed in this meeting transcript.
Return ONLY a JSON array of topic strings (3-7 topics).
Topics should be concise (1-3 words each).

Transcript:
${transcript}

Return format: ["topic1", "topic2", "topic3"]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Clean and parse response
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const topics: string[] = JSON.parse(cleanedResponse);
    return topics.filter(t => typeof t === 'string' && t.length > 0);
  } catch (err) {
    console.error('Failed to extract topics:', err);
    return [];
  }
}

/**
 * Upsert a topic and link it to a meeting
 */
async function upsertTopicAndLink(
  meetingId: string,
  topicName: string
): Promise<void> {
  const normalizedName = topicName.toLowerCase().trim();

  // Check if topic exists
  const { data: existingTopic } = await supabase
    .from('topics')
    .select('id, meeting_count')
    .eq('name', normalizedName)
    .single();

  let topicId: string;

  if (existingTopic) {
    // Update existing topic
    topicId = existingTopic.id;
    await supabase
      .from('topics')
      .update({
        meeting_count: (existingTopic.meeting_count || 0) + 1,
        last_discussed: new Date().toISOString(),
      })
      .eq('id', topicId);
  } else {
    // Create new topic
    const { data: newTopic, error } = await supabase
      .from('topics')
      .insert({
        name: normalizedName,
        meeting_count: 1,
        last_discussed: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !newTopic) {
      console.error('Failed to create topic:', error?.message);
      return;
    }

    topicId = newTopic.id;
  }

  // Link topic to meeting (ignore if already exists)
  const { error: linkError } = await supabase
    .from('meeting_topics')
    .insert({
      meeting_id: meetingId,
      topic_id: topicId,
    });

  if (linkError && !linkError.message.includes('duplicate')) {
    console.error('Failed to link topic to meeting:', linkError.message);
  }
}

/**
 * Generate embeddings for transcript chunks and store them
 */
async function generateAndStoreEmbeddings(
  meetingId: string,
  transcript: string,
  genAI: GoogleGenerativeAI
): Promise<void> {
  // Use text-embedding model
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  // Split transcript into chunks (approximately 500 words each)
  const chunks = splitIntoChunks(transcript, 500);

  // Delete existing embeddings for this meeting
  await supabase
    .from('meeting_embeddings')
    .delete()
    .eq('meeting_id', meetingId);

  // Generate and store embeddings for each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      const result = await embeddingModel.embedContent(chunk);
      const embedding = result.embedding.values;

      const { error } = await supabase
        .from('meeting_embeddings')
        .insert({
          meeting_id: meetingId,
          embedding: embedding,
          content_chunk: chunk,
          chunk_index: i,
        });

      if (error) {
        console.error(`Failed to store embedding chunk ${i}:`, error.message);
      }
    } catch (err) {
      console.error(`Failed to generate embedding for chunk ${i}:`, err);
    }
  }
}

/**
 * Split text into chunks of approximately n words
 */
function splitIntoChunks(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

// ============================================
// SEMANTIC SEARCH
// ============================================

/**
 * Search meetings using semantic similarity
 *
 * @param query - The search query
 * @param limit - Maximum number of results (default: 5)
 * @returns Array of meeting IDs with similarity scores
 *
 * @example
 * const results = await searchMeetings('budget planning discussion');
 */
export async function searchMeetings(
  query: string,
  limit: number = 5
): Promise<Array<{ meeting_id: string; similarity: number; content_chunk: string }>> {
  const apiKey = getGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  try {
    // Generate query embedding
    const result = await embeddingModel.embedContent(query);
    const queryEmbedding = result.embedding.values;

    // Fetch all embeddings (in production, use pgvector for efficient similarity search)
    const { data: embeddings, error } = await supabase
      .from('meeting_embeddings')
      .select('meeting_id, embedding, content_chunk');

    if (error || !embeddings) {
      throw new Error(`Failed to fetch embeddings: ${error?.message}`);
    }

    // Calculate cosine similarity
    const results = embeddings.map(row => ({
      meeting_id: row.meeting_id,
      content_chunk: row.content_chunk,
      similarity: cosineSimilarity(queryEmbedding, row.embedding as number[]),
    }));

    // Sort by similarity and deduplicate by meeting_id
    const sortedResults = results
      .sort((a, b) => b.similarity - a.similarity)
      .reduce((acc, curr) => {
        if (!acc.find(r => r.meeting_id === curr.meeting_id)) {
          acc.push(curr);
        }
        return acc;
      }, [] as typeof results);

    return sortedResults.slice(0, limit);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown search error';
    console.error('Semantic search failed:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// ============================================
// FULL PROCESSING PIPELINE
// ============================================

/**
 * Process a complete meeting: transcribe, extract insights, and update topics
 *
 * @param meetingId - The ID of the meeting
 * @param audioUrl - Public URL to the audio/video file
 * @returns Object containing transcript, action items, and decisions
 *
 * @example
 * const result = await processMeeting('meeting-uuid', 'https://...');
 * console.log(`Found ${result.actionItems.length} action items`);
 */
export async function processMeeting(
  meetingId: string,
  audioUrl: string
): Promise<{
  transcript: string;
  actionItems: ActionItem[];
  decisions: Decision[];
}> {
  try {
    // Step 1: Transcribe meeting
    const transcript = await transcribeMeeting(meetingId, audioUrl);

    // Step 2: Extract insights
    const insights = await extractMeetingInsights(meetingId, transcript);

    // Step 3: Update topics and embeddings
    await updateTopicsAndEmbeddings(meetingId, transcript);

    return {
      transcript,
      actionItems: insights.actionItems,
      decisions: insights.decisions,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown processing error';
    console.error(`Full processing failed for meeting ${meetingId}:`, errorMessage);
    throw new Error(errorMessage);
  }
}
