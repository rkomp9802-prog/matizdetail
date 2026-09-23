import AddQuestion from './AddQuestion';
import AdminNav from './AdminNav';
import HowItWorks from './HowItWorks';
import QuestionCard from './QuestionCard';
import { getTursoClient, isTursoConfigured, toQAEntry } from '@/lib/turso';
import type { QAEntry } from '@/types/chat.types';

// Страница всегда читает свежие данные — кэшировать список вопросов незачем
export const dynamic = 'force-dynamic';

async function loadQuestions(): Promise<
  { pending: QAEntry[]; answered: QAEntry[]; error?: undefined } | { error: string }
> {
  if (!isTursoConfigured()) {
    return { error: 'TURSO_DATABASE_URL не задан — база вопросов не подключена.' };
  }

  try {
    const db = getTursoClient()!;
    const { rows } = await db.execute(
      `SELECT * FROM questions
       ORDER BY asked_count DESC, created_at DESC`
    );
    const all = rows.map(toQAEntry);
    return {
      pending: all.filter((q) => q.status === 'pending'),
      answered: all.filter((q) => q.status === 'answered'),
    };
  } catch (error) {
    console.error('[admin] не удалось прочитать вопросы:', error);
    return {
      error: 'Не удалось прочитать базу. Выполнена ли миграция (npm run db:migrate)?',
    };
  }
}

export default async function AdminPage() {
  const result = await loadQuestions();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <AdminNav active="questions" />

      <h1 className="mt-8 font-heading text-3xl font-extrabold">База вопросов</h1>
      <p className="mt-2 text-sm text-muted">
        Здесь копятся вопросы, на которые у бота нет своего ответа. Впишите
        ответ — и бот перестанет отправлять такой вопрос в Gemini.
      </p>

      <HowItWorks />

      {'error' in result ? (
        <p className="mt-6 rounded-lg border border-brand/30 bg-brand/5 p-4 text-sm text-brand">
          {result.error}
        </p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="font-heading text-lg font-bold">Добавить вопрос вручную</h2>
            <AddQuestion />
          </section>

          <section className="mt-10">
            <h2 className="font-heading text-lg font-bold">
              Без ответа <span className="text-muted">({result.pending.length})</span>
            </h2>
            <p className="mt-1 text-sm text-muted">
              Сначала самые частые — их стоит закрыть в первую очередь.
            </p>

            <div className="mt-4 space-y-4">
              {result.pending.length === 0 ? (
                <p className="text-sm text-muted">
                  Пока пусто. Вопросы появятся здесь, как только посетитель спросит
                  что-то, чего нет в базе.
                </p>
              ) : (
                result.pending.map((entry) => (
                  <QuestionCard key={entry.id} entry={entry} />
                ))
              )}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-heading text-lg font-bold">
              Уже отвечены <span className="text-muted">({result.answered.length})</span>
            </h2>

            <div className="mt-4 space-y-3">
              {result.answered.map((entry) => (
                <details key={entry.id} className="rounded-xl border border-line bg-card">
                  <summary className="cursor-pointer px-5 py-3 text-sm font-medium">
                    {entry.question}
                  </summary>
                  <div className="border-t border-line p-2">
                    <QuestionCard entry={entry} />
                  </div>
                </details>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
