export interface VintedOrder {
  transactionId: number;
  title: string;
  priceAmount: string;
  priceCurrency: string;
  photoUrl: string | null;
  status: string;
  date: string;
}

/**
 * Vinted embeds page data as a JSON-escaped string inside
 * self.__next_f.push([1,"...preloadedOrders...\n"]) (React Server Components
 * flight data) rather than exposing it via a separate fetch/XHR call.
 */
export function parseVintedOrders(html: string): VintedOrder[] {
  const match = html.match(/\\"preloadedOrders\\":\{\\"orders\\":(\[[\s\S]*?\])(?:,\\"pagination\\"|\})/);
  if (!match) return [];

  // The captured group is still escaped as it appeared inside the outer
  // JS string literal passed to self.__next_f.push(...): backslash-escaped
  // quotes (\") and unicode escapes (\uXXXX). Unescape it back into plain
  // JSON text before parsing.
  const unescaped = match[1].replace(/\\"/g, '"').replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  let orders: unknown;
  try {
    orders = JSON.parse(unescaped);
  } catch {
    return [];
  }

  if (!Array.isArray(orders)) return [];

  return (orders as Record<string, unknown>[]).map((o) => ({
    transactionId: o.transactionId as number,
    title: o.title as string,
    priceAmount: (o.price as { amount: string }).amount,
    priceCurrency: (o.price as { currencyCode: string }).currencyCode,
    photoUrl: (o.photo as { url?: string } | undefined)?.url ?? null,
    status: o.status as string,
    date: o.date as string,
  }));
}
