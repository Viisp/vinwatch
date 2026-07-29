import type { Metadata } from 'next';
import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata: Metadata = { title: 'Connexion — VinWatch' };

export default function SignInPage() {
  return <SignInForm />;
}
