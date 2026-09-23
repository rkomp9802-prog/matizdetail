import { createClient, type Client, type Row } from '@libsql/client';
import type { QAEntry, QAStatus } from '@/types/chat.types';

let cached: Client | null = null;

/**
 * Turso не настроен — это нормальное состояние на этапах 1–2 (раздел 7 спеки):
 * проверка FAQ-базы просто пропускается, вопросы не логируются.
 */
export function isTursoConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

export function getTursoClient(): Client | null {
  if (!isTursoConfigured()) return null;

  if (!cached) {
    cached = createClient({
      url: process.env.TURSO_DATABASE_URL as string,
      // Для локального файла (file:local.db) токен не нужен, для облака — обязателен
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  return cached;
}

function asText(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

/**
 * Строки libSQL — не обычные объекты: у них есть прототип и доступ по индексу.
 * React не умеет передавать такие из серверного компонента в клиентский,
 * поэтому раскладываем их в простые объекты явно.
 */
export function toQAEntry(row: Row): QAEntry {
  return {
    id: String(row.id),
    question: String(row.question),
    normalized_question: String(row.normalized_question),
    answer: asText(row.answer),
    gemini_answer: asText(row.gemini_answer),
    keywords: asText(row.keywords),
    status: String(row.status) as QAStatus,
    asked_count: Number(row.asked_count),
    created_at: String(row.created_at),
    answered_at: asText(row.answered_at),
  };
}
