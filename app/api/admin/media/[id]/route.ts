import { NextResponse } from 'next/server';
import { loadMedia } from '@/lib/chatLog';

export const runtime = 'nodejs';

/**
 * Отдаёт фото или голосовое из переписки. Лежит под /api/admin,
 * поэтому доступ закрыт той же cookie, что и вся админка (см. proxy.ts).
 *
 * В Next 16 params асинхронные — см. guides/upgrading/version-16.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const media = await loadMedia(id);
    if (!media) {
      return NextResponse.json({ error: 'Вложение не найдено' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(media.buffer), {
      headers: {
        'Content-Type': media.mime,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[admin] не удалось отдать вложение:', error);
    return NextResponse.json({ error: 'Ошибка чтения' }, { status: 500 });
  }
}
