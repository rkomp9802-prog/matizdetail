'use client';

import { useRef, useState, type FormEvent } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'failed';

const EMPTY = { name: '', contact: '', message: '', website: '' };

export default function FeedbackForm() {
  const [values, setValues] = useState(EMPTY);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  function update(field: keyof typeof EMPTY, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
    if (status === 'sent' || status === 'failed') setStatus('idle');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === 'sending') return;

    /*
     * Кнопку намеренно не блокируем на пустом поле: выключенная кнопка
     * выглядит сломанной и не объясняет, чего от человека хотят.
     * Вместо этого — подсказка и фокус на нужном поле.
     */
    if (!values.message.trim()) {
      setError('Напишите, с чем вам помочь');
      messageRef.current?.focus();
      return;
    }

    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data: { success?: boolean } = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setValues(EMPTY);
        setStatus('sent');
      } else {
        setStatus('failed');
      }
    } catch {
      setStatus('failed');
    }
  }

  const sending = status === 'sending';

  const fieldClass =
    'mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink ' +
    'placeholder:text-muted/70 outline-none transition-[border-color,box-shadow] ' +
    'focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:opacity-60';

  const labelClass =
    'block text-[0.7rem] font-bold tracking-[0.12em] text-muted uppercase';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="relative rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-sm sm:p-8"
    >
      {/*
        Honeypot: человек его не увидит и не сможет навести фокус табом,
        а бот заполняет всё подряд. Прячем сдвигом за экран, а не display:none —
        часть ботов такие поля пропускает.
      */}
      <div aria-hidden="true" className="absolute left-[-9999px] w-px overflow-hidden">
        <label htmlFor="website">Не заполняйте это поле</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => update('website', e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="feedback-name" className={labelClass}>
            Имя
          </label>
          <input
            id="feedback-name"
            name="name"
            type="text"
            autoComplete="name"
            disabled={sending}
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Как к вам обращаться"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="feedback-contact" className={labelClass}>
            Телефон или email
          </label>
          <input
            id="feedback-contact"
            name="contact"
            type="text"
            autoComplete="tel"
            disabled={sending}
            value={values.contact}
            onChange={(e) => update('contact', e.target.value)}
            placeholder="Куда вам ответить"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="feedback-message" className={labelClass}>
          Сообщение
        </label>
        <textarea
          ref={messageRef}
          id="feedback-message"
          name="message"
          rows={5}
          disabled={sending}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'feedback-error' : undefined}
          value={values.message}
          onChange={(e) => update('message', e.target.value)}
          placeholder="Опишите, что нужно сделать"
          className={`${fieldClass} resize-y ${error ? 'border-brand' : ''}`}
        />
        {error && (
          <p id="feedback-error" className="mt-2 text-xs text-brand">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={sending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:bg-brand/70 sm:w-auto"
        >
          {sending ? 'Отправляем…' : 'Отправить'}
        </button>

        {/* aria-live, чтобы результат услышали и в скринридере */}
        <p aria-live="polite" className="text-sm sm:text-right">
          {status === 'sent' && (
            <span className="text-muted">Спасибо, мы получили ваше сообщение.</span>
          )}
          {status === 'failed' && (
            <span className="text-brand">Не удалось отправить, попробуйте позже.</span>
          )}
          {status === 'idle' && !error && (
            <span className="text-muted/80">Ответим в рабочее время</span>
          )}
        </p>
      </div>
    </form>
  );
}
