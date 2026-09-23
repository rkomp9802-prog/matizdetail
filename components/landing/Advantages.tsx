import Image from 'next/image';
import { business } from '@/data/business';

const icons = [
  <polygon key="star" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  <path key="shield" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  <g key="clock">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </g>,
  <path key="box" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />,
];

export default function Advantages() {
  return (
    <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-20 lg:grid-cols-2">
      <div>
        <div className="flex items-start gap-6">
          <span className="font-heading text-sm font-extrabold text-line">04</span>
          <div>
            <span className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
              Почему выбирают нас
            </span>
            <h2 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">
              Преимущества работы с нами
            </h2>
          </div>
        </div>

        <ul className="mt-10 space-y-7">
          {business.advantages.map((adv, i) => (
            <li key={adv.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-brand">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  {icons[i]}
                </svg>
              </span>
              <div>
                <h4 className="font-heading font-bold">{adv.title}</h4>
                <p className="mt-1 text-sm text-muted">{adv.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface">
        <Image
          src={business.advantagesImage}
          alt="Daewoo Matiz"
          width={800}
          height={600}
          className="h-full w-full object-contain"
        />
      </div>
    </section>
  );
}
