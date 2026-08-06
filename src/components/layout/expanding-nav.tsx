'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, ShoppingBag, Camera, Settings } from 'lucide-react';

const links = [
  { href: '/',               label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/ventes',         label: 'Ventes',          icon: TrendingUp },
  { href: '/achats',         label: 'Achats',          icon: ShoppingBag },
  { href: '/prompts-photos', label: 'Prompts photos',  icon: Camera },
  { href: '/parametres',     label: 'Paramètres',      icon: Settings },
];

export function ExpandingNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-[#1a2d42] border border-[#243552]">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            title={label}
            style={{ width: active ? '130px' : undefined }}
            className={[
              'group relative inline-flex items-center h-[38px] rounded-xl overflow-hidden',
              'transition-[width] duration-200 ease-in',
              active
                ? 'bg-[#00c896]/15 text-[#00c896]'
                : 'w-[38px] text-slate-400 hover:w-[130px] hover:bg-[#243552] hover:text-slate-100',
            ].join(' ')}
          >
            {/* Icon */}
            <span className="absolute left-[7px] w-6 h-6 flex items-center justify-center shrink-0">
              <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 1.8} />
            </span>
            {/* Label */}
            <span className={[
              'pl-[34px] pr-3 text-xs font-medium whitespace-nowrap transition-opacity duration-150',
              active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            ].join(' ')}>
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
