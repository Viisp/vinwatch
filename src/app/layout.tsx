import type { Metadata, Viewport } from 'next';
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
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VinWatch',
  },
};

// viewportFit: 'cover' lets the page extend under the iPhone's home-indicator
// area so `env(safe-area-inset-bottom)` actually returns a non-zero value --
// without it, the bottom tab bar sits flush against the screen edge, right
// under the home-indicator gesture zone.
export const viewport: Viewport = {
  themeColor: '#00c896',
  viewportFit: 'cover',
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
      </head>
      <body className="min-h-screen bg-[#08111e] text-slate-100 antialiased flex flex-col">
        <BeamsBackground intensity="medium" />
        <Navbar />
        <AuthGuard>
          <main className="pt-14 sm:pt-16 pb-24 sm:pb-10 flex-1">{children}</main>
        </AuthGuard>
        <FooterSection />
        <BottomNav />
      </body>
    </html>
  );
}
