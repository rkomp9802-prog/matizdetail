import { business } from '@/data/business';

interface Props {
  phone: string;
  hours: string;
  address: string;
}

export default function Contacts({ phone, hours, address }: Props) {
  return (
    <footer id="contacts" className="bg-inverse py-16 text-white">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-6 sm:grid-cols-3">
        <div>
          <span className="font-heading text-2xl font-extrabold">{business.logo}</span>
          <p className="mt-3 text-sm text-white/60">{business.tagline}</p>
        </div>

        <div>
          <h3 className="font-heading text-sm font-bold tracking-wide uppercase">Контакты</h3>
          <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="mt-3 block text-sm text-white/80 transition-colors hover:text-white">
            {phone}
          </a>
          <p className="mt-1 text-sm text-white/60">{hours}</p>
          {address && <p className="mt-1 text-sm text-white/60">{address}</p>}
        </div>

        <div>
          <h3 className="font-heading text-sm font-bold tracking-wide uppercase">Мы в сети</h3>
          <div className="mt-3 flex gap-4">
            {business.socials.map((s) => (
              <a key={s.label} href={s.href} className="text-sm font-bold text-white/70 transition-colors hover:text-brand">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
