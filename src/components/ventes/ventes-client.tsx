'use client';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedBorderButton as Button } from '@/components/ui/animated-border-button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getOrders, deleteOrder } from '@/lib/vinted-orders';
import { vintedOrderUrl, sortOrders, SORT_OPTIONS, type SortOption, type StoredOrder } from '@/lib/vinted-calculations';
import { PackageCheck, Trash2 } from 'lucide-react';
import SearchComponent from '@/components/ui/animated-glowing-search-bar';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 10;

function formatPrice(order: StoredOrder): string {
  return `${order.priceAmount} ${order.priceCurrency}`;
}

export function VentesClient() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [page, setPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    getOrders('sold').then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    try {
      await deleteOrder(id);
    } catch (err) {
      console.error('[VentesClient] delete failed:', err);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q ? orders.filter((o) => o.title.toLowerCase().includes(q)) : orders;
    return sortOrders(base, sortBy);
  }, [orders, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  function handleSearchChange(v: string) {
    setSearch(v);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-[#00c896]" />
          Ventes ({filtered.length})
        </h1>
        {orders.length > 0 && (
          <div className="flex items-center gap-2">
            <SearchComponent value={search} onChange={handleSearchChange} placeholder="Rechercher un article…" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-10 bg-[#1a2d42] border border-[#243552] rounded-lg px-3 text-sm text-slate-100 focus:outline-none focus:border-[#00c896] transition-colors"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Chargement…</p>
      ) : orders.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucune vente synchronisée pour l&apos;instant.</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucune vente ne correspond à &quot;{search}&quot;.</p>
      ) : (
        <div className="space-y-3">
          {paginated.map((order) => {
            const url = vintedOrderUrl(order);
            const card = (
              <Card
                className={`bg-[#1a2d42]/80 border-[#243552]${url ? ' hover:bg-[#1a2d42] transition-colors' : ''}`}
              >
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
                      <PackageCheck className="w-5 h-5 text-slate-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{order.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(order.orderDate).toLocaleDateString('fr-FR')} · {order.status}
                      {order.vintedAccountLabel && (
                        <span className="ml-2 rounded-full bg-[#243552] px-2 py-0.5 text-[10px] text-slate-400">
                          {order.vintedAccountLabel}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#00c896] shrink-0">{formatPrice(order)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPendingDeleteId(order.id);
                    }}
                    aria-label="Supprimer"
                    className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-[#0d1b2a]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </CardContent>
              </Card>
            );
            return url ? (
              <a key={order.id} href={url} target="_blank" rel="noopener noreferrer" className="block">
                {card}
              </a>
            ) : (
              <div key={order.id}>{card}</div>
            );
          })}
        </div>
      )}

      <Pagination page={pageSafe} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm bg-[#0d1b2a] border-[#243552]">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Supprimer cette vente ?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Cette ligne sera définitivement supprimée du site.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent border-t-0">
            <Button variant="outline" onClick={() => setPendingDeleteId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
