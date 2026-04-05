'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const PUBLIC_PATHS = ['/auth/signin', '/auth/signup'];

function isPublic(pathname: string) {
  const clean = pathname.replace(/\/$/, '');
  return PUBLIC_PATHS.includes(clean);
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isPublic(pathname)) {
      setReady(true);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/auth/signin');
      } else {
        setReady(true);
      }
    });
  }, [pathname, router]);

  if (!ready && !isPublic(pathname)) {
    return <div className="min-h-screen bg-[#08111e]" />;
  }

  return <>{children}</>;
}
