import { useState, useRef } from 'react';
import { Loader2, Plus, Calendar, Clock, Link as LinkIcon, Upload, X, FileAudio, FileVideo } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { createMeeting, CreateMeetingPayload } from '../../services/meetings.service';
import { Meeting } from '../../types/database';

/**
 * Props for NewMeetingModal component
 */
interface NewMeetingModalProps {
  /** Callback fired after successful meeting creation */
  onMeetingCreated?: (meeting: Meeting) => void;
  /** Custom trigger button (optional - defaults to "+ New Meeting" button) */
  trigger?: React.ReactNode;
}

/**
 * Media input type - URL or file upload
 */
type MediaInputType = 'url' | 'upload';

/**
 * Form state for new meeting
 */
interface NewMeetingFormState {
  title: string;
  meetingDate: string;
  durationMinutes: number;
  audioVideoUrl: string;
  mediaFile: File | null;
  mediaInputType: MediaInputType;
}

/**
 * Form validation errors
 */
interface FormErrors {
  title?: string;
  meetingDate?: string;
  durationMinutes?: string;
  mediaFile?: string;
}

/**
 * Accepted file types for meeting recordings
 */
const ACCEPTED_FILE_TYPES = {
  'audio/mp3': ['.mp3'],
  'audio/mpeg': ['.mp3', '.mpeg'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  'audio/ogg': ['.ogg'],
  'audio/m4a': ['.m4a'],
  'audio/x-m4a': ['.m4a'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
};

/**
 * Maximum file size in bytes (500MB)
 */
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get default datetime value (current time rounded to next 15 minutes)
 */
function getDefaultDateTime(): string {
  const now = new Date();
  const minutes = Math.ceil(now.getMinutes() / 15) * 15;
  now.setMinutes(minutes);
  now.setSeconds(0);
  now.setMilliseconds(0);

  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${mins}`;
}

/**
 * NewMeetingModal Component
 *
 * A modal dialog for creating new meetings with form validation.
 * Includes inputs for title, date/time, duration, and optional audio/video URL.
 *
 * @example
 * <NewMeetingModal onMeetingCreated={(m) => console.log('Created:', m)} />
 *
 * @example
 * // With custom trigger
 * <NewMeetingModal trigger={<Button variant="outline">Add</Button>} />
 */
export function NewMeetingModal({ onMeetingCreated, trigger }: NewMeetingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState<NewMeetingFormState>({
    title: '',
    meetingDate: getDefaultDateTime(),
    durationMinutes: 30,
    audioVideoUrl: '',
    mediaFile: null,
    mediaInputType: 'upload',
  });

  const { toast } = useToast();

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormState({
      title: '',
      meetingDate: getDefaultDateTime(),
      durationMinutes: 30,
      audioVideoUrl: '',
      mediaFile: null,
      mediaInputType: 'upload',
    });
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle modal open state change
   */
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      resetForm();
    }
  };

  /**
   * Update form field
   */
  const updateField = <K extends keyof NewMeetingFormState>(
    field: K,
    value: NewMeetingFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isValidType = Object.keys(ACCEPTED_FILE_TYPES).includes(file.type);
    if (!isValidType) {
      setErrors((prev) => ({
        ...prev,
        mediaFile: 'Invalid file type. Please upload an audio or video file (MP3, WAV, MP4, WebM, etc.)',
      }));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        mediaFile: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`,
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, mediaFile: file }));
    setErrors((prev) => ({ ...prev, mediaFile: undefined }));
  };

  /**
   * Remove selected file
   */
  const handleRemoveFile = () => {
    setFormState((prev) => ({ ...prev, mediaFile: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle media input type change
   */
  const handleMediaTabChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      mediaInputType: value as MediaInputType,
      // Clear the other input when switching
      audioVideoUrl: value === 'upload' ? '' : prev.audioVideoUrl,
      mediaFile: value === 'url' ? null : prev.mediaFile,
    }));
    setErrors((prev) => ({ ...prev, mediaFile: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Get file icon based on type
   */
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) {
      return <FileVideo className="w-5 h-5 text-blue-500" />;
    }
    return <FileAudio className="w-5 h-5 text-green-500" />;
  };

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Title validation
    if (!formState.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formState.title.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters';
    }

    // Date validation
    if (!formState.meetingDate) {
      newErrors.meetingDate = 'Date and time is required';
    }

    // Duration validation
    if (!formState.durationMinutes || formState.durationMinutes <= 0) {
      newErrors.durationMinutes = 'Duration must be greater than 0';
    } else if (formState.durationMinutes > 480) {
      newErrors.durationMinutes = 'Duration cannot exceed 8 hours (480 minutes)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert datetime-local to ISO string
      const meetingDateISO = new Date(formState.meetingDate).toISOString();

      const payload: CreateMeetingPayload = {
        title: formState.title.trim(),
        meeting_date: meetingDateISO,
        duration_minutes: formState.durationMinutes,
      };

      const newMeeting = await createMeeting(payload);

      toast({
        title: 'Meeting Created',
        description: `"${newMeeting.title}" has been created successfully.`,
      });

      // Call callback if provided
      onMeetingCreated?.(newMeeting);

      // Close modal
      setIsOpen(false);
      resetForm();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create meeting';

      toast({
        title: 'Error Creating Meeting',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Meeting
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Meeting</DialogTitle>
          <DialogDescription>
            Add a new meeting to your workspace. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Meeting Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., Q4 Planning Session"
              value={formState.title}
              onChange={(e) => updateField('title', e.target.value)}
              disabled={isSubmitting}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Date & Time Field */}
          <div className="space-y-2">
            <Label htmlFor="meetingDate" className="text-sm font-medium">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date & Time <span className="text-destructive">*</span>
              </span>
            </Label>
            <Input
              id="meetingDate"
              type="datetime-local"
              value={formState.meetingDate}
              onChange={(e) => updateField('meetingDate', e.target.value)}
              disabled={isSubmitting}
              className={errors.meetingDate ? 'border-destructive' : ''}
            />
            {errors.meetingDate && (
              <p className="text-xs text-destructive">{errors.meetingDate}</p>
            )}
          </div>

          {/* Duration Field */}
          <div className="space-y-2">
            <Label htmlFor="durationMinutes" className="text-sm font-medium">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration (minutes) <span className="text-destructive">*</span>
              </span>
            </Label>
            <Input
              id="durationMinutes"
              type="number"
              min={1}
              max={480}
              placeholder="30"
              value={formState.durationMinutes}
              onChange={(e) =>
                updateField('durationMinutes', parseInt(e.target.value, 10) || 0)
              }
              disabled={isSubmitting}
              className={errors.durationMinutes ? 'border-destructive' : ''}
            />
            {errors.durationMinutes && (
              <p className="text-xs text-destructive">{errors.durationMinutes}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter duration in minutes (1-480)
            </p>
          </div>

          {/* Audio/Video Input - Tabs for URL or Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Meeting Recording{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>

            <Tabs
              value={formState.mediaInputType}
              onValueChange={handleMediaTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Paste URL
                </TabsTrigger>
              </TabsList>

              {/* File Upload Tab */}
              <TabsContent value="upload" className="mt-3">
                {formState.mediaFile ? (
                  // Selected file display
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                    {getFileIcon(formState.mediaFile)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {formState.mediaFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(formState.mediaFile.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={handleRemoveFile}
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  // File upload dropzone
                  <div
                    className={`
                      border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                      transition-colors hover:border-primary/50 hover:bg-muted/30
                      ${errors.mediaFile ? 'border-destructive' : 'border-border'}
                    `}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MP3, WAV, MP4, WebM, MOV (max {formatFileSize(MAX_FILE_SIZE)})
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isSubmitting}
                />
                {errors.mediaFile && (
                  <p className="text-xs text-destructive mt-1">{errors.mediaFile}</p>
                )}
              </TabsContent>

              {/* URL Tab */}
              <TabsContent value="url" className="mt-3">
                <Input
                  id="audioVideoUrl"
                  type="url"
                  placeholder="https://example.com/meeting-recording.mp4"
                  value={formState.audioVideoUrl}
                  onChange={(e) => updateField('audioVideoUrl', e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste a direct link to the recording file
                </p>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground">
              Upload or link a meeting recording for AI transcription and analysis
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
