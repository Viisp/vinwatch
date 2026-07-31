'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, ShoppingBag, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/',           label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/ventes',     label: 'Ventes',       icon: TrendingUp },
  { href: '/achats',     label: 'Achats',       icon: ShoppingBag },
  { href: '/parametres', label: 'Paramètres',   icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[#0d1b2a]/95 backdrop-blur-sm border-t border-[#243552]">
      <div className="flex items-stretch h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
                active ? 'text-[#00c896]' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
