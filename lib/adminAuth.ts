/**
 * Простая защита админки одним паролем (раздел 10.3 спеки).
 * Это осознанное упрощение для учебного проекта, а не система пользователей:
 * для реального клиента сюда встаёт Clerk или Auth.js.
 *
 * В cookie кладём не сам пароль, а его хеш — Web Crypto работает
 * и в node runtime, и в middleware на edge.
 */

export const ADMIN_COOKIE = 'admin_session';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 дней

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** null — пароль не задан в окружении, значит админка недоступна вообще */
export async function expectedToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return sha256(`matiz-admin:${password}`);
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await expectedToken();
  return expected !== null && token === expected;
}
