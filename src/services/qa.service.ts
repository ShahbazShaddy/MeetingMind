import { supabase } from '../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================
// TYPES
// ============================================

/**
 * Search result for a meeting
 */
export interface MeetingSearchResult {
  meetingId: string;
  snippet: string;
  relevance: number;
}

/**
 * Source reference for Q&A answers
 */
export interface AnswerSource {
  meetingId: string;
  snippet: string;
}

/**
 * Result of Q&A query
 */
export interface QAResult {
  answer: string;
  sources: AnswerSource[];
}

/**
 * Internal embedding record from database
 */
interface EmbeddingRecord {
  meeting_id: string;
  embedding: number[];
  content_chunk: string;
}

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================

const getGeminiKey = (): string => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error('VITE_GEMINI_API_KEY environment variable is not set');
  }
  return key;
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

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

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateSnippet(text: string, maxLength: number = 300): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// ============================================
// SEMANTIC SEARCH
// ============================================

/**
 * Search meetings using semantic similarity with Gemini embeddings
 *
 * Finds the top-K most relevant meetings based on vector similarity
 * between the query and stored meeting transcript embeddings.
 *
 * @param query - The search query string
 * @param topK - Maximum number of results to return (default: 5)
 * @returns Array of search results with meetingId, snippet, and relevance score
 * @throws Error if embedding generation or database query fails
 *
 * @example
 * const results = await searchMeetings('budget planning Q4', 5);
 * results.forEach(r => {
 *   console.log(`Meeting ${r.meetingId}: ${r.relevance.toFixed(2)}`);
 *   console.log(`Snippet: ${r.snippet}`);
 * });
 */
export async function searchMeetings(
  query: string,
  topK: number = 5
): Promise<MeetingSearchResult[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty');
  }

  const apiKey = getGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  try {
    // Step 1: Generate embedding for the query
    const embeddingResult = await embeddingModel.embedContent(query.trim());
    const queryEmbedding = embeddingResult.embedding.values;

    // Step 2: Fetch all stored embeddings from database
    const { data: embeddings, error } = await supabase
      .from('meeting_embeddings')
      .select('meeting_id, embedding, content_chunk');

    if (error) {
      throw new Error(`Failed to fetch embeddings: ${error.message}`);
    }

    if (!embeddings || embeddings.length === 0) {
      return [];
    }

    // Step 3: Calculate similarity scores for each embedding
    const scoredResults = (embeddings as EmbeddingRecord[]).map(record => ({
      meetingId: record.meeting_id,
      snippet: truncateSnippet(record.content_chunk),
      relevance: cosineSimilarity(queryEmbedding, record.embedding),
      fullChunk: record.content_chunk,
    }));

    // Step 4: Sort by relevance (descending)
    scoredResults.sort((a, b) => b.relevance - a.relevance);

    // Step 5: Deduplicate by meeting_id, keeping highest relevance per meeting
    const seenMeetings = new Set<string>();
    const deduplicatedResults: MeetingSearchResult[] = [];

    for (const result of scoredResults) {
      if (!seenMeetings.has(result.meetingId)) {
        seenMeetings.add(result.meetingId);
        deduplicatedResults.push({
          meetingId: result.meetingId,
          snippet: result.snippet,
          relevance: result.relevance,
        });

        if (deduplicatedResults.length >= topK) {
          break;
        }
      }
    }

    return deduplicatedResults;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown search error';
    console.error('Semantic search failed:', errorMessage);
    throw new Error(`Search failed: ${errorMessage}`);
  }
}

// ============================================
// Q&A SERVICE
// ============================================

/**
 * Answer a question about meetings using RAG (Retrieval-Augmented Generation)
 *
 * 1. Finds relevant meeting content using semantic search
 * 2. Constructs a context from the top-K relevant chunks
 * 3. Uses Gemini LLM to generate a concise answer
 * 4. Returns the answer with source references
 *
 * @param question - The question to answer
 * @param topK - Number of relevant chunks to consider (default: 5)
 * @returns Object containing the answer and source references
 * @throws Error if search or LLM generation fails
 *
 * @example
 * const result = await answerMeetingQuestion(
 *   'What decisions were made about the Q4 budget?',
 *   5
 * );
 * console.log('Answer:', result.answer);
 * result.sources.forEach(s => {
 *   console.log(`Source: Meeting ${s.meetingId}`);
 * });
 */
export async function answerMeetingQuestion(
  question: string,
  topK: number = 5
): Promise<QAResult> {
  if (!question || question.trim().length === 0) {
    throw new Error('Question cannot be empty');
  }

  const apiKey = getGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // Step 1: Find relevant meeting content
    const relevantChunks = await findRelevantChunks(question, topK, genAI);

    if (relevantChunks.length === 0) {
      return {
        answer: 'I could not find any relevant meeting content to answer your question. Please try rephrasing your question or ensure meetings have been processed.',
        sources: [],
      };
    }

    // Step 2: Build context from relevant chunks
    const context = relevantChunks
      .map((chunk, index) => `[Source ${index + 1}]\n${chunk.content}`)
      .join('\n\n');

    // Step 3: Generate answer using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an AI assistant that answers questions about meetings based on transcript content.

Use ONLY the following meeting transcript excerpts to answer the question. If the information is not in the provided context, say so clearly.

Context from meeting transcripts:
${context}

Question: ${question}

Instructions:
- Answer concisely and accurately based on the provided context
- If multiple sources discuss the topic, synthesize the information
- If the context doesn't contain enough information, acknowledge this
- Do not make up information not present in the context
- Keep the answer focused and relevant

Answer:`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();

    // Step 4: Prepare sources
    const sources: AnswerSource[] = relevantChunks.map(chunk => ({
      meetingId: chunk.meetingId,
      snippet: truncateSnippet(chunk.content, 200),
    }));

    return {
      answer,
      sources,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown Q&A error';
    console.error('Q&A failed:', errorMessage);
    throw new Error(`Q&A failed: ${errorMessage}`);
  }
}

/**
 * Internal type for relevant chunks
 */
interface RelevantChunk {
  meetingId: string;
  content: string;
  relevance: number;
}

/**
 * Find relevant transcript chunks for a question
 * Returns chunks (not deduplicated by meeting) for richer context
 */
async function findRelevantChunks(
  query: string,
  topK: number,
  genAI: GoogleGenerativeAI
): Promise<RelevantChunk[]> {
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  // Generate query embedding
  const embeddingResult = await embeddingModel.embedContent(query.trim());
  const queryEmbedding = embeddingResult.embedding.values;

  // Fetch all embeddings
  const { data: embeddings, error } = await supabase
    .from('meeting_embeddings')
    .select('meeting_id, embedding, content_chunk');

  if (error) {
    throw new Error(`Failed to fetch embeddings: ${error.message}`);
  }

  if (!embeddings || embeddings.length === 0) {
    return [];
  }

  // Score and sort all chunks
  const scoredChunks = (embeddings as EmbeddingRecord[])
    .map(record => ({
      meetingId: record.meeting_id,
      content: record.content_chunk,
      relevance: cosineSimilarity(queryEmbedding, record.embedding),
    }))
    .sort((a, b) => b.relevance - a.relevance);

  // Return top-K chunks (may include multiple from same meeting for better context)
  return scoredChunks.slice(0, topK);
}

// ============================================
// ADVANCED SEARCH FUNCTIONS
// ============================================

/**
 * Search with additional metadata enrichment
 *
 * Returns search results with meeting title and date
 *
 * @param query - The search query string
 * @param topK - Maximum number of results (default: 5)
 * @returns Enriched search results with meeting metadata
 */
export async function searchMeetingsWithMetadata(
  query: string,
  topK: number = 5
): Promise<Array<MeetingSearchResult & { title: string; meetingDate: string }>> {
  const searchResults = await searchMeetings(query, topK);

  if (searchResults.length === 0) {
    return [];
  }

  // Fetch meeting metadata
  const meetingIds = searchResults.map(r => r.meetingId);
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('id, title, meeting_date')
    .in('id', meetingIds);

  if (error) {
    console.error('Failed to fetch meeting metadata:', error.message);
    // Return results without metadata
    return searchResults.map(r => ({
      ...r,
      title: 'Unknown',
      meetingDate: '',
    }));
  }

  // Merge metadata
  const meetingMap = new Map(
    meetings?.map(m => [m.id, { title: m.title, meetingDate: m.meeting_date }]) || []
  );

  return searchResults.map(r => ({
    ...r,
    title: meetingMap.get(r.meetingId)?.title || 'Unknown',
    meetingDate: meetingMap.get(r.meetingId)?.meetingDate || '',
  }));
}

/**
 * Get suggested questions based on recent meeting content
 *
 * Uses Gemini to generate relevant questions based on recent meetings
 *
 * @param limit - Number of recent meetings to analyze (default: 3)
 * @returns Array of suggested questions
 */
export async function getSuggestedQuestions(limit: number = 3): Promise<string[]> {
  const apiKey = getGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    // Fetch recent meeting summaries
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select('summary')
      .not('summary', 'is', null)
      .order('meeting_date', { ascending: false })
      .limit(limit);

    if (error || !meetings || meetings.length === 0) {
      return [
        'What decisions were made recently?',
        'What are the upcoming action items?',
        'What topics have been discussed most frequently?',
      ];
    }

    const summaries = meetings
      .filter(m => m.summary)
      .map(m => m.summary)
      .join('\n\n');

    const prompt = `Based on these recent meeting summaries, suggest 5 relevant questions a user might want to ask about their meetings.

Meeting summaries:
${summaries}

Return ONLY a JSON array of question strings, no markdown or other text.
Example: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse response
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const questions: string[] = JSON.parse(cleanedResponse);
    return questions.filter(q => typeof q === 'string' && q.length > 0).slice(0, 5);
  } catch (err) {
    console.error('Failed to generate suggested questions:', err);
    return [
      'What decisions were made recently?',
      'What are the upcoming action items?',
      'What topics have been discussed most frequently?',
    ];
  }
}
