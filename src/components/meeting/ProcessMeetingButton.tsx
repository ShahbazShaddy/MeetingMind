import { useState, useCallback, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  RefreshCw,
  FileAudio,
  Brain,
  ListChecks,
  Hash,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';
import { useRealtimeMeetings } from '../../hooks/useRealtimeMeetings';
import { useRealtimeActionItems } from '../../hooks/useRealtimeActionItems';
import { useRealtimeDecisions } from '../../hooks/useRealtimeDecisions';
import { processMeeting } from '../../services/ai.service';
import type { ActionItem, Decision, Meeting } from '../../types/database';

// ============================================
// TYPES
// ============================================

export type ProcessingStage =
  | 'idle'
  | 'starting'
  | 'transcribing'
  | 'extracting'
  | 'topics'
  | 'completed'
  | 'error';

interface ProcessingState {
  stage: ProcessingStage;
  progress: number;
  message: string;
  error?: string;
}

interface ProcessMeetingButtonProps {
  meetingId: string;
  meetingTitle?: string;
  audioUrl?: string | null;
  currentStatus?: string;
  onProcessingComplete?: (result: {
    transcript: string;
    actionItems: ActionItem[];
    decisions: Decision[];
  }) => void;
  onStatusChange?: (meeting: Meeting) => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

// ============================================
// STAGE CONFIGURATION
// ============================================

const STAGE_CONFIG: Record<ProcessingStage, { progress: number; message: string; icon: typeof Sparkles }> = {
  idle: { progress: 0, message: 'Ready to process', icon: Sparkles },
  starting: { progress: 5, message: 'Starting AI processing...', icon: Play },
  transcribing: { progress: 30, message: 'Transcribing audio with AssemblyAI...', icon: FileAudio },
  extracting: { progress: 60, message: 'Extracting insights with Gemini AI...', icon: Brain },
  topics: { progress: 85, message: 'Analyzing topics and generating embeddings...', icon: Hash },
  completed: { progress: 100, message: 'Processing complete!', icon: CheckCircle2 },
  error: { progress: 0, message: 'Processing failed', icon: AlertCircle },
};

// ============================================
// COMPONENT
// ============================================

export function ProcessMeetingButton({
  meetingId,
  meetingTitle = 'Meeting',
  audioUrl,
  currentStatus,
  onProcessingComplete,
  onStatusChange,
  variant = 'default',
  size = 'default',
  className = '',
}: ProcessMeetingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customAudioUrl, setCustomAudioUrl] = useState(audioUrl || '');
  const [processingState, setProcessingState] = useState<ProcessingState>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to process',
  });
  const [result, setResult] = useState<{
    transcript: string;
    actionItems: ActionItem[];
    decisions: Decision[];
  } | null>(null);

  const { toast } = useToast();

  // Update custom URL when prop changes
  useEffect(() => {
    if (audioUrl) {
      setCustomAudioUrl(audioUrl);
    }
  }, [audioUrl]);

  // Realtime subscription for meeting status updates
  useRealtimeMeetings({
    onUpdate: (meeting) => {
      if (meeting.id === meetingId) {
        onStatusChange?.(meeting);
      }
    },
    onMeetingReady: (meeting) => {
      if (meeting.id === meetingId) {
        setProcessingState({
          stage: 'completed',
          progress: 100,
          message: 'Processing complete!',
        });
        toast({
          title: 'Meeting Processed',
          description: `"${meetingTitle}" has been processed successfully.`,
        });
      }
    },
    onMeetingFailed: (meeting) => {
      if (meeting.id === meetingId) {
        setProcessingState({
          stage: 'error',
          progress: 0,
          message: 'Processing failed',
          error: 'Meeting processing failed. Please try again.',
        });
        toast({
          title: 'Processing Failed',
          description: `Failed to process "${meetingTitle}".`,
          variant: 'destructive',
        });
      }
    },
  });

  // Realtime subscription for new action items
  useRealtimeActionItems({
    onInsert: (item) => {
      if (item.meeting_id === meetingId) {
        setResult((prev) =>
          prev
            ? { ...prev, actionItems: [...prev.actionItems, item] }
            : null
        );
      }
    },
  });

  // Realtime subscription for new decisions
  useRealtimeDecisions({
    onInsert: (decision) => {
      if (decision.meeting_id === meetingId) {
        setResult((prev) =>
          prev
            ? { ...prev, decisions: [...prev.decisions, decision] }
            : null
        );
      }
    },
  });

  // Simulate progress updates
  const simulateProgress = useCallback((stage: ProcessingStage) => {
    const config = STAGE_CONFIG[stage];
    setProcessingState({
      stage,
      progress: config.progress,
      message: config.message,
    });
  }, []);

  // Main processing function
  const handleProcess = useCallback(async () => {
    const urlToUse = customAudioUrl.trim();

    if (!urlToUse) {
      toast({
        title: 'Audio URL Required',
        description: 'Please provide an audio or video URL to process.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Start processing
      simulateProgress('starting');
      
      // Simulate stage progression (actual progress is async)
      setTimeout(() => simulateProgress('transcribing'), 1000);
      setTimeout(() => simulateProgress('extracting'), 5000);
      setTimeout(() => simulateProgress('topics'), 10000);

      // Call the actual processing function
      const processingResult = await processMeeting(meetingId, urlToUse);

      // Success
      setResult(processingResult);
      simulateProgress('completed');

      toast({
        title: 'Processing Complete',
        description: `Found ${processingResult.actionItems.length} action items and ${processingResult.decisions.length} decisions.`,
      });

      onProcessingComplete?.(processingResult);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      setProcessingState({
        stage: 'error',
        progress: 0,
        message: 'Processing failed',
        error: errorMessage,
      });

      toast({
        title: 'Processing Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [meetingId, customAudioUrl, simulateProgress, toast, onProcessingComplete]);

  // Reset state
  const handleReset = useCallback(() => {
    setProcessingState({
      stage: 'idle',
      progress: 0,
      message: 'Ready to process',
    });
    setResult(null);
  }, []);

  const isProcessing = ['starting', 'transcribing', 'extracting', 'topics'].includes(
    processingState.stage
  );
  const isComplete = processingState.stage === 'completed';
  const hasError = processingState.stage === 'error';
  const canProcess = currentStatus !== 'processing';

  const StageIcon = STAGE_CONFIG[processingState.stage].icon;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={!canProcess && currentStatus === 'processing'}
        >
          {currentStatus === 'processing' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : currentStatus === 'ready' ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reprocess
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Process with AI
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            AI Meeting Processing
          </DialogTitle>
          <DialogDescription>
            Process "{meetingTitle}" with AI to extract transcripts, action items, and decisions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Audio URL Input */}
          {processingState.stage === 'idle' && (
            <div className="space-y-2">
              <Label htmlFor="audioUrl">Audio/Video URL</Label>
              <Input
                id="audioUrl"
                type="url"
                placeholder="https://example.com/meeting-recording.mp4"
                value={customAudioUrl}
                onChange={(e) => setCustomAudioUrl(e.target.value)}
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Provide a public URL to the meeting recording (MP3, MP4, WAV, etc.)
              </p>
            </div>
          )}

          {/* Processing Progress */}
          {(isProcessing || isComplete || hasError) && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                    ) : isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="font-medium">{processingState.message}</span>
                  </span>
                  <span className="text-muted-foreground">{processingState.progress}%</span>
                </div>
                <Progress value={processingState.progress} className="h-2" />
              </div>

              {/* Stage Indicators */}
              <div className="grid grid-cols-4 gap-2">
                {(['transcribing', 'extracting', 'topics', 'completed'] as ProcessingStage[]).map(
                  (stage) => {
                    const config = STAGE_CONFIG[stage];
                    const Icon = config.icon;
                    const isPast = config.progress < processingState.progress;
                    const isCurrent = processingState.stage === stage;

                    return (
                      <div
                        key={stage}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                          isCurrent
                            ? 'bg-primary-100 text-primary-700'
                            : isPast
                            ? 'bg-green-100 text-green-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs text-center capitalize">
                          {stage === 'completed' ? 'Done' : stage}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Error Message */}
              {hasError && processingState.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{processingState.error}</p>
                </div>
              )}

              {/* Results Summary */}
              {isComplete && result && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                  <h4 className="text-sm font-medium text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Processing Complete
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-green-700">
                      <ListChecks className="w-4 h-4" />
                      <span>{result.actionItems.length} Action Items</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <Brain className="w-4 h-4" />
                      <span>{result.decisions.length} Decisions</span>
                    </div>
                  </div>
                  <p className="text-xs text-green-600">
                    Transcript: {result.transcript.length.toLocaleString()} characters
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {(isComplete || hasError) && (
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {hasError ? 'Try Again' : 'Process Another'}
            </Button>
          )}

          {processingState.stage === 'idle' && (
            <Button
              onClick={handleProcess}
              disabled={!customAudioUrl.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Processing
            </Button>
          )}

          {isComplete && (
            <Button onClick={() => setIsOpen(false)}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// INLINE VARIANT (No Dialog)
// ============================================

interface InlineProcessingProps {
  meetingId: string;
  audioUrl: string;
  onComplete?: (result: {
    transcript: string;
    actionItems: ActionItem[];
    decisions: Decision[];
  }) => void;
  onError?: (error: string) => void;
}

export function InlineProcessingStatus({
  meetingId,
  audioUrl,
  onComplete,
  onError,
}: InlineProcessingProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to process',
  });
  const { toast } = useToast();

  const handleProcess = useCallback(async () => {
    try {
      setProcessingState({ stage: 'starting', progress: 5, message: 'Starting...' });

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProcessingState((prev) => {
          if (prev.progress >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return {
            ...prev,
            progress: Math.min(prev.progress + 10, 90),
            message:
              prev.progress < 30
                ? 'Transcribing audio...'
                : prev.progress < 60
                ? 'Extracting insights...'
                : 'Finalizing...',
          };
        });
      }, 2000);

      const result = await processMeeting(meetingId, audioUrl);

      clearInterval(progressInterval);
      setProcessingState({ stage: 'completed', progress: 100, message: 'Complete!' });

      toast({
        title: 'Processing Complete',
        description: `Found ${result.actionItems.length} action items.`,
      });

      onComplete?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      setProcessingState({ stage: 'error', progress: 0, message: errorMessage, error: errorMessage });
      onError?.(errorMessage);
    }
  }, [meetingId, audioUrl, toast, onComplete, onError]);

  useEffect(() => {
    if (processingState.stage === 'idle' && audioUrl) {
      handleProcess();
    }
  }, [audioUrl, processingState.stage, handleProcess]);

  if (processingState.stage === 'idle') {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
      {processingState.stage === 'error' ? (
        <AlertCircle className="w-5 h-5 text-destructive" />
      ) : processingState.stage === 'completed' ? (
        <CheckCircle2 className="w-5 h-5 text-green-600" />
      ) : (
        <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
      )}
      <div className="flex-1">
        <p className="text-sm font-medium">{processingState.message}</p>
        <Progress value={processingState.progress} className="h-1 mt-1" />
      </div>
      <span className="text-sm text-muted-foreground">{processingState.progress}%</span>
    </div>
  );
}
