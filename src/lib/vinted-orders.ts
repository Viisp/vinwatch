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

export async function deleteOrder(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('vinted_orders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface ManualOrderInput {
  orderType: 'sold' | 'purchased';
  title: string;
  priceAmount: string;
  priceCurrency: string;
  orderDate: string;
  status: string;
  vintedAccountLabel: string | null;
}

export async function addOrder(input: ManualOrderInput): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  // Gmail-synced rows are upserted on (user_id, transaction_id, order_type),
  // with real Vinted transaction ids (always positive). A negative,
  // timestamp-based id keeps manual entries out of that collision space
  // without needing their own separate identity scheme.
  const { error } = await supabase.from('vinted_orders').insert({
    user_id: user.id,
    transaction_id: -Date.now(),
    order_type: input.orderType,
    title: input.title,
    price_amount: input.priceAmount,
    price_currency: input.priceCurrency,
    status: input.status,
    order_date: input.orderDate,
    vinted_account_label: input.vintedAccountLabel,
  });

  if (error) throw new Error(error.message);
}

