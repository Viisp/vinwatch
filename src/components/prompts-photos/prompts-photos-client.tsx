'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFAULT_PROMPT_MODES,
  DEFAULT_CLOTHING_TYPES,
  DEFAULT_ANGLES,
  DEFAULT_POSES,
  DEFAULT_BACKGROUNDS,
  type PromptMode,
  type PromptOption,
} from '@/data/photo-prompts';
import { getPhotoPromptSettings, savePhotoPromptSettings } from '@/lib/photo-prompts';
import { Camera, Plus, Trash2, Copy, Check } from 'lucide-react';

function newOption(): PromptOption {
  return { id: crypto.randomUUID(), label: '', value: '' };
}

function newMode(): PromptMode {
  return { id: crypto.randomUUID(), name: '', emoji: '✨', text: '', usesPoseAngle: true };
}

function resolveText(
  mode: PromptMode,
  item?: PromptOption,
  angle?: PromptOption,
  pose?: PromptOption,
  background?: PromptOption
): string {
  let text = mode.text
    .replaceAll('{item}', item?.value || '{item}')
    .replaceAll('{background}', background?.value || '{background}');
  if (mode.usesPoseAngle) {
    text = text.replaceAll('{angle}', angle?.value || '{angle}').replaceAll('{pose}', pose?.value || '{pose}');
  }
  return text;
}

type PendingDelete = { kind: 'clothing' | 'angle' | 'pose' | 'background' | 'mode'; id: string; label: string };

export function PromptsPhotosClient() {
  const [modes, setModes] = useState<PromptMode[]>([]);
  const [clothingTypes, setClothingTypes] = useState<PromptOption[]>([]);
  const [angles, setAngles] = useState<PromptOption[]>([]);
  const [poses, setPoses] = useState<PromptOption[]>([]);
  const [backgrounds, setBackgrounds] = useState<PromptOption[]>([]);

  const [selectedModeId, setSelectedModeId] = useState('');
  const [selectedClothingId, setSelectedClothingId] = useState('');
  const [selectedAngleId, setSelectedAngleId] = useState('');
  const [selectedPoseId, setSelectedPoseId] = useState('');
  const [selectedBackgroundId, setSelectedBackgroundId] = useState('');

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [managing, setManaging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => {
    getPhotoPromptSettings().then((saved) => {
      const m = saved?.modes ?? DEFAULT_PROMPT_MODES;
      const c = saved?.clothingTypes ?? DEFAULT_CLOTHING_TYPES;
      const a = saved?.angles ?? DEFAULT_ANGLES;
      const p = saved?.poses ?? DEFAULT_POSES;
      const b = saved?.backgrounds ?? DEFAULT_BACKGROUNDS;
      setModes(m);
      setClothingTypes(c);
      setAngles(a);
      setPoses(p);
      setBackgrounds(b);
      setSelectedModeId(m[0]?.id ?? '');
      setSelectedClothingId(c[0]?.id ?? '');
      setSelectedAngleId(a[0]?.id ?? '');
      setSelectedPoseId(p[0]?.id ?? '');
      setSelectedBackgroundId(b[0]?.id ?? '');
      setLoaded(true);
    });
  }, []);

  const selectedMode = useMemo(() => modes.find((m) => m.id === selectedModeId), [modes, selectedModeId]);
  const selectedClothing = useMemo(() => clothingTypes.find((c) => c.id === selectedClothingId), [clothingTypes, selectedClothingId]);
  const selectedAngle = useMemo(() => angles.find((a) => a.id === selectedAngleId), [angles, selectedAngleId]);
  const selectedPose = useMemo(() => poses.find((p) => p.id === selectedPoseId), [poses, selectedPoseId]);
  const selectedBackground = useMemo(() => backgrounds.find((b) => b.id === selectedBackgroundId), [backgrounds, selectedBackgroundId]);

  const resultText = useMemo(() => {
    if (!selectedMode) return '';
    return resolveText(selectedMode, selectedClothing, selectedAngle, selectedPose, selectedBackground);
  }, [selectedMode, selectedClothing, selectedAngle, selectedPose, selectedBackground]);

  async function handleCopy() {
    if (!resultText) return;
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function persist(next: {
    modes?: PromptMode[];
    clothingTypes?: PromptOption[];
    angles?: PromptOption[];
    poses?: PromptOption[];
    backgrounds?: PromptOption[];
  }) {
    await savePhotoPromptSettings({
      modes: next.modes ?? modes,
      clothingTypes: next.clothingTypes ?? clothingTypes,
      angles: next.angles ?? angles,
      poses: next.poses ?? poses,
      backgrounds: next.backgrounds ?? backgrounds,
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await persist({});
    } catch (err) {
      console.error('[PromptsPhotosClient] save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  function removeClothingType(id: string) {
    setPendingDelete({ kind: 'clothing', id, label: clothingTypes.find((c) => c.id === id)?.label || 'ce vêtement' });
  }
  function removeAngle(id: string) {
    setPendingDelete({ kind: 'angle', id, label: angles.find((a) => a.id === id)?.label || 'cet angle' });
  }
  function removePose(id: string) {
    setPendingDelete({ kind: 'pose', id, label: poses.find((p) => p.id === id)?.label || 'cette pose' });
  }
  function removeBackground(id: string) {
    setPendingDelete({ kind: 'background', id, label: backgrounds.find((b) => b.id === id)?.label || 'ce fond' });
  }
  function removeMode(id: string) {
    setPendingDelete({ kind: 'mode', id, label: modes.find((m) => m.id === id)?.name || 'ce type de photo' });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { kind, id } = pendingDelete;

    const nextClothing = kind === 'clothing' ? clothingTypes.filter((c) => c.id !== id) : clothingTypes;
    const nextAngles = kind === 'angle' ? angles.filter((a) => a.id !== id) : angles;
    const nextPoses = kind === 'pose' ? poses.filter((p) => p.id !== id) : poses;
    const nextBackgrounds = kind === 'background' ? backgrounds.filter((b) => b.id !== id) : backgrounds;
    const nextModes = kind === 'mode' ? modes.filter((m) => m.id !== id) : modes;

    setClothingTypes(nextClothing);
    setAngles(nextAngles);
    setPoses(nextPoses);
    setBackgrounds(nextBackgrounds);
    setModes(nextModes);
    if (kind === 'clothing' && selectedClothingId === id) setSelectedClothingId(nextClothing[0]?.id ?? '');
    if (kind === 'angle' && selectedAngleId === id) setSelectedAngleId(nextAngles[0]?.id ?? '');
    if (kind === 'pose' && selectedPoseId === id) setSelectedPoseId(nextPoses[0]?.id ?? '');
    if (kind === 'background' && selectedBackgroundId === id) setSelectedBackgroundId(nextBackgrounds[0]?.id ?? '');
    if (kind === 'mode' && selectedModeId === id) setSelectedModeId(nextModes[0]?.id ?? '');
    setPendingDelete(null);
    try {
      await persist({
        clothingTypes: nextClothing,
        angles: nextAngles,
        poses: nextPoses,
        backgrounds: nextBackgrounds,
        modes: nextModes,
      });
    } catch (err) {
      console.error('[PromptsPhotosClient] delete failed:', err);
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
        Choisis ton article, le type de photo, la pose, l&apos;angle et le fond : le prompt se construit tout seul en
        bas de la page.
      </p>

      <Card className="bg-[#1a2d42]/80 border-[#243552] mb-6">
        <CardContent className="space-y-4 pt-4">
          <Field label="Vêtement">
            <PickerSelect options={clothingTypes} value={selectedClothingId} onChange={setSelectedClothingId} />
          </Field>
          <Field label="Type de photo">
            <Select value={selectedModeId} onValueChange={(v) => setSelectedModeId(v ?? '')}>
              <SelectTrigger className="w-full bg-[#0d1b2a] border-[#243552] text-slate-100">
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1b2a] border border-[#243552] text-slate-100">
                {modes.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.emoji} {m.name || 'Sans nom'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {selectedMode?.usesPoseAngle && (
            <>
              <Field label="Pose">
                <PickerSelect options={poses} value={selectedPoseId} onChange={setSelectedPoseId} />
              </Field>
              <Field label="Angle">
                <PickerSelect options={angles} value={selectedAngleId} onChange={setSelectedAngleId} />
              </Field>
            </>
          )}
          <Field label="Fond">
            <PickerSelect options={backgrounds} value={selectedBackgroundId} onChange={setSelectedBackgroundId} />
          </Field>
        </CardContent>
      </Card>

      <Card className="bg-[#1a2d42]/80 border-[#243552] mb-6">
        <CardHeader className="pb-2">
          <span className="text-sm font-semibold text-slate-100">Prompt</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-wrap rounded-lg bg-[#0d1b2a] border border-[#243552] p-3">
            {resultText}
          </p>
          <Button size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copié
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copier le prompt
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => setManaging((v) => !v)}
        className="text-xs text-slate-400 hover:text-[#00c896] mb-4"
      >
        {managing ? 'Fermer les réglages' : 'Gérer les listes et les types de photo'}
      </button>

      {managing && (
        <div className="space-y-4 mb-6">
          <ListManager title="Vêtements" options={clothingTypes} onChange={setClothingTypes} onAdd={() => setClothingTypes((p) => [...p, newOption()])} onRemove={removeClothingType} labelPlaceholder="ex: T-shirt" valuePlaceholder="ex: a t-shirt, ..." />
          <ListManager title="Poses" options={poses} onChange={setPoses} onAdd={() => setPoses((p) => [...p, newOption()])} onRemove={removePose} labelPlaceholder="ex: Sur cintre" valuePlaceholder="ex: hanging neatly on a wooden hanger" />
          <ListManager title="Angles" options={angles} onChange={setAngles} onAdd={() => setAngles((p) => [...p, newOption()])} onRemove={removeAngle} labelPlaceholder="ex: Face" valuePlaceholder="ex: front view" />
          <ListManager title="Fonds" options={backgrounds} onChange={setBackgrounds} onAdd={() => setBackgrounds((p) => [...p, newOption()])} onRemove={removeBackground} labelPlaceholder="ex: Bois" valuePlaceholder="ex: a wooden floor" />
          <ModeManager modes={modes} onChange={setModes} onAdd={() => setModes((p) => [...p, newMode()])} onRemove={removeMode} />
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pt-6 border-t border-[#243552]">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function PickerSelect({
  options,
  value,
  onChange,
}: {
  options: PromptOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
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
  );
}

function ListManager({
  title,
  options,
  onChange,
  onAdd,
  onRemove,
  labelPlaceholder,
  valuePlaceholder,
}: {
  title: string;
  options: PromptOption[];
  onChange: (next: PromptOption[]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  labelPlaceholder: string;
  valuePlaceholder: string;
}) {
  function update(id: string, patch: Partial<PromptOption>) {
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  return (
    <Card className="bg-[#1a2d42]/80 border-[#243552]">
      <CardHeader className="pb-2">
        <span className="text-sm font-semibold text-slate-100">{title}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        {options.map((o) => (
          <div key={o.id} className="flex items-center gap-1.5">
            <input
              value={o.label}
              onChange={(e) => update(o.id, { label: e.target.value })}
              placeholder={labelPlaceholder}
              className="w-28 shrink-0 rounded-lg bg-[#0d1b2a] border border-[#243552] px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-[#00c896]/60"
            />
            <input
              value={o.value}
              onChange={(e) => update(o.id, { value: e.target.value })}
              placeholder={valuePlaceholder}
              className="flex-1 rounded-lg bg-[#0d1b2a] border border-[#243552] px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-[#00c896]/60"
            />
            <button type="button" onClick={() => onRemove(o.id)} aria-label="Supprimer" className="shrink-0 rounded-lg p-1.5 text-red-400 hover:bg-[#0d1b2a]">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </Button>
      </CardContent>
    </Card>
  );
}

function ModeManager({
  modes,
  onChange,
  onAdd,
  onRemove,
}: {
  modes: PromptMode[];
  onChange: (next: PromptMode[]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  function update(id: string, patch: Partial<PromptMode>) {
    onChange(modes.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  return (
    <Card className="bg-[#1a2d42]/80 border-[#243552]">
      <CardHeader className="pb-2">
        <span className="text-sm font-semibold text-slate-100">Types de photo</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {modes.map((m) => (
          <div key={m.id} className="rounded-lg border border-[#243552] bg-[#0d1b2a] p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <input
                value={m.emoji}
                onChange={(e) => update(m.id, { emoji: e.target.value })}
                className="w-12 rounded-lg bg-[#1a2d42] border border-[#243552] px-2 py-1.5 text-center text-xs text-slate-100 outline-none focus:border-[#00c896]/60"
              />
              <input
                value={m.name}
                onChange={(e) => update(m.id, { name: e.target.value })}
                placeholder="Nom (ex: Photo produit)"
                className="flex-1 rounded-lg bg-[#1a2d42] border border-[#243552] px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-[#00c896]/60"
              />
              <label className="flex items-center gap-1 text-[11px] text-slate-400 whitespace-nowrap">
                <input type="checkbox" checked={m.usesPoseAngle} onChange={(e) => update(m.id, { usesPoseAngle: e.target.checked })} />
                Pose/Angle
              </label>
              <button type="button" onClick={() => onRemove(m.id)} aria-label="Supprimer" className="shrink-0 rounded-lg p-1.5 text-red-400 hover:bg-[#1a2d42]">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              value={m.text}
              onChange={(e) => update(m.id, { text: e.target.value })}
              rows={4}
              placeholder="Texte du prompt… ({item}, {background}, {pose}, {angle})"
              className="w-full resize-none rounded-lg bg-[#1a2d42] border border-[#243552] p-2.5 text-xs leading-relaxed text-slate-300 outline-none focus:border-[#00c896]/60"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5" /> Ajouter un type de photo
        </Button>
      </CardContent>
    </Card>
  );
}
