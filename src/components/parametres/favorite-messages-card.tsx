'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getFavoriteMessages, saveFavoriteMessages, type FavoriteMessage } from '@/lib/favorite-messages';
import { Copy, Check, Plus, Trash2, MessageSquareText } from 'lucide-react';

function newMessage(): FavoriteMessage {
  return { id: crypto.randomUUID(), label: '', content: '' };
}

export function FavoriteMessagesCard() {
  const [messages, setMessages] = useState<FavoriteMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    getFavoriteMessages().then((m) => {
      setMessages(m);
      setLoaded(true);
    });
  }, []);

  function updateMessage(id: string, patch: Partial<FavoriteMessage>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function addMessage() {
    setMessages((prev) => [...prev, newMessage()]);
  }

  function removeMessage(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveFavoriteMessages(messages);
    } catch (err) {
      console.error('[FavoriteMessagesCard] save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(id: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
  }

  if (!loaded) return null;

  return (
    <Card className="bg-[#1a2d42]/80 border-[#243552] mb-6">
      <CardHeader>
        <CardTitle className="text-slate-100 text-base flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-[#00c896]" />
          Messages favoris
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          Tes messages types (remerciement, réduction...) prêts à copier-coller dans une conversation Vinted.
        </p>

        {messages.map((m) => (
          <div key={m.id} className="rounded-xl border border-[#243552] bg-[#0d1b2a] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={m.label}
                onChange={(e) => updateMessage(m.id, { label: e.target.value })}
                placeholder="Nom du message (ex: Remerciement)"
                className="flex-1 rounded-lg bg-[#1a2d42] border border-[#243552] px-3 py-2 text-sm text-slate-100 font-medium placeholder:text-slate-500 placeholder:font-normal outline-none focus:border-[#00c896]/60 focus:ring-1 focus:ring-[#00c896]/40"
              />
              <Button variant="ghost" size="icon-sm" onClick={() => removeMessage(m.id)} aria-label="Supprimer">
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
            <textarea
              value={m.content}
              onChange={(e) => updateMessage(m.id, { content: e.target.value })}
              placeholder="Contenu du message…"
              rows={6}
              className="w-full resize-none rounded-lg bg-[#1a2d42] border border-[#243552] p-3 text-sm leading-relaxed text-slate-200 outline-none focus:border-[#00c896]/60 focus:ring-1 focus:ring-[#00c896]/40"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCopy(m.id, m.content)}
              disabled={m.content.trim().length === 0}
            >
              {copiedId === m.id ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copié
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copier
                </>
              )}
            </Button>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-1">
          <Button variant="outline" size="sm" onClick={addMessage}>
            <Plus className="w-3.5 h-3.5" /> Ajouter un message
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
