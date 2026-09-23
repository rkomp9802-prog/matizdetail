import { NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/answer';
import { saveMessage, validateMedia } from '@/lib/chatLog';
import { notifyNewQuestion, sendMedia } from '@/lib/telegram';

// @libsql/client стабильнее работает в node runtime, чем на edge
export const runtime = 'nodejs';

const MAX_LENGTH = 1000;

const MEDIA_ACK: Record<'photo' | 'voice', string> = {
  photo: 'Спасибо, фото получил и передал мастеру — он посмотрит и ответит. Если вопрос срочный, позвоните нам.',
  voice: 'Голосовое получил и передал мастеру — он прослушает и ответит. Если вопрос срочный, позвоните нам.',
};

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const sessionId =
    typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : null;
  if (!sessionId) {
    return NextResponse.json({ error: 'Не указан sessionId' }, { status: 400 });
  }

  const media = validateMedia(body.media);
  const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
  const text = rawMessage.slice(0, MAX_LENGTH);

  if (!text && !media) {
    return NextResponse.json({ error: 'Пустое сообщение' }, { status: 400 });
  }
  if (body.media && !media) {
    return NextResponse.json(
      { error: 'Вложение не принято: неподдерживаемый формат или слишком большой файл' },
      { status: 400 }
    );
  }

  // Сообщение посетителя пишем сразу — чтобы оно было в админке
  // независимо от того, чем закончится обработка
  try {
    await saveMessage({ sessionId, role: 'user', text: text || null, media });
  } catch (error) {
    console.error('[chat] не удалось записать сообщение:', error);
  }

  /*
   * Фото и голосовые бот не разбирает: он не умеет ни читать снимок,
   * ни слушать запись. Поэтому просто подтверждает приём, а само вложение
   * уходит владельцу в Telegram и остаётся в админке.
   */
  if (media) {
    const caption = text
      ? `📎 Вложение из чата на сайте\n\n${text}`
      : '📎 Вложение из чата на сайте';

    try {
      await sendMedia(media, caption);
    } catch (error) {
      console.error('[chat] не удалось отправить вложение в Telegram:', error);
    }

    const reply = MEDIA_ACK[media.kind];
    try {
      await saveMessage({ sessionId, role: 'bot', text: reply });
    } catch (error) {
      console.error('[chat] не удалось записать ответ:', error);
    }
    return NextResponse.json({ reply });
  }

  // Intents виджет уже прогнал в браузере — начинаем с базы FAQ
  const result = await answerQuestion(text, { skipIntents: true });

  try {
    await saveMessage({ sessionId, role: 'bot', text: result.reply });
  } catch (error) {
    console.error('[chat] не удалось записать ответ:', error);
  }

  if (result.source === 'gemini' || result.unanswered) {
    try {
      await notifyNewQuestion(text, {
        askedCount: 1,
        answeredByAi: result.source === 'gemini',
      });
    } catch (error) {
      console.error('[chat] не удалось уведомить в Telegram:', error);
    }
  }

  return NextResponse.json({ reply: result.reply });
}
