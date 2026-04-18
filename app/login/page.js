'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { demoUsers } from '@/lib/demoUsers';
import { loginWithDemoCredentials } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export default function LoginPage() {
  const router = useRouter();
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const [email, setEmail] = useState(demoUsers[0].email);
  const [password, setPassword] = useState(demoUsers[0].password);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await loginWithDemoCredentials({ email, password });
      window.localStorage.setItem('geo-dashboard-user', JSON.stringify(user));
      setCurrentUser(user);
      router.push('/dashboard');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (user) => {
    setEmail(user.email);
    setPassword(user.password);
    setError('');
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between bg-[#102923] px-6 py-8 text-white sm:px-10 lg:px-14">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#4fd1b6] font-bold text-[#102923]">
              G
            </div>
            <div>
              <div className="text-lg font-semibold">GeoIntel</div>
              <div className="text-xs text-white/70">Operations dashboard</div>
            </div>
          </div>

          <div className="max-w-xl py-16">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#8be3d2]">
              Secure demo access
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Real-time city intelligence with maps, charts, and team response.
            </h1>
            <p className="mt-5 text-base leading-7 text-white/78">
              Sign in with any test user to review incident density, regional KPIs, live activity, and team coordination from one clear workspace.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-white/78 sm:grid-cols-3">
            <div className="rounded-lg border border-white/14 bg-white/8 p-4">
              <div className="text-2xl font-bold text-white">6</div>
              <div>Tracked locations</div>
            </div>
            <div className="rounded-lg border border-white/14 bg-white/8 p-4">
              <div className="text-2xl font-bold text-white">808</div>
              <div>Incidents reviewed</div>
            </div>
            <div className="rounded-lg border border-white/14 bg-white/8 p-4">
              <div className="text-2xl font-bold text-white">2</div>
              <div>Group channels</div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-950">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-600">Use one of the demo accounts below.</p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-[#168c7a] focus:ring-2 focus:ring-[#168c7a]/20"
                  type="email"
                  autoComplete="email"
                />
              </label>

              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-[#168c7a] focus:ring-2 focus:ring-[#168c7a]/20"
                  type="password"
                  autoComplete="current-password"
                />
              </label>

              {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#168c7a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#116f61] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Testing credentials</h3>
              {demoUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => fillCredentials(user)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-[#168c7a]"
                >
                  <div className="font-semibold text-slate-950">{user.name}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {user.email} / {user.password}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
