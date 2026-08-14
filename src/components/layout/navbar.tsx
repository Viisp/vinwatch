'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { AuthButton } from '@/components/auth/auth-button';
import { ExpandingNav } from '@/components/layout/expanding-nav';

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b border-[#243552] bg-[#0d1b2a]/90 backdrop-blur-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0" onClick={() => setMobileOpen(false)}>
            <Image src="/logo.png" alt="VinWatch" width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover" />
            <span className="text-base sm:text-xl font-bold text-slate-100 tracking-tight">VinWatch</span>
          </Link>

          {/* Desktop nav — centré avec expanding icons */}
          <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2">
            <ExpandingNav />
          </div>

          {/* Desktop auth */}
          <div className="hidden sm:flex ml-auto items-center gap-1">
            <AuthButton />
          </div>

          {/* Mobile : hamburger */}
          <button
            className="flex sm:hidden items-center justify-center ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1a2d42]/60 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown — account only, navigation already lives in the bottom tab bar */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-[#243552] bg-[#0d1b2a]/95 backdrop-blur-sm">
          <nav className="px-3 py-2">
            <AuthButton inline onNavigate={() => setMobileOpen(false)} />
          </nav>
        </div>
      )}
    </header>
  );
}
