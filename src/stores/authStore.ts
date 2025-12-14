import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '../types/database';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  initialize: () => void;
}

function mapSupabaseUser(user: SupabaseUser, profile?: User): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    full_name: profile?.full_name || user.user_metadata?.full_name || user.email!.split('@')[0],
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
  };
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  login: (user) => set({ user, loading: false }),

  logout: () => {
    supabase.auth.signOut();
    set({ user: null });
  },

  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    let mounted = true;

    // Check existing session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (mounted && session?.user) {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      const authUser = mapSupabaseUser(session.user, profile || undefined);
      set({ user: authUser, loading: false });
    }
    
    if (mounted && !session) {
      set({ loading: false });
    }

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          const authUser = mapSupabaseUser(session.user, profile || undefined);
          set({ user: authUser, loading: false });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, loading: false });
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          const authUser = mapSupabaseUser(session.user, profile || undefined);
          set({ user: authUser });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  },
}));
