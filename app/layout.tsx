import type { Metadata } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-montserrat',
});

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Детейлинг Вашего MATIZ | Профессиональный уход',
  description:
    'Профессиональный детейлинг для Daewoo Matiz. Мойка, полировка, химчистка, керамика. Качество и гарантия.',
};

/*
 * Выполняется до отрисовки страницы, иначе при тёмной теме будет вспышка белым.
 * Если гость тему не выбирал — берём системную настройку.
 */
const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem('matiz-theme');
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = saved === 'dark' || saved === 'light' ? saved : system;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${montserrat.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
