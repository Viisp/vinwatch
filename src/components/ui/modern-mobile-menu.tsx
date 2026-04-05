'use client';
import React, { useRef, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Calculator,
} from 'lucide-react';

type IconComponentType = React.ElementType<{ className?: string }>;

interface DepenzMenuItem {
  label: string;
  icon: IconComponentType;
  href: string;
}

const depenzItems: DepenzMenuItem[] = [
  { label: 'Dashboard',  icon: LayoutDashboard, href: '/' },
  { label: 'Dépenses',   icon: Receipt,          href: '/depenses' },
  { label: 'Budget',     icon: Wallet,           href: '/budget' },
  { label: 'Simulateur', icon: Calculator,       href: '/pret' },
];

interface InteractiveMenuProps {
  accentColor?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function InteractiveMenu({
  accentColor = '#00c896',
  orientation = 'vertical',
}: InteractiveMenuProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeIndex = useMemo(
    () => Math.max(0, depenzItems.findIndex((item) => item.href === pathname)),
    [pathname]
  );

  const textRefs = useRef<(HTMLElement | null)[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    const txt = textRefs.current[activeIndex];
    if (el && txt) {
      el.style.setProperty('--lineWidth', `${txt.offsetWidth}px`);
    }
  }, [activeIndex]);

  const navStyle = useMemo(
    () => ({ '--component-active-color': accentColor } as React.CSSProperties),
    [accentColor]
  );

  const isVertical = orientation === 'vertical';

  return (
    <nav
      className={isVertical ? 'menu menu--vertical' : 'menu'}
      role="navigation"
      style={navStyle}
    >
      {depenzItems.map((item, index) => {
        const isActive = index === activeIndex;
        const IconComponent = item.icon;

        return (
          <button
            key={item.label}
            className={`menu__item ${isActive ? 'active' : ''}`}
            onClick={() => router.push(item.href)}
            ref={(el) => { itemRefs.current[index] = el; }}
            style={{ '--lineWidth': '0px' } as React.CSSProperties}
          >
            <div className="menu__icon">
              <IconComponent className="icon" />
            </div>
            <strong
              className={`menu__text ${isActive ? 'active' : ''}`}
              ref={(el) => { textRefs.current[index] = el as HTMLElement | null; }}
            >
              {item.label}
            </strong>
          </button>
        );
      })}
    </nav>
  );
}
