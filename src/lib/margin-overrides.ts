import { createClient } from './supabase';

// Sale ids the user has manually marked as "not actually linked to any of
// my Vinted purchases" (e.g. bought elsewhere, but a Vinted purchase
// happened to share enough title words to get auto-matched anyway).
export async function getUnmatchedSaleIds(): Promise<string[]> {
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
    console.error('[getUnmatchedSaleIds] Supabase query failed:', error.message);
    return [];
  }
  const ids = data?.data?.unmatchedSaleIds;
  return Array.isArray(ids) ? ids : [];
}

export async function saveUnmatchedSaleIds(ids: string[]): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  // user_data.data is a shared jsonb blob — merge instead of overwrite so
  // other features storing their own key here don't get clobbered.
  const { data: existing } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle();

  const { error } = await supabase
    .from('user_data')
    .upsert(
      { user_id: user.id, data: { ...(existing?.data ?? {}), unmatchedSaleIds: ids } },
      { onConflict: 'user_id' }
    );

  if (error) throw new Error(error.message);
}
