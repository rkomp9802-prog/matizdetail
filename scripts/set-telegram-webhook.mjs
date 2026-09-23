/**
 * Подключает Telegram-бота к вашему сайту.
 * Запуск: npm run tg:webhook -- https://ваш-домен.vercel.app
 *
 * Webhook требует публичного HTTPS-адреса: на localhost Telegram достучаться
 * не сможет. Секрет из TELEGRAM_WEBHOOK_SECRET передаётся вместе с адресом,
 * и потом приходит в заголовке каждого запроса — так роут отличает Telegram
 * от постороннего, который узнал адрес.
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN не задан в .env.local');
  process.exit(1);
}

const base = process.argv[2];
if (!base || !base.startsWith('https://')) {
  console.error('Укажите публичный адрес сайта:');
  console.error('  npm run tg:webhook -- https://ваш-домен.vercel.app');
  process.exit(1);
}

const url = `${base.replace(/\/$/, '')}/api/telegram/webhook`;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url,
    secret_token: secret || undefined,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  }),
});

const data = await res.json();
if (!data.ok) {
  console.error('Не получилось:', data.description ?? data);
  process.exit(1);
}

console.log('Webhook установлен:', url);
if (!secret) {
  console.log(
    'TELEGRAM_WEBHOOK_SECRET не задан — роут примет запрос от любого, кто знает адрес.\n' +
      'Задайте секрет и запустите скрипт ещё раз.'
  );
}
