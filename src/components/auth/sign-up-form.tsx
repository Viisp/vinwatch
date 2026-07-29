'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !confirm) { setError('Veuillez remplir tous les champs.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return; }
    setError(''); setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08111e] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#1a2d42] border border-[#243552] shadow-2xl p-8 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="VinWatch" width={48} height={48} className="rounded-xl object-cover" />
          <h1 className="text-2xl font-bold text-slate-100">Créer un compte</h1>
          <p className="text-slate-500 text-sm text-center">Rejoignez VinWatch gratuitement</p>
        </div>

        <div className="flex flex-col w-full gap-3">
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0d1b2a] border border-[#243552] text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-[#00c896] transition-colors"
          />

          {/* Mot de passe */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe (min. 6 caractères)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-11 rounded-xl bg-[#0d1b2a] border border-[#243552] text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-[#00c896] transition-colors"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirmer */}
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirmer le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
              className="w-full px-4 py-3 pr-11 rounded-xl bg-[#0d1b2a] border border-[#243552] text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-[#00c896] transition-colors"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <button
          onClick={handleSignUp}
          disabled={loading}
          className="relative w-full overflow-hidden rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition-all group disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-40 group-hover:opacity-80 blur transition-opacity duration-500" />
          <span className="relative">{loading ? 'Création…' : 'Créer mon compte'}</span>
        </button>

        <p className="text-xs text-slate-500 text-center">
          Déjà un compte ?{' '}
          <Link href="/auth/signin" className="text-[#00c896] hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
