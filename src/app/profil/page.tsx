import type { Metadata } from 'next';
import { ProfilClient } from '@/components/profil/profil-client';

export const metadata: Metadata = { title: 'Profil — Depenzo' };

export default function ProfilPage() {
  return <ProfilClient />;
}
