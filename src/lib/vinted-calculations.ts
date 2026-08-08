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
  vintedAccountLabel: string | null;
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

export type SortOption = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date-desc', label: 'Plus récent' },
  { value: 'date-asc', label: 'Plus ancien' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'price-asc', label: 'Prix croissant' },
];

export function sortOrders(orders: StoredOrder[], sortBy: SortOption): StoredOrder[] {
  const sorted = [...orders];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'date-asc':
        return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
      case 'price-desc':
        return (parseFloat(b.priceAmount) || 0) - (parseFloat(a.priceAmount) || 0);
      case 'price-asc':
        return (parseFloat(a.priceAmount) || 0) - (parseFloat(b.priceAmount) || 0);
      case 'date-desc':
      default:
        return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    }
  });
  return sorted;
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
