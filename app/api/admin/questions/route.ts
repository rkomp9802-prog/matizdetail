import { NextResponse } from 'next/server';
import { getTursoClient, isTursoConfigured, toQAEntry } from '@/lib/turso';
import { extractKeywords, normalizeQuestion } from '@/lib/qaMatch';

export const runtime = 'nodejs';

function noDatabase() {
  return NextResponse.json(
    { error: 'TURSO_DATABASE_URL не задан — база вопросов не подключена' },
    { status: 503 }
  );
}

/** Все вопросы: неотвеченные — сначала самые частые */
export async function GET() {
  if (!isTursoConfigured()) return noDatabase();
  const db = getTursoClient()!;

  try {
    const { rows } = await db.execute(
      `SELECT * FROM questions
       ORDER BY status ASC, asked_count DESC, created_at DESC`
    );
    const all = rows.map(toQAEntry);

    return NextResponse.json({
      pending: all.filter((q) => q.status === 'pending'),
      answered: all.filter((q) => q.status === 'answered'),
    });
  } catch (error) {
    console.error('[admin] не удалось прочитать вопросы:', error);
    return NextResponse.json(
      { error: 'Не удалось прочитать базу. Выполнена ли миграция?' },
      { status: 500 }
    );
  }
}

/** Сохранить ответ и/или ключевые слова */
export async function PATCH(request: Request) {
  if (!isTursoConfigured()) return noDatabase();
  const db = getTursoClient()!;

  let body: { id?: unknown; answer?: unknown; keywords?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const { id, answer, keywords } = body;
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Не указан id' }, { status: 400 });
  }
  if (typeof answer !== 'string' || !answer.trim()) {
    return NextResponse.json({ error: 'Пустой ответ' }, { status: 400 });
  }

  const cleanKeywords =
    typeof keywords === 'string' && keywords.trim() ? keywords.trim() : null;

  try {
    await db.execute({
      sql: `UPDATE questions
            SET answer = ?, keywords = ?, status = 'answered', answered_at = ?
            WHERE id = ?`,
      args: [answer.trim(), cleanKeywords, new Date().toISOString(), id],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] не удалось сохранить ответ:', error);
    return NextResponse.json({ error: 'Не удалось сохранить' }, { status: 500 });
  }
}

/** Добавить вопрос вручную — не дожидаясь, пока его задаст посетитель */
export async function POST(request: Request) {
  if (!isTursoConfigured()) return noDatabase();
  const db = getTursoClient()!;

  let body: { question?: unknown; answer?: unknown; keywords?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const { question, answer, keywords } = body;
  if (typeof question !== 'string' || !question.trim()) {
    return NextResponse.json({ error: 'Пустой вопрос' }, { status: 400 });
  }

  const normalized = normalizeQuestion(question);
  const hasAnswer = typeof answer === 'string' && answer.trim().length > 0;
  const cleanKeywords =
    typeof keywords === 'string' && keywords.trim()
      ? keywords.trim()
      : extractKeywords(normalized);

  try {
    await db.execute({
      sql: `INSERT INTO questions
              (id, question, normalized_question, answer, keywords, status, asked_count, created_at, answered_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      args: [
        crypto.randomUUID(),
        question.trim(),
        normalized,
        hasAnswer ? (answer as string).trim() : null,
        cleanKeywords,
        hasAnswer ? 'answered' : 'pending',
        new Date().toISOString(),
        hasAnswer ? new Date().toISOString() : null,
      ],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] не удалось добавить вопрос:', error);
    return NextResponse.json({ error: 'Не удалось добавить' }, { status: 500 });
  }
}
