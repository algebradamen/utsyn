'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LocaleProvider, useLocale } from '@/components/LocaleProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import A11yToolbar from '@/components/A11yToolbar';
import { IconClock, IconClipboard, IconMapPin } from '@/components/Icons';

interface OpenDay {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_active: number;
}

function HomePage() {
  const { locale, t } = useLocale();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [openDays, setOpenDays] = useState<OpenDay[]>([]);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' }).then(r => r.json()).then(setSettings).catch(console.error);
    fetch('/api/open-days', { cache: 'no-store' }).then(r => r.json()).then(setOpenDays).catch(console.error);
    fetch('/api/menu', { cache: 'no-store' }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setMenuCategories(data);
    }).catch(console.error);
  }, []);

  const dayNames = [
    t('day_sunday'), t('day_monday'), t('day_tuesday'), t('day_wednesday'),
    t('day_thursday'), t('day_friday'), t('day_saturday'),
  ];

  const heroTitle = settings[`hero_title_${locale}`] || t('hero_title');
  const heroSubtitle = settings[`hero_subtitle_${locale}`] || t('hero_subtitle');
  const aboutText = settings[`about_text_${locale}`] || '';

  return (
    <>
      <Header />

      <main id="main-content">
        {/* Hero */}
        <section className="hero" role="banner" aria-label={heroTitle}>
          <div className="hero-content animate-in">
            <h1>{heroTitle}</h1>
            <p>{heroSubtitle}</p>
            <Link href="/bestill" className="btn btn-primary btn-lg">
              {t('hero_cta')}
            </Link>
          </div>
        </section>

        {/* Info Grid */}
        <section className="section" aria-label={t('info_hours_title')}>
          <div className="info-grid">
            {/* Hours */}
            <div className="card animate-in">
              <div className="card-icon" aria-hidden="true"><IconClock size={24} /></div>
              <h3>{t('info_hours_title')}</h3>
              <table className="hours-table" role="table" aria-label={t('info_hours_title')}>
                <tbody>
                  {openDays.map(day => (
                    <tr key={day.day_of_week} className={day.is_active ? 'open' : 'closed'}>
                      <td>{dayNames[day.day_of_week]}</td>
                      <td>
                        {day.is_active
                          ? `${day.open_time} - ${day.close_time}`
                          : t('info_closed')
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Prices / Menu */}
            <div className="card animate-in">
              <div className="card-icon" aria-hidden="true"><IconClipboard size={24} /></div>
              <h3>{locale === 'no' ? 'Meny' : 'Menu'}</h3>
              <div style={{ marginTop: 'var(--space-md)' }}>
                {menuCategories.map(category => (
                  <div key={category.id} style={{ marginBottom: 'var(--space-md)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
                      {locale === 'no' ? category.name_no : category.name_en}
                    </h4>
                    {category.items.filter((item: any) => item.is_active).map((item: any) => (
                      <div key={item.id} className="price-item" style={{ borderBottom: '1px solid var(--color-border-light)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>
                            {locale === 'no' ? item.name_no : item.name_en}
                          </div>
                          {(item.desc_no || item.desc_en) && (
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                              {locale === 'no' ? item.desc_no : item.desc_en}
                            </div>
                          )}
                        </div>
                        <div className="price-value" style={{ marginLeft: 'var(--space-md)' }}>
                          {settings.currency || 'kr'} {item.price},-
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {menuCategories.length === 0 && (
                  <div className="price-item">
                    <span>Meny laster...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="card animate-in">
              <div className="card-icon" aria-hidden="true"><IconMapPin size={24} /></div>
              <h3>{t('info_location_title')}</h3>
              <p style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-md)' }}>
                {settings.address || 'Tangen 21, 1. etg'}
              </p>
              {settings.phone && (
                <p style={{ marginTop: 'var(--space-sm)' }}>
                  {t('contact_phone')}: <a href={`tel:${settings.phone}`}>{settings.phone}</a>
                </p>
              )}
              <div style={{ marginTop: 'var(--space-md)', width: '100%', height: '200px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2119.578680456184!2d8.0068037!3d58.1458995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4647900b3f8db1f3%3A0x6e9c9c381fbc05!2sTangen%20videreg%C3%A5ende%20skole!5e0!3m2!1sno!2sno!4v1700000000000!5m2!1sno!2sno"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Kart til Restaurant Utsyn"
                ></iframe>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="om-oss" className="section section-alt" aria-labelledby="about-heading" style={{ overflow: 'hidden' }}>
          <div className="about-section animate-in" style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
            <h2 id="about-heading" className="section-title">{t('about_title')}</h2>
            <p className="about-text" style={{ maxWidth: '800px', margin: '0 auto' }}>{aboutText}</p>
          </div>

          <div className="container">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4xl)' }}>
              {/* Row 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xl)', flexWrap: 'wrap' }} className="animate-in slide-in-left">
                <div style={{ flex: '1 1 400px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                  <img src="/kitchen_plating_food.jpg" alt={locale === 'no' ? "Elever på kjøkkenet" : "Students in the kitchen"} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover', aspectRatio: '4/3' }} />
                </div>
                <div style={{ flex: '1 1 400px' }}>
                  <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-md)' }}>
                    {locale === 'no' ? 'Lidenskap for faget' : 'Passion for the craft'}
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                    {locale === 'no'
                      ? 'Våre dyktige elever lærer seg alt fra klassiske teknikker til moderne matlaging på et pulserende og lærerikt kjøkken.'
                      : 'Our skilled students learn everything from classic techniques to modern cooking in a vibrant and educational kitchen.'}
                  </p>
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xl)', flexWrap: 'wrap', flexDirection: 'row-reverse' }} className="animate-in slide-in-right">
                <div style={{ flex: '1 1 400px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                  <img src="/culinary_students_sushi.jpg" alt={locale === 'no' ? "Elever lager sushi" : "Students making sushi"} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover', aspectRatio: '4/3' }} />
                </div>
                <div style={{ flex: '1 1 400px' }}>
                  <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-md)' }}>
                    {locale === 'no' ? 'Kreativitet med presisjon' : 'Creativity with precision'}
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                    {locale === 'no'
                      ? 'Gjennom nøyaktighet og utforskning forvandles råvarer til kulinariske kunstverk og smaksopplevelser du sent vil glemme.'
                      : 'Through accuracy and exploration, raw ingredients are transformed into culinary artwork and unforgettable taste experiences.'}
                  </p>
                </div>
              </div>

              {/* Row 3 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xl)', flexWrap: 'wrap' }} className="animate-in slide-in-left">
                <div style={{ flex: '1 1 400px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                  <img src="/plating_dessert.jpg" alt={locale === 'no' ? "Student anretter dessert" : "Student plating dessert"} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover', aspectRatio: '4/3' }} />
                </div>
                <div style={{ flex: '1 1 400px' }}>
                  <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-md)' }}>
                    {locale === 'no' ? 'Detaljer og perfeksjon' : 'Details and perfection'}
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                    {locale === 'no'
                      ? 'Hver eneste rett blir nøye anrettet, med et blikk for estetikk og sans for de deilige, små detaljene som gjør måltidet komplett.'
                      : 'Every single dish is carefully plated, with an eye for aesthetics and a sense for the delicious little details that make the meal complete.'}
                  </p>
                </div>
              </div>

              {/* Row 4 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xl)', flexWrap: 'wrap', flexDirection: 'row-reverse' }} className="animate-in slide-in-right">
                <div style={{ flex: '1 1 400px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                  <img src="/student_setting_table.jpg" alt={locale === 'no' ? "Student dekker bord" : "Student setting table"} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover', aspectRatio: '4/3' }} />
                </div>
                <div style={{ flex: '1 1 400px' }}>
                  <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-md)' }}>
                    {locale === 'no' ? 'Gjestfrihet og service' : 'Hospitality and service'}
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                    {locale === 'no'
                      ? 'Restaraunt Utsyn er mer enn bare mat; våre servitørelever sørger for at restauranten er vakkert dekket og at alle gjester føler seg hjertelig velkomne.'
                      : 'Restaraunt Utsyn is more than just food; our waiter students ensure that the restaurant is beautifully set and that all guests feel warmly welcomed.'}
                  </p>
                </div>
              </div>

              {/* Row 5 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xl)', flexWrap: 'wrap' }} className="animate-in slide-in-left">
                <div style={{ flex: '1 1 400px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                  <img src="/chef_at_pass.jpg" alt={locale === 'no' ? "Kokk ved luken" : "Chef at the pass"} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover', aspectRatio: '4/3' }} />
                </div>
                <div style={{ flex: '1 1 400px' }}>
                  <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-md)' }}>
                    {locale === 'no' ? 'Konsentrasjon og kvalitet' : 'Concentration and quality'}
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                    {locale === 'no'
                      ? 'Som ved enhver anerkjent restaurant opererer vi med strenge kvalitetskrav og en lidenskap for et sluttresultat som fanger øyet og gleder ganen.'
                      : 'As with any renowned restaurant, we operate with strict quality requirements and a passion for a final result that catches the eye and delights the palate.'}
                  </p>
                </div>
              </div>

              {/* Row 6 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xl)', flexWrap: 'wrap', flexDirection: 'row-reverse' }} className="animate-in slide-in-right">
                <div style={{ flex: '1 1 400px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                  <img src="/ready_table.png" alt={locale === 'no' ? "Smørbrødbrett" : "Sandwich platter"} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover', aspectRatio: '4/3' }} />
                </div>
                <div style={{ flex: '1 1 400px' }}>
                  <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-md)' }}>
                    {locale === 'no' ? 'Bredt og smakfullt tilbud' : 'Broad and tasty selection'}
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                    {locale === 'no'
                      ? 'Vi serverer et variert utvalg av retter som passer til store og små anledninger, laget fra bunnen av med ferske, gode råvarer.'
                      : 'We serve a varied selection of dishes suitable for large and small occasions, made from scratch with fresh, high-quality ingredients.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="kontakt" className="section" aria-labelledby="contact-heading">
          <div className="about-section animate-in">
            <h2 id="contact-heading" className="section-title">{t('contact_title')}</h2>
            <div className="info-grid" style={{ maxWidth: '600px', margin: '0 auto', gridTemplateColumns: '1fr' }}>
              <div className="card">
                <div className="price-item">
                  <span>{t('contact_address')}</span>
                  <span className="price-value" style={{ fontSize: 'var(--font-size-base)' }}>
                    {settings.address || 'Tangen 21, 1. etg'}
                  </span>
                </div>
                {settings.phone && (
                  <div className="price-item">
                    <span>{t('contact_phone')}</span>
                    <span className="price-value" style={{ fontSize: 'var(--font-size-base)' }}>
                      <a href={`tel:${settings.phone}`}>{settings.phone}</a>
                    </span>
                  </div>
                )}
                {settings.email && (
                  <div className="price-item">
                    <span>{t('contact_email')}</span>
                    <span className="price-value" style={{ fontSize: 'var(--font-size-base)' }}>
                      <a href={`mailto:${settings.email}`}>{settings.email}</a>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 'var(--space-2xl)' }}>
              <Link href="/bestill" className="btn btn-primary btn-lg">
                {t('hero_cta')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <A11yToolbar />
    </>
  );
}

export default function Page() {
  return (
    <LocaleProvider>
      <HomePage />
    </LocaleProvider>
  );
}
