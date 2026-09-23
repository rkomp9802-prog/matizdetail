export type MessageRole = 'user' | 'bot';

export type MediaKind = 'photo' | 'voice';

/** Вложение в том виде, в каком оно летит на сервер и лежит в базе */
export interface MediaAttachment {
  kind: MediaKind;
  mime: string;
  /** base64 без префикса data:...;base64, */
  data: string;
  /** размер исходного файла в байтах — для показа в админке */
  size: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  /** unix ms */
  timestamp: number;
  /** для показа в ленте: data-URL уже отправленного вложения */
  media?: { kind: MediaKind; url: string };
}

export interface ChatState {
  messages: Message[];
  isBotTyping: boolean;
}

export type QAStatus = 'pending' | 'answered';

export interface QAEntry {
  id: string;
  question: string;
  /** lowercase + trim, для сравнения похожих формулировок */
  normalized_question: string;
  answer: string | null;
  /** Черновик от Gemini: показывается в админке, но бот его не отдаёт */
  gemini_answer: string | null;
  /** Ключевые слова через запятую: ловят вопрос в другом падеже/времени */
  keywords: string | null;
  status: QAStatus;
  /** сколько раз похожий вопрос задавали */
  asked_count: number;
  /** ISO-строка: в SQLite нет timestamptz */
  created_at: string;
  answered_at: string | null;
}

/** Строка переписки из chat_messages */
export interface ChatMessageRecord {
  id: string;
  session_id: string;
  role: MessageRole;
  text: string | null;
  media_kind: MediaKind | null;
  media_mime: string | null;
  media_data: string | null;
  media_size: number | null;
  created_at: string;
}

/** Диалог для админки */
export interface Dialog {
  sessionId: string;
  startedAt: string;
  lastAt: string;
  messages: ChatMessageRecord[];
}

/** Ответ POST /api/chat */
export interface ChatResponse {
  reply?: string;
  error?: string;
}
