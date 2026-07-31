'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getSyncStatus } from '@/lib/vinted-orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { FavoriteMessagesCard } from './favorite-messages-card';
import { KeyRound } from 'lucide-react';

export function ParametresClient() {
  const [cookiesJson, setCookiesJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<{ status: string; lastSyncAt: string | null } | null>(null);

  useEffect(() => {
    getSyncStatus().then(setStatus);
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    let cookies: unknown;
    try {
      cookies = JSON.parse(cookiesJson);
    } catch {
      setMessage('Erreur : format JSON invalide');
      setSaving(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non connecté');

      const res = await fetch('/api/vinted-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ cookies }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur inconnue');

      setMessage('Cookies enregistrés. La prochaine synchronisation les utilisera.');
    } catch (err) {
      setMessage(`Erreur : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    } finally {
      setCookiesJson('');
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-[#00c896]" />
        Paramètres
      </h1>

      <Card className="bg-[#1a2d42]/80 border-[#243552] mb-6">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">Statut de la synchronisation</CardTitle>
        </CardHeader>
        <CardContent>
          {status ? (
            <p className="text-sm text-slate-300">
              Statut : <strong>{status.status}</strong>
              {status.lastSyncAt && ` — dernière tentative le ${new Date(status.lastSyncAt).toLocaleString('fr-FR')}`}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Aucune synchronisation configurée pour l&apos;instant.</p>
          )}
        </CardContent>
      </Card>

      <FavoriteMessagesCard />

      <Card className="bg-[#1a2d42]/80 border-[#243552]">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">Connexion à Vinted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Installe l&apos;extension <strong>Cookie-Editor</strong>, va sur vinted.fr connecté, ouvre
            l&apos;extension, clique sur «&nbsp;Export&nbsp;» → «&nbsp;Export as JSON&nbsp;»
            (copie dans le presse-papiers), puis colle le résultat ci-dessous.
          </p>
          <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            ⚠️ Ce texte donne un accès complet à ton compte Vinted, au même titre qu&apos;un mot de passe. Ne le partage jamais (support, capture d&apos;écran, autre site).
          </p>
          <textarea
            value={cookiesJson}
            onChange={(e) => setCookiesJson(e.target.value)}
            placeholder='[{"name":"access_token_web","value":"...","domain":".vinted.fr",...}, ...]'
            rows={6}
            className="w-full rounded-lg bg-[#0d1b2a] border border-[#243552] p-3 text-xs text-slate-200 font-mono"
          />
          {message && <p className="text-xs text-slate-300">{message}</p>}
          <ButtonColorful
            onClick={handleSave}
            disabled={saving || cookiesJson.trim().length === 0}
            label={saving ? 'Enregistrement…' : 'Enregistrer'}
            showArrow={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
