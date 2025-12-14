import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Loader2,
  MessageSquare,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Separator } from '../components/ui/separator';
import { useToast } from '../hooks/use-toast';
import {
  searchMeetings,
  answerMeetingQuestion,
  MeetingSearchResult,
  QAResult,
} from '../services/qa.service';
import { getMeetingById } from '../services/meetings.service';
import { Meeting } from '../types/database';

/**
 * Search result with meeting details
 */
interface EnrichedSearchResult extends MeetingSearchResult {
  meetingTitle: string;
  meetingDate: string;
}

/**
 * Example search queries for user guidance
 */
const EXAMPLE_SEARCHES = [
  'What decisions were made about marketing?',
  'Show me action items from recent meetings',
  'Find discussions about product launch',
  'What did we decide about the Q4 budget?',
];

/**
 * SearchPage Component
 *
 * AI-powered search across all meeting transcripts with Q&A capabilities.
 * Features:
 * - Semantic search using embeddings
 * - RAG-based Q&A with source citations
 * - Meeting result cards with links
 * - Example queries for guidance
 */
export function SearchPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<EnrichedSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Q&A state
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [qaResult, setQaResult] = useState<QAResult | null>(null);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  // Error state
  const [searchError, setSearchError] = useState<string | null>(null);
  const [qaError, setQaError] = useState<string | null>(null);

  const { toast } = useToast();

  /**
   * Fetch meeting details for search results
   */
  const enrichSearchResults = async (
    results: MeetingSearchResult[]
  ): Promise<EnrichedSearchResult[]> => {
    const enriched: EnrichedSearchResult[] = [];

    for (const result of results) {
      try {
        const meeting = await getMeetingById(result.meetingId);
        enriched.push({
          ...result,
          meetingTitle: meeting?.title || 'Untitled Meeting',
          meetingDate: meeting?.meeting_date
            ? new Date(meeting.meeting_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : 'Unknown date',
        });
      } catch {
        // If we can't fetch meeting details, use defaults
        enriched.push({
          ...result,
          meetingTitle: 'Meeting',
          meetingDate: 'Unknown date',
        });
      }
    }

    return enriched;
  };

  /**
   * Handle search form submission
   */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      toast({
        title: 'Search query required',
        description: 'Please enter a search term or question.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setQaResult(null);
    setQaError(null);
    setHasSearched(true);

    try {
      const results = await searchMeetings(searchQuery.trim(), 10);
      const enrichedResults = await enrichSearchResults(results);
      setSearchResults(enrichedResults);

      if (results.length === 0) {
        toast({
          title: 'No results found',
          description: 'Try different keywords or ensure meetings have been processed.',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      setSearchError(errorMessage);
      toast({
        title: 'Search failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Handle "Ask AI" button click for RAG-based Q&A
   */
  const handleAskAI = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Question required',
        description: 'Please enter a question to ask the AI.',
        variant: 'destructive',
      });
      return;
    }

    setIsAskingAI(true);
    setQaError(null);
    setQaResult(null);

    try {
      const result = await answerMeetingQuestion(searchQuery.trim(), 5);
      setQaResult(result);
      setSourcesExpanded(true);

      toast({
        title: 'AI Response Ready',
        description: 'The AI has analyzed your meetings and generated an answer.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Q&A failed';
      setQaError(errorMessage);
      toast({
        title: 'AI Q&A failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAskingAI(false);
    }
  };

  /**
   * Handle example search click
   */
  const handleExampleClick = (example: string) => {
    setSearchQuery(example);
  };

  /**
   * Get relevance badge color based on score
   */
  const getRelevanceBadgeVariant = (
    relevance: number
  ): 'default' | 'secondary' | 'outline' => {
    if (relevance >= 0.8) return 'default';
    if (relevance >= 0.6) return 'secondary';
    return 'outline';
  };

  /**
   * Format relevance as percentage
   */
  const formatRelevance = (relevance: number): string => {
    return `${Math.round(relevance * 100)}% match`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Smart Search</h1>
          <p className="text-lg text-muted-foreground">
            Find anything across your meetings with AI-powered semantic search
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-6 animate-slide-up">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What would you like to know? Try 'What did Sarah say about the budget?'"
              className="w-full pl-12 pr-4 py-6 text-lg rounded-xl border-2 border-border focus:border-primary"
              disabled={isSearching || isAskingAI}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              type="submit"
              className="flex-1"
              size="lg"
              disabled={isSearching || isAskingAI || !searchQuery.trim()}
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search Meetings
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="flex-1"
              size="lg"
              onClick={handleAskAI}
              disabled={isSearching || isAskingAI || !searchQuery.trim()}
            >
              {isAskingAI ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Asking AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Ask AI
                </>
              )}
            </Button>
          </div>
        </form>

        {/* AI Answer Section */}
        {qaResult && (
          <Card className="mb-8 border-primary/20 bg-primary/5 animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">AI Answer</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {qaResult.answer}
              </p>

              {/* Sources Collapsible */}
              {qaResult.sources.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <Collapsible open={sourcesExpanded} onOpenChange={setSourcesExpanded}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {qaResult.sources.length} Source
                          {qaResult.sources.length > 1 ? 's' : ''}
                        </span>
                        {sourcesExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-3">
                      {qaResult.sources.map((source, index) => (
                        <div
                          key={`${source.meetingId}-${index}`}
                          className="bg-background rounded-lg p-3 border border-border"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              Source {index + 1}
                            </Badge>
                            <Link
                              to={`/meetings/${source.meetingId}`}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              View Meeting
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            "{source.snippet}"
                          </p>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Q&A Error */}
        {qaError && (
          <Card className="mb-8 border-destructive/50 bg-destructive/10 animate-fade-in">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <p>{qaError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {hasSearched && !isSearching && (
          <div className="space-y-4 animate-fade-in">
            {searchResults.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Search Results
                </h2>
                <Badge variant="secondary">
                  {searchResults.length} meeting{searchResults.length > 1 ? 's' : ''} found
                </Badge>
              </div>
            )}

            {searchError && (
              <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <p>{searchError}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {searchResults.length === 0 && !searchError && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No meetings found matching your search.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try different keywords or ensure meetings have been processed with AI.
                  </p>
                </CardContent>
              </Card>
            )}

            {searchResults.map((result, index) => (
              <Card
                key={`${result.meetingId}-${index}`}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <Link to={`/meetings/${result.meetingId}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          {result.meetingTitle}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {result.meetingDate}
                        </CardDescription>
                      </div>
                      <Badge variant={getRelevanceBadgeVariant(result.relevance)}>
                        {formatRelevance(result.relevance)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {result.snippet}
                    </p>
                    <div className="flex items-center gap-1 mt-3 text-primary text-sm">
                      View full meeting
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {/* Example Searches & Tips - Only show when no results */}
        {!hasSearched && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Example Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {EXAMPLE_SEARCHES.map((example, index) => (
                    <li
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors flex items-center gap-2"
                    >
                      <Search className="w-3 h-3" />
                      {example}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Search Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-primary" />
                    Use natural language questions for AI answers
                  </li>
                  <li className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-primary" />
                    Reference people, topics, or decisions
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-primary" />
                    Meetings must be AI-processed to appear in search
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
