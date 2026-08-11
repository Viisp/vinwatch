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
  type ClothingKind,
} from '@/data/photo-prompts';

const CLOTHING_KINDS: { id: ClothingKind; label: string }[] = [
  { id: 'haut', label: 'Haut' },
  { id: 'bas', label: 'Bas' },
  { id: 'chaussure', label: 'Chaussure' },
];

function isAvailableFor(restrictTo: ClothingKind[] | undefined, kind: ClothingKind | undefined): boolean {
  return !restrictTo || restrictTo.length === 0 || !kind || restrictTo.includes(kind);
}

// Settings saved before a field existed (emoji, kind, restrictTo, family...)
// come back from Supabase without it. Layer each saved entry over its
// current default (matched by id) so new fields get backfilled without
// touching anything the user actually edited (label/value/etc. from the
// saved entry always win) or losing entries/deletions they made. Also
// appends any brand-new default entries (new id, e.g. a newly-added
// background like "Cuisine") that predate the user's save entirely, since
// otherwise they'd never show up at all -- not just missing a field.
function withDefaults<T extends { id: string }>(saved: T[] | undefined, defaults: T[]): T[] {
  if (!saved) return defaults;
  const defaultsById = new Map(defaults.map((d) => [d.id, d]));
  const merged = saved.map((s) => ({ ...defaultsById.get(s.id), ...s }));
  const savedIds = new Set(saved.map((s) => s.id));
  const newDefaults = defaults.filter((d) => !savedIds.has(d.id));
  return [...merged, ...newDefaults];
}
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
  const backgroundValue = background?.value || '{background}';
  // A pose's own value can reference {background} (e.g. "laid flat on
  // {background}" vs "hanging, with {background} visible behind it") so the
  // connecting phrase matches whether the item sits on a surface or in a room.
  const poseValue = pose ? pose.value.replaceAll('{background}', backgroundValue) : '{pose}';

  let text = mode.text.replaceAll('{item}', item?.value || '{item}').replaceAll('{background}', backgroundValue);
  if (mode.usesPoseAngle) {
    text = text.replaceAll('{angle}', angle?.value || '{angle}').replaceAll('{pose}', poseValue);
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
  const [pendingReset, setPendingReset] = useState(false);

  useEffect(() => {
    getPhotoPromptSettings().then((saved) => {
      const m = withDefaults(saved?.modes, DEFAULT_PROMPT_MODES);
      const c = withDefaults(saved?.clothingTypes, DEFAULT_CLOTHING_TYPES);
      const a = withDefaults(saved?.angles, DEFAULT_ANGLES);
      const p = withDefaults(saved?.poses, DEFAULT_POSES);
      const b = withDefaults(saved?.backgrounds, DEFAULT_BACKGROUNDS);
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

  const selectedClothing = useMemo(() => clothingTypes.find((c) => c.id === selectedClothingId), [clothingTypes, selectedClothingId]);

  // Options that don't make physical sense for the current garment (a
  // mannequin bust for a pair of shorts, a sole close-up for a t-shirt)
  // are hidden rather than just left selectable and wrong.
  const availableModes = useMemo(
    () => modes.filter((m) => isAvailableFor(m.restrictTo, selectedClothing?.kind)),
    [modes, selectedClothing]
  );
  const availablePoses = useMemo(
    () => poses.filter((p) => isAvailableFor(p.restrictTo, selectedClothing?.kind)),
    [poses, selectedClothing]
  );

  const selectedMode = useMemo(() => availableModes.find((m) => m.id === selectedModeId), [availableModes, selectedModeId]);
  const selectedPose = useMemo(() => availablePoses.find((p) => p.id === selectedPoseId), [availablePoses, selectedPoseId]);

  // A pose "on a surface" only pairs with floor/surface backgrounds and
  // angles, and a pose "in a room" (cintre/mannequin) only with real-room
  // backgrounds and just face/back -- otherwise a hanging t-shirt could end
  // up "presented on a carpet" shot from a bird's-eye view.
  const availableBackgrounds = useMemo(() => {
    if (!selectedMode?.usesPoseAngle || !selectedPose) return backgrounds;
    return backgrounds.filter((b) => !b.family || b.family === selectedPose.family);
  }, [backgrounds, selectedMode, selectedPose]);
  const availableAngles = useMemo(() => {
    if (!selectedMode?.usesPoseAngle || !selectedPose) return angles;
    return angles.filter((a) => !a.family || a.family === selectedPose.family);
  }, [angles, selectedMode, selectedPose]);

  const selectedAngle = useMemo(() => availableAngles.find((a) => a.id === selectedAngleId), [availableAngles, selectedAngleId]);
  const selectedBackground = useMemo(
    () => availableBackgrounds.find((b) => b.id === selectedBackgroundId),
    [availableBackgrounds, selectedBackgroundId]
  );

  // If the garment changes and the current mode/pose is no longer valid for
  // it (e.g. switching from Chaussures to T-shirt while "Semelle" was
  // selected), fall back to the first option that's still available. Same
  // for angle/background when the pose's scene family changes.
  useEffect(() => {
    if (!loaded) return;
    if (!selectedMode && availableModes.length > 0) setSelectedModeId(availableModes[0].id);
    if (!selectedPose && availablePoses.length > 0) setSelectedPoseId(availablePoses[0].id);
    if (!selectedAngle && availableAngles.length > 0) setSelectedAngleId(availableAngles[0].id);
    if (!selectedBackground && availableBackgrounds.length > 0) setSelectedBackgroundId(availableBackgrounds[0].id);
  }, [loaded, selectedMode, selectedPose, selectedAngle, selectedBackground, availableModes, availablePoses, availableAngles, availableBackgrounds]);

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

  // Backfilling only fills in fields a saved entry never had -- it can't
  // pick up a rewritten default value/text for a field that's already
  // present (e.g. an improved pose description), since that would risk
  // clobbering a genuine user edit. This is the explicit escape hatch:
  // wipe everything back to the current built-in defaults.
  function requestReset() {
    setPendingReset(true);
  }

  async function confirmReset() {
    setPendingReset(false);
    setModes(DEFAULT_PROMPT_MODES);
    setClothingTypes(DEFAULT_CLOTHING_TYPES);
    setAngles(DEFAULT_ANGLES);
    setPoses(DEFAULT_POSES);
    setBackgrounds(DEFAULT_BACKGROUNDS);
    setSaving(true);
    try {
      await savePhotoPromptSettings({
        modes: DEFAULT_PROMPT_MODES,
        clothingTypes: DEFAULT_CLOTHING_TYPES,
        angles: DEFAULT_ANGLES,
        poses: DEFAULT_POSES,
        backgrounds: DEFAULT_BACKGROUNDS,
      });
    } catch (err) {
      console.error('[PromptsPhotosClient] reset failed:', err);
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
                <SelectValue placeholder="Choisir…">
                  {(v: string | null) => {
                    const m = availableModes.find((mm) => mm.id === v);
                    return m ? `${m.emoji} ${m.name || 'Sans nom'}` : 'Choisir…';
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#0d1b2a] border border-[#243552] text-slate-100">
                {availableModes.map((m) => (
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
                <PickerSelect options={availablePoses} value={selectedPoseId} onChange={setSelectedPoseId} />
              </Field>
              <Field label="Angle">
                <PickerSelect options={availableAngles} value={selectedAngleId} onChange={setSelectedAngleId} />
              </Field>
            </>
          )}
          <Field label="Fond">
            <PickerSelect options={availableBackgrounds} value={selectedBackgroundId} onChange={setSelectedBackgroundId} />
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
          <ListManager title="Vêtements" options={clothingTypes} onChange={setClothingTypes} onAdd={() => setClothingTypes((p) => [...p, newOption()])} onRemove={removeClothingType} labelPlaceholder="ex: T-shirt" valuePlaceholder="ex: a t-shirt, ..." showKind />
          <ListManager title="Poses" options={poses} onChange={setPoses} onAdd={() => setPoses((p) => [...p, newOption()])} onRemove={removePose} labelPlaceholder="ex: Sur cintre" valuePlaceholder="ex: hanging neatly on a wooden hanger" showRestrictTo />
          <ListManager title="Angles" options={angles} onChange={setAngles} onAdd={() => setAngles((p) => [...p, newOption()])} onRemove={removeAngle} labelPlaceholder="ex: Face" valuePlaceholder="ex: front view" />
          <ListManager title="Fonds" options={backgrounds} onChange={setBackgrounds} onAdd={() => setBackgrounds((p) => [...p, newOption()])} onRemove={removeBackground} labelPlaceholder="ex: Bois" valuePlaceholder="ex: a wooden floor" />
          <ModeManager modes={modes} onChange={setModes} onAdd={() => setModes((p) => [...p, newMode()])} onRemove={removeMode} />
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pt-6 border-t border-[#243552]">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button size="sm" variant="outline" onClick={requestReset} disabled={saving}>
          Réinitialiser
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

      <Dialog open={pendingReset} onOpenChange={(open) => { if (!open) setPendingReset(false); }}>
        <DialogContent className="sm:max-w-sm bg-[#0d1b2a] border-[#243552]">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Réinitialiser tous les prompts ?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Vêtements, poses, angles, fonds et types de photo reviendront tous aux valeurs par défaut. Toute
              personnalisation sera perdue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent border-t-0">
            <Button variant="outline" onClick={() => setPendingReset(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmReset}>
              Réinitialiser
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
        <SelectValue placeholder="Choisir…">
          {(v: string | null) => {
            const o = options.find((oo) => oo.id === v);
            return o ? `${o.emoji ?? ''} ${o.label || 'Sans nom'}`.trim() : 'Choisir…';
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-[#0d1b2a] border border-[#243552] text-slate-100">
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.emoji} {o.label || 'Sans nom'}
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
  showKind,
  showRestrictTo,
}: {
  title: string;
  options: PromptOption[];
  onChange: (next: PromptOption[]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  labelPlaceholder: string;
  valuePlaceholder: string;
  // Vêtements: tag each entry with its silhouette family.
  showKind?: boolean;
  // Poses: restrict which silhouette families can use this pose.
  showRestrictTo?: boolean;
}) {
  function update(id: string, patch: Partial<PromptOption>) {
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function toggleRestrict(o: PromptOption, k: ClothingKind) {
    const current = o.restrictTo && o.restrictTo.length > 0 ? o.restrictTo : CLOTHING_KINDS.map((c) => c.id);
    const next = current.includes(k) ? current.filter((x) => x !== k) : [...current, k];
    update(o.id, { restrictTo: next });
  }

  return (
    <Card className="bg-[#1a2d42]/80 border-[#243552]">
      <CardHeader className="pb-2">
        <span className="text-sm font-semibold text-slate-100">{title}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        {options.map((o) => (
          <div key={o.id} className="space-y-1 rounded-lg border border-[#243552] p-2">
            <div className="flex items-center gap-1.5">
              <input
                value={o.emoji ?? ''}
                onChange={(e) => update(o.id, { emoji: e.target.value })}
                placeholder="✨"
                className="w-10 shrink-0 rounded-lg bg-[#0d1b2a] border border-[#243552] px-1 py-1.5 text-center text-xs text-slate-100 outline-none focus:border-[#00c896]/60"
              />
              <input
                value={o.label}
                onChange={(e) => update(o.id, { label: e.target.value })}
                placeholder={labelPlaceholder}
                className="w-24 shrink-0 rounded-lg bg-[#0d1b2a] border border-[#243552] px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-[#00c896]/60"
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
            {showKind && (
              <select
                value={o.kind ?? 'haut'}
                onChange={(e) => update(o.id, { kind: e.target.value as ClothingKind })}
                className="rounded-lg bg-[#0d1b2a] border border-[#243552] px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-[#00c896]/60"
              >
                {CLOTHING_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            )}
            {showRestrictTo && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Pour :</span>
                {CLOTHING_KINDS.map((k) => (
                  <label key={k.id} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!o.restrictTo || o.restrictTo.length === 0 || o.restrictTo.includes(k.id)}
                      onChange={() => toggleRestrict(o, k.id)}
                    />
                    {k.label}
                  </label>
                ))}
              </div>
            )}
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

  function toggleRestrict(m: PromptMode, k: ClothingKind) {
    const current = m.restrictTo && m.restrictTo.length > 0 ? m.restrictTo : CLOTHING_KINDS.map((c) => c.id);
    const next = current.includes(k) ? current.filter((x) => x !== k) : [...current, k];
    update(m.id, { restrictTo: next });
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
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Pour :</span>
              {CLOTHING_KINDS.map((k) => (
                <label key={k.id} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={!m.restrictTo || m.restrictTo.length === 0 || m.restrictTo.includes(k.id)}
                    onChange={() => toggleRestrict(m, k.id)}
                  />
                  {k.label}
                </label>
              ))}
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
