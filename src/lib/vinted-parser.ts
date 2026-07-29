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
  // quotes (\"). Unescape those back into plain JSON text before parsing;
  // \uXXXX unicode escapes don't need separate handling since they're
  // already valid JSON string escapes that JSON.parse decodes natively.
  const unescaped = match[1].replace(/\\"/g, '"');

  let orders: unknown;
  try {
    orders = JSON.parse(unescaped);
  } catch {
    return [];
  }

  if (!Array.isArray(orders)) return [];

  // Real /my_orders pages contain order states this parser hasn't been
  // exercised against (cancelled, disputed, deleted listings, etc.) where
  // fields can be missing or null. Validate each record and skip malformed
  // ones individually rather than letting one bad order throw inside
  // .map() and silently drop every order on the page.
  const result: VintedOrder[] = [];
  for (const raw of orders as Record<string, unknown>[]) {
    const order = toVintedOrder(raw);
    if (order) result.push(order);
  }
  return result;
}

function toVintedOrder(o: Record<string, unknown>): VintedOrder | null {
  const price = o.price as { amount?: unknown; currencyCode?: unknown } | undefined;

  const transactionId = o.transactionId;
  const title = o.title;
  const priceAmount = price?.amount;
  const priceCurrency = price?.currencyCode;
  const status = o.status;
  const date = o.date;

  if (
    typeof transactionId !== 'number' ||
    typeof title !== 'string' ||
    typeof priceAmount !== 'string' ||
    typeof priceCurrency !== 'string' ||
    typeof status !== 'string' ||
    typeof date !== 'string'
  ) {
    return null;
  }

  const photo = o.photo as { url?: unknown } | undefined;
  const photoUrl = typeof photo?.url === 'string' ? photo.url : null;

  return { transactionId, title, priceAmount, priceCurrency, photoUrl, status, date };
}
