'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { LogIn, User, LogOut, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function AuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push('/auth/signin');
  };

  if (!user) {
    return (
      <a href="/auth/signin" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-[#00c896] hover:bg-[#1a2d42]/60 transition-colors">
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Connexion</span>
      </a>
    );
  }

  const googleAvatar = user.user_metadata?.avatar_url as string | undefined;
  const googleName = user.user_metadata?.full_name as string | undefined;
  const displayName = googleName || user.email?.split('@')[0] || 'Profil';
  const avatarSrc = googleAvatar;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1a2d42]/60 transition-colors"
      >
        {avatarSrc ? (
          <Image src={avatarSrc} alt="Avatar" width={26} height={26} className="rounded-full object-cover" />
        ) : (
          <div className="w-[26px] h-[26px] rounded-full bg-[#243552] flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-[#00c896]" />
          </div>
        )}
        <span className="hidden sm:block text-xs text-slate-300 max-w-[100px] truncate">{displayName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-[#1a2d42] border border-[#243552] shadow-2xl overflow-hidden z-[200]">
          <div className="px-4 py-3 border-b border-[#243552]">
            <p className="text-xs font-semibold text-slate-100 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <Link
            href="/parametres"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-[#243552] transition-colors"
          >
            <Settings className="w-4 h-4" />
            Paramètres
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
