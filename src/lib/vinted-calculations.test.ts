import { describe, it, expect } from 'vitest';
import { computeOrdersSummary, matchOrderMargins, vintedOrderUrl, type StoredOrder } from './vinted-calculations';

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
    vintedAccountLabel: null,
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

describe('matchOrderMargins', () => {
  it('links a sale to a purchase when one title contains the other', () => {
    const orders = [
      order({ id: 's1', orderType: 'sold', title: 'T-shirt Ralph Lauren rouge M', priceAmount: '20.0' }),
      order({ id: 'a1', orderType: 'purchased', title: 'Ralph Lauren', priceAmount: '8.0' }),
    ];

    const [match] = matchOrderMargins(orders);

    expect(match.sale.id).toBe('s1');
    expect(match.purchase?.id).toBe('a1');
    expect(match.margin).toBe(12.0);
  });

  it('leaves the margin null when no purchase title matches', () => {
    const orders = [
      order({ id: 's1', orderType: 'sold', title: 'Sweat Nike', priceAmount: '20.0' }),
      order({ id: 'a1', orderType: 'purchased', title: 'Casquette Lacoste', priceAmount: '5.0' }),
    ];

    const [match] = matchOrderMargins(orders);

    expect(match.purchase).toBeNull();
    expect(match.margin).toBeNull();
  });

  it('never matches the same purchase to two different sales', () => {
    const orders = [
      order({ id: 's1', orderType: 'sold', title: 'Carhartt', priceAmount: '20.0', orderDate: '2026-07-02T00:00:00+02:00' }),
      order({ id: 's2', orderType: 'sold', title: 'Carhartt', priceAmount: '15.0', orderDate: '2026-07-01T00:00:00+02:00' }),
      order({ id: 'a1', orderType: 'purchased', title: 'Carhartt', priceAmount: '5.0' }),
    ];

    const matches = matchOrderMargins(orders);
    const matchedPurchaseIds = matches.filter((m) => m.purchase).map((m) => m.purchase!.id);

    expect(matchedPurchaseIds).toEqual(['a1']);
    expect(matches.filter((m) => m.purchase === null)).toHaveLength(1);
  });
});
