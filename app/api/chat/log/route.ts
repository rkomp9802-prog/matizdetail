import { NextResponse } from 'next/server';
import { saveMessage } from '@/lib/chatLog';
import type { MessageRole } from '@/types/chat.types';

export const runtime = 'nodejs';

/**
 * Сообщения, на которые ответил локальный слой intents, до сервера не доходят —
 * а в админке должна быть видна вся переписка. Клиент досылает такие пары сюда.
 * Вложения через этот роут не принимаются: они всегда идут в /api/chat.
 */
export async function POST(request: Request) {
  let body: { sessionId?: unknown; entries?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const { sessionId, entries } = body;
  if (typeof sessionId !== 'string' || !sessionId) {
    return NextResponse.json({ error: 'Не указан sessionId' }, { status: 400 });
  }
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 10) {
    return NextResponse.json({ error: 'Некорректный список сообщений' }, { status: 400 });
  }

  try {
    for (const entry of entries) {
      const role = (entry as { role?: unknown })?.role;
      const text = (entry as { text?: unknown })?.text;
      if ((role !== 'user' && role !== 'bot') || typeof text !== 'string' || !text.trim()) {
        continue;
      }
      await saveMessage({
        sessionId,
        role: role as MessageRole,
        text: text.trim().slice(0, 1000),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[chat/log] не удалось записать переписку:', error);
    return NextResponse.json({ error: 'Не удалось записать' }, { status: 500 });
  }
}
