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
    orderType: row.order_type,
    title: row.title,
    priceAmount: row.price_amount,
    priceCurrency: row.price_currency,
    photoUrl: row.photo_url,
    status: row.status,
    orderDate: row.order_date,
  }));
}

export async function getSyncStatus(): Promise<{ status: string; lastSyncAt: string | null } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('vinted_session')
    .select('last_sync_status, last_sync_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[getSyncStatus] Supabase query failed:', error.message);
    return null;
  }
  if (!data) return null;
  return { status: data.last_sync_status, lastSyncAt: data.last_sync_at };
}
