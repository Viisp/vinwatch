'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { getNotes, saveNote, updateNote, deleteNote, generateId } from '@/lib/storage';
import { type Note } from '@/types';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';

export function NotesClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saved, setSaved] = useState(false);

  const load = () => setNotes(getNotes());
  useEffect(() => { load(); }, []);

  const handleCreate = () => {
    if (!newTitle.trim() && !newContent.trim()) return;
    saveNote({ id: generateId(), title: newTitle.trim() || 'Sans titre', content: newContent.trim(), createdAt: new Date().toISOString() });
    setNewTitle(''); setNewContent(''); setShowForm(false);
    load();
  };

  const handleSelect = (note: Note) => {
    setSelected(note); setEditTitle(note.title); setEditContent(note.content);
    setSaved(false);
  };

  const handleSave = () => {
    if (!selected) return;
    const updated = { ...selected, title: editTitle || 'Sans titre', content: editContent };
    updateNote(updated); setSelected(updated); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  /* ── État vide ── */
  if (notes.length === 0 && !showForm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-[#1a2d42] border border-[#243552] flex items-center justify-center">
          <Pencil className="w-9 h-9 text-slate-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Aucune note</h2>
        <p className="text-slate-500 text-sm max-w-xs">Notez vos objectifs financiers, rappels de paiement, idées d&apos;économies…</p>
        <ButtonColorful label="Créer ma première note" onClick={() => setShowForm(true)} className="px-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Mes notes</h1>
        <button
          onClick={() => { setShowForm((v) => !v); setNewTitle(''); setNewContent(''); }}
          className="w-12 h-12 rounded-full bg-[#00c896] text-[#0d1b2a] flex items-center justify-center hover:bg-[#00b085] transition-colors shadow-lg hover:scale-110 active:scale-95"
        >
          {showForm ? <X className="w-6 h-6" /> : <Plus className="w-7 h-7" />}
        </button>
      </div>

      {/* Formulaire nouvelle note */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <Card className="bg-[#1a2d42] border-[#00c896]/40">
              <CardContent className="p-3 space-y-2">
                <input
                  autoFocus
                  placeholder="Titre…"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0d1b2a] border border-[#243552] rounded-lg px-3 py-2 text-sm font-medium text-slate-100 placeholder:text-slate-500 outline-none focus:border-[#00c896] transition-colors"
                />
                <textarea
                  placeholder="Contenu…"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                  className="w-full resize-none bg-[#0d1b2a] border border-[#243552] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#00c896] transition-colors leading-relaxed"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() && !newContent.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#00c896] text-[#0d1b2a] text-sm font-semibold hover:bg-[#00b085] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-3.5 h-3.5" /> Enregistrer
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grille liste + éditeur */}
      {notes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Liste */}
          <div className="lg:col-span-1 space-y-2">
            <AnimatePresence>
              {notes.map((note) => (
                <motion.div key={note.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Card
                    onClick={() => handleSelect(note)}
                    className={`bg-[#1a2d42] border-[#243552] cursor-pointer transition-colors hover:border-[#00c896]/40 ${selected?.id === note.id ? 'border-[#00c896]/50' : ''}`}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-100 truncate">{note.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{note.content || '(vide)'}</p>
                          <p className="text-xs text-slate-600 mt-1">{fmt(note.createdAt)}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Éditeur */}
          <div className="lg:col-span-2">
            <Card className="bg-[#1a2d42] border-[#243552]">
              {selected ? (
                <CardContent className="p-0 flex flex-col min-h-[360px]">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[#243552]">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 bg-transparent text-base font-bold text-slate-100 outline-none placeholder:text-slate-500"
                      placeholder="Titre…"
                    />
                    <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00c896] text-[#0d1b2a] hover:bg-[#00b085] transition-colors shrink-0">
                      <Save className="w-3 h-3" />
                      {saved ? 'Enregistré ✓' : 'Enregistrer'}
                    </button>
                    <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Écrivez ici…"
                    className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none leading-relaxed min-h-[300px]"
                  />
                  <div className="px-4 py-2 border-t border-[#243552] text-xs text-slate-600">
                    {fmt(selected.createdAt)}
                  </div>
                </CardContent>
              ) : (
                <CardContent className="flex flex-col items-center justify-center min-h-[360px] text-slate-500 text-sm gap-2">
                  <Pencil className="w-8 h-8 text-slate-700" />
                  <p>Sélectionnez une note pour l&apos;éditer.</p>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
