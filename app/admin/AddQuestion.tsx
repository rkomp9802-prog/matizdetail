'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AddQuestion() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function add() {
    if (!question.trim()) return;
    setIsSaving(true);
    try {
      await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      setQuestion('');
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-3 flex gap-2">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Например: Вы моете мотоциклы?"
        className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus-visible:border-brand"
      />
      <button
        type="button"
        onClick={add}
        disabled={isSaving || !question.trim()}
        className="rounded-lg bg-ink px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
      >
        {isSaving ? 'Добавляем…' : 'Добавить'}
      </button>
    </div>
  );
}
