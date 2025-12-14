# 🎯 MeetingMind

An intelligent SaaS platform that transforms meeting recordings into actionable insights using AI-powered transcription, analysis, and semantic search.

## Overview

MeetingMind helps teams capture, understand, and act on meeting discussions by providing:

- **AI Transcription** - Convert audio/video recordings to text with AssemblyAI
- **Smart Summaries & Insights** - Generate summaries and key insights with Google Gemini
- **Action Item Tracking** - Automatically extract and track action items from meetings
- **Decision Logging** - Capture and organize meeting decisions
- **Semantic Search** - Search meetings using natural language with RAG-based Q&A
- **Real-time Collaboration** - Live updates across users with Supabase

## Tech Stack

### Frontend
- **React 18** + **TypeScript** - Type-safe UI components
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible component library
- **React Router** - Client-side routing
- **Zustand** - Lightweight state management

### Backend
- **Supabase** - PostgreSQL database, auth, and real-time subscriptions
- **Row Level Security (RLS)** - Fine-grained access control

### AI & Machine Learning
- **AssemblyAI** - High-accuracy audio transcription
- **Google Gemini 1.5** - LLM for summaries, insights, and embeddings
- **text-embedding-004** - Dense vector embeddings for semantic search
- **RAG (Retrieval-Augmented Generation)** - Q&A with source citations

## Project Structure

```
src/
├── components/
│   ├── auth/              # Authentication & route protection
│   ├── dashboard/         # Dashboard widgets & statistics
│   ├── meeting/           # Meeting-specific components
│   ├── landing/           # Landing page sections
│   ├── layout/            # Header & layout components
│   └── ui/                # Reusable shadcn UI components
├── pages/
│   ├── DashboardPage.tsx      # Main dashboard
│   ├── MeetingPage.tsx        # Meeting detail view
│   ├── SearchPage.tsx         # AI search & Q&A
│   ├── LoginPage.tsx          # Authentication
│   ├── SignupPage.tsx         # User registration
│   ├── SettingsPage.tsx       # User settings
│   ├── LandingPage.tsx        # Landing page
│   └── Index.tsx              # Home redirect
├── services/
│   ├── meetings.service.ts    # Meeting CRUD operations
│   ├── actionItems.service.ts # Action item management
│   ├── decisions.service.ts   # Decision logging
│   ├── topics.service.ts      # Topic extraction
│   ├── ai.service.ts          # AI operations (transcription, embeddings)
│   ├── qa.service.ts          # Semantic search & Q&A
│   └── orchestrator.service.ts # AI pipeline orchestration
├── hooks/
│   ├── useAuth.ts             # Authentication hook
│   ├── useRealtimeMeetings.ts # Real-time meeting updates
│   ├── useRealtimeActionItems.ts
│   ├── useRealtimeDecisions.ts
│   ├── use-toast.ts           # Toast notifications
│   └── use-mobile.tsx         # Mobile detection
├── stores/
│   └── authStore.ts           # Zustand auth store
├── types/
│   └── database.ts            # TypeScript database types
├── lib/
│   ├── supabase.ts            # Supabase client
│   └── utils.ts               # Utility functions
├── App.tsx                    # Main app component
└── main.tsx                   # Entry point
```

## Features

### 📊 Dashboard
- Real-time meeting statistics
- Recent meetings overview
- Pending action items
- Key decisions this week
- Trending discussion topics

### 📝 Meeting Management
- Create new meetings with title, date, duration
- Upload audio/video files or paste URLs
- View full meeting transcripts
- Read AI-generated summaries
- Review key insights from discussions

### ✅ Action Items
- Auto-extracted from meeting transcripts
- Assignable to team members
- Priority levels (low, medium, high)
- Due date tracking
- Status management (pending, in progress, completed)
- Real-time updates across team

### 💡 Decision Tracking
- Capture important decisions
- Add context and tags
- Link to source meetings
- Historical decision log
- Easy retrieval and reference

### 🔍 Smart Search
- **Semantic Search** - Find meetings using natural language
- **AI Q&A** - Ask questions about all meetings
- **RAG-Based Answers** - Responses with source citations
- **Relevance Ranking** - Best matches first
- Realtime results

### 🎤 AI Processing
- **Transcription** - Convert audio/video to text (AssemblyAI)
- **Summaries** - Key points from meetings
- **Insights** - Main themes and important discussions
- **Embeddings** - Vector representations for semantic search
- **Topics** - Automatic topic extraction

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account (https://supabase.com)
- AssemblyAI API key (https://www.assemblyai.com)
- Google Generative AI API key (https://ai.google.dev)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ShahbazShaddy/MeetingMind.git
   cd MeetingMind
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_ASSEMBLYAI_API_KEY=your_assemblyai_api_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Initialize the database**
   - Copy the schema from `schema.sql`
   - Create a new Supabase project
   - Run the SQL in the Supabase SQL editor
   - This will create all tables with RLS policies

5. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Database Schema

### Core Tables
- **users** - User profiles and authentication
- **meetings** - Meeting records with transcripts and summaries
- **action_items** - Tasks extracted from meetings
- **decisions** - Important decisions made in meetings
- **topics** - Discussion topics and themes
- **meeting_participants** - Attendee information and talk time
- **meeting_topics** - M:N relationship between meetings and topics
- **meeting_embeddings** - Vector embeddings for semantic search

All tables include Row Level Security (RLS) policies:
- Users can only see their own meetings and related data
- Admins can manage team members
- Real-time subscriptions keep data in sync

## API Reference

### Meetings Service
```typescript
// Create a meeting
const meeting = await createMeeting({
  title: "Q4 Planning",
  meeting_date: "2025-12-15T14:00:00Z",
  duration_minutes: 60
});

// Fetch a meeting with all details
const meeting = await getMeetingById(meetingId);

// Get recent meetings
const meetings = await getRecentMeetings(limit);

// Update meeting title
const updated = await updateMeetingTitle(meetingId, "New Title");
```

### AI Service
```typescript
// Transcribe audio
const transcript = await transcribeMeeting(audioUrl);

// Generate summary and insights
const { summary, insights } = await generateSummaryAndInsights(transcript);

// Create embeddings for semantic search
const embeddings = await createMeetingEmbeddings(
  meetingId,
  transcript,
  chunkSize
);
```

### Q&A Service
```typescript
// Search meetings semantically
const results = await searchMeetings(query, topK);
// Returns: { meetingId, snippet, relevance }[]

// Ask a question about meetings
const { answer, sources } = await answerMeetingQuestion(question, topK);
```

### Orchestrator Service
```typescript
// Complete AI pipeline: transcribe, summarize, extract entities, create embeddings
const result = await processMeetingComplete(
  meetingId,
  audioUrl,
  onProgress // Optional progress callback
);
```

## Authentication

MeetingMind uses **Supabase Auth**:

- Email/password signup and login
- Protected routes with `ProtectedRoute` component
- Token stored in `localStorage`
- Automatic token refresh
- User data in Zustand store

### Session Management
```typescript
// In any component
const { user, login, logout, signup } = useAuthStore();
```

## Real-time Features

MeetingMind uses **Supabase Real-time** subscriptions:

```typescript
// Hook: useRealtimeMeetings
const meetings = useRealtimeMeetings();

// Hook: useRealtimeActionItems
const actionItems = useRealtimeActionItems();

// Hook: useRealtimeDecisions
const decisions = useRealtimeDecisions();
```

Changes made in one session automatically update in all other active sessions.

## Components

### NewMeetingModal
Create a new meeting with title, date/time, duration, and optional audio/video upload or URL.

```tsx
<NewMeetingModal onMeetingCreated={(meeting) => console.log('Created:', meeting)} />
```

### ProcessMeetingButton
Trigger AI processing (transcription, summary, insights, embeddings) with progress tracking.

```tsx
<ProcessMeetingButton
  meetingId={meetingId}
  audioUrl={audioUrl}
  currentStatus={meeting.status}
  onProcessingComplete={() => refetch()}
/>
```

### RecentMeetings, ActionItems, KeyDecisions, TrendingTopics, MeetingStats
Dashboard widgets that display real-time data from Supabase.

### SearchPage
Semantic search with AI Q&A, including relevance ranking and source citations.

## Styling

- **TailwindCSS** - Core styling framework
- **shadcn/ui** - Pre-built, accessible components
- **CSS Variables** - Theme customization in `src/index.css`
- **Dark Mode** - Responsive light/dark theme support

## Error Handling

All services include:
- Try-catch blocks with detailed error messages
- Toast notifications for user feedback
- Validation before API calls
- Graceful fallbacks

## Best Practices

1. **TypeScript** - Full type safety across the codebase
2. **React Hooks** - Functional components with custom hooks
3. **Zustand** - Minimal state management
4. **RLS Policies** - Database-level security
5. **Real-time Updates** - Automatic sync via Supabase subscriptions
6. **Error Handling** - User-friendly error messages
7. **Accessibility** - shadcn/ui components with ARIA labels
8. **Code Splitting** - Lazy-loaded routes with React Router

## Performance

- **Vite** - ~80% faster build time than Webpack
- **Code Splitting** - Route-based lazy loading
- **Real-time Sync** - Efficient WebSocket subscriptions
- **Semantic Caching** - Vector embeddings cached in database
- **Optimized Queries** - Selective field selection with Supabase

## Security

- **Row Level Security** - Database-level access control
- **Authentication** - Supabase Auth with JWT tokens
- **Input Validation** - Client-side validation + server-side checks
- **API Keys** - Environment variables, not exposed in code
- **HTTPS Only** - Enforced in production

## Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Submit a pull request

## Roadmap

- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] Meeting recording playback with transcript sync
- [ ] Custom AI prompt templates
- [ ] Mobile app (React Native)
- [ ] Integration with calendar systems
- [ ] Automated action item reminders
- [ ] Meeting transcription webhooks

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Contact: support@meetingmind.dev
- Documentation: https://docs.meetingmind.dev

## Author

**Shahbaz** - [@ShahbazShaddy](https://github.com/ShahbazShaddy)

---

**MeetingMind** - Transform your meetings into actionable intelligence 🚀
