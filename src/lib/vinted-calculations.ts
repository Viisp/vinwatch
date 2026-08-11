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

export interface OrderMarginMatch {
  sale: StoredOrder;
  purchase: StoredOrder | null;
  margin: number | null;
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

// Mirrors the matching heuristic in Code.gs's calculerMarges(): a sale and a
// purchase are linked when one title contains the other. There's no shared
// id between a sale and the purchase it came from (Vinted doesn't expose
// one), so this substring match is the best available signal -- same
// tradeoff as the Sheet-side version, just also usable on the site. Each
// purchase is only ever matched to one sale, so a cheap item bought twice
// doesn't get double-counted as the cost basis for two different sales.
//
// `excludedSaleIds` lets a user override a wrong auto-match (e.g. an item
// actually bought off-Vinted that coincidentally shares title words with an
// unrelated Vinted purchase) -- those sales are always reported unmatched.
export function matchOrderMargins(orders: StoredOrder[], excludedSaleIds: ReadonlySet<string> = new Set()): OrderMarginMatch[] {
  const sales = sortOrders(orders.filter((o) => o.orderType === 'sold'), 'date-desc');
  const purchases = orders.filter((o) => o.orderType === 'purchased');
  const usedPurchaseIds = new Set<string>();

  return sales.map((sale) => {
    if (excludedSaleIds.has(sale.id)) return { sale, purchase: null, margin: null };

    const saleTitle = normalizeTitle(sale.title);
    const purchase = purchases.find((p) => {
      if (usedPurchaseIds.has(p.id)) return false;
      const purchaseTitle = normalizeTitle(p.title);
      if (!purchaseTitle) return false;
      return saleTitle.includes(purchaseTitle) || purchaseTitle.includes(saleTitle);
    });

    if (!purchase) return { sale, purchase: null, margin: null };
    usedPurchaseIds.add(purchase.id);
    const margin = (parseFloat(sale.priceAmount) || 0) - (parseFloat(purchase.priceAmount) || 0);
    return { sale, purchase, margin };
  });
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
