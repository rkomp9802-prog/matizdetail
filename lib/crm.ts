/**
 * Передача заявок с формы обратной связи в CRM.
 *
 * Контракт взят из самой CRM (app/api/public/leads/route.ts):
 *   POST, заголовок X-Api-Key, поле name обязательно,
 *   phone / email / message — нет. Ответ 201 { ok, leadId, clientCreated }.
 */

export function isCrmConfigured(): boolean {
  return Boolean(process.env.CRM_LEADS_URL && process.env.CRM_API_KEY);
}

export interface LeadInput {
  name: string;
  /** Телефон или email одной строкой — как его ввёл посетитель */
  contact: string;
  message: string;
}

/**
 * В форме один контакт на выбор, а CRM ждёт phone и email раздельно.
 * Различаем по «собаке»: для телефона она невозможна, для адреса обязательна.
 */
function splitContact(contact: string): { phone?: string; email?: string } {
  const value = contact.trim();
  if (!value) return {};
  return value.includes('@') ? { email: value } : { phone: value };
}

export interface CrmResult {
  ok: boolean;
  leadId?: string;
  error?: string;
}

/**
 * Никогда не бросает исключение: заявка уже принята и ушла в Telegram,
 * и посетитель не должен видеть ошибку из-за того, что CRM прилегла.
 */
export async function sendLeadToCrm(lead: LeadInput): Promise<CrmResult> {
  if (!isCrmConfigured()) {
    return { ok: false, error: 'CRM не настроена' };
  }

  const { phone, email } = splitContact(lead.contact);

  try {
    const res = await fetch(process.env.CRM_LEADS_URL as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.CRM_API_KEY as string,
      },
      body: JSON.stringify({
        name: lead.name.slice(0, 200),
        phone,
        email,
        message: lead.message.slice(0, 5000),
      }),
      // CRM может быть недоступна — не держим посетителя в ожидании
      signal: AbortSignal.timeout(8000),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      leadId?: string;
      error?: string;
    };

    if (!res.ok) {
      return { ok: false, error: data.error ?? `CRM ответила ${res.status}` };
    }

    return { ok: true, leadId: data.leadId };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'CRM не ответила за 8 секунд'
        : String(error);
    return { ok: false, error: reason };
  }
}
