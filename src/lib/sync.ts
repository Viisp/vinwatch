import { createClient } from './supabase';

const SYNC_KEYS = [
  'depenzo_expenses',
  'depenzo_budget',
  'depenzo_last_pret',
  'depenzo_custom_categories',
  'depenzo_deleted_categories',
  'depenzo_notes',
  'depenzo_injected_months',
  'depenzo_goals',
  'depenzo_profile',
] as const;

function readAllLocal(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of SYNC_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  }
  return data;
}

function writeAllLocal(data: Record<string, unknown>): void {
  for (const key of SYNC_KEYS) {
    if (key in data && data[key] !== undefined) {
      localStorage.setItem(key, JSON.stringify(data[key]));
    }
  }
}

/** Load data from Supabase into localStorage. Called after sign-in. */
export async function loadFromSupabase(): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return;
    writeAllLocal(data.data as Record<string, unknown>);
  } catch {
    // Silently fail — localStorage still works
  }
}

/** Push current localStorage data to Supabase. */
export async function syncToSupabase(): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = readAllLocal();
    await supabase.from('user_data').upsert(
      { user_id: user.id, data: payload },
      { onConflict: 'user_id' }
    );
  } catch {
    // Silently fail
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced sync — called after every localStorage write. */
export function triggerSync(): void {
  if (typeof window === 'undefined') return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncToSupabase();
    syncTimer = null;
  }, 2000);
}
