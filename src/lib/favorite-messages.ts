import { createClient } from './supabase';

export interface FavoriteMessage {
  id: string;
  label: string;
  content: string;
}

export async function getFavoriteMessages(): Promise<FavoriteMessage[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[getFavoriteMessages] Supabase query failed:', error.message);
    return [];
  }
  const messages = data?.data?.favoriteMessages;
  return Array.isArray(messages) ? messages : [];
}

export async function saveFavoriteMessages(messages: FavoriteMessage[]): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  // user_data.data is a shared jsonb blob — merge instead of overwrite so a
  // future feature storing its own key here doesn't get clobbered.
  const { data: existing } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle();

  const { error } = await supabase
    .from('user_data')
    .upsert(
      { user_id: user.id, data: { ...(existing?.data ?? {}), favoriteMessages: messages } },
      { onConflict: 'user_id' }
    );

  if (error) throw new Error(error.message);
}
