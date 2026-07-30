export interface StoredOrder {
  id: string;
  transactionId: number;
  conversationId: number | null;
  orderType: 'sold' | 'purchased';
  title: string;
  priceAmount: string;
  priceCurrency: string;
  photoUrl: string | null;
  status: string;
  orderDate: string;
}

export interface OrdersSummary {
  totalSold: number;
  totalPurchased: number;
  delta: number;
  soldCount: number;
  purchasedCount: number;
}

/** Link to the Vinted conversation thread for this order, or null if we never captured one. */
export function vintedOrderUrl(order: Pick<StoredOrder, 'conversationId'>): string | null {
  return order.conversationId ? `https://www.vinted.fr/inbox/${order.conversationId}` : null;
}

export function computeOrdersSummary(orders: StoredOrder[]): OrdersSummary {
  let totalSold = 0;
  let totalPurchased = 0;
  let soldCount = 0;
  let purchasedCount = 0;

  for (const o of orders) {
    const amount = parseFloat(o.priceAmount) || 0;
    if (o.orderType === 'sold') {
      totalSold += amount;
      soldCount += 1;
    } else {
      totalPurchased += amount;
      purchasedCount += 1;
    }
  }

  return {
    totalSold,
    totalPurchased,
    delta: totalSold - totalPurchased,
    soldCount,
    purchasedCount,
  };
}
