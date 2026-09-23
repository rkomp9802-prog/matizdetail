'use client';

import { useEffect, useRef, useState } from 'react';
import ChatInput from './ChatInput';
import MessageList from './MessageList';
import { useChat } from '@/hooks/useChat';
import { defaultBotProfile, type BotProfile } from '@/lib/chatBot';
import { business } from '@/data/business';

const SUGGESTIONS = [
  'Сколько стоит мойка?',
  'Что такое полировка?',
  'Как записаться?',
  'Сколько стоит керамика?',
];

export default function ChatWidget({
  profile = defaultBotProfile,
}: {
  profile?: BotProfile;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { messages, isBotTyping, handleUserMessage, handleMediaMessage } =
    useChat(profile);
  const windowRef = useRef<HTMLDivElement>(null);

  function send(text: string) {
    setShowSuggestions(false);
    void handleUserMessage(text);
  }

  // Esc закрывает чат — ожидаемое поведение для модального виджета
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // При открытии уводим фокус внутрь окна, чтобы можно было сразу печатать
  useEffect(() => {
    if (isOpen) windowRef.current?.querySelector('textarea')?.focus();
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          ref={windowRef}
          role="dialog"
          aria-modal="false"
          aria-label={`Чат поддержки ${business.name}`}
          className="fixed inset-0 z-[1001] flex flex-col overflow-hidden bg-card xs:inset-auto xs:right-6 xs:bottom-24 xs:h-[500px] xs:w-[360px] xs:rounded-2xl xs:shadow-[0_10px_40px_rgba(0,0,0,0.15)]"
        >
          <header className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 font-heading text-base font-bold">
                М
              </div>
              <div>
                <div className="text-sm font-semibold">Поддержка {business.name}</div>
                <div className="flex items-center gap-1.5 text-[0.7rem] opacity-90">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
                  Онлайн
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Закрыть чат"
              className="rounded p-1 opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <MessageList messages={messages} isBotTyping={isBotTyping}>
            {showSuggestions && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-[20px] border border-line bg-card px-2.5 py-1 text-[0.72rem] text-brand transition-colors hover:bg-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </MessageList>

          <ChatInput
            disabled={isBotTyping}
            onSend={send}
            onSendMedia={(prepared, caption) => {
              setShowSuggestions(false);
              void handleMediaMessage(prepared, caption);
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Закрыть чат поддержки' : 'Открыть чат поддержки'}
        aria-expanded={isOpen}
        className={`fixed right-6 bottom-6 z-[1000] h-15 w-15 items-center justify-center rounded-full bg-brand text-white shadow-[0_5px_20px_rgba(230,0,0,0.4)] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          // на мобильном чат занимает весь экран — кнопка под ним не нужна
          isOpen ? 'hidden xs:flex' : 'flex'
        }`}
      >
        {isOpen ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-green-600 text-[0.7rem] font-bold">
              1
            </span>
          </>
        )}
      </button>
    </>
  );
}
