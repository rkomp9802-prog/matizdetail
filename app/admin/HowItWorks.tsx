const steps = [
  {
    n: '1',
    title: 'Готовые ответы',
    text:
      'Цены, услуги, график, телефон, запись. Отвечает мгновенно и бесплатно, ' +
      'берёт данные из вкладки «Данные сервиса».',
  },
  {
    n: '2',
    title: 'Ваша база ответов',
    text:
      'Вопросы, на которые ответ написали вы. Это вкладка «База вопросов» — ' +
      'то, что ниже на этой странице.',
  },
  {
    n: '3',
    title: 'Gemini',
    text:
      'Включается, только если первые два шага не знают ответа. Стоит денег и ' +
      'может ошибиться, поэтому его ответ сохраняется черновиком — на проверку вам.',
  },
];

export default function HowItWorks() {
  return (
    <details className="mt-6 rounded-xl border border-line bg-card">
      <summary className="cursor-pointer px-5 py-3 text-sm font-medium">
        Как это всё устроено
      </summary>

      <div className="border-t border-line p-5">
        <p className="text-sm text-muted">
          Когда гость пишет в чат, бот ищет ответ по порядку — от быстрого и
          бесплатного к дорогому:
        </p>

        <ol className="mt-4 space-y-3">
          {steps.map((step) => (
            <li key={step.n} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                {step.n}
              </span>
              <p className="text-sm">
                <span className="font-semibold">{step.title}.</span>{' '}
                <span className="text-muted">{step.text}</span>
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-sm text-muted">
          <span className="font-semibold text-ink">Что делать вам:</span>{' '}
          заполните «Данные сервиса» и отвечайте на вопросы из списка «Без
          ответа». Чем больше ответов вы впишете, тем реже включается Gemini и
          тем точнее бот говорит вашими словами.
        </p>

        <div className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
          <p>
            <span className="font-semibold">База вопросов</span>
            <br />
            <span className="text-muted">что спросили и что бот ответит</span>
          </p>
          <p>
            <span className="font-semibold">Переписка</span>
            <br />
            <span className="text-muted">все диалоги, фото и голосовые</span>
          </p>
          <p>
            <span className="font-semibold">Данные сервиса</span>
            <br />
            <span className="text-muted">что бот знает о вас</span>
          </p>
        </div>
      </div>
    </details>
  );
}
