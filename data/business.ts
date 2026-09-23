/**
 * Единый источник данных о бизнесе.
 * Используется и лендингом (секции), и чат-ботом (lib/chatBot.ts, lib/gemini.ts).
 * Меняешь цену здесь — она меняется и на сайте, и в ответах бота.
 */

export interface Service {
  id: string;
  title: string;
  description: string;
  /** Короткая формулировка цены для ответов бота */
  price: string;
  /** Сколько занимает по времени — бот часто спрашивают об этом */
  duration: string;
  image: string;
}

export interface Advantage {
  title: string;
  description: string;
}

export interface Stat {
  value: string;
  label: string;
}

export const business = {
  name: 'MATIZ Detail',
  logo: 'DETAIL',
  tagline: 'Чистота. Блеск. Защита.',
  heroTitle: 'Детейлинг\nвашего MATIZ',
  heroDescription:
    'Профессиональный уход за автомобилем, который подчеркнет его стиль и продлевает срок службы.',
  badge: 'Детейлинг с заботой',

  // TODO: заменить на настоящий номер — в исходном лендинге стоит заглушка
  phone: '+998 90 788 96 75',
  workHours: 'Ежедневно с 9:00 до 21:00',

  socials: [
    { label: 'IG', href: '#' },
    { label: 'VK', href: '#' },
    { label: 'TG', href: '#' },
  ],

  stats: [
    { value: '5 лет', label: 'опыта работы' },
    { value: '1000+', label: 'довольных клиентов' },
    { value: '100%', label: 'гарантия качества' },
  ] as Stat[],

  about: {
    subtitle: 'О детейлинге',
    title: 'Детейлинг — это не роскошь, а забота о вашем авто',
    description:
      'Регулярный профессиональный уход помогает сохранить внешний вид, защитить кузов и салон от износа, продлить срок службы автомобиля и поддерживать его в идеальном состоянии.',
    image: '/assets/polishing_action_1789579252075.jpg',
  },

  /**
   * ВНИМАНИЕ: в исходном лендинге были указаны только две цены —
   * мойка (от 1500 ₽) и керамика (от 15000 ₽), они взяты как есть.
   * Цены полировки и химчистки, а также все значения duration —
   * ЗАГЛУШКИ, проставленные для работоспособности бота.
   * Замени их на реальные до показа клиенту: бот озвучивает их посетителям.
   */
  services: [
    {
      id: 'wash',
      title: 'Мойка',
      description:
        'Деликатная мойка кузова и дисков с использованием премиум химии.',
      price: 'от 1500 рублей — зависит от степени загрязнения',
      duration: '1–2 часа',
      image: '/assets/car_wash_1789579260476.jpg',
    },
    {
      id: 'polishing',
      title: 'Полировка',
      description: 'Устранение царапин, восстановление блеска и глубины цвета.',
      price: 'от 8000 рублей — зависит от состояния ЛКП',
      duration: 'от 1 до 3 дней',
      image: '/assets/polishing_action_1789579252075.jpg',
    },
    {
      id: 'ceramics',
      title: 'Керамика',
      description:
        'Надежная защита кузова от внешних воздействий и ультрафиолета.',
      price: 'от 15000 рублей — зависит от количества слоёв и состояния ЛКП',
      duration: '2–3 дня',
      image: '/assets/car_ceramics_1789579271201.jpg',
    },
    {
      id: 'dry-cleaning',
      title: 'Химчистка',
      description:
        'Глубокая очистка салона с восстановлением его первозданного вида.',
      price: 'от 6000 рублей — зависит от объёма салона',
      duration: '4–6 часов',
      image: '/assets/car_dry_cleaning_1789579289192.jpg',
    },
  ] as Service[],

  advantages: [
    {
      title: 'Профессионализм',
      description:
        'Опытные мастера с профильным обучением и любовью к деталям.',
    },
    {
      title: 'Качество',
      description: 'Используем только проверенные материалы и оборудование.',
    },
    {
      title: 'Экономия времени',
      description: 'Работаем быстро и качественно, ценим ваше время.',
    },
    {
      title: 'Гарантия',
      description: 'Предоставляем гарантию на все виды работ и материалы.',
    },
  ] as Advantage[],

  advantagesImage: '/assets/matiz_hero_1789579241110.jpg',
  heroImage: '/assets/matiz_hero_1789579241110.jpg',
} as const;

/** Компактная сводка для system-инструкции Gemini */
export function buildBusinessContext(): string {
  const services = business.services
    .map(
      (s) =>
        `- ${s.title}: ${s.description} Цена: ${s.price}. Занимает ${s.duration}.`
    )
    .join('\n');

  const advantages = business.advantages
    .map((a) => `- ${a.title}: ${a.description}`)
    .join('\n');

  return [
    `Автосервис-детейлинг «${business.name}».`,
    `Режим работы: ${business.workHours}. Телефон: ${business.phone}.`,
    '',
    'Услуги и цены:',
    services,
    '',
    'Преимущества:',
    advantages,
  ].join('\n');
}
