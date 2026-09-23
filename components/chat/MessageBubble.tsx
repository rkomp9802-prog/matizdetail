/* eslint-disable @next/next/no-img-element */
import type { Message } from '@/types/chat.types';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const hasText = message.text.trim().length > 0;

  return (
    <div
      className={`flex max-w-[85%] flex-col ${
        isUser ? 'items-end self-end' : 'items-start self-start'
      }`}
    >
      {message.media && (
        <div
          className={`mb-1 overflow-hidden rounded-[15px] ${
            isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
          }`}
        >
          {message.media.kind === 'photo' ? (
            /* next/image здесь не подходит: это data-URL, а не файл из /public */
            <img
              src={message.media.url}
              alt="Фото от посетителя"
              className="max-h-56 w-auto max-w-full object-cover"
            />
          ) : (
            <audio
              controls
              src={message.media.url}
              className="h-10 w-56 max-w-full"
            >
              Ваш браузер не умеет проигрывать аудио.
            </audio>
          )}
        </div>
      )}

      {hasText && (
        <div
          className={`rounded-[15px] px-3.5 py-2.5 text-[0.82rem] leading-snug shadow-sm ${
            isUser
              ? 'rounded-br-sm bg-brand text-white'
              : 'rounded-bl-sm bg-card text-ink'
          }`}
        >
          {message.text}
        </div>
      )}

      <span className="mt-1 px-1 text-[0.65rem] text-muted">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
