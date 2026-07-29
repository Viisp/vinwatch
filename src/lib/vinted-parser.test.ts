import { describe, it, expect } from 'vitest';
import { parseVintedOrders, parseVintedProfile } from './vinted-parser';

const SAMPLE_HTML = `<html><body>
<script>self.__next_f.push([1,"2a:[\\"$\\",\\"$La4\\",null,{\\"orderStatus\\":\\"in_progress\\",\\"orderType\\":\\"sold\\",\\"preloadedOrders\\":{\\"orders\\":[{\\"transactionId\\":21200090946,\\"conversationId\\":23996837200,\\"date\\":\\"2026-07-28T11:24:05+02:00\\",\\"photo\\":{\\"url\\":\\"https://images1.vinted.net/photo1.jpg\\"},\\"price\\":{\\"amount\\":\\"20.0\\",\\"currencyCode\\":\\"EUR\\"},\\"status\\":\\"Bordereau envoy\\u00e9 au vendeur\\",\\"title\\":\\"Maillot Adidas\\",\\"transactionUserStatus\\":\\"needs_action\\"},{\\"transactionId\\":21193475575,\\"conversationId\\":23990011679,\\"date\\":\\"2026-07-28T08:29:26+02:00\\",\\"photo\\":{\\"url\\":\\"https://images1.vinted.net/photo2.jpg\\"},\\"price\\":{\\"amount\\":\\"10.0\\",\\"currencyCode\\":\\"EUR\\"},\\"status\\":\\"Bordereau envoy\\u00e9 au vendeur\\",\\"title\\":\\"Short jean\\",\\"transactionUserStatus\\":\\"needs_action\\"}],\\"pagination\\":{\\"currentPage\\":1,\\"totalPages\\":1,\\"totalEntries\\":2,\\"perPage\\":20,\\"time\\":1785267196},\\"ordersNeedActionCount\\":2},\\"defaultBoughtStatus\\":\\"in_progress\\"}]\\n"])</script>
</body></html>`;

describe('parseVintedOrders', () => {
  it('extracts all orders with the expected fields', () => {
    const orders = parseVintedOrders(SAMPLE_HTML);

    expect(orders).toHaveLength(2);
    expect(orders[0]).toEqual({
      transactionId: 21200090946,
      title: 'Maillot Adidas',
      priceAmount: '20.0',
      priceCurrency: 'EUR',
      photoUrl: 'https://images1.vinted.net/photo1.jpg',
      status: 'Bordereau envoyé au vendeur',
      date: '2026-07-28T11:24:05+02:00',
    });
    expect(orders[1].transactionId).toBe(21193475575);
  });

  it('returns an empty array when no preloadedOrders block is present', () => {
    const orders = parseVintedOrders('<html><body>Rien ici</body></html>');
    expect(orders).toEqual([]);
  });

  it('returns an empty array when the orders list itself is empty', () => {
    const html = `<script>self.__next_f.push([1,"x:{\\"preloadedOrders\\":{\\"orders\\":[]}}"])</script>`;
    expect(parseVintedOrders(html)).toEqual([]);
  });

  it('skips a malformed order (missing price) without dropping the others', () => {
    const html = `<script>self.__next_f.push([1,"x:{\\"preloadedOrders\\":{\\"orders\\":[{\\"transactionId\\":1,\\"date\\":\\"2026-07-28T11:24:05+02:00\\",\\"status\\":\\"cancelled\\",\\"title\\":\\"Broken order\\"},{\\"transactionId\\":2,\\"conversationId\\":9,\\"date\\":\\"2026-07-28T08:29:26+02:00\\",\\"photo\\":{\\"url\\":\\"https://images1.vinted.net/photo2.jpg\\"},\\"price\\":{\\"amount\\":\\"10.0\\",\\"currencyCode\\":\\"EUR\\"},\\"status\\":\\"Bordereau envoy\\u00e9 au vendeur\\",\\"title\\":\\"Short jean\\"}],\\"pagination\\":{}}}"])</script>`;

    const orders = parseVintedOrders(html);

    expect(orders).toHaveLength(1);
    expect(orders[0].transactionId).toBe(2);
  });

  it('treats a missing photo as photoUrl: null rather than skipping the order', () => {
    const html = `<script>self.__next_f.push([1,"x:{\\"preloadedOrders\\":{\\"orders\\":[{\\"transactionId\\":3,\\"date\\":\\"2026-07-28T08:29:26+02:00\\",\\"price\\":{\\"amount\\":\\"5.0\\",\\"currencyCode\\":\\"EUR\\"},\\"status\\":\\"needs_action\\",\\"title\\":\\"No photo\\"}],\\"pagination\\":{}}}"])</script>`;

    const orders = parseVintedOrders(html);

    expect(orders).toHaveLength(1);
    expect(orders[0].photoUrl).toBeNull();
  });
});

describe('parseVintedProfile', () => {
  it('extracts login, profile URL, and photo URL', () => {
    const html = `<script>self.__next_f.push([1,"2a:{\\"initialUserState\\":{\\"user\\":{\\"id\\":33864781,\\"login\\":\\"viiisp\\",\\"profile_url\\":\\"https://www.vinted.fr/member/33864781-viiisp\\",\\"business\\":false,\\"photo\\":{\\"id\\":323923880,\\"width\\":420,\\"url\\":\\"https://images1.vinted.net/t/photo.webp\\"}}}}"])</script>`;

    expect(parseVintedProfile(html)).toEqual({
      login: 'viiisp',
      profileUrl: 'https://www.vinted.fr/member/33864781-viiisp',
      photoUrl: 'https://images1.vinted.net/t/photo.webp',
    });
  });

  it('returns null when initialUserState is not present', () => {
    expect(parseVintedProfile('<html><body>Rien ici</body></html>')).toBeNull();
  });

  it('returns login with null photo/profile URL when those fields are missing', () => {
    const html = `<script>self.__next_f.push([1,"2a:{\\"initialUserState\\":{\\"user\\":{\\"id\\":1,\\"login\\":\\"soloname\\"}}}"])</script>`;

    expect(parseVintedProfile(html)).toEqual({
      login: 'soloname',
      profileUrl: null,
      photoUrl: null,
    });
  });
});
