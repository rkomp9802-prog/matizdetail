import { business } from '@/data/business';

/**
 * Данные, на которые опираются локальные intents. По умолчанию берутся
 * из data/business.ts, но сайт передаёт сюда актуальные — те, что владелец
 * правит в админке, — чтобы бот и страница говорили одно и то же.
 */
export interface BotProfile {
  name: string;
  phone: string;
  hours: string;
  services: {
    id: string;
    title: string;
    description: string;
    price: string;
    duration: string;
  }[];
}

export const defaultBotProfile: BotProfile = {
  name: business.name,
  phone: business.phone,
  hours: business.workHours,
  services: business.services.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    price: s.price,
    duration: s.duration,
  })),
};

export interface BotResponse {
  text: string;
  /** true — ни один intent не сработал, нужно идти на сервер (FAQ → Gemini) */
  isFallback: boolean;
  /** для отладки: какой intent сработал */
  intent: string;
}

/**
 * Локальная нормализация. Намеренно дублирует такую же функцию в lib/qaMatch.ts:
 * этот файл выполняется в браузере, а qaMatch.ts тянет за собой клиент Turso,
 * который в клиентский бандл попадать не должен.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

interface Intent {
  name: string;
  match: (text: string) => boolean;
  reply: () => string;
}

function buildIntents(profile: BotProfile): Intent[] {
  const servicesList = profile.services.map((s) => s.title).join(', ');

  return [
    {
      name: 'greeting',
      match: (t) =>
        hasAny(t, ['привет', 'здравствуй', 'добрый день', 'добрый вечер', 'доброе утро', 'салам', 'хай']),
      reply: () =>
        `Здравствуйте! Я бот поддержки ${profile.name}. Могу рассказать про услуги, цены, сроки и запись. Что вас интересует?`,
    },
    {
      name: 'workHours',
      match: (t) =>
        hasAny(t, ['график', 'режим работы', 'во сколько', 'когда работает', 'работаете', 'часы работы', 'открыт', 'выходн']),
      reply: () => `Мы работаем ${profile.hours.toLowerCase()}. Без выходных.`,
    },
    {
      name: 'servicesList',
      match: (t) =>
        hasAny(t, ['услуг', 'что делаете', 'чем занимаетесь', 'что входит', 'прайс', 'весь список']),
      reply: () =>
        `Мы делаем: ${servicesList}. Про любую услугу могу рассказать подробнее — просто назовите её.`,
    },
    {
      name: 'booking',
      match: (t) => hasAny(t, ['записаться', 'запись', 'записат', 'забронир', 'приехать', 'свободное время']),
      reply: () =>
        `Записаться можно по телефону ${profile.phone} или через форму на сайте. Работаем ${profile.hours.toLowerCase()}.`,
    },
    {
      name: 'contacts',
      match: (t) => hasAny(t, ['телефон', 'контакт', 'номер', 'связаться']),
      reply: () => `Телефон: ${profile.phone}. Режим работы: ${profile.hours.toLowerCase()}.`,
    },
    {
      name: 'guarantee',
      match: (t) => hasAny(t, ['гарант', 'если что то пойдет не так', 'вернете']),
      reply: () =>
        'Даём гарантию на все виды работ и материалы. Если результат не устроит — вернитесь к нам, разберёмся за свой счёт.',
    },
    {
      name: 'thanks',
      match: (t) => hasAny(t, ['спасибо', 'благодар', 'спс']),
      reply: () => 'Пожалуйста! Если появятся вопросы — пишите, я на связи.',
    },
    {
      name: 'farewell',
      match: (t) => hasAny(t, ['пока', 'до свидания', 'всего доброго']),
      reply: () => 'До свидания! Будем рады видеть вас в сервисе.',
    },
  ];
}

/** Ключевые слова, по которым узнаём конкретную услугу */
const serviceKeywords: Record<string, string[]> = {
  wash: ['мойк', 'помыт', 'помыв', 'вымыт'],
  polishing: ['полиров', 'царапин', 'блеск', 'паутинк'],
  ceramics: ['керамик', 'защитное покрытие', 'жидкое стекло'],
  'dry-cleaning': ['химчистк', 'салон', 'чистка салона', 'обивк'],
};

function findService(text: string, profile: BotProfile) {
  for (const [id, words] of Object.entries(serviceKeywords)) {
    if (hasAny(text, words)) {
      return profile.services.find((s) => s.id === id) ?? null;
    }
  }
  return null;
}

function fallbackText(profile: BotProfile): string {
  return (
    'Хороший вопрос — я уточню это у мастера. Если ответ нужен прямо сейчас, ' +
    `позвоните нам: ${profile.phone}.`
  );
}

/**
 * Первый уровень из раздела 5.4 спеки: быстро, бесплатно, без сети.
 * Если вернулся isFallback: true — вызывающий код идёт на /api/chat.
 */
export function getBotResponse(
  input: string,
  profile: BotProfile = defaultBotProfile
): BotResponse {
  const text = normalize(input);

  if (!text) {
    return { text: fallbackText(profile), isFallback: true, intent: 'empty' };
  }

  // Вопрос про конкретную услугу разбираем первым: он информативнее общих intent-ов
  const service = findService(text, profile);
  if (service) {
    const asksPrice = hasAny(text, ['цена', 'стоит', 'стоимость', 'сколько', 'почем', 'прайс']);
    const asksTime = hasAny(text, ['сколько времени', 'долго', 'срок', 'время', 'быстро', 'займет']);

    if (asksPrice) {
      return {
        text: `${service.title}: ${service.price}. Занимает ${service.duration}.`,
        isFallback: false,
        intent: `price:${service.id}`,
      };
    }
    if (asksTime) {
      return {
        text: `${service.title} занимает ${service.duration}. Цена — ${service.price}.`,
        isFallback: false,
        intent: `duration:${service.id}`,
      };
    }
    return {
      text: `${service.title} — ${service.description} Цена: ${service.price}. Занимает ${service.duration}.`,
      isFallback: false,
      intent: `service:${service.id}`,
    };
  }

  for (const intent of buildIntents(profile)) {
    if (intent.match(text)) {
      return { text: intent.reply(), isFallback: false, intent: intent.name };
    }
  }

  return { text: fallbackText(profile), isFallback: true, intent: 'fallback' };
}

/** Показывается, когда Gemini недоступен (раздел 7 спеки) */
export function getFallbackResponse(
  profile: BotProfile = defaultBotProfile
): string {
  return fallbackText(profile);
}
