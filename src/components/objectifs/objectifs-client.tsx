'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, PiggyBank, Pencil, X, ChevronDown } from 'lucide-react';
import { EmojiPicker, EmojiPickerSearch, EmojiPickerContent } from '@/components/ui/emoji-picker';
import { GradientPicker } from '@/components/ui/gradient-picker';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';
import { getSavingsGoals, saveSavingsGoal, updateSavingsGoal, deleteSavingsGoal, generateId } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculations';
import { type SavingsGoal } from '@/types';

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #00c896 0%, #3b82f6 100%)';

export function ObjectifsClient() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [target, setTarget] = useState<number | undefined>();
  const [color, setColor] = useState(DEFAULT_GRADIENT);
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [contribution, setContribution] = useState<number | undefined>();
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const load = () => setGoals(getSavingsGoals());
  useEffect(() => { load(); }, []);

  const handleCreate = () => {
    if (!name.trim() || !target || target <= 0) return;
    saveSavingsGoal({
      id: generateId(),
      name: name.trim(),
      emoji,
      targetAmount: target,
      currentAmount: 0,
      color,
      gradient: color,
      createdAt: new Date().toISOString(),
    });
    setName(''); setEmoji('🎯'); setTarget(undefined); setColor(DEFAULT_GRADIENT);
    setShowForm(false);
    load();
  };

  const handleContribute = (goal: SavingsGoal) => {
    if (!contribution || contribution <= 0) return;
    updateSavingsGoal({ ...goal, currentAmount: Math.min(goal.targetAmount, goal.currentAmount + contribution) });
    setContributingId(null);
    setContribution(undefined);
    load();
  };

  const handleDelete = (id: string) => {
    deleteSavingsGoal(id);
    load();
  };

  const handleEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setEmoji(goal.emoji);
    setTarget(goal.targetAmount);
    setColor(goal.gradient ?? goal.color);
    setShowForm(true);
  };

  const handleUpdate = () => {
    if (!editingGoal || !name.trim() || !target || target <= 0) return;
    updateSavingsGoal({ ...editingGoal, name: name.trim(), emoji, targetAmount: target, color, gradient: color });
    setEditingGoal(null);
    setName(''); setEmoji('🎯'); setTarget(undefined); setColor(DEFAULT_GRADIENT);
    setShowForm(false);
    load();
  };

  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {goals.length > 0 && (
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="w-12 h-12 rounded-full bg-[#00c896] text-[#0d1b2a] flex items-center justify-center hover:bg-[#00b085] transition-colors shadow-lg hover:scale-110 active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-[#1a2d42] border-[#243552]">
            <CardContent className="py-4">
              <p className="text-xs text-slate-400 mb-1">Total épargné</p>
              <p className="text-2xl font-bold text-[#00c896]">{formatCurrency(totalSaved)}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2d42] border-[#243552]">
            <CardContent className="py-4">
              <p className="text-xs text-slate-400 mb-1">Objectif total</p>
              <p className="text-2xl font-bold text-slate-100">{formatCurrency(totalTarget)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <Card className="bg-[#1a2d42] border-[#00c896]/40">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-100 text-base">{editingGoal ? 'Modifier l\'objectif' : 'Nouvel objectif'}</CardTitle>
                  <button onClick={() => { setShowForm(false); setEditingGoal(null); setName(''); setEmoji('🎯'); setTarget(undefined); setColor(DEFAULT_GRADIENT); }} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Emoji picker */}
                <div>
                  <Label className="text-slate-400 text-xs mb-2 block">Icône</Label>
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker((v) => !v)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0d1b2a] border border-[#243552] hover:border-[#00c896]/50 transition-colors text-sm text-slate-200"
                    >
                      <span className="text-xl">{emoji}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-full left-0 mt-1 z-50">
                        <EmojiPicker
                          className="h-[280px] w-[300px] shadow-2xl"
                          onEmojiSelect={({ emoji: e }) => { setEmoji(e); setShowEmojiPicker(false); }}
                        >
                          <EmojiPickerSearch />
                          <EmojiPickerContent />
                        </EmojiPicker>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Nom de l&apos;objectif</Label>
                  <Input placeholder="Ex : Vacances, Voiture, Apport…" value={name} onChange={(e) => setName(e.target.value)}
                    className="bg-[#0d1b2a] border-[#243552] text-slate-100 mt-1" />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Montant cible (€)</Label>
                  <div className="mt-1">
                    <NumberInput value={target} onChange={(v) => setTarget(isNaN(v) ? undefined : v)} min={1} step={100} formatOptions={{ maximumFractionDigits: 0 }} />
                  </div>
                </div>
                {/* Gradient picker */}
                <GradientPicker value={color} onChange={setColor} label="Dégradé" />
                <Button onClick={editingGoal ? handleUpdate : handleCreate} disabled={!name.trim() || !target} className="w-full bg-[#00c896] text-[#0d1b2a] hover:bg-[#00b085] font-semibold">
                  {editingGoal ? 'Enregistrer les modifications' : 'Créer l\'objectif'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals grid */}
      {goals.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#1a2d42] border border-[#243552] flex items-center justify-center">
            <PiggyBank className="w-10 h-10 text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Aucun objectif</h2>
          <p className="text-slate-500 text-sm max-w-xs">Créez votre premier objectif d&apos;épargne pour suivre vos projets : vacances, voiture, apport immobilier…</p>
          <ButtonColorful label="Créer un objectif" onClick={() => setShowForm(true)} className="px-6" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {goals.map((goal) => {
              const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
              const done = pct >= 100;
              return (
                <motion.div key={goal.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                  <Card className="bg-[#1a2d42] border-[#243552] flex flex-col">
                    <CardContent className="pt-5 flex flex-col gap-3 flex-1">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{goal.emoji}</span>
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{goal.name}</p>
                            {done && <span className="text-xs text-[#00c896] font-medium">Objectif atteint !</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(goal)} className="text-slate-600 hover:text-[#00c896] transition-colors p-1" title="Modifier">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(goal.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1" title="Supprimer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="h-2.5 bg-[#0d1b2a] rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ background: goal.gradient ?? goal.color }}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                          <span className="font-semibold" style={{ color: goal.color }}>{formatCurrency(goal.currentAmount)}</span>
                          <span>{pct.toFixed(0)}% — {formatCurrency(goal.targetAmount)}</span>
                        </div>
                      </div>

                      {/* Remaining */}
                      {!done && (
                        <p className="text-xs text-slate-500">Reste <span className="text-slate-300 font-medium">{formatCurrency(goal.targetAmount - goal.currentAmount)}</span> à épargner</p>
                      )}

                      {/* Contribute */}
                      {contributingId === goal.id ? (
                        <div className="flex gap-2 mt-auto">
                          <div className="flex-1">
                            <NumberInput value={contribution} onChange={(v) => setContribution(isNaN(v) ? undefined : v)} min={1} step={50} formatOptions={{ maximumFractionDigits: 0 }} />
                          </div>
                          <Button onClick={() => handleContribute(goal)} disabled={!contribution} className="bg-[#00c896] text-[#0d1b2a] hover:bg-[#00b085] px-3 shrink-0">✓</Button>
                          <Button onClick={() => { setContributingId(null); setContribution(undefined); }} className="bg-[#243552] text-slate-300 hover:bg-[#2d4266] px-3 shrink-0">✕</Button>
                        </div>
                      ) : (
                        <button onClick={() => { setContributingId(goal.id); setContribution(undefined); }} disabled={done}
                          className="mt-auto w-full py-2 rounded-lg text-xs font-semibold border border-[#243552] text-slate-400 hover:border-[#00c896] hover:text-[#00c896] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          + Ajouter une contribution
                        </button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
