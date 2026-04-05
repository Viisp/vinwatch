'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { loadFromSupabase, syncToSupabase } from '@/lib/sync';

/** Handles Supabase ↔ localStorage sync on auth state changes. */
export function SyncProvider() {
  useEffect(() => {
    const supabase = createClient();

    // Load on mount if already logged in
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) loadFromSupabase();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadFromSupabase();
      } else if (event === 'SIGNED_OUT') {
        // Flush any pending writes before clearing, then push a final sync
        // (We don't clear localStorage — user data stays locally on this device)
      } else if (event === 'TOKEN_REFRESHED') {
        // Trigger an immediate sync to catch any writes while offline
        syncToSupabase();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
