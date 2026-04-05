'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CreditCard, Wallet, Calculator, Target, StickyNote } from 'lucide-react';

const links = [
  { href: '/',          label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/depenses',  label: 'Dépenses',         icon: CreditCard },
  { href: '/budget',    label: 'Budget',           icon: Wallet },
  { href: '/pret',      label: 'Simulateur',       icon: Calculator },
  { href: '/objectifs', label: 'Objectifs',        icon: Target },
  { href: '/notes',     label: 'Notes',            icon: StickyNote },
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
