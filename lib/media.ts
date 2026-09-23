'use client';

import type { MediaAttachment } from '@/types/chat.types';

/** Фото ужимаем в браузере: в базу не должны улетать пятимегабайтные снимки с телефона */
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

/** Больше минуты голосового в чате поддержки не нужно, а база скажет спасибо */
export const MAX_VOICE_MS = 60_000;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(blob);
  });
}

/** base64 без префикса data:...;base64, */
export function stripDataUrlPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось открыть изображение'));
    img.src = dataUrl;
  });
}

export interface PreparedMedia {
  attachment: MediaAttachment;
  /** data-URL для показа в ленте сообщений */
  previewUrl: string;
}

/**
 * Уменьшает картинку до MAX_DIMENSION по длинной стороне и жмёт в JPEG.
 * Типичное фото с телефона после этого весит 150–300 КБ вместо нескольких мегабайт.
 */
export async function prepareImage(file: File): Promise<PreparedMedia> {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Браузер не дал нарисовать изображение');
  ctx.drawImage(img, 0, 0, width, height);

  const previewUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const data = stripDataUrlPrefix(previewUrl);

  return {
    attachment: {
      kind: 'photo',
      mime: 'image/jpeg',
      data,
      // примерный размер после сжатия: base64 длиннее оригинала примерно на треть
      size: Math.round((data.length * 3) / 4),
    },
    previewUrl,
  };
}

export async function prepareVoice(blob: Blob): Promise<PreparedMedia> {
  const previewUrl = await readAsDataUrl(blob);
  const data = stripDataUrlPrefix(previewUrl);

  return {
    attachment: {
      kind: 'voice',
      mime: blob.type || 'audio/webm',
      data,
      size: blob.size,
    },
    previewUrl,
  };
}

/** Формат, который поддержит и браузер, и Telegram */
export function pickAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}
