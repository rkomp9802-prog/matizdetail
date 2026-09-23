'use client';

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  MAX_VOICE_MS,
  pickAudioMimeType,
  prepareImage,
  prepareVoice,
  type PreparedMedia,
} from '@/lib/media';

interface Props {
  disabled: boolean;
  onSend: (text: string) => void;
  onSendMedia: (prepared: PreparedMedia, caption: string) => void;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function ChatInput({ disabled, onSend, onSendMedia }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const busy = disabled || isPreparing;
  const canSend = value.trim().length > 0 && !busy && !isRecording;

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Микрофон нужно отпустить, даже если виджет закрыли во время записи
  useEffect(() => {
    return () => {
      stopTimer();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        cancelledRef.current = true;
        recorder.stop();
      }
    };
  }, []);

  function send() {
    if (!canSend) return;
    onSend(value);
    setValue('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter отправляет, Shift+Enter переносит строку
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Сбрасываем сразу: иначе повторный выбор того же файла не даст события
    e.target.value = '';
    if (!file) return;

    setError(null);
    setIsPreparing(true);
    try {
      const prepared = await prepareImage(file);
      onSendMedia(prepared, value);
      setValue('');
    } catch {
      setError('Не удалось обработать изображение');
    } finally {
      setIsPreparing(false);
    }
  }

  async function startRecording() {
    setError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Браузер не поддерживает запись звука');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Нет доступа к микрофону — разрешите его в настройках браузера');
      return;
    }

    const mimeType = pickAudioMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    chunksRef.current = [];
    cancelledRef.current = false;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;

      if (cancelledRef.current || chunksRef.current.length === 0) return;

      setIsPreparing(true);
      try {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const prepared = await prepareVoice(blob);
        onSendMedia(prepared, value);
        setValue('');
      } catch {
        setError('Не удалось подготовить запись');
      } finally {
        setIsPreparing(false);
      }
    };

    const startedAt = Date.now();
    recorder.start();
    setIsRecording(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(ms);
      // Дольше минуты не пишем: и слушать тяжело, и базу жалко
      if (ms >= MAX_VOICE_MS) finishRecording();
    }, 200);
  }

  function finishRecording() {
    stopTimer();
    setIsRecording(false);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }

  function cancelRecording() {
    cancelledRef.current = true;
    finishRecording();
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 border-t border-line bg-card px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-[0.82rem] text-brand">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden="true" />
          Запись {formatDuration(elapsed)}
        </span>
        <span className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={cancelRecording}
            className="rounded-full border border-line px-3 py-1.5 text-[0.75rem] transition-colors hover:bg-surface"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={finishRecording}
            className="rounded-full bg-brand px-4 py-1.5 text-[0.75rem] font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Отправить
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="border-t border-line bg-card px-3.5 py-2.5">
      {error && <p className="mb-2 text-[0.72rem] text-brand">{error}</p>}

      <div className="flex items-end gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="Прикрепить фото"
          title="Прикрепить фото"
          className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <button
          type="button"
          onClick={startRecording}
          disabled={busy}
          aria-label="Записать голосовое сообщение"
          title="Записать голосовое сообщение"
          className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
          </svg>
        </button>

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          rows={1}
          aria-label="Сообщение"
          placeholder={
            isPreparing ? 'Отправляем…' : disabled ? 'Бот отвечает…' : 'Напишите сообщение...'
          }
          className="max-h-24 min-h-9 flex-1 resize-none rounded-[20px] border border-line px-3.5 py-2 text-[0.82rem] outline-none transition-colors focus-visible:border-brand disabled:bg-surface disabled:text-muted"
        />

        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label="Отправить сообщение"
          className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
