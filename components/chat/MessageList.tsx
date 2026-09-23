'use client';

import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import type { Message } from '@/types/chat.types';

/** Допуск в пикселях: считаем, что пользователь «внизу» списка */
const BOTTOM_TOLERANCE = 50;

interface Props {
  messages: Message[];
  isBotTyping: boolean;
  children?: React.ReactNode;
}

export default function MessageList({ messages, isBotTyping, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  /** Сколько сообщений пользователь уже видел внизу ленты */
  const [seenCount, setSeenCount] = useState(messages.length);

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }

  /*
   * Единственное место, где обновляются оба состояния. Автоскролл ниже тоже
   * проходит через него: scrollTo порождает событие scroll, и счётчик
   * просмотренных сообщений догоняется сам — без setState внутри эффекта.
   */
  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_TOLERANCE;
    setIsAtBottom(atBottom);
    if (atBottom) setSeenCount(messages.length);
  }

  // Автоскролл только если пользователь сам не ушёл вверх — иначе не мешаем ему.
  // Эффект синхронизирует DOM и не трогает state: setState здесь вызвал бы
  // каскадные перерисовки.
  useEffect(() => {
    if (isAtBottom) scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isBotTyping]);

  const hasNewBelow = !isAtBottom && messages.length > seenCount;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="История переписки"
        className="flex h-full flex-col gap-2.5 overflow-y-auto bg-surface p-3.5"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isBotTyping && <TypingIndicator />}
        {children}
      </div>

      {hasNewBelow && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/90 px-3 py-1.5 text-[0.7rem] font-medium text-white shadow-lg transition-colors hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          ↓ Новые сообщения
        </button>
      )}
    </div>
  );
}
