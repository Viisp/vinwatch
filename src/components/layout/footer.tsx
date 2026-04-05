import Link from 'next/link';
import Image from 'next/image';

const navLinks = [
  { title: 'Tableau de bord', href: '/' },
  { title: 'Dépenses', href: '/depenses' },
  { title: 'Budget', href: '/budget' },
  { title: 'Simulateur', href: '/pret' },
  { title: 'Objectifs', href: '/objectifs' },
  { title: 'Notes', href: '/notes' },
];

export function FooterSection() {
  return (
    <footer className="bg-[#0d1b2a] border-t border-[#243552] py-10">
      <div className="mx-auto max-w-5xl px-6">
        {/* Logo */}
        <Link href="/" aria-label="Accueil Depenzo" className="mx-auto flex w-fit items-center gap-2">
          <Image src="/logo.jpg" alt="Depenzo" width={28} height={28} className="rounded-md object-cover" />
          <span className="text-lg font-bold text-slate-100 tracking-tight">Depenzo</span>
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
            © {new Date().getFullYear()} Depenzo — Gestion financière personnelle.
          </p>
        </div>
      </div>
    </footer>
  );
}
