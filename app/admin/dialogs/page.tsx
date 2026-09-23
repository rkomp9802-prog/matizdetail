/* eslint-disable @next/next/no-img-element */
import AdminNav from '../AdminNav';
import { loadDialogs } from '@/lib/chatLog';
import { isTursoConfigured } from '@/lib/turso';
import type { ChatMessageRecord } from '@/types/chat.types';

export const dynamic = 'force-dynamic';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function MessageRow({ message }: { message: ChatMessageRecord }) {
  const isUser = message.role === 'user';

  return (
    <li className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className="max-w-[80%]">
        {message.media_kind === 'photo' && (
          <img
            src={`/api/admin/media/${message.id}`}
            alt="Фото от посетителя"
            loading="lazy"
            className="mb-1 max-h-64 rounded-xl border border-line"
          />
        )}

        {message.media_kind === 'voice' && (
          <audio
            controls
            preload="none"
            src={`/api/admin/media/${message.id}`}
            className="mb-1 h-10 w-64 max-w-full"
          >
            Браузер не умеет проигрывать аудио.
          </audio>
        )}

        {message.text && (
          <div
            className={`rounded-xl px-3.5 py-2 text-sm ${
              isUser ? 'bg-brand text-white' : 'bg-surface text-ink'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-1 flex gap-2 px-1 text-[0.7rem] text-muted">
          <span>{isUser ? 'Посетитель' : 'Бот'}</span>
          <span>{formatDateTime(message.created_at)}</span>
          {message.media_size ? <span>{formatSize(message.media_size)}</span> : null}
        </div>
      </div>
    </li>
  );
}

export default async function DialogsPage() {
  if (!isTursoConfigured()) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <AdminNav active="dialogs" />
        <p className="mt-6 rounded-lg border border-brand/30 bg-brand/5 p-4 text-sm text-brand">
          TURSO_DATABASE_URL не задан — переписка не сохраняется.
        </p>
      </main>
    );
  }

  let dialogs;
  try {
    dialogs = await loadDialogs(30);
  } catch (error) {
    console.error('[admin] не удалось прочитать переписку:', error);
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <AdminNav active="dialogs" />
        <p className="mt-6 rounded-lg border border-brand/30 bg-brand/5 p-4 text-sm text-brand">
          Не удалось прочитать переписку. Выполнена ли миграция (npm run db:migrate)?
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav active="dialogs" />

      <h1 className="mt-8 font-heading text-3xl font-extrabold">Переписка</h1>
      <p className="mt-2 text-sm text-muted">
        Все сообщения из чата на сайте, включая фото и голосовые. Последние 30
        диалогов, свежие сверху.
      </p>

      {dialogs.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          Пока пусто. Здесь появятся диалоги, как только кто-то напишет в чат.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {dialogs.map((dialog) => {
            const mediaCount = dialog.messages.filter((m) => m.media_kind).length;

            return (
              <details
                key={dialog.sessionId}
                className="rounded-xl border border-line bg-card"
              >
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                  <span className="font-medium">{formatDateTime(dialog.lastAt)}</span>
                  <span className="text-muted">
                    {dialog.messages.length} сообщ.
                    {mediaCount > 0 && ` · ${mediaCount} вложений`}
                  </span>
                  <span className="ml-auto font-mono text-[0.7rem] text-muted">
                    {dialog.sessionId.slice(0, 8)}
                  </span>
                </summary>

                <ul className="space-y-3 border-t border-line p-5">
                  {dialog.messages.map((message) => (
                    <MessageRow key={message.id} message={message} />
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </main>
  );
}
