'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { getOrders } from '@/lib/vinted-orders';
import type { StoredOrder } from '@/lib/vinted-calculations';
import { ShoppingBag } from 'lucide-react';

function formatPrice(order: StoredOrder): string {
  return `${order.priceAmount} ${order.priceCurrency}`;
}

export function AchatsClient() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders('purchased').then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-[#00c896]" />
        Achats ({orders.length})
      </h1>

      {loading ? (
        <p className="text-slate-500 text-sm">Chargement…</p>
      ) : orders.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucun achat synchronisé pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="bg-[#1a2d42]/80 border-[#243552]">
              <CardContent className="flex items-center gap-4 py-4">
                {order.photoUrl ? (
                  <Image
                    src={order.photoUrl}
                    alt={order.title}
                    width={56}
                    height={56}
                    className="rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-[56px] h-[56px] rounded-lg bg-[#243552] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-slate-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{order.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(order.orderDate).toLocaleDateString('fr-FR')} · {order.status}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-400 shrink-0">-{formatPrice(order)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
