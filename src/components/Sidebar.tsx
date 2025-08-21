'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600","700"] });

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/connected', label: 'Connected Accounts' },
  { href: '/projects', label: 'Projects' },
  { href: '/generate',  label: 'Generate Notes' },
  { href: '/templates', label: 'Templates' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 h-screen flex-col border-r border-gray-200 bg-white/80">
      <div className="px-5 py-1 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="logo" className="w-16" />
          <span className={`${jakarta.className} font-semibold text-2xl`}>ReleaseGPT</span>
        </div>
      </div>
      <nav className="p-3 space-y-1">
        {links.map(l => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`${jakarta.className}  block rounded-lg px-3 py-2 text-sm
                ${active ? 'bg-teal-50 text-teal-700 font-medium border border-teal-100'
                         : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
