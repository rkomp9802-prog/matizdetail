'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-lg border border-line px-4 py-2 text-sm transition-colors hover:bg-surface"
    >
      Выйти
    </button>
  );
}
