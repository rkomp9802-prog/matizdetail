import { business } from '@/data/business';
import { getTursoClient } from './turso';

/**
 * Данные о сервисе, которые владелец правит в админке.
 * Значения из базы перекрывают умолчания из data/business.ts — поэтому
 * пока таблица пуста, всё работает ровно как раньше.
 */

export interface BusinessField {
  key: string;
  label: string;
  hint: string;
  /** многострочное поле */
  long: boolean;
}

/** Поля, которые видит владелец в админке. Порядок здесь = порядок в форме. */
export const BUSINESS_FIELDS: BusinessField[] = [
  {
    key: 'phone',
    label: 'Телефон',
    hint: 'Бот диктует его при записи, он же стоит в шапке и подвале сайта.',
    long: false,
  },
  {
    key: 'hours',
    label: 'Режим работы',
    hint: 'Например: ежедневно с 9:00 до 21:00.',
    long: false,
  },
  {
    key: 'address',
    label: 'Адрес',
    hint: 'Где вас найти. Пока пусто — бот честно скажет, что адрес уточнит мастер.',
    long: false,
  },
  {
    key: 'price_wash',
    label: 'Цена: мойка',
    hint: 'Короткой фразой, как скажет бот: «от 1500 рублей — зависит от загрязнения».',
    long: false,
  },
  {
    key: 'price_polishing',
    label: 'Цена: полировка',
    hint: '',
    long: false,
  },
  {
    key: 'price_ceramics',
    label: 'Цена: керамика',
    hint: '',
    long: false,
  },
  {
    key: 'price_dry_cleaning',
    label: 'Цена: химчистка',
    hint: '',
    long: false,
  },
  {
    key: 'can_do',
    label: 'Что мы делаем',
    hint: 'Всё, что помимо четырёх основных услуг. По одному пункту на строку.',
    long: true,
  },
  {
    key: 'cannot_do',
    label: 'Чего мы НЕ делаем',
    hint:
      'Самое важное поле. Без него Gemini додумывает за вас: однажды он сам ' +
      'заявил клиенту, что выезда на дом нет, хотя мы этого не писали. ' +
      'По одному пункту на строку.',
    long: true,
  },
  {
    key: 'notes',
    label: 'Дополнительно',
    hint: 'Оплата, скидки, парковка, гарантия — всё, что часто спрашивают.',
    long: true,
  },
];

const SERVICE_PRICE_KEYS: Record<string, string> = {
  wash: 'price_wash',
  polishing: 'price_polishing',
  ceramics: 'price_ceramics',
  'dry-cleaning': 'price_dry_cleaning',
};

export interface BusinessProfile {
  name: string;
  phone: string;
  hours: string;
  address: string;
  canDo: string;
  cannotDo: string;
  notes: string;
  services: {
    id: string;
    title: string;
    description: string;
    price: string;
    duration: string;
  }[];
}

/** Умолчания из кода — используются, пока владелец ничего не переопределил */
export function defaultValues(): Record<string, string> {
  const values: Record<string, string> = {
    phone: business.phone,
    hours: business.workHours,
    address: '',
    can_do: '',
    cannot_do: '',
    notes: '',
  };

  for (const service of business.services) {
    const key = SERVICE_PRICE_KEYS[service.id];
    if (key) values[key] = service.price;
  }

  return values;
}

export async function loadOverrides(): Promise<Record<string, string>> {
  const db = getTursoClient();
  if (!db) return {};

  const { rows } = await db.execute('select key, value from business_info');
  const overrides: Record<string, string> = {};
  for (const row of rows) {
    overrides[String(row.key)] = String(row.value);
  }
  return overrides;
}

/** Сырые значения для формы в админке: умолчания, перекрытые базой */
export async function loadValues(): Promise<Record<string, string>> {
  return { ...defaultValues(), ...(await loadOverrides()) };
}

export async function saveValues(values: Record<string, string>): Promise<void> {
  const db = getTursoClient();
  if (!db) throw new Error('База не подключена');

  const now = new Date().toISOString();
  const allowed = new Set(BUSINESS_FIELDS.map((f) => f.key));

  for (const [key, value] of Object.entries(values)) {
    if (!allowed.has(key)) continue;
    await db.execute({
      sql: `insert into business_info (key, value, updated_at) values (?, ?, ?)
            on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at`,
      args: [key, value.trim(), now],
    });
  }
}

export async function getBusinessProfile(): Promise<BusinessProfile> {
  const values = await loadValues();

  return {
    name: business.name,
    phone: values.phone,
    hours: values.hours,
    address: values.address,
    canDo: values.can_do,
    cannotDo: values.cannot_do,
    notes: values.notes,
    services: business.services.map((service) => ({
      id: service.id,
      title: service.title,
      description: service.description,
      duration: service.duration,
      price: values[SERVICE_PRICE_KEYS[service.id]] ?? service.price,
    })),
  };
}

/**
 * Сводка для system-инструкции Gemini. Блок «чего мы НЕ делаем» идёт
 * отдельным разделом с явным запретом — именно он удерживает модель
 * от выдуманных обещаний.
 */
export function buildContext(profile: BusinessProfile): string {
  const services = profile.services
    .map(
      (s) =>
        `- ${s.title}: ${s.description} Цена: ${s.price}. Занимает ${s.duration}.`
    )
    .join('\n');

  const parts = [
    `Автосервис-детейлинг «${profile.name}».`,
    `Режим работы: ${profile.hours}. Телефон: ${profile.phone}.`,
  ];

  if (profile.address) parts.push(`Адрес: ${profile.address}.`);
  else parts.push('Адрес не указан — если спросят, скажи, что уточните у мастера.');

  parts.push('', 'Услуги и цены:', services);

  if (profile.canDo.trim()) {
    parts.push('', 'Что мы ещё делаем:', profile.canDo.trim());
  }

  if (profile.cannotDo.trim()) {
    parts.push(
      '',
      'Чего мы НЕ делаем (об этом отвечай отказом, не придумывай обратного):',
      profile.cannotDo.trim()
    );
  }

  if (profile.notes.trim()) {
    parts.push('', 'Дополнительно:', profile.notes.trim());
  }

  return parts.join('\n');
}
