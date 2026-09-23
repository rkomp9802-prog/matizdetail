import { NextResponse } from 'next/server';
import { sendTelegramFeedback } from '@/lib/telegram';

export const runtime = 'nodejs';

const MAX_FIELD = 500;
const MAX_MESSAGE = 2000;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const asText = (value: unknown, limit: number) =>
    typeof value === 'string' ? value.trim().slice(0, limit) : '';

  /*
   * Honeypot. Поле спрятано от людей, но видно ботам — если оно заполнено,
   * молча отвечаем успехом. Бот уходит довольный и не начинает подбирать
   * обход, а сообщение никуда не отправляется.
   */
  if (asText(body.website, MAX_FIELD)) {
    return NextResponse.json({ success: true });
  }

  const name = asText(body.name, MAX_FIELD);
  const contact = asText(body.contact, MAX_FIELD);
  const message = asText(body.message, MAX_MESSAGE);

  if (!message) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const text = [
    '📨 Сообщение с сайта',
    '',
    `Имя: ${name || 'не указано'}`,
    `Контакт: ${contact || 'не указан'}`,
    '',
    message,
  ].join('\n');

  try {
    await sendTelegramFeedback(text);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[feedback] не удалось отправить в Telegram:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
