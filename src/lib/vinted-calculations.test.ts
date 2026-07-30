import { describe, it, expect } from 'vitest';
import { computeOrdersSummary, vintedOrderUrl, type StoredOrder } from './vinted-calculations';

function order(overrides: Partial<StoredOrder>): StoredOrder {
  return {
    id: '1',
    transactionId: 1,
    conversationId: null,
    orderType: 'sold',
    title: 'Item',
    priceAmount: '10.0',
    priceCurrency: 'EUR',
    photoUrl: null,
    status: 'ok',
    orderDate: '2026-07-01T00:00:00+02:00',
    ...overrides,
  };
}

describe('computeOrdersSummary', () => {
  it('sums sold and purchased totals separately and computes the delta', () => {
    const orders = [
      order({ orderType: 'sold', priceAmount: '20.0' }),
      order({ orderType: 'sold', priceAmount: '15.5' }),
      order({ orderType: 'purchased', priceAmount: '8.0' }),
    ];

    const summary = computeOrdersSummary(orders);

    expect(summary.totalSold).toBe(35.5);
    expect(summary.totalPurchased).toBe(8.0);
    expect(summary.delta).toBe(27.5);
    expect(summary.soldCount).toBe(2);
    expect(summary.purchasedCount).toBe(1);
  });

  it('returns zeroes for an empty list', () => {
    const summary = computeOrdersSummary([]);
    expect(summary).toEqual({ totalSold: 0, totalPurchased: 0, delta: 0, soldCount: 0, purchasedCount: 0 });
  });
});

describe('vintedOrderUrl', () => {
  it('builds the conversation link when a conversationId is present', () => {
    expect(vintedOrderUrl({ conversationId: 23996837200 })).toBe('https://www.vinted.fr/inbox/23996837200');
  });

  it('returns null when there is no conversationId', () => {
    expect(vintedOrderUrl({ conversationId: null })).toBeNull();
  });
});
