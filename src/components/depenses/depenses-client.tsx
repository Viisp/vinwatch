'use client';
import { useEffect, useRef, useState } from 'react';
import SearchComponent from '@/components/ui/animated-glowing-search-bar';
import { DepenzDatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pencil, Check } from 'lucide-react';
import { NumberInput } from '@/components/ui/number-input';
import { Pagination } from '@/components/ui/pagination';
import { formatCurrency } from '@/lib/calculations';
import {
  getExpenses,
  saveExpense,
  updateExpense,
  deleteExpense,
  getMonthlyTotals,
  generateId,
  getAllCategories,
  saveCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
  deleteBuiltinCategory,
} from '@/lib/storage';
import { CATEGORIES as BUILTIN_CATEGORIES } from '@/types';
import { type Expense, type CategoryDef } from '@/types';
import {
  Chart,
  DoughnutController,
  LineController,
  ArcElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(
  DoughnutController,
  LineController,
  ArcElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

const TODAY = new Date().toISOString().split('T')[0];
const CURRENT_MONTH = TODAY.slice(0, 7);

const CAT_COLORS = [
  '#00c896', '#3b82f6', '#f59e0b', '#a855f7',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#94a3b8',
];

const EMOJI_LIST: { emoji: string; keywords: string[] }[] = [
  { emoji: '🛒', keywords: ['courses', 'supermarché', 'alimentation', 'nourriture', 'marché'] },
  { emoji: '🍽️', keywords: ['restaurant', 'repas', 'dîner', 'déjeuner', 'manger'] },
  { emoji: '🍕', keywords: ['pizza', 'fast food', 'livraison'] },
  { emoji: '☕', keywords: ['café', 'boisson', 'bar'] },
  { emoji: '🍺', keywords: ['alcool', 'bière', 'bar', 'soirée'] },
  { emoji: '🏠', keywords: ['loyer', 'maison', 'logement', 'appartement'] },
  { emoji: '🏗️', keywords: ['travaux', 'rénovation', 'construction'] },
  { emoji: '🛋️', keywords: ['meuble', 'déco', 'maison', 'intérieur'] },
  { emoji: '💡', keywords: ['électricité', 'énergie', 'facture'] },
  { emoji: '💧', keywords: ['eau', 'facture', 'énergie'] },
  { emoji: '🔥', keywords: ['gaz', 'chauffage', 'énergie'] },
  { emoji: '🚗', keywords: ['voiture', 'transport', 'carburant', 'auto'] },
  { emoji: '⛽', keywords: ['essence', 'carburant', 'voiture'] },
  { emoji: '🚕', keywords: ['taxi', 'vtc', 'uber', 'transport'] },
  { emoji: '🚇', keywords: ['métro', 'transport', 'commun', 'train'] },
  { emoji: '🚌', keywords: ['bus', 'transport', 'commun'] },
  { emoji: '✈️', keywords: ['avion', 'voyage', 'vacances', 'billet'] },
  { emoji: '🚂', keywords: ['train', 'sncf', 'voyage'] },
  { emoji: '🚲', keywords: ['vélo', 'trottinette', 'transport'] },
  { emoji: '🅿️', keywords: ['parking', 'stationnement', 'voiture'] },
  { emoji: '💊', keywords: ['pharmacie', 'médicament', 'santé'] },
  { emoji: '🏥', keywords: ['hôpital', 'médecin', 'santé', 'clinique'] },
  { emoji: '🦷', keywords: ['dentiste', 'santé'] },
  { emoji: '👁️', keywords: ['opticien', 'lunettes', 'santé'] },
  { emoji: '💆', keywords: ['spa', 'massage', 'bien-être', 'détente'] },
  { emoji: '💪', keywords: ['sport', 'salle', 'fitness', 'gym'] },
  { emoji: '🏋️', keywords: ['musculation', 'sport', 'gym'] },
  { emoji: '🧘', keywords: ['yoga', 'méditation', 'bien-être'] },
  { emoji: '👕', keywords: ['vêtements', 'habits', 'mode', 'shopping'] },
  { emoji: '👟', keywords: ['chaussures', 'basket', 'mode'] },
  { emoji: '👜', keywords: ['sac', 'accessoire', 'mode'] },
  { emoji: '💄', keywords: ['beauté', 'cosmétique', 'maquillage'] },
  { emoji: '🪒', keywords: ['rasoir', 'hygiène', 'beauté'] },
  { emoji: '💻', keywords: ['ordinateur', 'tech', 'informatique'] },
  { emoji: '📱', keywords: ['téléphone', 'mobile', 'smartphone', 'abonnement'] },
  { emoji: '🖨️', keywords: ['imprimante', 'bureau', 'tech'] },
  { emoji: '🎮', keywords: ['jeu', 'gaming', 'console', 'loisir'] },
  { emoji: '🎵', keywords: ['musique', 'concert', 'streaming', 'spotify'] },
  { emoji: '🎬', keywords: ['cinéma', 'film', 'netflix', 'streaming'] },
  { emoji: '📚', keywords: ['livre', 'lecture', 'éducation'] },
  { emoji: '🎓', keywords: ['formation', 'école', 'cours', 'éducation'] },
  { emoji: '🎁', keywords: ['cadeau', 'présent', 'fête'] },
  { emoji: '🎉', keywords: ['fête', 'soirée', 'événement'] },
  { emoji: '🌴', keywords: ['vacances', 'voyage', 'tourisme'] },
  { emoji: '🏖️', keywords: ['plage', 'vacances', 'mer'] },
  { emoji: '🏔️', keywords: ['montagne', 'ski', 'vacances'] },
  { emoji: '🐾', keywords: ['animal', 'vétérinaire', 'chien', 'chat'] },
  { emoji: '🌿', keywords: ['jardin', 'plante', 'nature'] },
  { emoji: '🔧', keywords: ['réparation', 'bricolage', 'outil'] },
  { emoji: '🧹', keywords: ['ménage', 'nettoyage', 'entretien'] },
  { emoji: '📦', keywords: ['colis', 'livraison', 'achat', 'amazon'] },
  { emoji: '📋', keywords: ['abonnement', 'facture', 'service'] },
  { emoji: '🔑', keywords: ['loyer', 'assurance', 'logement'] },
  { emoji: '🛡️', keywords: ['assurance', 'protection'] },
  { emoji: '🏦', keywords: ['banque', 'crédit', 'prêt', 'finance'] },
  { emoji: '💰', keywords: ['argent', 'épargne', 'finance', 'cash'] },
  { emoji: '💳', keywords: ['carte', 'paiement', 'banque'] },
  { emoji: '📈', keywords: ['investissement', 'bourse', 'finance'] },
  { emoji: '🧾', keywords: ['facture', 'reçu', 'impôt', 'taxe'] },
  { emoji: '✂️', keywords: ['coiffeur', 'salon', 'beauté'] },
  { emoji: '🎯', keywords: ['loisir', 'activité', 'divers'] },
  { emoji: '🧩', keywords: ['loisir', 'jeu', 'activité'] },
  { emoji: '🎨', keywords: ['art', 'créativité', 'loisir'] },
  { emoji: '📸', keywords: ['photo', 'appareil', 'loisir'] },
  { emoji: '🌐', keywords: ['internet', 'abonnement', 'web'] },
  { emoji: '📺', keywords: ['télévision', 'streaming', 'abonnement'] },
  { emoji: '🏡', keywords: ['résidence', 'maison', 'propriété'] },
  { emoji: '🧺', keywords: ['pressing', 'laverie', 'entretien'] },
  { emoji: '🍷', keywords: ['vin', 'alcool', 'restaurant'] },
  { emoji: '🧃', keywords: ['boisson', 'courses', 'alimentation'] },
  { emoji: '🥗', keywords: ['salade', 'alimentation', 'restaurant'] },
  { emoji: '🛺', keywords: ['mobilité', 'transport'] },
  { emoji: '🎪', keywords: ['spectacle', 'sortie', 'loisir'] },
  { emoji: '🎭', keywords: ['théâtre', 'culture', 'sortie'] },
  { emoji: '🏟️', keywords: ['stade', 'sport', 'sortie'] },
  { emoji: '📌', keywords: ['autre', 'divers', 'misc'] },
  { emoji: '⭐', keywords: ['autre', 'divers', 'favori'] },
  { emoji: '🔖', keywords: ['divers', 'autre', 'misc'] },
];

export function DepensesClient() {
  const donutRef = useRef<HTMLCanvasElement>(null);
  const lineRef = useRef<HTMLCanvasElement>(null);
  const donutInstance = useRef<Chart | null>(null);
  const lineInstance = useRef<Chart | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryDef[]>(() => getAllCategories());
  const [filterMonth, setFilterMonth] = useState(CURRENT_MONTH);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState('');

  const setFilterMonthAndReset = (v: string) => { setFilterMonth(v); setCurrentPage(1); };
  const setFilterCategoryAndReset = (v: string) => { setFilterCategory(v); setCurrentPage(1); };
  const setFilterSearchAndReset = (v: string) => { setFilterSearch(v); setCurrentPage(1); };

  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(() => getAllCategories()[0]?.value ?? '');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(TODAY);
  const [error, setError] = useState('');

  // Edit / delete confirm
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  // New/edit category form state
  const [catSelectOpen, setCatSelectOpen] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [editingCatValue, setEditingCatValue] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('📌');
  const [newCatColor, setNewCatColor] = useState('#00c896');
  const [emojiSearch, setEmojiSearch] = useState('');

  const load = () => setExpenses(getExpenses());

  useEffect(() => {
    load();
  }, []);

  const filtered = expenses.filter((e) => {
    const monthMatch = e.date.startsWith(filterMonth);
    const catMatch = filterCategory === 'all' || e.category === filterCategory;
    const searchMatch = !filterSearch || (e.description?.toLowerCase().includes(filterSearch.toLowerCase()));
    return monthMatch && catMatch && searchMatch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = [...filtered]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = (p: number) => setCurrentPage(p);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  // Draw charts when data changes
  useEffect(() => {
    const monthExpenses = expenses.filter((e) => e.date.startsWith(filterMonth));

    // Donut
    if (donutRef.current) {
      if (donutInstance.current) donutInstance.current.destroy();
      const byCategory: Record<string, number> = {};
      for (const e of monthExpenses) {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      }
      const cats = allCategories.filter((c) => byCategory[c.value]);
      if (cats.length > 0) {
        donutInstance.current = new Chart(donutRef.current, {
          type: 'doughnut',
          data: {
            labels: cats.map((c) => `${c.emoji} ${c.label}`),
            datasets: [
              {
                data: cats.map((c) => byCategory[c.value]),
                backgroundColor: cats.map((c) => c.color),
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            cutout: '65%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#94a3b8', boxWidth: 12, padding: 10 },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
                },
              },
            },
          },
        });
      }
    }

    // Line
    if (lineRef.current) {
      if (lineInstance.current) lineInstance.current.destroy();
      const monthly = getMonthlyTotals(6);
      lineInstance.current = new Chart(lineRef.current, {
        type: 'line',
        data: {
          labels: monthly.map((m) => m.label),
          datasets: [
            {
              label: 'Dépenses',
              data: monthly.map((m) => m.total),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#3b82f6',
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: '#243552' } },
            y: {
              ticks: {
                color: '#94a3b8',
                callback: (v) => formatCurrency(Number(v)),
              },
              grid: { color: '#243552' },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${formatCurrency(ctx.parsed.y ?? 0)}`,
              },
            },
          },
        },
      });
    }
  }, [expenses, filterMonth, allCategories]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Montant invalide (doit être > 0)');
      return;
    }
    if (!date) {
      setError('Date requise');
      return;
    }
    if (date > TODAY) {
      setError('La date ne peut pas être dans le futur');
      return;
    }
    if (editingId) {
      updateExpense({ id: editingId, amount: amt, category, description, date });
      setEditingId(null);
    } else {
      saveExpense({ id: generateId(), amount: amt, category, description, date });
    }
    setAmount('');
    setDescription('');
    setDate(TODAY);
    load();
  };

  const handleEdit = (e: Expense) => {
    setEditingId(e.id);
    setAmount(String(e.amount));
    setCategory(e.category);
    setDescription(e.description ?? '');
    setDate(e.date);
    setShowNewCat(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAmount('');
    setDescription('');
    setDate(TODAY);
    setCategory(getAllCategories()[0]?.value ?? '');
  };

  const handleDelete = (id: string) => {
    deleteExpense(id);
    if (editingId === id) handleCancelEdit();

    load();
  };

  const handleDeleteCategory = (value: string) => {
    const isBuiltin = BUILTIN_CATEGORIES.some((c) => c.value === value);
    if (isBuiltin) deleteBuiltinCategory(value);
    else deleteCustomCategory(value);
    const updated = getAllCategories();
    setAllCategories(updated);
    setCategory((prev) =>
      prev === value || !updated.some((c) => c.value === prev)
        ? (updated[0]?.value ?? '')
        : prev
    );
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const handleEditCategory = (cat: CategoryDef) => {
    setEditingCatValue(cat.value);
    setNewCatName(cat.label);
    setNewCatEmoji(cat.emoji);
    setNewCatColor(cat.color);
    setShowNewCat(true);
    setCatSelectOpen(false);
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    const label = capitalize(newCatName.trim());
    if (editingCatValue) {
      // Édition d'une catégorie existante
      const isBuiltin = BUILTIN_CATEGORIES.some((c) => c.value === editingCatValue);
      const cat: CategoryDef = { value: editingCatValue, label, color: newCatColor, emoji: newCatEmoji };
      if (isBuiltin) {
        deleteBuiltinCategory(editingCatValue);
        saveCustomCategory(cat);
      } else {
        updateCustomCategory(cat);
      }
      setCategory(editingCatValue);
    } else {
      const value = newCatName.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(2, 5);
      const cat: CategoryDef = { value, label, color: newCatColor, emoji: newCatEmoji };
      saveCustomCategory(cat);
      setCategory(value);
    }
    setAllCategories(getAllCategories());
    setNewCatName('');
    setNewCatEmoji('📌');
    setNewCatColor('#00c896');
    setEditingCatValue(null);
    setShowNewCat(false);
  };

  // Month options — current month + months that have at least one expense
  const expenseMonths = new Set(expenses.map((e) => e.date.slice(0, 7)));
  const monthOptions: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (i === 0 || expenseMonths.has(key)) monthOptions.push(key);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
        <h1 className="text-3xl font-bold text-slate-100">
          Suivi des dépenses
        </h1>
        <SearchComponent
          value={filterSearch}
          onChange={setFilterSearchAndReset}
          placeholder="Rechercher une dépense..."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        {/* Add form */}
        <Card className="bg-[#1a2d42] border-[#243552] lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-slate-100">
              {editingId ? 'Modifier la dépense' : 'Nouvelle dépense'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="amount" className="text-slate-300">Montant (€)</Label>
                <div className="mt-1">
                  <NumberInput
                    value={amount ? parseFloat(amount) : undefined}
                    onChange={(v) => setAmount(isNaN(v) ? '' : String(v))}
                    min={0.01}
                    step={5}
                    formatOptions={{ maximumFractionDigits: 2 }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category" className="text-slate-300">Catégorie</Label>
                <Select
                  value={category}
                  onValueChange={(v) => v && setCategory(v)}
                  open={catSelectOpen}
                  onOpenChange={setCatSelectOpen}
                >
                  <SelectTrigger className="bg-[#0d1b2a] border-[#243552] text-slate-100 mt-1 h-11 text-base">
                    <span>
                      {allCategories.find((c) => c.value === category)?.emoji}{' '}
                      {allCategories.find((c) => c.value === category)?.label ?? category}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2d42] border-[#243552] min-w-[260px]">
                    {allCategories.map((c) => (
                      <div
                        key={c.value}
                        className="flex items-center justify-between px-3 py-2 text-sm text-slate-100 cursor-pointer hover:bg-[#243552] rounded-sm"
                        onClick={() => { setCategory(c.value); setCatSelectOpen(false); }}
                      >
                        <span>{c.emoji} {c.label}</span>
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            type="button"
                            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                            onClick={(e) => { e.stopPropagation(); handleEditCategory(c); }}
                            className="text-slate-500 hover:text-[#00c896] transition-colors p-0.5"
                            title="Modifier"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                            onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c.value); setCatSelectOpen(false); }}
                            className="text-slate-500 hover:text-red-400 transition-colors leading-none text-base"
                            title="Supprimer"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </SelectContent>
                </Select>

                {/* New category toggle */}
                <button
                  type="button"
                  onClick={() => { setShowNewCat((v) => !v); setEditingCatValue(null); setNewCatName(''); setNewCatEmoji('📌'); setNewCatColor('#00c896'); }}
                  className="mt-2 text-xs text-[#00c896] hover:text-[#00b085] transition-colors"
                >
                  {showNewCat ? '− Annuler' : '＋ Créer une catégorie'}
                </button>

                {/* New category form */}
                {showNewCat && (
                  <div className="mt-3 p-3 rounded-lg bg-[#0d1b2a] border border-[#243552] space-y-3">
                    <div className="flex gap-2">
                      <div className="w-16">
                        <p className="text-xs text-slate-500 mb-1">Émoji</p>
                        <Input
                          value={newCatEmoji}
                          onChange={(e) => setNewCatEmoji(e.target.value)}
                          className="bg-[#1a2d42] border-[#243552] text-slate-100 text-center text-lg px-1"
                          maxLength={2}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1">Nom</p>
                        <Input
                          placeholder="Ex : Cadeaux"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateCategory())}
                          className="bg-[#1a2d42] border-[#243552] text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Emoji search + picker */}
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="🔍 Rechercher un émoji…"
                        value={emojiSearch}
                        onChange={(e) => setEmojiSearch(e.target.value)}
                        className="w-full bg-[#0d1b2a] border border-[#243552] rounded-md px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#00c896] transition-colors"
                      />
                      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                        {EMOJI_LIST.filter((e) =>
                          !emojiSearch || e.keywords.some((k) => k.includes(emojiSearch.toLowerCase()))
                        ).map(({ emoji }) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setNewCatEmoji(emoji)}
                            className={`text-base w-7 h-7 rounded flex items-center justify-center transition-colors ${newCatEmoji === emoji ? 'bg-[#00c896]/20 ring-1 ring-[#00c896]' : 'hover:bg-[#243552]'}`}
                          >
                            {emoji}
                          </button>
                        ))}
                        {EMOJI_LIST.filter((e) =>
                          !emojiSearch || e.keywords.some((k) => k.includes(emojiSearch.toLowerCase()))
                        ).length === 0 && (
                          <p className="text-xs text-slate-500 py-1">Aucun résultat.</p>
                        )}
                      </div>
                    </div>

                    {/* Color picker */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Couleur</p>
                      <div className="flex flex-wrap gap-2">
                        {CAT_COLORS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setNewCatColor(col)}
                            className={`w-6 h-6 rounded-full transition-transform ${newCatColor === col ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`}
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={!newCatName.trim()}
                      className="w-full bg-[#243552] hover:bg-[#2d4266] text-slate-100 text-sm h-8 flex items-center gap-2 justify-center"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {editingCatValue ? 'Modifier la catégorie' : 'Créer la catégorie'}
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="text-slate-300">Description (optionnel)</Label>
                <Input
                  id="description"
                  placeholder="Ex: Courses Lidl"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-[#0d1b2a] border-[#243552] text-slate-100 mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-300">Date</Label>
                <DepenzDatePicker value={date} onChange={setDate} />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <ButtonColorful label={editingId ? 'Enregistrer' : 'Ajouter'} type="submit" showArrow={false} className="w-full" />
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="w-full border-[#243552] text-slate-300 hover:bg-[#243552]"
                >
                  Annuler
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* List + filters — single card */}
        <Card className="lg:col-span-2 bg-[#1a2d42] border-[#243552] flex flex-col">
          {/* Filters header */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[#243552]">
            <div className="flex items-center gap-2">
              <Label className="text-slate-400 text-sm whitespace-nowrap">Mois :</Label>
              <Select value={filterMonth} onValueChange={(v) => v && setFilterMonthAndReset(v)}>
                <SelectTrigger className="bg-[#0d1b2a] border-[#243552] text-slate-100 w-40">
                  <span>
                    {(() => { const s = new Date(filterMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); })()}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-[#1a2d42] border-[#243552]">
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={m} className="text-slate-100 focus:bg-[#243552]">
                      {(() => { const s = new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); })()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-slate-400 text-sm whitespace-nowrap">Catégorie :</Label>
              <Select value={filterCategory} onValueChange={(v) => v && setFilterCategoryAndReset(v)}>
                <SelectTrigger className="bg-[#0d1b2a] border-[#243552] text-slate-100 w-40">
                  <span>
                    {filterCategory === 'all'
                      ? 'Toutes'
                      : (() => { const c = allCategories.find((c) => c.value === filterCategory); return c ? `${c.emoji} ${c.label}` : filterCategory; })()}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-[#1a2d42] border-[#243552]">
                  <SelectItem value="all" className="text-slate-100 focus:bg-[#243552]">Toutes</SelectItem>
                  {allCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-slate-100 focus:bg-[#243552]">
                      {c.emoji} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-slate-400 text-sm">Total :</span>
              <span className="text-red-400 font-semibold">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* List body */}
          <div className="flex-1 px-5 py-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-2">
                  <span className="text-3xl">🔍</span>
                  <p className="text-slate-500 text-sm text-center">Aucune dépense pour ce filtre.</p>
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-[#243552]">
                    {paginated.map((e) => {
                      const cat = allCategories.find((c) => c.value === e.category);
                      return (
                        <li key={e.id} className="flex items-center justify-between py-3 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg leading-none flex-shrink-0">{cat?.emoji ?? '📦'}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-200 truncate">
                                {e.description || cat?.label}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(e.date).toLocaleDateString('fr-FR')} ·{' '}
                                <Badge
                                  variant="outline"
                                  className="text-xs border-[#243552] text-slate-400 px-1 py-0"
                                  style={{ borderColor: cat?.color + '60' }}
                                >
                                  {cat?.label ?? e.category}
                                </Badge>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-semibold text-red-400">
                              -{formatCurrency(e.amount)}
                            </span>
                            <button onClick={() => handleEdit(e)} className="text-slate-600 hover:text-[#00c896] transition-colors p-1" title="Modifier">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(e.id)} className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none" title="Supprimer">
                              ×
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <Pagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                </>
              )}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-[#1a2d42] border-[#243552]">
          <CardHeader>
            <CardTitle className="text-slate-100">Répartition par catégorie</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[220px]">
            {expenses.filter((e) => e.date.startsWith(filterMonth)).length > 0 ? (
              <canvas ref={donutRef} className="max-h-[280px]" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-4xl">📊</span>
                <p className="text-slate-400 text-sm font-medium">Aucune dépense ce mois-ci</p>
                <p className="text-slate-500 text-xs">Ajoutez une dépense ci-contre pour voir la répartition.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1a2d42] border-[#243552]">
          <CardHeader>
            <CardTitle className="text-slate-100">Évolution mensuelle (6 mois)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[220px]">
            {expenses.length > 0 ? (
              <canvas ref={lineRef} className="w-full" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-4xl">📈</span>
                <p className="text-slate-400 text-sm font-medium">Pas encore de données</p>
                <p className="text-slate-500 text-xs">L'évolution s'affiche après vos premières dépenses.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
