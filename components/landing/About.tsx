import Image from 'next/image';
import { business } from '@/data/business';

export default function About() {
  const { about } = business;

  return (
    <section id="about" className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-20 lg:grid-cols-2">
      <div>
        <span className="font-heading text-sm font-extrabold text-line">02</span>
        <span className="mt-2 block text-xs font-bold tracking-[0.2em] text-brand uppercase">
          {about.subtitle}
        </span>
        <h2 className="mt-4 font-heading text-4xl font-extrabold tracking-tight">
          {about.title}
        </h2>
        <p className="mt-5 text-muted">{about.description}</p>
        <a
          href="#services"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
        >
          Подробнее <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)]">
        <Image
          src={about.image}
          alt="Процесс полировки автомобиля"
          width={800}
          height={600}
          className="h-full w-full object-cover"
        />
      </div>
    </section>
  );
}
