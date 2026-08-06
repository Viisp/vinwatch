'use client';
import { useState } from 'react';
import { Copy, Check, ChevronDown, Trash2 } from 'lucide-react';
import type { PhotoPrompt } from '@/data/photo-prompts';

export function PromptRow({
  prompt,
  id,
  expanded,
  onToggle,
  onChange,
  onDelete,
}: {
  prompt: PhotoPrompt;
  id?: string;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<PhotoPrompt>) => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div id={id} className="rounded-xl border border-[#243552] bg-[#0d1b2a] overflow-hidden scroll-mt-24">
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-2 p-3 text-left">
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        <span className="flex-1 truncate text-sm text-slate-100 font-medium">
          {prompt.emoji} {prompt.angle || 'Nouveau prompt'}
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            void handleCopy();
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-[#1a2d42]"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> Copié
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copier
            </>
          )}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={prompt.emoji}
              onChange={(e) => onChange({ emoji: e.target.value })}
              placeholder="🟢"
              className="w-14 rounded-lg bg-[#1a2d42] border border-[#243552] px-2 py-2 text-sm text-center text-slate-100 outline-none focus:border-[#00c896]/60 focus:ring-1 focus:ring-[#00c896]/40"
            />
            <input
              value={prompt.angle}
              onChange={(e) => onChange({ angle: e.target.value })}
              placeholder="Nom de l'angle (ex: Face)"
              className="flex-1 rounded-lg bg-[#1a2d42] border border-[#243552] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#00c896]/60 focus:ring-1 focus:ring-[#00c896]/40"
            />
            <button
              type="button"
              onClick={onDelete}
              aria-label="Supprimer le prompt"
              className="shrink-0 rounded-lg p-2 text-red-400 hover:bg-[#1a2d42]"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={prompt.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Texte du prompt…"
            rows={6}
            className="w-full resize-none rounded-lg bg-[#1a2d42] border border-[#243552] p-3 text-xs leading-relaxed text-slate-300 outline-none focus:border-[#00c896]/60 focus:ring-1 focus:ring-[#00c896]/40"
          />
        </div>
      )}
    </div>
  );
}
