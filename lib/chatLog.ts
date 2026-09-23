import { getTursoClient } from './turso';
import type {
  ChatMessageRecord,
  Dialog,
  MediaAttachment,
  MediaKind,
  MessageRole,
} from '@/types/chat.types';

/**
 * Потолок на вложение. Фото сжимается в браузере до ~200 КБ, голосовое
 * ограничено минутой, так что нормальные сообщения проходят с запасом.
 * Лимит нужен, чтобы одним запросом не положить базу.
 */
export const MAX_MEDIA_BASE64 = 1_200_000;

const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/** Проверка приходящего вложения: данные пользовательские, доверять им нельзя */
export function validateMedia(value: unknown): MediaAttachment | null {
  if (!value || typeof value !== 'object') return null;

  const media = value as Partial<MediaAttachment>;
  if (media.kind !== 'photo' && media.kind !== 'voice') return null;
  if (typeof media.mime !== 'string' || typeof media.data !== 'string') return null;
  if (!media.data || media.data.length > MAX_MEDIA_BASE64) return null;

  if (media.kind === 'photo' && !ALLOWED_PHOTO_MIME.includes(media.mime)) return null;
  if (media.kind === 'voice' && !media.mime.startsWith('audio/')) return null;

  return {
    kind: media.kind,
    mime: media.mime,
    data: media.data,
    size: typeof media.size === 'number' ? media.size : 0,
  };
}

interface SaveInput {
  sessionId: string;
  role: MessageRole;
  text?: string | null;
  media?: MediaAttachment | null;
}

/** Пишем каждое сообщение — и пользователя, и бота, откуда бы ни пришёл ответ */
export async function saveMessage(input: SaveInput): Promise<void> {
  const db = getTursoClient();
  if (!db) return;

  await db.execute({
    sql: `insert into chat_messages
            (id, session_id, role, text, media_kind, media_mime, media_data, media_size, created_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      input.sessionId,
      input.role,
      input.text ?? null,
      input.media?.kind ?? null,
      input.media?.mime ?? null,
      input.media?.data ?? null,
      input.media?.size ?? null,
      new Date().toISOString(),
    ],
  });
}

function toRecord(row: Record<string, unknown>): ChatMessageRecord {
  const asText = (v: unknown) => (v === null || v === undefined ? null : String(v));
  return {
    id: String(row.id),
    session_id: String(row.session_id),
    role: String(row.role) as MessageRole,
    text: asText(row.text),
    media_kind: row.media_kind ? (String(row.media_kind) as MediaKind) : null,
    media_mime: asText(row.media_mime),
    media_data: asText(row.media_data),
    media_size: row.media_size === null || row.media_size === undefined ? null : Number(row.media_size),
    created_at: String(row.created_at),
  };
}

/**
 * Диалоги для админки, свежие сверху.
 * limit — по числу диалогов, а не сообщений: иначе переписка обрывалась бы
 * на середине.
 */
export async function loadDialogs(limit = 30): Promise<Dialog[]> {
  const db = getTursoClient();
  if (!db) return [];

  /*
   * media_data намеренно не выбираем: иначе страница админки тянула бы
   * мегабайты base64 в HTML. Сами файлы отдаёт /api/admin/media/[id].
   */
  const { rows } = await db.execute({
    sql: `select id, session_id, role, text, media_kind, media_mime, media_size, created_at
          from chat_messages
          where session_id in (
            select session_id from chat_messages
            group by session_id
            order by max(created_at) desc
            limit ?
          )
          order by created_at asc`,
    args: [limit],
  });

  const bySession = new Map<string, ChatMessageRecord[]>();
  for (const row of rows) {
    const record = toRecord(row as unknown as Record<string, unknown>);
    const list = bySession.get(record.session_id);
    if (list) list.push(record);
    else bySession.set(record.session_id, [record]);
  }

  const dialogs: Dialog[] = [];
  for (const [sessionId, messages] of bySession) {
    dialogs.push({
      sessionId,
      startedAt: messages[0].created_at,
      lastAt: messages[messages.length - 1].created_at,
      messages,
    });
  }

  return dialogs.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** Файл вложения для защищённого роута админки */
export async function loadMedia(
  id: string
): Promise<{ mime: string; buffer: Buffer } | null> {
  const db = getTursoClient();
  if (!db) return null;

  const { rows } = await db.execute({
    sql: 'select media_mime, media_data from chat_messages where id = ?',
    args: [id],
  });

  const row = rows[0] as unknown as Record<string, unknown> | undefined;
  if (!row?.media_data) return null;

  return {
    mime: row.media_mime ? String(row.media_mime) : 'application/octet-stream',
    buffer: Buffer.from(String(row.media_data), 'base64'),
  };
}
