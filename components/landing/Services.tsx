import Image from 'next/image';
import { business } from '@/data/business';

interface Props {
  services: { id: string; title: string; description: string; price: string }[];
}

export default function Services({ services }: Props) {
  return (
    <section id="services" className="bg-surface py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex items-start gap-6">
          <span className="font-heading text-sm font-extrabold text-line">03</span>
          <div>
            <span className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
              Наши услуги
            </span>
            <h2 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">
              Полный комплекс для вашего авто
            </h2>
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <article
              key={service.id}
              className="overflow-hidden rounded-[var(--radius-card)] bg-card shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="relative h-44">
                <Image
                  src={
                    business.services.find((s) => s.id === service.id)?.image ??
                    business.services[0].image
                  }
                  alt={service.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="font-heading text-lg font-bold">{service.title}</h3>
                <p className="mt-2 text-sm text-muted">{service.description}</p>
                <p className="mt-3 text-sm font-semibold text-brand">{service.price}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
