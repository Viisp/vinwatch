'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Pencil, Check, X, LogOut, Mail, KeyRound, Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getProfile, saveProfile } from '@/lib/storage';
import type { User as SupabaseUser } from '@supabase/supabase-js';

function resizeImage(file: File, size = 200): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfilClient() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [pseudo, setPseudo] = useState('');
  const [customAvatar, setCustomAvatar] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'sent' | 'loading'>('idle');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth/signin'); return; }
      setUser(data.user);
    });
    const profile = getProfile();
    setPseudo(profile.pseudo ?? '');
    setCustomAvatar(profile.customAvatar ?? '');
  }, [router]);

  const startEdit = () => { setDraft(pseudo); setEditingName(true); };
  const confirmEdit = () => {
    const v = draft.trim();
    setPseudo(v);
    saveProfile({ ...getProfile(), pseudo: v });
    setEditingName(false);
  };
  const cancelEdit = () => setEditingName(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await resizeImage(file);
    setCustomAvatar(b64);
    saveProfile({ ...getProfile(), customAvatar: b64 });
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setPwStatus('loading');
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: 'https://www.depenzo.fr/auth/signin',
    });
    setPwStatus('sent');
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  const googleAvatar = user?.user_metadata?.avatar_url as string | undefined;
  const googleName = user?.user_metadata?.full_name as string | undefined;
  const displayName = pseudo || googleName || user?.email?.split('@')[0] || 'Utilisateur';
  const avatarSrc = customAvatar || googleAvatar;
  const isGoogleUser = user?.app_metadata?.provider === 'google';

  return (
    <div className="min-h-screen flex items-start justify-center pt-24 pb-32 px-4">
      <div className="w-full max-w-md flex flex-col gap-4">

        {/* Avatar + nom éditable */}
        <div className="rounded-2xl bg-[#1a2d42] border border-[#243552] p-8 flex flex-col items-center gap-4">

          {/* Photo cliquable via label (iOS-safe) */}
          <label htmlFor="avatar-input" className="relative group cursor-pointer">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-[#00c896]/40"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#243552] flex items-center justify-center ring-2 ring-[#00c896]/40">
                <User className="w-9 h-9 text-slate-400" />
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </label>
          <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          {/* Nom cliquable */}
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
                placeholder="Ton pseudo..."
                className="px-3 py-1.5 rounded-xl bg-[#0d1b2a] border border-[#243552] text-slate-100 placeholder-slate-500 text-sm text-center focus:outline-none focus:border-[#00c896] transition-colors"
              />
              <button onClick={confirmEdit} className="p-1.5 rounded-lg bg-[#00c896]/20 text-[#00c896] hover:bg-[#00c896]/30 transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-[#243552] text-slate-400 hover:text-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={startEdit} className="group flex items-center gap-1.5 text-xl font-bold text-slate-100 hover:text-[#00c896] transition-colors">
              {displayName}
              <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          )}
        </div>

        {/* Email */}
        <div className="rounded-2xl bg-[#1a2d42] border border-[#243552] p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Email</p>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-500 shrink-0" />
            <p className="text-slate-200 text-sm truncate">{user?.email}</p>
          </div>
        </div>

        {/* Mot de passe — seulement pour comptes email */}
        {!isGoogleUser && (
          <div className="rounded-2xl bg-[#1a2d42] border border-[#243552] p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Mot de passe</p>
            {pwStatus === 'sent' ? (
              <p className="text-sm text-[#00c896]">Email envoyé à {user?.email}</p>
            ) : (
              <button
                onClick={handleResetPassword}
                disabled={pwStatus === 'loading'}
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-[#00c896] transition-colors disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                {pwStatus === 'loading' ? 'Envoi…' : 'Changer le mot de passe'}
              </button>
            )}
          </div>
        )}

        {/* Déconnexion */}
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
