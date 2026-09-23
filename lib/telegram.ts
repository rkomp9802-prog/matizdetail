import type { MediaAttachment } from '@/types/chat.types';

/**
 * Уведомления владельцу в Telegram. Не настроен — молча пропускаем:
 * чат не должен падать из-за того, что не заполнена переменная окружения.
 */

const API = 'https://api.telegram.org/bot';

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function endpoint(method: string): string {
  return `${API}${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

async function call(method: string, body: FormData | object): Promise<void> {
  const init: RequestInit =
    body instanceof FormData
      ? { method: 'POST', body }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        };

  const res = await fetch(endpoint(method), init);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Telegram ${method} ${res.status}: ${detail.slice(0, 200)}`);
  }
}

/** Экранирование под parse_mode HTML */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Бот умеет отвечать клиентам, даже если владелец не указал свой chat id */
export function hasBotToken(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** Сообщение в конкретный чат — так бот отвечает клиенту */
export async function sendMessageTo(
  chatId: number | string,
  text: string
): Promise<void> {
  if (!hasBotToken()) return;
  await call('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

/** Уведомление владельцу */
export async function sendText(text: string): Promise<void> {
  if (!isTelegramConfigured()) return;
  await call('sendMessage', {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

/**
 * Скачивает файл, присланный клиентом в Telegram, чтобы он лёг в базу
 * и был виден в админке рядом с остальной перепиской.
 * Ограничение Telegram Bot API — 20 МБ, но нам хватит и куда меньшего.
 */
export async function downloadFile(
  fileId: string,
  maxBytes: number
): Promise<{ mime: string; base64: string; size: number } | null> {
  if (!hasBotToken()) return null;

  const infoRes = await fetch(endpoint('getFile'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });
  if (!infoRes.ok) return null;

  const info = (await infoRes.json()) as {
    ok: boolean;
    result?: { file_path?: string; file_size?: number };
  };
  const filePath = info.result?.file_path;
  if (!info.ok || !filePath) return null;
  if (info.result?.file_size && info.result.file_size > maxBytes) return null;

  const fileRes = await fetch(
    `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`
  );
  if (!fileRes.ok) return null;

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  if (buffer.byteLength > maxBytes) return null;

  const mime =
    fileRes.headers.get('content-type') ??
    (filePath.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream');

  return { mime, base64: buffer.toString('base64'), size: buffer.byteLength };
}

/** Новый вопрос, на который у нас нет своего ответа */
export async function notifyNewQuestion(
  question: string,
  options: { askedCount: number; answeredByAi: boolean }
): Promise<void> {
  if (!isTelegramConfigured()) return;

  const header = options.askedCount > 1
    ? `❓ Повторный вопрос (${options.askedCount}-й раз)`
    : '❓ Новый вопрос';

  const footer = options.answeredByAi
    ? 'Gemini ответил черновиком — проверьте его в админке.'
    : 'Бот не смог ответить. Впишите ответ в админке.';

  await sendText(
    `${header}\n\n<b>${escapeHtml(question)}</b>\n\n${footer}`
  );
}

/** Фото или голосовое от посетителя */
export async function sendMedia(
  media: MediaAttachment,
  caption: string
): Promise<void> {
  if (!isTelegramConfigured()) return;

  const buffer = Buffer.from(media.data, 'base64');
  const blob = new Blob([new Uint8Array(buffer)], { type: media.mime });

  const form = new FormData();
  form.append('chat_id', process.env.TELEGRAM_CHAT_ID as string);
  form.append('caption', caption.slice(0, 1000));

  if (media.kind === 'photo') {
    form.append('photo', blob, 'photo.jpg');
    await call('sendPhoto', form);
    return;
  }

  // sendVoice ждёт ogg/opus; браузер чаще отдаёт webm, поэтому шлём документом
  const isOgg = media.mime.includes('ogg');
  if (isOgg) {
    form.append('voice', blob, 'voice.ogg');
    await call('sendVoice', form);
  } else {
    form.append('audio', blob, 'voice.webm');
    await call('sendAudio', form);
  }
}

/**
 * Сообщение из формы обратной связи на сайте.
 *
 * В отличие от остальных функций модуля, эта намеренно БРОСАЕТ исключение,
 * если бот не настроен или Telegram ответил ошибкой: посетителю нельзя
 * показать «спасибо», когда сообщение на самом деле никуда не ушло.
 */
export async function sendTelegramFeedback(text: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы в .env.local — отправлять некуда'
    );
  }

  await call('sendMessage', {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text,
    disable_web_page_preview: true,
  });
}
