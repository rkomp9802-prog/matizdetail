import { NextResponse } from 'next/server';
import { sendTelegramFeedback } from '@/lib/telegram';
import { isCrmConfigured, sendLeadToCrm } from '@/lib/crm';

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

  /*
   * Два независимых получателя: Telegram для быстрого уведомления и CRM
   * для учёта. Считаем заявку принятой, если сработал хотя бы один, —
   * терять обращение из-за того, что один из каналов прилёг, нельзя.
   */
  let telegramOk = false;
  try {
    await sendTelegramFeedback(text);
    telegramOk = true;
  } catch (error) {
    console.error('[feedback] не удалось отправить в Telegram:', error);
  }

  let crmOk = false;
  if (isCrmConfigured()) {
    // CRM требует имя, заявку без него она отклонит
    if (!name) {
      console.error('[feedback] заявка без имени — в CRM не передана');
    } else {
      const result = await sendLeadToCrm({ name, contact, message });
      crmOk = result.ok;
      if (result.ok) {
        console.log('[feedback] заявка в CRM, id:', result.leadId);
      } else {
        console.error('[feedback] CRM не приняла заявку:', result.error);
      }
    }
  }

  if (!telegramOk && !crmOk) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
