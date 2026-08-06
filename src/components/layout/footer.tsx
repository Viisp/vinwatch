import Link from 'next/link';
import Image from 'next/image';

const navLinks = [
  { title: 'Dashboard', href: '/' },
  { title: 'Ventes', href: '/ventes' },
  { title: 'Achats', href: '/achats' },
  { title: 'Prompts photos', href: '/prompts-photos' },
  { title: 'Paramètres', href: '/parametres' },
];

export function FooterSection() {
  return (
    <footer className="bg-[#0d1b2a] border-t border-[#243552] py-10">
      <div className="mx-auto max-w-5xl px-6">
        {/* Logo */}
        <Link href="/" aria-label="Accueil VinWatch" className="mx-auto flex w-fit items-center gap-2">
          <Image src="/logo.png" alt="VinWatch" width={28} height={28} className="rounded-md object-cover" />
          <span className="text-lg font-bold text-slate-100 tracking-tight">VinWatch</span>
        </Link>

        {/* Nav links */}
        <div className="my-6 flex flex-wrap justify-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-slate-400 hover:text-[#00c896] transition-colors duration-150 text-sm"
            >
              {link.title}
            </Link>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-[#243552] pt-6">
          <p className="text-center text-sm text-slate-500">
            © {new Date().getFullYear()} VinWatch — Suivi des ventes et achats Vinted.
          </p>
        </div>
      </div>
    </footer>
  );
}
