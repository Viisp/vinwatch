'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PromptRow } from './prompt-row';
import {
  DEFAULT_PROMPT_TEMPLATES,
  DEFAULT_CLOTHING_TYPES,
  DEFAULT_BACKGROUNDS,
  type PhotoPrompt,
  type PromptOption,
} from '@/data/photo-prompts';
import { getPhotoPromptSettings, savePhotoPromptSettings } from '@/lib/photo-prompts';
import { Camera, Plus, Trash2 } from 'lucide-react';

function newTemplate(): PhotoPrompt {
  return { id: crypto.randomUUID(), angle: '', emoji: '✨', text: '' };
}

function newOption(): PromptOption {
  return { id: crypto.randomUUID(), label: '', value: '' };
}

function resolveText(text: string, item?: PromptOption, background?: PromptOption): string {
  return text
    .replaceAll('{item}', item?.value || '{item}')
    .replaceAll('{background}', background?.value || '{background}');
}

type PendingDelete =
  | { kind: 'template'; id: string; label: string }
  | { kind: 'clothing'; id: string; label: string }
  | { kind: 'background'; id: string; label: string };

export function PromptsPhotosClient() {
  const [templates, setTemplates] = useState<PhotoPrompt[]>([]);
  const [clothingTypes, setClothingTypes] = useState<PromptOption[]>([]);
  const [backgrounds, setBackgrounds] = useState<PromptOption[]>([]);
  const [selectedClothingId, setSelectedClothingId] = useState<string>('');
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => {
    getPhotoPromptSettings().then((saved) => {
      const t = saved?.templates ?? DEFAULT_PROMPT_TEMPLATES;
      const c = saved?.clothingTypes ?? DEFAULT_CLOTHING_TYPES;
      const b = saved?.backgrounds ?? DEFAULT_BACKGROUNDS;
      setTemplates(t);
      setClothingTypes(c);
      setBackgrounds(b);
      setSelectedClothingId(c[0]?.id ?? '');
      setSelectedBackgroundId(b[0]?.id ?? '');
      setLoaded(true);
    });
  }, []);

  const selectedClothing = useMemo(
    () => clothingTypes.find((c) => c.id === selectedClothingId),
    [clothingTypes, selectedClothingId]
  );
  const selectedBackground = useMemo(
    () => backgrounds.find((b) => b.id === selectedBackgroundId),
    [backgrounds, selectedBackgroundId]
  );

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateTemplate(id: string, patch: Partial<PhotoPrompt>) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function addTemplate() {
    const t = newTemplate();
    setTemplates((prev) => [...prev, t]);
    setExpandedIds((prev) => new Set(prev).add(t.id));
  }

  function removeTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    setPendingDelete({ kind: 'template', id, label: t?.angle || 'ce prompt' });
  }

  function updateClothingType(id: string, patch: Partial<PromptOption>) {
    setClothingTypes((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function addClothingType() {
    setClothingTypes((prev) => [...prev, newOption()]);
  }

  function removeClothingType(id: string) {
    const c = clothingTypes.find((x) => x.id === id);
    setPendingDelete({ kind: 'clothing', id, label: c?.label || 'ce vêtement' });
  }

  function updateBackground(id: string, patch: Partial<PromptOption>) {
    setBackgrounds((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function addBackground() {
    setBackgrounds((prev) => [...prev, newOption()]);
  }

  function removeBackground(id: string) {
    const b = backgrounds.find((x) => x.id === id);
    setPendingDelete({ kind: 'background', id, label: b?.label || 'ce fond' });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const nextTemplates = pendingDelete.kind === 'template' ? templates.filter((t) => t.id !== pendingDelete.id) : templates;
    const nextClothing = pendingDelete.kind === 'clothing' ? clothingTypes.filter((c) => c.id !== pendingDelete.id) : clothingTypes;
    const nextBackgrounds = pendingDelete.kind === 'background' ? backgrounds.filter((b) => b.id !== pendingDelete.id) : backgrounds;

    setTemplates(nextTemplates);
    setClothingTypes(nextClothing);
    setBackgrounds(nextBackgrounds);
    if (pendingDelete.kind === 'clothing' && selectedClothingId === pendingDelete.id) {
      setSelectedClothingId(nextClothing[0]?.id ?? '');
    }
    if (pendingDelete.kind === 'background' && selectedBackgroundId === pendingDelete.id) {
      setSelectedBackgroundId(nextBackgrounds[0]?.id ?? '');
    }
    setPendingDelete(null);
    try {
      await savePhotoPromptSettings({ templates: nextTemplates, clothingTypes: nextClothing, backgrounds: nextBackgrounds });
    } catch (err) {
      console.error('[PromptsPhotosClient] delete failed:', err);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await savePhotoPromptSettings({ templates, clothingTypes, backgrounds });
      setExpandedIds(new Set());
    } catch (err) {
      console.error('[PromptsPhotosClient] save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-2">
        <Camera className="w-5 h-5 text-[#00c896]" />
        Prompts photos
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Choisis un vêtement et un fond, puis copie l&apos;angle qu&apos;il te faut. Un seul jeu de prompts pour tous
        les vêtements — ajoute, édite ou supprime librement.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <OptionPicker
          title="Vêtement"
          options={clothingTypes}
          selectedId={selectedClothingId}
          onSelect={setSelectedClothingId}
          onChange={updateClothingType}
          onAdd={addClothingType}
          onRemove={removeClothingType}
          labelPlaceholder="ex: T-shirt"
          valuePlaceholder="ex: a t-shirt laid perfectly flat"
        />
        <OptionPicker
          title="Fond"
          options={backgrounds}
          selectedId={selectedBackgroundId}
          onSelect={setSelectedBackgroundId}
          onChange={updateBackground}
          onAdd={addBackground}
          onRemove={removeBackground}
          labelPlaceholder="ex: Bois"
          valuePlaceholder="ex: a natural wooden floor"
        />
      </div>

      <Card className="bg-[#1a2d42]/80 border-[#243552]">
        <CardHeader>
          <span className="text-base font-semibold text-slate-100">Prompts</span>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.map((t) => (
            <PromptRow
              key={t.id}
              prompt={t}
              resolvedText={resolveText(t.text, selectedClothing, selectedBackground)}
              expanded={expandedIds.has(t.id)}
              onToggle={() => toggleExpanded(t.id)}
              onChange={(patch) => updateTemplate(t.id, patch)}
              onDelete={() => removeTemplate(t.id)}
            />
          ))}
          <Button variant="outline" size="sm" onClick={addTemplate}>
            <Plus className="w-3.5 h-3.5" /> Ajouter un prompt
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-3 mt-6 pt-6 border-t border-[#243552]">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <DialogContent className="sm:max-w-sm bg-[#0d1b2a] border-[#243552]">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Supprimer ?</DialogTitle>
            <DialogDescription className="text-slate-400">
              &quot;{pendingDelete?.label}&quot; sera définitivement supprimé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent border-t-0">
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
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

function OptionPicker({
  title,
  options,
  selectedId,
  onSelect,
  onChange,
  onAdd,
  onRemove,
  labelPlaceholder,
  valuePlaceholder,
}: {
  title: string;
  options: PromptOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<PromptOption>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  labelPlaceholder: string;
  valuePlaceholder: string;
}) {
  const [managing, setManaging] = useState(false);

  return (
    <Card className="bg-[#1a2d42]/80 border-[#243552]">
      <CardHeader className="pb-2">
        <span className="text-sm font-semibold text-slate-100">{title}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        <Select value={selectedId} onValueChange={(value) => onSelect(value ?? '')}>
          <SelectTrigger className="w-full bg-[#0d1b2a] border-[#243552] text-slate-100">
            <SelectValue placeholder="Choisir…" />
          </SelectTrigger>
          <SelectContent className="bg-[#0d1b2a] border border-[#243552] text-slate-100">
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label || 'Sans nom'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => setManaging((v) => !v)}
          className="text-xs text-slate-400 hover:text-[#00c896]"
        >
          {managing ? 'Fermer la liste' : 'Gérer la liste'}
        </button>

        {managing && (
          <div className="space-y-2 pt-1">
            {options.map((o) => (
              <div key={o.id} className="flex items-center gap-1.5">
                <input
                  value={o.label}
                  onChange={(e) => onChange(o.id, { label: e.target.value })}
                  placeholder={labelPlaceholder}
                  className="w-24 shrink-0 rounded-lg bg-[#0d1b2a] border border-[#243552] px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-[#00c896]/60"
                />
                <input
                  value={o.value}
                  onChange={(e) => onChange(o.id, { value: e.target.value })}
                  placeholder={valuePlaceholder}
                  className="flex-1 rounded-lg bg-[#0d1b2a] border border-[#243552] px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-[#00c896]/60"
                />
                <button
                  type="button"
                  onClick={() => onRemove(o.id)}
                  aria-label="Supprimer"
                  className="shrink-0 rounded-lg p-1.5 text-red-400 hover:bg-[#0d1b2a]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={onAdd}>
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
