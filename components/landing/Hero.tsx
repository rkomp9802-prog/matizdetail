import Image from 'next/image';
import { business } from '@/data/business';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-surface">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 py-14 lg:grid-cols-2">
        <div className="relative">
          <span className="pointer-events-none absolute -top-8 -left-2 font-heading text-[7rem] leading-none font-extrabold text-line select-none">
            01
          </span>
          <span className="relative inline-block rounded-full bg-card px-5 py-2 text-xs font-semibold shadow-sm">
            {business.badge}
          </span>
          <div className="relative mt-6">
            <Image
              src={business.heroImage}
              alt="Daewoo Matiz после детейлинга"
              width={900}
              height={600}
              priority
              className="h-auto w-full object-contain"
            />
          </div>
        </div>

        <div>
          <span className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
            {business.tagline}
          </span>
          <h1 className="mt-4 font-heading text-5xl font-extrabold tracking-tight whitespace-pre-line lg:text-6xl">
            {business.heroTitle}
          </h1>
          <p className="mt-5 max-w-md text-muted">{business.heroDescription}</p>
          <a
            href="#feedback"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Записаться на услугу <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 border-t border-line px-6 py-6">
        <div className="flex gap-4 text-xs font-bold text-muted">
          {business.socials.map((s) => (
            <a key={s.label} href={s.href} className="transition-colors hover:text-brand">
              {s.label}
            </a>
          ))}
        </div>
        <div className="flex flex-wrap gap-8">
          {business.stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-2">
              <span className="font-heading text-xl font-extrabold">{stat.value}</span>
              <span className="text-xs text-muted">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
