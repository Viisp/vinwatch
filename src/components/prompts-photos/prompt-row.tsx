'use client';
import { useState } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import type { PhotoPrompt } from '@/data/photo-prompts';

export function PromptRow({ prompt, id }: { prompt: PhotoPrompt; id?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div id={id} className="rounded-xl border border-[#243552] bg-[#0d1b2a] overflow-hidden scroll-mt-24">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-2 p-3 text-left">
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        <span className="flex-1 text-sm text-slate-100 font-medium">
          {prompt.emoji} {prompt.angle}
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
        <div className="px-4 pb-4">
          <p className="text-xs leading-relaxed text-slate-400 bg-[#1a2d42] rounded-lg p-3">{prompt.text}</p>
        </div>
      )}
    </div>
  );
}
