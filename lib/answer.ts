import { getBusinessProfile } from './businessInfo';
import { getBotResponse, getFallbackResponse, type BotProfile } from './chatBot';
import { askGemini, isGeminiConfigured } from './gemini';
import { findAnswer, recordQuestion, saveGeminiAnswer } from './qaMatch';

/**
 * Единая цепочка ответа: локальные intents → своя база FAQ → Gemini.
 * Ею пользуются и виджет на сайте, и Telegram-бот, чтобы клиент получал
 * одинаковые ответы независимо от того, где он пишет.
 */

export type AnswerSource = 'intent' | 'faq' | 'gemini' | 'fallback';

export interface AnswerResult {
  reply: string;
  source: AnswerSource;
  /** id строки в questions, если вопрос туда попал */
  questionId: string | null;
  /** true — своего ответа не нашлось и Gemini не помог */
  unanswered: boolean;
}

interface Options {
  /**
   * Виджет на сайте прогоняет intents в браузере и обращается к серверу
   * только на fallback-е — повторять их незачем.
   */
  skipIntents?: boolean;
}

export async function answerQuestion(
  text: string,
  options: Options = {}
): Promise<AnswerResult> {
  let profile: BotProfile | undefined;

  if (!options.skipIntents) {
    const business = await getBusinessProfile();
    profile = {
      name: business.name,
      phone: business.phone,
      hours: business.hours,
      services: business.services,
    };

    const local = getBotResponse(text, profile);
    if (!local.isFallback) {
      return {
        reply: local.text,
        source: 'intent',
        questionId: null,
        unanswered: false,
      };
    }
  }

  // Свой ответ из накопленной базы — Gemini не трогаем
  try {
    const fromFaq = await findAnswer(text);
    if (fromFaq) {
      return { reply: fromFaq, source: 'faq', questionId: null, unanswered: false };
    }
  } catch (error) {
    console.error('[answer] не удалось прочитать FAQ-базу:', error);
  }

  /*
   * Своего ответа нет — фиксируем вопрос для админки ДО вызова Gemini
   * и независимо от его результата: иначе вопросы, заданные при незаданном
   * ключе или при ошибке, потерялись бы.
   */
  let questionId: string | null = null;
  try {
    questionId = await recordQuestion(text);
  } catch (error) {
    console.error('[answer] не удалось записать вопрос:', error);
  }

  const fallback = getFallbackResponse(profile);

  if (!isGeminiConfigured()) {
    return { reply: fallback, source: 'fallback', questionId, unanswered: true };
  }

  try {
    const reply = await askGemini(text);

    // Черновик для админки: там его можно принять как есть или переписать
    if (questionId) {
      try {
        await saveGeminiAnswer(questionId, reply);
      } catch (error) {
        console.error('[answer] не удалось сохранить черновик Gemini:', error);
      }
    }

    return { reply, source: 'gemini', questionId, unanswered: false };
  } catch (error) {
    console.error('[answer] Gemini недоступен:', error);
    return { reply: fallback, source: 'fallback', questionId, unanswered: true };
  }
}
