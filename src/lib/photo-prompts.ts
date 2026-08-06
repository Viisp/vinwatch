import { createClient } from './supabase';
import type { PromptCategory } from '@/data/photo-prompts';

export async function getPhotoPromptCategories(): Promise<PromptCategory[] | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[getPhotoPromptCategories] Supabase query failed:', error.message);
    return null;
  }
  const categories = data?.data?.photoPromptCategories;
  // null (not an empty array) tells the caller "user has never saved
  // anything yet" so it can fall back to the built-in defaults — an empty
  // array is a valid, deliberate "user deleted everything" state.
  return Array.isArray(categories) ? categories : null;
}

export async function savePhotoPromptCategories(categories: PromptCategory[]): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  // user_data.data is a shared jsonb blob — merge instead of overwrite so
  // other features storing their own key here (e.g. favoriteMessages)
  // don't get clobbered.
  const { data: existing } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle();

  const { error } = await supabase
    .from('user_data')
    .upsert(
      { user_id: user.id, data: { ...(existing?.data ?? {}), photoPromptCategories: categories } },
      { onConflict: 'user_id' }
    );

  if (error) throw new Error(error.message);
}
