'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LocaleProvider, useLocale } from '@/components/LocaleProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import A11yToolbar from '@/components/A11yToolbar';
import { IconClock, IconMoney, IconMapPin } from '@/components/Icons';

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

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(console.error);
    fetch('/api/open-days').then(r => r.json()).then(setOpenDays).catch(console.error);
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
              <div className="card-icon" aria-hidden="true"><IconClock size={32} /></div>
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

            {/* Prices */}
            <div className="card animate-in">
              <div className="card-icon" aria-hidden="true"><IconMoney size={32} /></div>
              <h3>{t('info_price_title')}</h3>
              <div style={{ marginTop: 'var(--space-md)' }}>
                <div className="price-item">
                  <span>{t('info_main_course')}</span>
                  <span className="price-value">
                    {settings.currency || 'kr'} {settings.price_main || '135'},-
                  </span>
                </div>
                <div className="price-item">
                  <span>{t('info_dessert')}</span>
                  <span className="price-value">
                    {settings.currency || 'kr'} {settings.price_dessert || '35'},-
                  </span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="card animate-in">
              <div className="card-icon" aria-hidden="true"><IconMapPin size={32} /></div>
              <h3>{t('info_location_title')}</h3>
              <p style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-md)' }}>
                {settings.address || 'Tangen 21, 1. etg'}
              </p>
              {settings.phone && (
                <p style={{ marginTop: 'var(--space-sm)' }}>
                  {t('contact_phone')}: <a href={`tel:${settings.phone}`}>{settings.phone}</a>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* About */}
        <section id="om-oss" className="section section-alt" aria-labelledby="about-heading">
          <div className="about-section animate-in">
            <h2 id="about-heading" className="section-title">{t('about_title')}</h2>
            <p className="about-text">{aboutText}</p>
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
