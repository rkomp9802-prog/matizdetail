'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { QAEntry } from '@/types/chat.types';

export default function QuestionCard({ entry }: { entry: QAEntry }) {
  const router = useRouter();
  // Пока своего ответа нет — подставляем черновик от Gemini,
  // чтобы не писать с нуля: достаточно вычитать и сохранить
  const isGeminiDraft = !entry.answer && Boolean(entry.gemini_answer);
  const [answer, setAnswer] = useState(entry.answer ?? entry.gemini_answer ?? '');
  const [keywords, setKeywords] = useState(entry.keywords ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, answer, keywords }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Не удалось сохранить');
        return;
      }
      router.refresh();
    } catch {
      setError('Нет соединения с сервером');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-heading font-bold">{entry.question}</p>
        <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs text-muted">
          спросили {entry.asked_count} раз
        </span>
      </div>

      <label className="mt-4 block text-xs font-bold tracking-wide text-muted uppercase">
        Ключевые слова (через запятую)
      </label>
      <input
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="мойка, стоимость, цена"
        className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus-visible:border-brand"
      />
      <p className="mt-1.5 text-xs text-muted">
        Сравниваются по основе слова: «мойка» поймает и «мойки», и «мойку».
        Достаточно одного совпадения, поэтому пишите синонимы через запятую и только
        отличительные слова — общие («как», «цена») сработают на чём угодно.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-xs font-bold tracking-wide text-muted uppercase">
          Ответ
        </label>
        {isGeminiDraft && (
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-[0.7rem] text-muted">
            черновик от Gemini — вычитайте и сохраните
          </span>
        )}
      </div>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        placeholder="Напишите ответ, который увидит посетитель"
        className={`mt-1.5 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-brand ${
          isGeminiDraft ? 'border-dashed border-muted/50' : 'border-line'
        }`}
      />

      {error && <p className="mt-2 text-sm text-brand">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={isSaving || !answer.trim()}
        className="mt-3 rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
      >
        {isSaving ? 'Сохраняем…' : 'Сохранить'}
      </button>
    </div>
  );
}
