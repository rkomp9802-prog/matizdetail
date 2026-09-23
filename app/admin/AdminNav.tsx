import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutButton from './LogoutButton';

interface Props {
  active: 'questions' | 'dialogs' | 'info';
}

const tabs = [
  { key: 'questions', href: '/admin', label: 'База вопросов' },
  { key: 'dialogs', href: '/admin/dialogs', label: 'Переписка' },
  { key: 'info', href: '/admin/info', label: 'Данные сервиса' },
] as const;

export default function AdminNav({ active }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <nav className="flex gap-1 rounded-xl bg-surface p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active === tab.key
                ? 'bg-card text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LogoutButton />
      </div>
    </div>
  );
}
