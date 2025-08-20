'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600","700"] });

export default function Topbar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setEmail(JSON.parse(u).email);
  }, []);

  const logout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between 
                       border-b border-gray-200 bg-white/70 backdrop-blur px-4 py-3">
      <div className="md:hidden flex items-center gap-2">
        <img src="/logo.png" className="h-6 w-6" alt="logo" />
        <span className="font-semibold">ReleaseGPT</span>
      </div>

      <nav className="ml-auto flex items-center gap-3">
        
        <span className={`${jakarta.className} hidden sm:inline text-sm text-gray-600`}>
          {email ? `Hello, ${email}` : ''}
        </span>
        <button
          onClick={logout}
          className={`${jakarta.className} rounded-md bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700`}
        >
          Log out
        </button>
        <Link
          href="/pricing"
          className={`rounded-md border border-gray-200 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-yellow-200 to-yellow-500 hover:bg-gray-50 hover:text-teal-600 transition-colors ${jakarta.className}`}
        >
          Pricing
        </Link>
      </nav>
    </header>
  );
}
