/**
 * Создаёт таблицу questions. Скрипт идемпотентный — можно запускать повторно.
 * Запуск: npm run db:migrate
 *
 * Для локальной разработки достаточно TURSO_DATABASE_URL=file:local.db,
 * токен нужен только для облачной базы Turso.
 */
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error('TURSO_DATABASE_URL не задан. Создайте .env.local — см. .env.example');
  process.exit(1);
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

await db.execute(`
  create table if not exists questions (
    id text primary key,
    question text not null,
    normalized_question text not null,
    answer text,
    gemini_answer text,
    keywords text,
    status text not null default 'pending',
    asked_count integer not null default 1,
    created_at text not null,
    answered_at text
  )
`);

// Колонки, добавленные позже — догоняем базы, созданные до них
const { rows } = await db.execute('pragma table_info(questions)');
for (const column of ['keywords', 'gemini_answer']) {
  if (!rows.some((r) => r.name === column)) {
    await db.execute(`alter table questions add column ${column} text`);
    console.log(`Добавлена колонка ${column}`);
  }
}

await db.execute(
  'create index if not exists idx_questions_status on questions(status)'
);

/*
 * Полная переписка. В исходной спеке история не сохранялась (раздел 12),
 * но потребовалось видеть в админке все сообщения, включая фото и голосовые,
 * поэтому появилась отдельная таблица и session_id.
 *
 * Медиа лежит прямо здесь в base64: отдельное файловое хранилище потребовало бы
 * ещё один сервис и токен. Фото сжимается в браузере перед отправкой.
 */
await db.execute(`
  create table if not exists chat_messages (
    id text primary key,
    session_id text not null,
    role text not null,
    text text,
    media_kind text,
    media_mime text,
    media_data text,
    media_size integer,
    created_at text not null
  )
`);

await db.execute(
  'create index if not exists idx_chat_messages_session on chat_messages(session_id, created_at)'
);

await db.execute(
  'create index if not exists idx_chat_messages_created on chat_messages(created_at)'
);

/*
 * Данные о сервисе, которые владелец правит в админке: контакты, цены,
 * что делаем и чего НЕ делаем. Отсюда их берут и сайт, и бот, и Gemini —
 * чтобы менять их не нужно было трогать код и передеплоивать.
 * Ключ-значение, а не колонки: набор полей ещё будет меняться.
 */
await db.execute(`
  create table if not exists business_info (
    key text primary key,
    value text not null,
    updated_at text not null
  )
`);

console.log('Готово: таблицы questions, chat_messages и business_info на месте.');
