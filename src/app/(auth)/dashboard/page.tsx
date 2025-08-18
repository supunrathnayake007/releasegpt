'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {/* your dashboard UI here */}
    </div>
  );
}
