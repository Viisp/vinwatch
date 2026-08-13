'use client';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Copy, Check, Hash } from 'lucide-react';

const TYPES = ['T-shirt', 'Chemise', 'Sweat', 'Veste', 'Short', 'Jean', 'Jogging', 'Chaussures', 'Casquette', 'Robe', 'Jupe'];
const ETATS = ['Neuf avec étiquette', 'Neuf sans étiquette', 'Très bon état', 'Bon état', 'Satisfaisant'];

// A few generic type-specific hashtags on top of the always-present ones --
// purely template-driven (no AI call), same spirit as prompts-photos.
const TYPE_HASHTAGS: Record<string, string[]> = {
  'T-shirt': ['tshirt', 'haut', 'casual'],
  Chemise: ['chemise', 'haut', 'chic'],
  Sweat: ['sweat', 'hoodie', 'streetwear'],
  Veste: ['veste', 'outerwear', 'style'],
  Short: ['short', 'bas', 'ete'],
  Jean: ['jean', 'denim', 'bas'],
  Jogging: ['jogging', 'bas', 'sport'],
  Chaussures: ['chaussures', 'sneakers', 'shoes'],
  Casquette: ['casquette', 'accessoire', 'cap'],
  Robe: ['robe', 'dress', 'femme'],
  Jupe: ['jupe', 'skirt', 'femme'],
};

function slugTag(s: string): string {
  // NFKD splits accented letters into base + combining mark, then the
  // alphanumeric filter drops the (now-separate) accent along with any
  // other punctuation/spaces -- e.g. "Ralph Lauren" -> "ralphlauren".
  return s
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

export function AnnonceClient() {
  const [type, setType] = useState('T-shirt');
  const [marque, setMarque] = useState('');
  const [taille, setTaille] = useState('');
  const [etat, setEtat] = useState('Très bon état');
  const [couleur, setCouleur] = useState('');
  const [matiere, setMatiere] = useState('');
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const title = useMemo(() => {
    return [type, marque.trim(), couleur.trim()].filter(Boolean).join(' ');
  }, [type, marque, couleur]);

  const description = useMemo(() => {
    const lines = [title || type];
    lines.push('');
    if (taille.trim()) lines.push(`📏 Taille : ${taille.trim()}`);
    lines.push(`✨ État : ${etat.toLowerCase()}`);
    if (matiere.trim()) lines.push(`🧵 Matière : ${matiere.trim()}`);
    lines.push('');
    lines.push('Un indispensable à avoir !');
    lines.push('');
    lines.push('📦 Envoi soigné et rapide');
    lines.push('💬 N\'hésitez pas à me contacter pour plus d\'infos !');
    return lines.join('\n');
  }, [title, type, taille, etat, matiere]);

  const hashtags = useMemo(() => {
    const base = ['vinted', 'secondemain', 'modedurable'];
    const typeTags = TYPE_HASHTAGS[type] ?? [slugTag(type)];
    const marqueTag = marque.trim() ? [slugTag(marque)] : [];
    return Array.from(new Set([...base, ...marqueTag, ...typeTags])).filter(Boolean);
  }, [type, marque]);

  async function handleCopyDescription() {
    await navigator.clipboard.writeText(description);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCopyTag(tag: string) {
    await navigator.clipboard.writeText(`#${tag}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-2">
        <FileText className="w-5 h-5 text-[#00c896]" />
        Générateur d&apos;annonce
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Renseigne les infos de l&apos;article pour générer un titre, une description et des hashtags prêts à coller
        sur Vinted.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1a2d42]/80 border-[#243552]">
          <CardHeader>
            <span className="text-sm font-semibold text-slate-100">Informations de l&apos;article</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-400">Type d&apos;article</Label>
              <Select value={type} onValueChange={(v) => setType(v ?? 'T-shirt')}>
                <SelectTrigger className="w-full bg-[#0d1b2a] border-[#243552] text-slate-100">
                  <SelectValue placeholder="Choisir…">{() => type}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#0d1b2a] border border-[#243552] text-slate-100">
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="marque" className="text-slate-400">Marque</Label>
              <Input id="marque" value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="ex: Izod" className="bg-[#0d1b2a] border-[#243552] text-slate-100" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taille" className="text-slate-400">Taille</Label>
              <Input id="taille" value={taille} onChange={(e) => setTaille(e.target.value)} placeholder="ex: M" className="bg-[#0d1b2a] border-[#243552] text-slate-100" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400">État</Label>
              <Select value={etat} onValueChange={(v) => setEtat(v ?? ETATS[0])}>
                <SelectTrigger className="w-full bg-[#0d1b2a] border-[#243552] text-slate-100">
                  <SelectValue placeholder="Choisir…">{() => etat}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#0d1b2a] border border-[#243552] text-slate-100">
                  {ETATS.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="couleur" className="text-slate-400">Couleur</Label>
              <Input id="couleur" value={couleur} onChange={(e) => setCouleur(e.target.value)} placeholder="ex: Noir" className="bg-[#0d1b2a] border-[#243552] text-slate-100" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="matiere" className="text-slate-400">Matière (optionnel)</Label>
              <Input id="matiere" value={matiere} onChange={(e) => setMatiere(e.target.value)} placeholder="Ex: Coton, Cuir, Polyester…" className="bg-[#0d1b2a] border-[#243552] text-slate-100" />
            </div>
            <Button type="button" className="w-full" onClick={() => setGenerated(true)}>
              <FileText className="w-4 h-4" /> Générer la description
            </Button>
          </CardContent>
        </Card>

        {generated ? (
          <div className="space-y-4">
            <Card className="bg-[#1a2d42]/80 border-[#00c896]/40">
              <CardHeader className="flex flex-row items-center justify-between">
                <span className="text-sm font-semibold text-[#00c896]">✓ Description générée</span>
                <Button type="button" variant="ghost" size="sm" onClick={handleCopyDescription}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copié' : 'Copier'}
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-200 whitespace-pre-wrap rounded-lg bg-[#0d1b2a] border border-[#243552] p-3">
                  {description}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2d42]/80 border-[#243552]">
              <CardHeader>
                <span className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-[#00c896]" /> Hashtags suggérés
                </span>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {hashtags.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => handleCopyTag(tag)}
                    title="Copier"
                    className="rounded-full bg-[#0d1b2a] border border-[#243552] px-3 py-1.5 text-xs text-slate-300 hover:border-[#00c896]/60 hover:text-[#00c896] transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-[#243552] text-slate-500 text-sm min-h-[300px]">
            Remplis le formulaire et clique sur &quot;Générer la description&quot;
          </div>
        )}
      </div>
    </div>
  );
}
