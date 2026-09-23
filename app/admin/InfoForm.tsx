'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { BusinessField } from '@/lib/businessInfo';

interface Props {
  fields: BusinessField[];
  initial: Record<string, string>;
}

export default function InfoForm({ fields, initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
  }

  async function save() {
    setError(null);
    setStatus('saving');
    try {
      const res = await fetch('/api/admin/info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Не удалось сохранить');
        setStatus('idle');
        return;
      }
      setStatus('saved');
      router.refresh();
    } catch {
      setError('Нет соединения с сервером');
      setStatus('idle');
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {fields.map((field) => (
        <div key={field.key}>
          <label
            htmlFor={field.key}
            className="block text-xs font-bold tracking-wide text-muted uppercase"
          >
            {field.label}
          </label>

          {field.long ? (
            <textarea
              id={field.key}
              value={values[field.key] ?? ''}
              onChange={(e) => update(field.key, e.target.value)}
              rows={4}
              className="mt-1.5 w-full resize-y rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus-visible:border-brand"
            />
          ) : (
            <input
              id={field.key}
              value={values[field.key] ?? ''}
              onChange={(e) => update(field.key, e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus-visible:border-brand"
            />
          )}

          {field.hint && <p className="mt-1.5 text-xs text-muted">{field.hint}</p>}
        </div>
      ))}

      {error && <p className="text-sm text-brand">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={status === 'saving'}
          className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
        >
          {status === 'saving' ? 'Сохраняем…' : 'Сохранить'}
        </button>
        {status === 'saved' && (
          <span className="text-sm text-muted">
            Сохранено — бот уже отвечает по новым данным.
          </span>
        )}
      </div>
    </div>
  );
}
