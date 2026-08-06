'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PromptRow } from './prompt-row';
import { GARMENT_PROMPTS, GENERIC_PROMPTS } from '@/data/photo-prompts';
import { Camera, Sparkles } from 'lucide-react';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function PromptsPhotosClient() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-2">
        <Camera className="w-5 h-5 text-[#00c896]" />
        Prompts photos
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Prompts prêts à copier pour générer des photos d&apos;annonces Vinted premium. Choisis un vêtement ci-dessous, un
        angle, copie le prompt, et colle-le dans ton outil IA avec ta photo source.
      </p>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2 mb-8">
        {GARMENT_PROMPTS.map((g) => (
          <a
            key={g.slug}
            href={`#${g.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#243552] bg-[#1a2d42] px-3 py-1.5 text-sm text-slate-200 hover:border-[#00c896]/60 hover:text-[#00c896] transition-colors"
          >
            <span>{g.emoji}</span> {g.name}
          </a>
        ))}
        <a
          href="#generique"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#243552] bg-[#1a2d42] px-3 py-1.5 text-sm text-slate-200 hover:border-[#00c896]/60 hover:text-[#00c896] transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" /> Génériques
        </a>
      </div>

      <div className="space-y-6">
        {GARMENT_PROMPTS.map((g) => (
          <Card key={g.slug} id={g.slug} className="bg-[#1a2d42]/80 border-[#243552] scroll-mt-20">
            <CardHeader>
              <CardTitle className="text-slate-100 text-base">
                {g.emoji} {g.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {g.prompts.map((p) => (
                <PromptRow key={p.angle} prompt={p} id={`${g.slug}-${slugify(p.angle)}`} />
              ))}
            </CardContent>
          </Card>
        ))}

        <Card id="generique" className="bg-[#1a2d42]/80 border-[#243552] scroll-mt-20">
          <CardHeader>
            <CardTitle className="text-slate-100 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00c896]" />
              Prompts génériques (valables pour n&apos;importe quel vêtement)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {GENERIC_PROMPTS.map((p) => (
              <PromptRow key={p.angle} prompt={p} id={`generique-${slugify(p.angle)}`} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
