import type { Metadata } from 'next';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata: Metadata = { title: 'Créer un compte — VinWatch' };

export default function SignUpPage() {
  return <SignUpForm />;
}
