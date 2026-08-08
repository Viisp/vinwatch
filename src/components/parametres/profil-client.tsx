'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, KeyRound } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function ProfilClient() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setFullName((data.user?.user_metadata?.full_name as string | undefined) ?? '');
    });
  }, []);

  async function handleSaveName() {
    setSavingName(true);
    setNameMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
    setSavingName(false);
    setNameMessage(error ? `Erreur : ${error.message}` : 'Nom mis à jour.');
  }

  async function handleSavePassword() {
    if (newPassword.length < 6) {
      setPasswordMessage('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setSavingPassword(true);
    setPasswordMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordMessage(`Erreur : ${error.message}`);
      return;
    }
    setPasswordMessage('Mot de passe mis à jour.');
    setNewPassword('');
    setConfirmPassword('');
  }

  if (!user) return null;

  const googleAvatar = user.user_metadata?.avatar_url as string | undefined;
  const hasPasswordAuth = user.app_metadata?.providers
    ? (user.app_metadata.providers as string[]).includes('email')
    : true;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 sm:px-6 lg:px-8 pt-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
        <UserIcon className="w-5 h-5 text-[#00c896]" />
        Mon profil
      </h1>

      <Card className="bg-[#1a2d42]/80 border-[#243552]">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {googleAvatar ? (
              <Image src={googleAvatar} alt="Avatar" width={48} height={48} className="rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#243552] flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-[#00c896]" />
              </div>
            )}
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-slate-400">Nom affiché</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Votre nom"
              className="bg-[#1a2d42] border-[#243552] text-slate-100"
            />
          </div>

          {nameMessage && <p className="text-xs text-slate-300">{nameMessage}</p>}

          <Button size="sm" onClick={handleSaveName} disabled={savingName || !fullName.trim()}>
            {savingName ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </CardContent>
      </Card>

      {hasPasswordAuth && (
        <Card className="bg-[#1a2d42]/80 border-[#243552]">
          <CardHeader>
            <CardTitle className="text-slate-100 text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#00c896]" />
              Mot de passe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-slate-400">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="bg-[#1a2d42] border-[#243552] text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-slate-400">Confirmer</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
                className="bg-[#1a2d42] border-[#243552] text-slate-100"
              />
            </div>

            {passwordMessage && <p className="text-xs text-slate-300">{passwordMessage}</p>}

            <Button
              size="sm"
              onClick={handleSavePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
            >
              {savingPassword ? 'Enregistrement…' : 'Mettre à jour'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
