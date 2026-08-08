'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, KeyRound, Eye, EyeOff, Camera } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function ProfilClient() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setFullName((data.user?.user_metadata?.full_name as string | undefined) ?? '');
      setAvatarUrl(data.user?.user_metadata?.avatar_url as string | undefined);
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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setAvatarMessage(null);
    const supabase = createClient();

    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
      setUploadingAvatar(false);
      setAvatarMessage(`Erreur : ${uploadError.message}`);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    // Cache-bust so the new avatar shows immediately instead of a stale
    // browser-cached image at the same URL.
    const bustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: bustedUrl } });
    setUploadingAvatar(false);
    if (updateError) {
      setAvatarMessage(`Erreur : ${updateError.message}`);
      return;
    }
    setAvatarUrl(bustedUrl);
    setAvatarMessage('Photo mise à jour.');
  }

  async function handleSavePassword() {
    if (!user?.email) return;
    if (newPassword.length < 6) {
      setPasswordMessage('Le nouveau mot de passe doit faire au moins 6 caractères.');
      return;
    }
    setSavingPassword(true);
    setPasswordMessage(null);
    const supabase = createClient();

    // Supabase's updateUser doesn't require the current password (the
    // session is already authenticated), but we verify it explicitly first
    // so "ancien mot de passe" actually gates the change as the UI implies.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      setSavingPassword(false);
      setPasswordMessage('Mot de passe actuel incorrect.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordMessage(`Erreur : ${error.message}`);
      return;
    }
    setPasswordMessage('Mot de passe mis à jour.');
    setCurrentPassword('');
    setNewPassword('');
  }

  if (!user) return null;

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
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative group w-16 h-16 shrink-0 disabled:opacity-60"
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" width={64} height={64} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#243552] flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-[#00c896]" />
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-slate-400">{user.email}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-xs text-[#00c896] hover:underline text-left w-fit disabled:opacity-60"
              >
                {uploadingAvatar ? 'Envoi…' : 'Changer la photo'}
              </button>
            </div>
          </div>

          {avatarMessage && <p className="text-xs text-slate-300">{avatarMessage}</p>}

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
              <Label htmlFor="currentPassword" className="text-slate-400">Ancien mot de passe</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mot de passe actuel"
                className="bg-[#1a2d42] border-[#243552] text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-slate-400">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  className="bg-[#1a2d42] border-[#243552] text-slate-100 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordMessage && <p className="text-xs text-slate-300">{passwordMessage}</p>}

            <Button
              size="sm"
              onClick={handleSavePassword}
              disabled={savingPassword || !currentPassword || !newPassword}
            >
              {savingPassword ? 'Enregistrement…' : 'Mettre à jour'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
