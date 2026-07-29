'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.917z" />
  </svg>
);

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Veuillez remplir tous les champs.'); return; }
    setError(''); setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.push('/');
    router.refresh();
  };

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://www.depenzo.fr/' },
    });
  };

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row w-full bg-[#08111e]">

      {/* Colonne gauche — formulaire */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md flex flex-col gap-6">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="VinWatch" width={40} height={40} className="rounded-xl object-cover" />
            <span className="text-2xl font-bold text-slate-100 tracking-tight">VinWatch</span>
          </div>

          <div>
            <h1 className="text-4xl font-semibold text-slate-100 tracking-tight">Connexion</h1>
            <p className="text-slate-500 mt-2">Accédez à votre espace financier personnel</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSignIn}>
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-400">Adresse email</label>
              <div className="rounded-2xl border border-[#243552] bg-[#1a2d42]/50 backdrop-blur-sm transition-colors focus-within:border-[#00c896]/60 focus-within:bg-[#00c896]/5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 p-4 rounded-2xl focus:outline-none"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-400">Mot de passe</label>
              <div className="rounded-2xl border border-[#243552] bg-[#1a2d42]/50 backdrop-blur-sm transition-colors focus-within:border-[#00c896]/60 focus-within:bg-[#00c896]/5">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 p-4 pr-12 rounded-2xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-2xl bg-zinc-900 px-5 py-4 text-sm font-semibold text-white transition-all group disabled:opacity-50 mt-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-40 group-hover:opacity-80 blur transition-opacity duration-500" />
              <span className="relative">{loading ? 'Connexion…' : 'Se connecter'}</span>
            </button>
          </form>

          {/* Séparateur */}
          <div className="relative flex items-center justify-center">
            <span className="w-full border-t border-[#243552]" />
            <span className="px-4 text-xs text-slate-500 bg-[#08111e] absolute">ou continuer avec</span>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 border border-[#243552] rounded-2xl py-3.5 text-sm font-medium text-slate-300 hover:bg-[#1a2d42]/60 hover:border-[#00c896]/30 transition-colors"
          >
            <GoogleIcon />
            Continuer avec Google
          </button>

          <p className="text-center text-sm text-slate-500">
            Pas encore de compte ?{' '}
            <Link href="/auth/signup" className="text-[#00c896] hover:underline">Créer un compte</Link>
          </p>
        </div>
      </section>

      {/* Colonne droite — visuel */}
      <section className="hidden md:flex flex-1 relative p-4">
        <div className="absolute inset-4 rounded-3xl overflow-hidden bg-gradient-to-br from-[#0d1b2a] via-[#1a2d42] to-[#08111e] border border-[#243552] flex flex-col items-center justify-center gap-8">
          {/* Glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#00c896]/10 blur-3xl pointer-events-none" />
          <div className="absolute top-2/3 left-1/3 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center px-8">
            <Image src="/logo.jpg" alt="VinWatch" width={64} height={64} className="rounded-2xl object-cover mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-slate-100 tracking-tight mb-3">Vos finances, <br />enfin maîtrisées.</h2>
            <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
              Suivez vos dépenses, gérez votre budget et atteignez vos objectifs d'épargne depuis n'importe quel appareil.
            </p>
          </div>

          {/* Stats déco */}
          <div className="relative z-10 flex gap-4 px-8">
            {[
              { label: 'Dépenses suivies', value: '100%' },
              { label: 'Sync multi-appareils', value: '✓' },
              { label: 'Données sécurisées', value: '🔒' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 bg-[#1a2d42]/60 border border-[#243552] rounded-2xl px-4 py-3 backdrop-blur-sm">
                <span className="text-xl font-bold text-[#00c896]">{s.value}</span>
                <span className="text-xs text-slate-500 text-center">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
