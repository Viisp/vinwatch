import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Navbar } from '@/components/layout/navbar';
import { FooterSection } from '@/components/layout/footer';
import { BeamsBackground } from '@/components/ui/beams-background';
import { BottomNav } from '@/components/layout/bottom-nav';
import { AuthGuard } from '@/components/auth/auth-guard';
import './globals.css';

const geist = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VinWatch — Suivi des ventes et achats Vinted',
  description: 'Suivez automatiquement vos ventes et achats Vinted.',
  icons: { icon: '/favicon.ico', apple: '/logo.jpg' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VinWatch',
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
        <BeamsBackground intensity="medium" />
        <Navbar />
        <AuthGuard>
          <main className="pt-16 pb-10 sm:pb-10 pb-24 flex-1">{children}</main>
        </AuthGuard>
        <FooterSection />
        <BottomNav />
      </body>
    </html>
  );
}
