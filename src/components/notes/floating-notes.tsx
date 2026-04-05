'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { StickyNote, X, Save, ExternalLink, GripHorizontal } from 'lucide-react';
import { saveNote, generateId } from '@/lib/storage';
import { createClient } from '@/lib/supabase';

type Corner = 'tl' | 'tr' | 'bl' | 'br';

const MIN_W = 240;
const MIN_H = 220;
const INIT_W = 288;
const INIT_H = 280;

export function FloatingNotes() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [size, setSize] = useState({ width: INIT_W, height: INIT_H });
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // position shift during resize from tl/tr/bl
  const constraintsRef = useRef(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!loggedIn) return null;

  const handleSave = () => {
    if (!title.trim() && !content.trim()) return;
    saveNote({
      id: generateId(),
      title: title.trim() || 'Sans titre',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); setTitle(''); setContent(''); }, 1500);
  };

  const startResize = (e: React.PointerEvent, corner: Corner) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.width;
    const startH = size.height;
    const startOX = offset.x;
    const startOY = offset.y;
    const ratio = startH / startW; // ratio verrouillé

    const onMove = (ev: PointerEvent) => {
      // Signe du delta selon le coin : +1 ou -1
      const signX = (corner === 'br' || corner === 'tr') ? 1 : -1;
      const signY = (corner === 'br' || corner === 'bl') ? 1 : -1;
      const dx = (ev.clientX - startX) * signX;
      const dy = (ev.clientY - startY) * signY;

      // Projection sur la diagonale normalisée → 1 px de souris = 1 px de resize
      const diag = Math.SQRT2;
      const delta = (dx + dy) / diag;
      const w = Math.max(MIN_W, startW + delta);
      const h = Math.max(MIN_H, w * ratio);

      // Ajustement de position pour les coins qui "poussent" vers haut/gauche
      const ox = (corner === 'tl' || corner === 'bl') ? startOX + (startW - w) : startOX;
      const oy = (corner === 'tl' || corner === 'tr') ? startOY + (startH - h) : startOY;

      setSize({ width: w, height: h });
      setOffset({ x: ox, y: oy });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const cornerClass = 'absolute w-5 h-5 z-10';

  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[90]" />

      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={constraintsRef}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[100] cursor-grab active:cursor-grabbing"
        whileDrag={{ scale: 1.02 }}
      >
        <AnimatePresence mode="wait">
          {!open ? (
            <motion.button
              key="trigger"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => setOpen(true)}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-12 h-12 rounded-full bg-[#1a2d42] border border-[#243552] text-[#00c896] shadow-lg hover:bg-[#243552] hover:scale-110 transition-colors flex items-center justify-center cursor-pointer"
              title="Notes rapides"
            >
              <StickyNote className="w-5 h-5" />
            </motion.button>
          ) : (
            <motion.div
              key="panel"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
            >
              <div
                className="relative rounded-xl bg-[#1a2d42] border border-[#243552] shadow-2xl flex flex-col overflow-hidden"
                style={{ width: size.width, height: size.height }}
              >
                {/* Poignées 4 coins — coins en L, visibles au survol */}
                <div className={`${cornerClass} top-0 left-0 cursor-nw-resize group`} onPointerDown={(e) => startResize(e, 'tl')}>
                  <svg width="12" height="12" className="text-[#243552] group-hover:text-[#00c896] transition-colors"><path d="M10 2H2v8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
                </div>
                <div className={`${cornerClass} top-0 right-0 cursor-ne-resize group`} onPointerDown={(e) => startResize(e, 'tr')}>
                  <svg width="12" height="12" className="text-[#243552] group-hover:text-[#00c896] transition-colors"><path d="M2 2h8v8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
                </div>
                <div className={`${cornerClass} bottom-0 left-0 cursor-sw-resize group`} onPointerDown={(e) => startResize(e, 'bl')}>
                  <svg width="12" height="12" className="text-[#243552] group-hover:text-[#00c896] transition-colors"><path d="M10 10H2V2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
                </div>
                <div className={`${cornerClass} bottom-0 right-0 cursor-se-resize group`} onPointerDown={(e) => startResize(e, 'br')}>
                  <svg width="12" height="12" className="text-[#243552] group-hover:text-[#00c896] transition-colors"><path d="M2 10h8V2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#243552] bg-[#0d1b2a]/50 shrink-0">
                  <div className="flex items-center gap-2 text-slate-500">
                    <GripHorizontal className="w-4 h-4" />
                    <span className="text-xs font-medium text-slate-400">Note rapide</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href="/notes"
                      onClick={() => setOpen(false)}
                      className="p-1 rounded text-slate-500 hover:text-[#00c896] transition-colors"
                      title="Voir toutes les notes"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setOpen(false)}
                      className="p-1 rounded text-slate-500 hover:text-slate-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contenu */}
                <div className="p-3 flex flex-col gap-2 flex-1 min-h-0">
                  <input
                    autoFocus
                    placeholder="Titre…"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full shrink-0 bg-[#0d1b2a] border border-[#243552] rounded-lg px-3 py-2 text-sm font-medium text-slate-100 placeholder:text-slate-500 outline-none focus:border-[#00c896] transition-colors"
                  />
                  <textarea
                    placeholder="Écrivez votre note…"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-1 min-h-0 resize-none bg-[#0d1b2a] border border-[#243552] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#00c896] transition-colors leading-relaxed"
                  />
                  <button
                    onClick={handleSave}
                    disabled={!title.trim() && !content.trim()}
                    className="w-full shrink-0 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#00c896] text-[#0d1b2a] text-sm font-semibold hover:bg-[#00b085] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saved ? 'Enregistrée ✓' : 'Enregistrer la note'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
