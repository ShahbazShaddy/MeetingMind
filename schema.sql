-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    team_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_users
ON public.users
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY authenticated_insert_own_user
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY authenticated_update_own_user
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- ============================================
-- MEETINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    meeting_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'processing',
    transcript TEXT,
    summary TEXT,
    video_url TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_meetings_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.users(id)
        ON DELETE CASCADE
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_meetings
ON public.meetings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY authenticated_insert_meetings
ON public.meetings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY authenticated_update_own_meetings
ON public.meetings
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY authenticated_delete_own_meetings
ON public.meetings
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- ============================================
-- TOPICS
-- ============================================
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    meeting_count INTEGER DEFAULT 0,
    last_discussed TIMESTAMPTZ
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_topics
ON public.topics
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY authenticated_insert_topics
ON public.topics
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- MEETING TOPICS (M:N)
-- ============================================
CREATE TABLE IF NOT EXISTS public.meeting_topics (
    meeting_id UUID NOT NULL,
    topic_id UUID NOT NULL,

    PRIMARY KEY (meeting_id, topic_id),

    CONSTRAINT fk_meeting_topics_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES public.meetings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_meeting_topics_topic
        FOREIGN KEY (topic_id)
        REFERENCES public.topics(id)
        ON DELETE CASCADE
);

ALTER TABLE public.meeting_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_meeting_topics
ON public.meeting_topics
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY authenticated_insert_meeting_topics
ON public.meeting_topics
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM meetings
        WHERE meetings.id = meeting_topics.meeting_id
          AND meetings.created_by = auth.uid()
    )
);

-- ============================================
-- MEETING PARTICIPANTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.meeting_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL,
    user_id UUID NOT NULL,
    talk_time_minutes INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_participants_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES public.meetings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_participants_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_meeting_user UNIQUE (meeting_id, user_id)
);

ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_participants
ON public.meeting_participants
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY authenticated_insert_participants
ON public.meeting_participants
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM meetings
        WHERE meetings.id = meeting_participants.meeting_id
          AND meetings.created_by = auth.uid()
    )
);

CREATE POLICY authenticated_delete_participants
ON public.meeting_participants
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM meetings
        WHERE meetings.id = meeting_participants.meeting_id
          AND meetings.created_by = auth.uid()
    )
);

-- ============================================
-- ACTION ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL,
    description TEXT NOT NULL,
    assigned_to UUID,
    due_date DATE,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_action_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES public.meetings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_action_assigned_user
        FOREIGN KEY (assigned_to)
        REFERENCES public.users(id)
        ON DELETE SET NULL
);

ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_action_items
ON public.action_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY authenticated_insert_action_items
ON public.action_items
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM meetings
        WHERE meetings.id = action_items.meeting_id
          AND meetings.created_by = auth.uid()
    )
);

CREATE POLICY authenticated_update_action_items
ON public.action_items
FOR UPDATE
TO authenticated
USING (
    auth.uid() = assigned_to
    OR EXISTS (
        SELECT 1
        FROM meetings
        WHERE meetings.id = action_items.meeting_id
          AND meetings.created_by = auth.uid()
    )
);

CREATE POLICY authenticated_delete_action_items
ON public.action_items
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM meetings
        WHERE meetings.id = action_items.meeting_id
          AND meetings.created_by = auth.uid()
    )
);

-- ============================================
-- DECISIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL,
    decision_text TEXT NOT NULL,
    context TEXT,
    decided_at TIMESTAMPTZ DEFAULT now(),
    tags TEXT[],

    CONSTRAINT fk_decisions_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES public.meetings(id)
        ON DELETE CASCADE
);

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_decisions
ON public.decisions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY authenticated_insert_decisions
ON public.decisions
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM meetings
        WHERE meetings.id = decisions.meeting_id
          AND meetings.created_by = auth.uid()
    )
);

CREATE POLICY authenticated_delete_decisions
ON public.decisions
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM meetings
        WHERE meetings.id = decisions.meeting_id
          AND meetings.created_by = auth.uid()
    )
);

-- ============================================
-- MEETING EMBEDDINGS (Vector Search)
-- ============================================
CREATE TABLE IF NOT EXISTS public.meeting_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL,
    embedding FLOAT8[] NOT NULL,
    content_chunk TEXT NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_meeting_embeddings_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES public.meetings(id)
        ON DELETE CASCADE
);

ALTER TABLE public.meeting_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_embeddings
ON public.meeting_embeddings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY authenticated_insert_embeddings
ON public.meeting_embeddings
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM meetings
        WHERE meetings.id = meeting_embeddings.meeting_id
          AND meetings.created_by = auth.uid()
    )
);

CREATE POLICY authenticated_delete_embeddings
ON public.meeting_embeddings
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM meetings
        WHERE meetings.id = meeting_embeddings.meeting_id
          AND meetings.created_by = auth.uid()
    )
);

-- Index for faster meeting_id lookups
CREATE INDEX IF NOT EXISTS idx_meeting_embeddings_meeting_id
ON public.meeting_embeddings(meeting_id);
