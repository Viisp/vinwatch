'use client';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Copy, Check, Hash } from 'lucide-react';

const TYPE_SUGGESTIONS = ['T-shirt', 'Chemise', 'Sweat', 'Veste', 'Short', 'Jean', 'Jogging', 'Chaussures', 'Casquette', 'Robe', 'Jupe', 'Pull', 'Polo'];
const ETATS = ['Neuf avec étiquette', 'Neuf sans étiquette', 'Très bon état', 'Bon état', 'Satisfaisant'];

// Niche/style hashtags per type on top of the always-present + brand ones --
// purely template-driven (no AI call), same spirit as prompts-photos.
const TYPE_HASHTAGS: Record<string, string[]> = {
  tshirt: ['tshirt', 'haut', 'casual'],
  chemise: ['chemise', 'haut', 'chic'],
  sweat: ['sweat', 'hoodie', 'streetwear'],
  pull: ['pull', 'maille', 'automnehiver'],
  polo: ['polo', 'chic', 'casual'],
  veste: ['veste', 'outerwear', 'style'],
  short: ['short', 'bas', 'ete'],
  jean: ['jean', 'denim', 'bas'],
  jogging: ['jogging', 'bas', 'sport'],
  chaussures: ['chaussures', 'sneakers', 'shoes'],
  casquette: ['casquette', 'accessoire', 'cap'],
  robe: ['robe', 'dress', 'femme'],
  jupe: ['jupe', 'skirt', 'femme'],
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

function guessTypeHashtags(type: string): string[] {
  const words = type.toLowerCase().split(/\s+/);
  for (const w of words) {
    const slug = slugTag(w);
    if (TYPE_HASHTAGS[slug]) return TYPE_HASHTAGS[slug];
  }
  return words.slice(0, 2).map(slugTag).filter(Boolean);
}

export function AnnonceClient() {
  const [type, setType] = useState('T-shirt');
  const [marque, setMarque] = useState('');
  const [taille, setTaille] = useState('');
  const [mesures, setMesures] = useState('');
  const [etat, setEtat] = useState('Très bon état');
  const [etatDetail, setEtatDetail] = useState('');
  const [couleur, setCouleur] = useState('');
  const [details, setDetails] = useState('');
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const title = useMemo(() => {
    return [marque.trim(), type.trim(), couleur.trim(), taille.trim() && `Taille ${taille.trim()}`]
      .filter(Boolean)
      .join(' ');
  }, [marque, type, couleur, taille]);

  const description = useMemo(() => {
    const article = [marque.trim(), type.trim()].filter(Boolean).join(' ') || 'cet article';
    const lines: string[] = [];

    // Accroche
    lines.push(
      `Craquez pour ${article}${couleur.trim() ? `, coloris ${couleur.trim().toLowerCase()}` : ''} — une pièce qui a tout pour plaire !`
    );
    lines.push('');

    // Caractéristiques
    lines.push('✨ Caractéristiques :');
    if (couleur.trim()) lines.push(`• Couleur / Motif : ${couleur.trim()}`);
    if (type.trim()) lines.push(`• Type : ${type.trim()}`);
    if (details.trim()) lines.push(`• Détails : ${details.trim()}`);
    lines.push('');

    // Mesures
    lines.push('📏 Mesures :');
    if (mesures.trim()) {
      lines.push(mesures.trim());
    } else if (taille.trim()) {
      lines.push(`Taille ${taille.trim()} (mesures précises sur demande)`);
    } else {
      lines.push('Mesures précises sur demande');
    }
    lines.push('');

    // État
    const etatLine = etatDetail.trim() ? `${etat} — ${etatDetail.trim()}` : etat;
    lines.push(`✅ État : ${etatLine}`);
    lines.push('');

    // Envoi
    lines.push('📦 Envoi rapide et soigné sous 24-48h !');
    lines.push('💬 N\'hésitez pas à me contacter pour toute question 😊');

    return lines.join('\n');
  }, [marque, type, couleur, details, mesures, taille, etat, etatDetail]);

  const hashtags = useMemo(() => {
    const base = ['vinted', 'secondemain', 'modedurable', 'bonneaffaire'];
    const marqueTag = marque.trim() ? [slugTag(marque)] : [];
    const couleurTag = couleur.trim() ? [slugTag(couleur)] : [];
    const typeTags = guessTypeHashtags(type);
    return Array.from(new Set([...base, ...marqueTag, ...typeTags, ...couleurTag])).filter(Boolean).slice(0, 15);
  }, [marque, type, couleur]);

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
        Renseigne les infos de l&apos;article pour générer un titre optimisé, une description structurée (accroche,
        caractéristiques, mesures, état, envoi) et des hashtags ciblés, prêts à coller sur Vinted.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1a2d42]/80 border-[#243552]">
          <CardHeader>
            <span className="text-sm font-semibold text-slate-100">Informations de l&apos;article</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="marque" className="text-slate-400">Marque</Label>
              <Input id="marque" value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="ex: Lacoste" className="bg-[#0d1b2a] border-[#243552] text-slate-100" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-slate-400">Type d&apos;article</Label>
              <Input
                id="type"
                list="type-suggestions"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="ex: Polo en maille tricot"
                className="bg-[#0d1b2a] border-[#243552] text-slate-100"
              />
              <datalist id="type-suggestions">
                {TYPE_SUGGESTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taille" className="text-slate-400">Taille officielle</Label>
              <Input id="taille" value={taille} onChange={(e) => setTaille(e.target.value)} placeholder="ex: S / FR 3" className="bg-[#0d1b2a] border-[#243552] text-slate-100" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mesures" className="text-slate-400">Mesures (optionnel)</Label>
              <Input id="mesures" value={mesures} onChange={(e) => setMesures(e.target.value)} placeholder="ex: Aisselle à aisselle 48cm, Longueur 60cm" className="bg-[#0d1b2a] border-[#243552] text-slate-100" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="couleur" className="text-slate-400">Couleur / Motif</Label>
              <Input id="couleur" value={couleur} onChange={(e) => setCouleur(e.target.value)} placeholder="ex: Rayé bleu et vert néon" className="bg-[#0d1b2a] border-[#243552] text-slate-100" />
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
              <Label htmlFor="etatDetail" className="text-slate-400">Précision état (optionnel)</Label>
              <Input id="etatDetail" value={etatDetail} onChange={(e) => setEtatDetail(e.target.value)} placeholder="ex: aucune tache ni trou" className="bg-[#0d1b2a] border-[#243552] text-slate-100" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="details" className="text-slate-400">Détails importants (optionnel)</Label>
              <Input id="details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="ex: Made in France, boutons gravés, matière fluide" className="bg-[#0d1b2a] border-[#243552] text-slate-100" />
            </div>
            <Button type="button" className="w-full" onClick={() => setGenerated(true)}>
              <FileText className="w-4 h-4" /> Générer la description
            </Button>
          </CardContent>
        </Card>

        {generated ? (
          <div className="space-y-4">
            <Card className="bg-[#1a2d42]/80 border-[#00c896]/40">
              <CardHeader>
                <span className="text-sm font-semibold text-[#00c896]">✓ Titre optimisé</span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-200 rounded-lg bg-[#0d1b2a] border border-[#243552] p-3">
                  {title || 'Remplis au moins la marque ou le type'}
                </p>
              </CardContent>
            </Card>

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
                  <Hash className="w-4 h-4 text-[#00c896]" /> Hashtags ciblés ({hashtags.length})
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
