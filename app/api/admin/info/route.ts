import { NextResponse } from 'next/server';
import { BUSINESS_FIELDS, loadValues, saveValues } from '@/lib/businessInfo';
import { isTursoConfigured } from '@/lib/turso';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ values: await loadValues() });
  } catch (error) {
    console.error('[admin] не удалось прочитать данные сервиса:', error);
    return NextResponse.json({ error: 'Не удалось прочитать' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isTursoConfigured()) {
    return NextResponse.json(
      { error: 'TURSO_DATABASE_URL не задан — сохранять некуда' },
      { status: 503 }
    );
  }

  let body: { values?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const raw = body.values;
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ error: 'Нет данных' }, { status: 400 });
  }

  // Берём только известные поля и только строки — остальное игнорируем
  const allowed = new Set(BUSINESS_FIELDS.map((f) => f.key));
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (allowed.has(key) && typeof value === 'string') {
      values[key] = value.slice(0, 4000);
    }
  }

  try {
    await saveValues(values);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] не удалось сохранить данные сервиса:', error);
    return NextResponse.json({ error: 'Не удалось сохранить' }, { status: 500 });
  }
}
