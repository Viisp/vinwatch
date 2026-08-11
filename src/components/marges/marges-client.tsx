'use client';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { getOrders } from '@/lib/vinted-orders';
import { getUnmatchedSaleIds, saveUnmatchedSaleIds } from '@/lib/margin-overrides';
import { matchOrderMargins, type StoredOrder } from '@/lib/vinted-calculations';
import { Scale, ArrowRight, PackageCheck, Unlink, Link2 } from 'lucide-react';
import SearchComponent from '@/components/ui/animated-glowing-search-bar';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 10;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function MargesClient() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([getOrders(), getUnmatchedSaleIds()]).then(([data, unmatched]) => {
      setOrders(data);
      setExcludedIds(new Set(unmatched));
      setLoading(false);
    });
  }, []);

  const matches = useMemo(() => matchOrderMargins(orders, excludedIds), [orders, excludedIds]);

  async function toggleExcluded(saleId: string) {
    const next = new Set(excludedIds);
    if (next.has(saleId)) next.delete(saleId);
    else next.add(saleId);
    setExcludedIds(next);
    try {
      await saveUnmatchedSaleIds(Array.from(next));
    } catch (err) {
      console.error('[MargesClient] save failed:', err);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? matches.filter((m) => m.sale.title.toLowerCase().includes(q)) : matches;
  }, [matches, search]);

  const totalMargin = useMemo(
    () => filtered.reduce((sum, m) => sum + (m.margin ?? 0), 0),
    [filtered]
  );
  const matchedCount = useMemo(() => filtered.filter((m) => m.purchase).length, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  function handleSearchChange(v: string) {
    setSearch(v);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#00c896]" />
          Marges ({filtered.length})
        </h1>
        {orders.length > 0 && (
          <SearchComponent value={search} onChange={handleSearchChange} placeholder="Rechercher une vente…" />
        )}
      </div>

      {!loading && matches.length > 0 && (
        <Card className="bg-[#1a2d42]/80 border-[#243552] mb-6">
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-2 py-4">
            <div>
              <p className="text-xs text-slate-500">Marge totale</p>
              <p className={`text-xl font-bold ${totalMargin >= 0 ? 'text-[#00c896]' : 'text-red-400'}`}>
                {formatCurrency(totalMargin)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Ventes rapprochées</p>
              <p className="text-xl font-bold text-slate-100">{matchedCount} / {filtered.length}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-slate-500 mb-4">
        Rapprochement automatique par titre entre tes ventes et tes achats — approximatif, pas garanti à 100%.
        Un mauvais rapprochement (article acheté ailleurs) peut être dissocié manuellement.
      </p>

      {loading ? (
        <p className="text-slate-500 text-sm">Chargement…</p>
      ) : matches.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucune vente synchronisée pour l&apos;instant.</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucune vente ne correspond à &quot;{search}&quot;.</p>
      ) : (
        <div className="space-y-3">
          {paginated.map((m) => {
            const isExcluded = excludedIds.has(m.sale.id);
            return (
              <Card key={m.sale.id} className="bg-[#1a2d42]/80 border-[#243552]">
                <CardContent className="flex items-center gap-3 py-4">
                  {m.sale.photoUrl ? (
                    <Image
                      src={m.sale.photoUrl}
                      alt={m.sale.title}
                      width={48}
                      height={48}
                      className="rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-[48px] h-[48px] rounded-lg bg-[#243552] flex items-center justify-center shrink-0">
                      <PackageCheck className="w-5 h-5 text-slate-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{m.sale.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(m.sale.orderDate).toLocaleDateString('fr-FR')}
                      {isExcluded && <span className="ml-2 italic">dissocié manuellement</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                    <span className="text-[#00c896] font-semibold">
                      +{m.sale.priceAmount} {m.sale.priceCurrency}
                    </span>
                    {m.purchase ? (
                      <>
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-red-400 font-semibold">
                          -{m.purchase.priceAmount} {m.purchase.priceCurrency}
                        </span>
                      </>
                    ) : (
                      <span className="italic">achat non trouvé</span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-semibold shrink-0 w-20 text-right ${
                      m.margin === null ? 'text-slate-500' : m.margin >= 0 ? 'text-[#00c896]' : 'text-red-400'
                    }`}
                  >
                    {m.margin === null ? '—' : formatCurrency(m.margin)}
                  </span>
                  {(m.purchase || isExcluded) && (
                    <button
                      type="button"
                      onClick={() => toggleExcluded(m.sale.id)}
                      aria-label={isExcluded ? 'Réactiver le rapprochement' : 'Dissocier ce rapprochement'}
                      title={isExcluded ? 'Réactiver le rapprochement' : 'Dissocier ce rapprochement'}
                      className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:text-[#00c896] hover:bg-[#0d1b2a]"
                    >
                      {isExcluded ? <Link2 className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination page={pageSafe} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
