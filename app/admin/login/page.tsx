'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSending(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Не удалось войти');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Нет соединения с сервером');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-sm"
      >
        <h1 className="font-heading text-2xl font-extrabold">Вход в админку</h1>
        <p className="mt-2 text-sm text-muted">
          Пароль задаётся переменной ADMIN_PASSWORD в .env.local
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          aria-label="Пароль"
          placeholder="Пароль"
          className="mt-6 w-full rounded-lg border border-line px-4 py-2.5 outline-none focus-visible:border-brand"
        />

        {error && <p className="mt-3 text-sm text-brand">{error}</p>}

        <button
          type="submit"
          disabled={isSending || !password}
          className="mt-5 w-full rounded-lg bg-brand py-2.5 font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
        >
          {isSending ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </main>
  );
}
