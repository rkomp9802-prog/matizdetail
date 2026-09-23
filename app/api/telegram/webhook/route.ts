import { NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/answer';
import { saveMessage } from '@/lib/chatLog';
import {
  downloadFile,
  hasBotToken,
  notifyNewQuestion,
  sendMessageTo,
} from '@/lib/telegram';
import type { MediaAttachment } from '@/types/chat.types';

export const runtime = 'nodejs';

/** Столько же, сколько принимаем с сайта */
const MAX_MEDIA_BYTES = 900_000;

const MEDIA_ACK = {
  photo: 'Спасибо, фото получил и передал мастеру — он посмотрит и ответит.',
  voice: 'Голосовое получил и передал мастеру — он прослушает и ответит.',
};

interface TelegramUpdate {
  message?: {
    chat?: { id?: number };
    from?: { first_name?: string; username?: string };
    text?: string;
    caption?: string;
    photo?: { file_id: string; file_size?: number }[];
    voice?: { file_id: string; file_size?: number; mime_type?: string };
  };
}

/**
 * Клиенты могут писать боту прямо в Telegram и получают те же ответы,
 * что и в виджете на сайте: intents → своя база → Gemini.
 * Вся переписка попадает в ту же админку, диалог помечается как tg-<chat id>.
 *
 * Telegram шлёт сюда POST, поэтому вместо cookie проверяем секрет из заголовка:
 * его знает только Telegram, потому что мы передали его при setWebhook.
 */
export async function POST(request: Request) {
  if (!hasBotToken()) {
    return NextResponse.json({ error: 'Бот не настроен' }, { status: 503 });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const provided = request.headers.get('x-telegram-bot-api-secret-token');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  const chatId = message?.chat?.id;
  if (!message || typeof chatId !== 'number') {
    // Не наш тип обновления — отвечаем 200, иначе Telegram будет повторять
    return NextResponse.json({ ok: true });
  }

  const sessionId = `tg-${chatId}`;
  // Не шлём владельцу уведомление о его же сообщениях
  const isOwner = String(chatId) === process.env.TELEGRAM_CHAT_ID;

  try {
    const media = await extractMedia(message);
    const text = (message.text ?? message.caption ?? '').trim().slice(0, 1000);

    await saveMessage({
      sessionId,
      role: 'user',
      text: text || null,
      media,
    });

    if (media) {
      const reply = MEDIA_ACK[media.kind];
      await sendMessageTo(chatId, reply);
      await saveMessage({ sessionId, role: 'bot', text: reply });
      return NextResponse.json({ ok: true });
    }

    if (!text) return NextResponse.json({ ok: true });

    if (text.startsWith('/start')) {
      const greeting =
        'Здравствуйте! Я бот поддержки детейлинг-центра. Спросите про услуги, ' +
        'цены, сроки или запись — отвечу сразу.';
      await sendMessageTo(chatId, greeting);
      await saveMessage({ sessionId, role: 'bot', text: greeting });
      return NextResponse.json({ ok: true });
    }

    const result = await answerQuestion(text);

    await sendMessageTo(chatId, result.reply);
    await saveMessage({ sessionId, role: 'bot', text: result.reply });

    if (!isOwner && (result.source === 'gemini' || result.unanswered)) {
      await notifyNewQuestion(`${text}\n\n(из Telegram)`, {
        askedCount: 1,
        answeredByAi: result.source === 'gemini',
      });
    }
  } catch (error) {
    console.error('[telegram] ошибка обработки сообщения:', error);
    try {
      await sendMessageTo(
        chatId,
        'Извините, что-то пошло не так. Попробуйте ещё раз или позвоните нам.'
      );
    } catch {
      // Ответить не вышло — дальше ловить нечего
    }
  }

  // Telegram считает доставку неудачной на любом не-200 и шлёт апдейт снова
  return NextResponse.json({ ok: true });
}

async function extractMedia(
  message: NonNullable<TelegramUpdate['message']>
): Promise<MediaAttachment | null> {
  // В photo приходит несколько размеров — берём самый большой, он последний
  const photo = message.photo?.[message.photo.length - 1];
  if (photo) {
    const file = await downloadFile(photo.file_id, MAX_MEDIA_BYTES);
    if (!file) return null;
    return {
      kind: 'photo',
      mime: file.mime.startsWith('image/') ? file.mime : 'image/jpeg',
      data: file.base64,
      size: file.size,
    };
  }

  if (message.voice) {
    const file = await downloadFile(message.voice.file_id, MAX_MEDIA_BYTES);
    if (!file) return null;
    return {
      kind: 'voice',
      mime: message.voice.mime_type ?? 'audio/ogg',
      data: file.base64,
      size: file.size,
    };
  }

  return null;
}
