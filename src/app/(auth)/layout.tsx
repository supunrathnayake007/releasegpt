import Navbar from '@/components/Navbar';
import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Navbar />
      <main className="p-6">{children}</main>
    </div>
  );
}
