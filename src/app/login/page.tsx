'use client';
import Image from 'next/image';
import { Plus_Jakarta_Sans } from "next/font/google";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type User = { email: string; password: string };
const mockUsers: User[] = [
  { email: 'admin@example.com', password: 'Password123!' },
  { email: 'teacher@example.com', password: 'Password123!' },
  { email: 'kasun@releasegpt.com', password: 'Password123!' },
  { email: 'supun.r@azendtech.com', password: 'Supun@123' },
];

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600","700"] });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (!user) {
      setBusy(false);
      setError('Invalid email or password');
      return;
    }
    localStorage.setItem('user', JSON.stringify({ email: user.email }));
    router.push('/dashboard');
  };

  return (
    <div
      className="
        min-h-screen flex items-center justify-center px-4
        bg-gradient-to-br from-white via-[#F7FFFB] to-[#F1FEFC]
      "
    >
      <div className="flex flex-col items-center space-y-2">

        {/* Logo & title */}
        <div className="flex flex-col items-center">
          <div className="w-[200px]">
            <Image
            src="/logo.png"
            width={200}
            height={200}
            alt="ReleaseGPT Logo"
            className="" // increase size here
          />
          </div>
          <h1 className={`${jakarta.className} -mt-8 mb-7 text-5xl font-semibold tracking-tight text-gray-700`}>ReleaseGPT</h1>
        </div>

          <div
        className="
          w-full max-w-sm rounded-2xl border border-gray-200 bg-white
          p-7 shadow-[0_10px_30px_rgba(0,0,0,0.06)]
        "
      >
        

        {/* Form */}
        <form onSubmit={handleLogin} className="mt-1 space-y-4 w-[300px]">
          <div> 
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={` ${jakarta.className}
              w-full rounded-xl border border-gray-300 
                px-3 py-2 text-gray-900 outline-none
                focus:ring-2 focus:ring-teal-200 focus:border-teal-400
              `}
              placeholder="Email"
            />
          </div>

          <div> 
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={` ${jakarta.className}
                w-full rounded-xl border border-gray-300
                px-3 py-2 text-gray-900 outline-none
                focus:ring-2 focus:ring-teal-200 focus:border-teal-400
                `}
              placeholder="Password"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className={` ${jakarta.className}
              w-full rounded-xl px-4 py-2 font-medium text-white
              bg-gradient-to-r from-emerald-500 to-teal-500
              shadow-[0_6px_0_rgba(0,0,0,0.08)]
              hover:opacity-95 active:translate-y-[1px]
              disabled:opacity-60
              `}
          >
            {busy ? 'Logging in…' : 'Log In'}
          </button>

          <div className="text-center">
            <button
              type="button"
              className={`${jakarta.className} text-sm text-teal-500 hover:underline`}
              onClick={() => alert('Forgot password (demo)')}
            >
              Forgot password?
            </button>
          </div>
        </form>
      </div>
      </div>

      
    </div>
  );
}
