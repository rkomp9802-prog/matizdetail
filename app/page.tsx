import About from '@/components/landing/About';
import Advantages from '@/components/landing/Advantages';
import ChatWidget from '@/components/chat/ChatWidget';
import Contacts from '@/components/landing/Contacts';
import FeedbackForm from '@/components/FeedbackForm';
import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Services from '@/components/landing/Services';
import { getBusinessProfile } from '@/lib/businessInfo';

// Данные сервиса правятся в админке, поэтому страницу не кэшируем
export const dynamic = 'force-dynamic';

export default async function Home() {
  const profile = await getBusinessProfile();

  return (
    <>
      <Header hours={profile.hours} />
      <main>
        <Hero />
        <About />
        <Services services={profile.services} />
        <Advantages />

        <section id="feedback" className="bg-surface py-20">
          <div className="mx-auto max-w-2xl px-6">
            <span className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
              Обратная связь
            </span>
            <h2 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">
              Напишите нам
            </h2>
            <p className="mt-3 text-muted">
              Оставьте сообщение — ответим на указанный контакт. Если вопрос
              срочный, позвоните: {profile.phone}.
            </p>

            <div className="mt-8">
              <FeedbackForm />
            </div>
          </div>
        </section>
      </main>
      <Contacts
        phone={profile.phone}
        hours={profile.hours}
        address={profile.address}
      />
      <ChatWidget
        profile={{
          name: profile.name,
          phone: profile.phone,
          hours: profile.hours,
          services: profile.services,
        }}
      />
    </>
  );
}
