'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getVintedAccounts, type VintedAccount } from '@/lib/vinted-orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyRound, ChevronDown, Trash2, Plus } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  ok: '✅ OK',
  expired: '🔴 Session expirée',
  error: '⚠️ Erreur',
  never_synced: '⏳ Jamais synchronisé',
};

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Non connecté');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };
}

function AccountCard({ account, onChanged }: { account: VintedAccount; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [cookiesJson, setCookiesJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState(account.label);
  const [renaming, setRenaming] = useState(false);

  async function handleRename() {
    if (!labelInput.trim() || labelInput.trim() === account.label) return;
    setRenaming(true);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/vinted-session', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sessionId: account.id, label: labelInput.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur inconnue');
      onChanged();
    } catch (err) {
      setMessage(`Erreur : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    } finally {
      setRenaming(false);
    }
  }

  async function handleRepaste() {
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
      const headers = await authHeader();
      const res = await fetch('/api/vinted-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ cookies, sessionId: account.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur inconnue');
      setMessage('Cookies mis à jour.');
      setCookiesJson('');
      onChanged();
    } catch (err) {
      setMessage(`Erreur : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/vinted-session?sessionId=${account.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur inconnue');
      onChanged();
    } catch (err) {
      setMessage(`Erreur : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    }
  }

  return (
    <div className="rounded-xl border border-[#243552] bg-[#0d1b2a] overflow-hidden">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-2 p-3 text-left">
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        <span className="flex-1 text-sm text-slate-100 font-medium">
          {account.label}
          {account.login && <span className="text-slate-400 font-normal"> — {account.login}</span>}
        </span>
        <span className="text-xs text-slate-400">{STATUS_LABEL[account.lastSyncStatus] ?? account.lastSyncStatus}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="Nom du compte"
              className="flex-1 rounded-lg bg-[#1a2d42] border border-[#243552] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#00c896]/60 focus:ring-1 focus:ring-[#00c896]/40"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRename}
              disabled={renaming || !labelInput.trim() || labelInput.trim() === account.label}
            >
              {renaming ? 'Renommage…' : 'Renommer'}
            </Button>
          </div>
          {account.lastSyncAt && (
            <p className="text-xs text-slate-500">
              Dernière tentative le {new Date(account.lastSyncAt).toLocaleString('fr-FR')}
            </p>
          )}
          <textarea
            value={cookiesJson}
            onChange={(e) => setCookiesJson(e.target.value)}
            placeholder='[{"name":"access_token_web","value":"...","domain":".vinted.fr",...}, ...]'
            rows={5}
            className="w-full rounded-lg bg-[#1a2d42] border border-[#243552] p-3 text-xs text-slate-200 font-mono outline-none focus:border-[#00c896]/60 focus:ring-1 focus:ring-[#00c896]/40"
          />
          {message && <p className="text-xs text-slate-300">{message}</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleRepaste} disabled={saving || cookiesJson.trim().length === 0}>
              {saving ? 'Enregistrement…' : 'Recoller les cookies'}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={handleDelete} aria-label="Supprimer ce compte">
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddAccountCard({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [cookiesJson, setCookiesJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAdd() {
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
      const headers = await authHeader();
      const res = await fetch('/api/vinted-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ cookies, label: label.trim() || 'Compte Vinted' }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur inconnue');
      setLabel('');
      setCookiesJson('');
      setOpen(false);
      onAdded();
    } catch (err) {
      setMessage(`Erreur : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Ajouter un compte Vinted
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-[#243552] bg-[#0d1b2a] p-4 space-y-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Nom du compte (ex: Vente, Achat)"
        className="w-full rounded-lg bg-[#1a2d42] border border-[#243552] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#00c896]/60 focus:ring-1 focus:ring-[#00c896]/40"
      />
      <textarea
        value={cookiesJson}
        onChange={(e) => setCookiesJson(e.target.value)}
        placeholder='[{"name":"access_token_web","value":"...","domain":".vinted.fr",...}, ...]'
        rows={5}
        className="w-full rounded-lg bg-[#1a2d42] border border-[#243552] p-3 text-xs text-slate-200 font-mono outline-none focus:border-[#00c896]/60 focus:ring-1 focus:ring-[#00c896]/40"
      />
      {message && <p className="text-xs text-slate-300">{message}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleAdd} disabled={saving || cookiesJson.trim().length === 0}>
          {saving ? 'Enregistrement…' : 'Ajouter ce compte'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

export function ParametresClient() {
  const [accounts, setAccounts] = useState<VintedAccount[]>([]);
  const [loaded, setLoaded] = useState(false);

  function refresh() {
    getVintedAccounts().then((a) => {
      setAccounts(a);
      setLoaded(true);
    });
  }

  useEffect(refresh, []);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-[#00c896]" />
        Paramètres
      </h1>

      <Card className="bg-[#1a2d42]/80 border-[#243552]">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">Comptes Vinted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Tu peux lier plusieurs comptes Vinted (ex: un pour vendre, un pour acheter) — leurs ventes et achats sont
            fusionnés sur le Dashboard, avec le nom du compte affiché sur chaque commande.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Installe l&apos;extension <strong>Cookie-Editor</strong>, va sur vinted.fr connecté avec le compte
            concerné, ouvre l&apos;extension, clique sur «&nbsp;Export&nbsp;» → «&nbsp;Export as JSON&nbsp;», puis
            colle le résultat ci-dessous.
          </p>
          <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            ⚠️ Ce texte donne un accès complet au compte Vinted concerné, au même titre qu&apos;un mot de passe. Ne le
            partage jamais (support, capture d&apos;écran, autre site).
          </p>

          {loaded && accounts.length === 0 && (
            <p className="text-sm text-slate-500">Aucun compte Vinted lié pour l&apos;instant.</p>
          )}

          <div className="space-y-2">
            {accounts.map((a) => (
              <AccountCard key={a.id} account={a} onChanged={refresh} />
            ))}
          </div>

          <AddAccountCard onAdded={refresh} />
        </CardContent>
      </Card>
    </div>
  );
}
