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

