'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  defaultBotProfile,
  getBotResponse,
  getFallbackResponse,
  type BotProfile,
} from '@/lib/chatBot';
import type {
  ChatResponse,
  MediaKind,
  Message,
  MessageRole,
} from '@/types/chat.types';
import type { PreparedMedia } from '@/lib/media';
import { business } from '@/data/business';

/** Декоративная пауза, чтобы мгновенный локальный ответ не выглядел неестественно */
const RULE_BASED_DELAY_MS = 400;

const SESSION_KEY = 'matiz-chat-session';

function createMessage(
  role: MessageRole,
  text: string,
  media?: { kind: MediaKind; url: string }
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: Date.now(),
    media,
  };
}

function welcomeMessage(): Message {
  return createMessage(
    'bot',
    `Здравствуйте! Я бот поддержки ${business.name}. Чем могу помочь?`
  );
}

export function useChat(profile: BotProfile = defaultBotProfile) {
  const [messages, setMessages] = useState<Message[]>(() => [welcomeMessage()]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const sessionIdRef = useRef('');

  /*
   * Одна вкладка — один диалог. sessionStorage, а не localStorage:
   * переписка не должна тянуться через недели и путать владельца в админке.
   * Инициализируем после монтирования — на сервере sessionStorage нет.
   */
  useEffect(() => {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(SESSION_KEY, id);
      }
      sessionIdRef.current = id;
    } catch {
      sessionIdRef.current = crypto.randomUUID();
    }
  }, []);

  const pushMessage = useCallback(
    (role: MessageRole, text: string, media?: { kind: MediaKind; url: string }) => {
      setMessages((prev) => [...prev, createMessage(role, text, media)]);
    },
    []
  );

  /** Досылаем в админку то, на что ответил локальный слой intents */
  const logLocally = useCallback(
    async (entries: { role: MessageRole; text: string }[]) => {
      if (!sessionIdRef.current) return;
      try {
        await fetch('/api/chat/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdRef.current, entries }),
        });
      } catch {
        // Журнал не должен ломать чат: посетителю ответ уже показан
      }
    },
    []
  );

  /**
   * Порядок из раздела 5.4 спеки: от бесплатного и мгновенного к дорогому.
   * Уровни 5–7 (FAQ-база и Gemini) выполняются на сервере внутри /api/chat.
   */
  const handleUserMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || isBotTyping) return;

      pushMessage('user', text);
      setIsBotTyping(true);

      try {
        // Уровень 1-3: локальные intents, без сети и без затрат
        const local = getBotResponse(text, profile);
        if (!local.isFallback) {
          await new Promise((r) => setTimeout(r, RULE_BASED_DELAY_MS));
          pushMessage('bot', local.text);
          void logLocally([
            { role: 'user', text },
            { role: 'bot', text: local.text },
          ]);
          return;
        }

        // Уровень 4: отдаём на сервер — там FAQ-база, затем Gemini
        let res: Response;
        try {
          res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, sessionId: sessionIdRef.current }),
          });
        } catch {
          // Сеть недоступна — честно об этом говорим, а не подменяем fallback-ом
          pushMessage(
            'bot',
            'Похоже, пропало соединение. Проверьте интернет и попробуйте ещё раз.'
          );
          return;
        }

        if (!res.ok) {
          // Ожидаемая деградация: лимит Gemini, 5xx.
          // Сообщение посетителя сервер уже записал — досылаем только ответ.
          const fallback = getFallbackResponse(profile);
          pushMessage('bot', fallback);
          void logLocally([{ role: 'bot', text: fallback }]);
          return;
        }

        const data: ChatResponse = await res.json();
        pushMessage('bot', data.reply?.trim() || getFallbackResponse(profile));
      } finally {
        // Обязательно в finally — иначе поле ввода останется заблокированным
        setIsBotTyping(false);
      }
    },
    [isBotTyping, logLocally, profile, pushMessage]
  );

  /**
   * Фото и голосовые. Бот их не разбирает — он не умеет ни смотреть снимок,
   * ни слушать запись. Вложение уходит владельцу в Telegram и в админку,
   * посетителю приходит подтверждение приёма.
   */
  const handleMediaMessage = useCallback(
    async (prepared: PreparedMedia, caption = '') => {
      if (isBotTyping) return;

      const text = caption.trim();
      pushMessage('user', text, {
        kind: prepared.attachment.kind,
        url: prepared.previewUrl,
      });
      setIsBotTyping(true);

      try {
        let res: Response;
        try {
          res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text,
              sessionId: sessionIdRef.current,
              media: prepared.attachment,
            }),
          });
        } catch {
          pushMessage(
            'bot',
            'Не удалось отправить вложение — похоже, пропало соединение.'
          );
          return;
        }

        if (!res.ok) {
          const data: ChatResponse = await res.json().catch(() => ({}));
          pushMessage(
            'bot',
            data.error ?? 'Не удалось принять вложение. Попробуйте ещё раз.'
          );
          return;
        }

        const data: ChatResponse = await res.json();
        pushMessage('bot', data.reply?.trim() || 'Вложение получено.');
      } finally {
        setIsBotTyping(false);
      }
    },
    [isBotTyping, pushMessage]
  );

  return { messages, isBotTyping, handleUserMessage, handleMediaMessage };
}
