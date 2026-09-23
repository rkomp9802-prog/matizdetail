import AdminNav from '../AdminNav';
import InfoForm from '../InfoForm';
import { BUSINESS_FIELDS, loadValues } from '@/lib/businessInfo';

export const dynamic = 'force-dynamic';

export default async function InfoPage() {
  const values = await loadValues();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav active="info" />

      <h1 className="mt-8 font-heading text-3xl font-extrabold">Данные сервиса</h1>
      <p className="mt-2 text-sm text-muted">
        Это то, что бот знает о вас. Отсюда он берёт телефон, режим работы, цены
        и адрес — и этим же ограничен, когда отвечает на незнакомый вопрос.
        Менять код и передеплоивать сайт не нужно: сохранили — бот отвечает
        по-новому со следующего сообщения.
      </p>
      <p className="mt-2 text-sm text-muted">
        Телефон, режим работы, цены и адрес подставляются ещё и на сам сайт —
        в шапку, карточки услуг и подвал.
      </p>

      <InfoForm fields={BUSINESS_FIELDS} initial={values} />
    </main>
  );
}
