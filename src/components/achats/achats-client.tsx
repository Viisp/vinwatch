'use client';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getOrders, deleteOrder, addOrder, updateOrder, uploadOrderPhoto } from '@/lib/vinted-orders';
import { vintedOrderUrl, sortOrders, SORT_OPTIONS, type SortOption, type StoredOrder } from '@/lib/vinted-calculations';
import { ShoppingBag, Trash2, Plus, Pencil, Camera } from 'lucide-react';
import SearchComponent from '@/components/ui/animated-glowing-search-bar';
import { Pagination } from '@/components/ui/pagination';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const PAGE_SIZE = 10;

function formatPrice(order: StoredOrder): string {
  return `${order.priceAmount} ${order.priceCurrency}`;
}

export function AchatsClient() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [page, setPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDate, setFormDate] = useState(todayIsoDate());
  const [formSource, setFormSource] = useState('');
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    getOrders('purchased').then((data) => {
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
      console.error('[AchatsClient] delete failed:', err);
    }
  }

  function resetForm() {
    setEditingId(null);
    setFormTitle('');
    setFormPrice('');
    setFormDate(todayIsoDate());
    setFormSource('');
    setFormPhotoFile(null);
    setFormPhotoPreview(null);
    setFormError('');
  }

  function openAddForm() {
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(order: StoredOrder) {
    setEditingId(order.id);
    setFormTitle(order.title);
    setFormPrice(order.priceAmount);
    setFormDate(order.orderDate.slice(0, 10));
    setFormSource(order.vintedAccountLabel ?? '');
    setFormPhotoFile(null);
    setFormPhotoPreview(order.photoUrl);
    setFormError('');
    setFormOpen(true);
  }

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFormPhotoFile(file);
    setFormPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmitForm() {
    if (!formTitle.trim()) { setFormError('Le titre est obligatoire.'); return; }
    const amount = parseFloat(formPrice.replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) { setFormError('Prix invalide.'); return; }

    setSaving(true);
    setFormError('');
    try {
      let photoUrl: string | undefined;
      if (formPhotoFile) {
        photoUrl = await uploadOrderPhoto(formPhotoFile);
      }

      if (editingId) {
        await updateOrder(editingId, {
          title: formTitle.trim(),
          priceAmount: amount.toFixed(2),
          priceCurrency: 'EUR',
          orderDate: new Date(formDate).toISOString(),
          vintedAccountLabel: formSource.trim() || null,
          ...(photoUrl !== undefined ? { photoUrl } : {}),
        });
      } else {
        await addOrder({
          orderType: 'purchased',
          title: formTitle.trim(),
          priceAmount: amount.toFixed(2),
          priceCurrency: 'EUR',
          orderDate: new Date(formDate).toISOString(),
          status: 'Payé',
          vintedAccountLabel: formSource.trim() || 'Externe',
          photoUrl,
        });
      }
      const data = await getOrders('purchased');
      setOrders(data);
      setFormOpen(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setSaving(false);
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
          <ShoppingBag className="w-5 h-5 text-[#00c896]" />
          Achats ({filtered.length})
        </h1>
        <div className="flex items-center gap-2">
          {orders.length > 0 && (
            <>
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
            </>
          )}
          <Button type="button" size="sm" onClick={openAddForm}>
            <Plus className="w-3.5 h-3.5" /> Ajouter un achat
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Chargement…</p>
      ) : orders.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucun achat synchronisé pour l&apos;instant.</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucun achat ne correspond à &quot;{search}&quot;.</p>
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
                      <ShoppingBag className="w-5 h-5 text-slate-600" />
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
                  <span className="text-sm font-semibold text-red-400 shrink-0">-{formatPrice(order)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openEditForm(order);
                    }}
                    aria-label="Modifier"
                    className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:text-[#00c896] hover:bg-[#0d1b2a]"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
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
            <DialogTitle className="text-slate-100">Supprimer cet achat ?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Cette ligne sera définitivement supprimée du site.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent border-t-0">
            <Button type="button" variant="outline" onClick={() => setPendingDeleteId(null)}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-sm bg-[#0d1b2a] border-[#243552]">
          <DialogHeader>
            <DialogTitle className="text-slate-100">{editingId ? "Modifier l'achat" : 'Ajouter un achat'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingId ? 'Corrige les informations de cette ligne.' : 'Pour un article acheté ailleurs que sur Vinted.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-1">
            <div className="flex items-center gap-3">
              <label className="relative group w-16 h-16 shrink-0 cursor-pointer">
                {formPhotoPreview ? (
                  <Image src={formPhotoPreview} alt="Aperçu" width={64} height={64} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-[#1a2d42] border border-[#243552] flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-slate-600" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelected} />
              </label>
              <p className="text-xs text-slate-500">Photo (optionnel)</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="formTitle" className="text-slate-400">Article</Label>
              <Input
                id="formTitle"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="ex: Air Jordan 4 Retro SE 95 Neon, taille 39"
                className="bg-[#1a2d42] border-[#243552] text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="formPrice" className="text-slate-400">Prix (€)</Label>
              <Input
                id="formPrice"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="ex: 128.72"
                inputMode="decimal"
                className="bg-[#1a2d42] border-[#243552] text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="formDate" className="text-slate-400">Date</Label>
              <Input
                id="formDate"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="bg-[#1a2d42] border-[#243552] text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="formSource" className="text-slate-400">Source (optionnel)</Label>
              <Input
                id="formSource"
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                placeholder="ex: Whatnot"
                className="bg-[#1a2d42] border-[#243552] text-slate-100"
              />
            </div>
            {formError && <p className="text-xs text-red-400">{formError}</p>}
          </div>
          <DialogFooter className="bg-transparent border-t-0">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSubmitForm} disabled={saving}>
              {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
