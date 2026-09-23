import { GoogleGenAI } from '@google/genai';
import { buildContext, getBusinessProfile } from './businessInfo';

/** Модель можно переопределить через env, не трогая код */
/*
 * Через || , а не ?? : пустая переменная окружения — это пустая строка,
 * а не undefined, и ?? её бы пропустил. Тогда в Gemini ушло бы model: ''
 * и каждый запрос падал бы с «model is required».
 */
const MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

async function buildSystemInstruction(): Promise<string> {
  const profile = await getBusinessProfile();

  return [
    'Ты — бот поддержки на сайте автосервиса-детейлинга. Отвечай на русском.',
    'Отвечай коротко: 1–3 предложения, без списков и разметки — текст идёт в пузырь чата.',
    'Опирайся ТОЛЬКО на данные ниже. Если информации нет — честно скажи, что уточнишь',
    'у мастера, и предложи позвонить. Не выдумывай цены, сроки, адрес и услуги:',
    'лучше признать незнание, чем пообещать клиенту то, чего сервис не делает.',
    '',
    buildContext(profile),
  ].join('\n');
}

/**
 * Уровень 6 из раздела 5.4 — самый дорогой путь, вызывается последним.
 * Бросает исключение при сетевой ошибке или лимите — вызывающий код это ловит.
 */
export async function askGemini(message: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY не задан');

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: message,
    config: {
      systemInstruction: await buildSystemInstruction(),
      temperature: 0.3,
      maxOutputTokens: 400,
    },
  });

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini вернул пустой ответ');

  return text;
}
