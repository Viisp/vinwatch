import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Navbar } from '@/components/layout/navbar';
import { FooterSection } from '@/components/layout/footer';
import { BeamsBackground } from '@/components/ui/beams-background';
import { FloatingNotes } from '@/components/notes/floating-notes';
import { RecurringInjector } from '@/components/budget/recurring-injector';
import { BottomNav } from '@/components/layout/bottom-nav';
import { SyncProvider } from '@/components/auth/sync-provider';
import { AuthGuard } from '@/components/auth/auth-guard';
import './globals.css';

const geist = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Depenzo — Gestion financière personnelle',
  description:
    'Suivez vos dépenses, gérez votre budget et simulez vos prêts avec Depenzo.',
  icons: { icon: '/favicon.ico', apple: '/logo.jpg' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Depenzo',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geist.variable} dark`} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#00c896" />
      </head>
      <body className="min-h-screen bg-[#08111e] text-slate-100 antialiased flex flex-col">
        {/* Background animé global */}
        <BeamsBackground intensity="medium" />

        {/* Top navbar */}
        <Navbar />

        <AuthGuard>
          <main className="pt-16 pb-10 sm:pb-10 pb-24 flex-1">{children}</main>
        </AuthGuard>
        <FooterSection />
        <FloatingNotes />
        <RecurringInjector />
        <BottomNav />
        <SyncProvider />
      </body>
    </html>
  );
}
