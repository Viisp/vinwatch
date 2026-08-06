'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PromptRow } from './prompt-row';
import { DEFAULT_PROMPT_CATEGORIES, type PromptCategory, type PhotoPrompt } from '@/data/photo-prompts';
import { getPhotoPromptCategories, savePhotoPromptCategories } from '@/lib/photo-prompts';
import { Camera, Plus, Trash2 } from 'lucide-react';

function newCategory(): PromptCategory {
  const id = crypto.randomUUID();
  return { id, slug: id, name: '', emoji: '✨', prompts: [] };
}

function newPrompt(): PhotoPrompt {
  return { id: crypto.randomUUID(), angle: '', emoji: '🟢', text: '' };
}

export function PromptsPhotosClient() {
  const [categories, setCategories] = useState<PromptCategory[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getPhotoPromptCategories().then((saved) => {
      setCategories(saved ?? DEFAULT_PROMPT_CATEGORIES);
      setLoaded(true);
    });
  }, []);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateCategory(catId: string, patch: Partial<PromptCategory>) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, ...patch } : c)));
  }

  function removeCategory(catId: string) {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  }

  function addCategory() {
    setCategories((prev) => [...prev, newCategory()]);
  }

  function addPrompt(catId: string) {
    const p = newPrompt();
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, prompts: [...c.prompts, p] } : c)));
    setExpandedIds((prev) => new Set(prev).add(p.id));
  }

  function updatePrompt(catId: string, promptId: string, patch: Partial<PhotoPrompt>) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, prompts: c.prompts.map((p) => (p.id === promptId ? { ...p, ...patch } : p)) }
          : c
      )
    );
  }

  function removePrompt(catId: string, promptId: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, prompts: c.prompts.filter((p) => p.id !== promptId) } : c))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await savePhotoPromptCategories(categories);
      setExpandedIds(new Set());
    } catch (err) {
      console.error('[PromptsPhotosClient] save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-2">
        <Camera className="w-5 h-5 text-[#00c896]" />
        Prompts photos
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Prompts prêts à copier pour générer des photos d&apos;annonces Vinted premium. Ajoute, édite ou supprime tes
        propres catégories et prompts librement.
      </p>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-2 mb-8">
        {categories.map((c) => (
          <a
            key={c.id}
            href={`#cat-${c.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-[#243552] bg-[#1a2d42] px-3 py-2 text-sm text-slate-200 hover:border-[#00c896]/60 hover:text-[#00c896] transition-colors"
          >
            <span>{c.emoji}</span> {c.name || 'Sans nom'}
          </a>
        ))}
      </div>

      <div className="columns-1 md:columns-2 gap-4">
        {categories.map((c) => (
          <Card
            key={c.id}
            id={`cat-${c.id}`}
            className="bg-[#1a2d42]/80 border-[#243552] scroll-mt-20 mb-4 break-inside-avoid"
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <input
                  value={c.emoji}
                  onChange={(e) => updateCategory(c.id, { emoji: e.target.value })}
                  className="w-12 rounded-lg bg-[#0d1b2a] border border-[#243552] px-2 py-2 text-sm text-center text-slate-100 outline-none focus:border-[#00c896]/60 focus:ring-1 focus:ring-[#00c896]/40"
                />
                <input
                  value={c.name}
                  onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                  placeholder="Nom de la catégorie"
                  className="flex-1 rounded-lg bg-[#0d1b2a] border border-[#243552] px-3 py-2 text-sm text-slate-100 font-semibold outline-none focus:border-[#00c896]/60 focus:ring-1 focus:ring-[#00c896]/40"
                />
                <Button variant="ghost" size="icon-sm" onClick={() => removeCategory(c.id)} aria-label="Supprimer la catégorie">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {c.prompts.map((p) => (
                <PromptRow
                  key={p.id}
                  prompt={p}
                  expanded={expandedIds.has(p.id)}
                  onToggle={() => toggleExpanded(p.id)}
                  onChange={(patch) => updatePrompt(c.id, p.id, patch)}
                  onDelete={() => removePrompt(c.id, p.id)}
                />
              ))}
              <Button variant="outline" size="sm" onClick={() => addPrompt(c.id)}>
                <Plus className="w-3.5 h-3.5" /> Ajouter un prompt
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 mt-6 pt-6 border-t border-[#243552]">
        <Button variant="outline" size="sm" onClick={addCategory}>
          <Plus className="w-3.5 h-3.5" /> Ajouter une catégorie
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
