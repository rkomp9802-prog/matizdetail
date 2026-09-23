import ThemeToggle from '@/components/ThemeToggle';
import { business } from '@/data/business';

export default function Header({ hours }: { hours: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-page/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-4">
        <span className="font-heading text-2xl font-extrabold tracking-tight">
          {business.logo}
        </span>

        <nav className="hidden gap-7 text-sm font-medium md:flex">
          <a href="#services" className="transition-colors hover:text-brand">Наши работы</a>
          <a href="#about" className="transition-colors hover:text-brand">О нас</a>
          <a href="#contacts" className="transition-colors hover:text-brand">Контакты</a>
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-muted lg:block">{hours}</span>
          <ThemeToggle />
          <a
            href="#feedback"
            className="rounded-full border-2 border-brand px-5 py-2 text-xs font-bold tracking-wide text-brand uppercase transition-colors hover:bg-brand hover:text-white"
          >
            Записаться
          </a>
        </div>
      </div>
    </header>
  );
}
