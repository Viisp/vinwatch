import { createClient } from './supabase';
import type { StoredOrder } from './vinted-calculations';

export async function getOrders(orderType?: 'sold' | 'purchased'): Promise<StoredOrder[]> {
  const supabase = createClient();
  let query = supabase.from('vinted_orders').select('*').order('order_date', { ascending: false });
  if (orderType) query = query.eq('order_type', orderType);

  const { data, error } = await query;
  if (error) {
    console.error('[getOrders] Supabase query failed:', error.message);
    return [];
  }
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    transactionId: row.transaction_id,
    conversationId: row.conversation_id,
    orderType: row.order_type,
    title: row.title,
    priceAmount: row.price_amount,
    priceCurrency: row.price_currency,
    photoUrl: row.photo_url,
    status: row.status,
    orderDate: row.order_date,
    vintedAccountLabel: row.vinted_account_label,
  }));
}

export interface VintedProfileInfo {
  login: string | null;
  profileUrl: string | null;
  photoUrl: string | null;
}

// Used for the nav bar avatar/pseudo, which only has room for one identity —
// picks whichever linked Vinted account comes back first. For managing all
// linked accounts, see getVintedAccounts below.
export async function getVintedProfile(): Promise<VintedProfileInfo | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('vinted_session')
    .select('vinted_login, vinted_profile_url, vinted_photo_url')
    .eq('user_id', user.id)
    .not('vinted_login', 'is', null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getVintedProfile] Supabase query failed:', error.message);
    return null;
  }
  if (!data || !data.vinted_login) return null;
  return { login: data.vinted_login, profileUrl: data.vinted_profile_url, photoUrl: data.vinted_photo_url };
}

export interface VintedAccount {
  id: string;
  label: string;
  login: string | null;
  profileUrl: string | null;
  photoUrl: string | null;
  lastSyncStatus: string;
  lastSyncAt: string | null;
}

/** All Vinted accounts linked to the current VinWatch user (e.g. one for selling, one for buying). */
export async function getVintedAccounts(): Promise<VintedAccount[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('vinted_session')
    .select('id, label, vinted_login, vinted_profile_url, vinted_photo_url, last_sync_status, last_sync_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: true });

  if (error) {
    console.error('[getVintedAccounts] Supabase query failed:', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    login: row.vinted_login,
    profileUrl: row.vinted_profile_url,
    photoUrl: row.vinted_photo_url,
    lastSyncStatus: row.last_sync_status,
    lastSyncAt: row.last_sync_at,
  }));
}
