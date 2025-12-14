export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          team_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          team_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          team_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      meetings: {
        Row: {
          id: string;
          title: string;
          meeting_date: string;
          duration_minutes: number | null;
          status: string;
          transcript: string | null;
          summary: string | null;
          video_url: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          meeting_date: string;
          duration_minutes?: number | null;
          status?: string;
          transcript?: string | null;
          summary?: string | null;
          video_url?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          meeting_date?: string;
          duration_minutes?: number | null;
          status?: string;
          transcript?: string | null;
          summary?: string | null;
          video_url?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_meetings_created_by";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      meeting_participants: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          talk_time_minutes: number;
          joined_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          talk_time_minutes?: number;
          joined_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          talk_time_minutes?: number;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_participants_meeting";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_participants_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      action_items: {
        Row: {
          id: string;
          meeting_id: string;
          description: string;
          assigned_to: string | null;
          due_date: string | null;
          priority: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          description: string;
          assigned_to?: string | null;
          due_date?: string | null;
          priority?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          description?: string;
          assigned_to?: string | null;
          due_date?: string | null;
          priority?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_action_meeting";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_action_assigned_user";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      decisions: {
        Row: {
          id: string;
          meeting_id: string;
          decision_text: string;
          context: string | null;
          decided_at: string;
          tags: string[] | null;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          decision_text: string;
          context?: string | null;
          decided_at?: string;
          tags?: string[] | null;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          decision_text?: string;
          context?: string | null;
          decided_at?: string;
          tags?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_decisions_meeting";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          }
        ];
      };
      topics: {
        Row: {
          id: string;
          name: string;
          meeting_count: number;
          last_discussed: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          meeting_count?: number;
          last_discussed?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          meeting_count?: number;
          last_discussed?: string | null;
        };
        Relationships: [];
      };
      meeting_topics: {
        Row: {
          meeting_id: string;
          topic_id: string;
        };
        Insert: {
          meeting_id: string;
          topic_id: string;
        };
        Update: {
          meeting_id?: string;
          topic_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_meeting_topics_meeting";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_meeting_topics_topic";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          }
        ];
      };
      meeting_embeddings: {
        Row: {
          id: string;
          meeting_id: string;
          embedding: number[];
          content_chunk: string;
          chunk_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          embedding: number[];
          content_chunk: string;
          chunk_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          embedding?: number[];
          content_chunk?: string;
          chunk_index?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_meeting_embeddings_meeting";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type User = Database['public']['Tables']['users']['Row'];
export type Meeting = Database['public']['Tables']['meetings']['Row'];
export type MeetingParticipant = Database['public']['Tables']['meeting_participants']['Row'];
export type ActionItem = Database['public']['Tables']['action_items']['Row'];
export type Decision = Database['public']['Tables']['decisions']['Row'];
export type Topic = Database['public']['Tables']['topics']['Row'];
export type MeetingEmbedding = Database['public']['Tables']['meeting_embeddings']['Row'];
