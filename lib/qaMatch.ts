import { compareTwoStrings } from 'string-similarity';
import { getTursoClient } from './turso';
import type { QAEntry } from '@/types/chat.types';

/**
 * Порог совпадения. Спека предлагает начинать с 0.6 и подкручивать на практике:
 * ниже — поймаете неверные совпадения, выше — перестанете ловить перефразировки.
 */
export const SIMILARITY_THRESHOLD = 0.6;

/** Нормализация для сравнения. Дублируется в lib/chatBot.ts — см. комментарий там. */
export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Русские окончания, которые отбрасываем, чтобы «мойка», «мойки», «мойку»
 * и «помыть» сводились к общей основе. Порядок важен: длинные окончания первыми,
 * иначе короткое съест часть длинного.
 */
const RU_ENDINGS =
  /(иями|ыми|ими|ями|ами|ого|его|ому|ему|ешь|ете|ают|яют|ой|ая|яя|ое|ее|ые|ие|ий|ый|ов|ев|ам|ям|ом|ем|ах|ях|ую|юю|ым|им|ет|ут|ют|ат|ят|ла|ло|ли|ть|у|ю|а|я|ы|и|е|о|ь|й)$/;

/** Грубый стеммер: не лингвистически точный, но достаточный для FAQ на десятки записей */
export function stem(word: string): string {
  if (word.length <= 4) return word;
  const cut = word.replace(RU_ENDINGS, '');
  return cut.length >= 3 ? cut : word;
}

const STOP_WORDS = new Set([
  'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то',
  'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за',
  'бы', 'по', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о',
  'из', 'ему', 'теперь', 'даже', 'ну', 'ли', 'если', 'уже', 'или', 'ни',
  'быть', 'был', 'него', 'до', 'вас', 'нибудь', 'вам', 'сказал', 'этот',
  'для', 'мы', 'тебя', 'их', 'чем', 'была', 'сам', 'чтоб', 'без', 'будто',
  'этом', 'один', 'почти', 'мой', 'тем', 'кто', 'эту', 'при', 'них', 'эти',
  'здравствуйте', 'подскажите', 'скажите', 'пожалуйста', 'хочу', 'можно',
  // Частые в вопросах, но неотличительные: по ним совпало бы что угодно
  'есть', 'вас', 'вам', 'нас', 'нам', 'тоже', 'также', 'очень', 'надо',
  'нужно', 'какой', 'какая', 'какие', 'когда', 'где', 'почему', 'зачем',
  'сколько', 'стоит', 'стоимость', 'цена', 'делаете', 'умеете', 'работает',
]);

/** Набор основ слов вопроса — по нему сверяем ключевые слова записи */
function stemSet(normalized: string): Set<string> {
  return new Set(normalized.split(' ').filter(Boolean).map(stem));
}

export function parseKeywords(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((k) => normalizeQuestion(k))
    .filter((k) => {
      if (!k) return false;
      // Короткие и служебные слова слишком часто встречаются — по ним
      // сработало бы что угодно, поэтому в расчёт их не берём
      const parts = k.split(' ');
      if (parts.length > 1) return true;
      return k.length >= 4 && !STOP_WORDS.has(k);
    });
}

/**
 * Автоматические ключевые слова из самого вопроса — стартовый набор,
 * который потом можно поправить руками в админке.
 */
export function extractKeywords(normalized: string): string {
  const words = normalized
    .split(' ')
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  return Array.from(new Set(words)).slice(0, 6).join(', ');
}

/**
 * Оценка совпадения: берём лучшее из двух способов.
 * 1) коэффициент Дайса по всей строке — ловит похожие формулировки целиком;
 * 2) доля ключевых слов записи, найденных в вопросе (по основам) — ловит
 *    другой падеж, время и порядок слов, ради чего ключевые слова и заведены.
 */
function scoreEntry(
  normalized: string,
  stems: Set<string>,
  entry: Pick<QAEntry, 'normalized_question' | 'keywords'>
): number {
  const dice = compareTwoStrings(normalized, entry.normalized_question);

  const keywords = parseKeywords(entry.keywords);
  if (keywords.length === 0) return dice;

  // Ключевое слово может быть фразой из нескольких слов — тогда нужны все её части
  const hits = keywords.filter((keyword) =>
    keyword.split(' ').every((part) => stems.has(stem(part)))
  ).length;

  /*
   * Ключевые слова — это альтернативы («мотоцикл», «байк», «мото»),
   * а не обязательный набор: посетитель напишет одно из них, а не все сразу.
   * Поэтому хватает одного попадания, а каждое следующее только повышает
   * уверенность. Отсюда требование к самим словам: они должны быть
   * отличительными — слишком общие отсекаются в parseKeywords.
   */
  if (hits === 0) return dice;

  return Math.max(dice, 0.7 + 0.3 * (hits / keywords.length));
}

/** Уровень 5 из раздела 5.4: ищем уже отвеченный похожий вопрос */
export async function findAnswer(question: string): Promise<string | null> {
  const db = getTursoClient();
  if (!db) return null;

  const normalized = normalizeQuestion(question);
  if (!normalized) return null;

  const { rows } = await db.execute(
    "SELECT * FROM questions WHERE status = 'answered'"
  );

  const stems = stemSet(normalized);
  let best: { answer: string; score: number } | null = null;

  for (const row of rows as unknown as QAEntry[]) {
    if (!row.answer) continue;
    const score = scoreEntry(normalized, stems, row);
    if (score >= SIMILARITY_THRESHOLD && (!best || score > best.score)) {
      best = { answer: row.answer, score };
    }
  }

  return best?.answer ?? null;
}

/**
 * Вопрос, на который у нас нет своего ответа, попадает в базу со статусом
 * pending — и появляется в админке. Похожий вопрос уже есть (любой статус) —
 * увеличиваем счётчик, чтобы таблица не раздувалась от одного вопроса,
 * заданного 50 посетителями.
 *
 * Возвращает id строки, чтобы вызывающий код мог дописать к ней черновик
 * ответа от Gemini (см. saveGeminiAnswer).
 */
export async function recordQuestion(question: string): Promise<string | null> {
  const db = getTursoClient();
  if (!db) return null;

  const normalized = normalizeQuestion(question);
  if (!normalized) return null;

  const { rows } = await db.execute(
    'SELECT id, normalized_question, keywords FROM questions'
  );

  const stems = stemSet(normalized);
  let matchId: string | null = null;
  let bestScore = 0;

  for (const row of rows as unknown as QAEntry[]) {
    const score = scoreEntry(normalized, stems, row);
    if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
      bestScore = score;
      matchId = row.id;
    }
  }

  if (matchId) {
    await db.execute({
      sql: 'UPDATE questions SET asked_count = asked_count + 1 WHERE id = ?',
      args: [matchId],
    });
    return matchId;
  }

  // В SQLite нет gen_random_uuid() и timestamptz — генерируем в коде
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO questions
            (id, question, normalized_question, answer, gemini_answer, keywords, status, asked_count, created_at, answered_at)
          VALUES (?, ?, ?, NULL, NULL, ?, 'pending', 1, ?, NULL)`,
    args: [
      id,
      question,
      normalized,
      extractKeywords(normalized),
      new Date().toISOString(),
    ],
  });

  return id;
}

/**
 * Черновик ответа от Gemini. Пишется отдельно от `answer` намеренно:
 * бот отдаёт из базы только то, что человек утвердил в админке, —
 * иначе сгенерированный текст начал бы расходиться посетителям как
 * официальный ответ сервиса, без единой проверки.
 *
 * Для уже отвеченных вопросов ничего не трогаем: свой ответ важнее черновика.
 */
export async function saveGeminiAnswer(
  id: string,
  answer: string
): Promise<void> {
  const db = getTursoClient();
  if (!db) return;

  await db.execute({
    sql: `UPDATE questions
          SET gemini_answer = ?
          WHERE id = ? AND status = 'pending'`,
    args: [answer, id],
  });
}
