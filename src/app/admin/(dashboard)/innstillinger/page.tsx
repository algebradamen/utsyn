'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface OpenDay {
  id: number;
  day_of_week: number;
  open_time: string;
    close_time: string;
    time_slots?: string;
    is_active: boolean;
}

interface Closure {
  id: number;
  date: string;
  reason_no: string;
  reason_en: string;
}

const DAY_NAMES = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];

export default function InnstillingerPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [openDays, setOpenDays] = useState<OpenDay[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // New closure form
  const [newClosureDate, setNewClosureDate] = useState('');
  const [newClosureReasonNo, setNewClosureReasonNo] = useState('');
  const [newClosureReasonEn, setNewClosureReasonEn] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [settingsRes, daysRes, closuresRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/open-days'),
        fetch('/api/closures'),
      ]);
      setSettings(await settingsRes.json());
      setOpenDays(await daysRes.json());
      const closuresData = await closuresRes.json();
      if (Array.isArray(closuresData)) setClosures(closuresData);
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const saveSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) showToast('Innstillinger lagret!');
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  const saveOpenDays = async () => {
    try {
      const res = await fetch('/api/open-days', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(openDays),
      });
      if (res.ok) showToast('Åpningstider lagret!');
    } catch (err) {
      console.error('Error saving open days:', err);
    }
  };

  const addClosure = async () => {
    if (!newClosureDate) return;
    try {
      const res = await fetch('/api/closures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newClosureDate,
          reason_no: newClosureReasonNo,
          reason_en: newClosureReasonEn,
        }),
      });
      if (res.ok) {
        setNewClosureDate('');
        setNewClosureReasonNo('');
        setNewClosureReasonEn('');
        fetchAll();
        showToast('Stengt dag lagt til!');
      }
    } catch (err) {
      console.error('Error adding closure:', err);
    }
  };

  const deleteClosure = async (id: number) => {
    try {
      const res = await fetch(`/api/closures/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAll();
        showToast('Stengt dag fjernet!');
      }
    } catch (err) {
      console.error('Error deleting closure:', err);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateOpenDay = (dayOfWeek: number, field: string, value: string | number | boolean) => {
    setOpenDays(prev =>
      prev.map(d =>
        d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d
      )
    );
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Innstillinger</h1>
      </div>

      {/* Site Content */}
      <div className="admin-form-section">
        <h3>Nettsidens innhold</h3>
        <div className="admin-form-grid">
          <div className="form-group">
            <label className="form-label">Tittel (Norsk)</label>
            <input className="form-input" value={settings.hero_title_no || ''} onChange={e => updateSetting('hero_title_no', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tittel (Engelsk)</label>
            <input className="form-input" value={settings.hero_title_en || ''} onChange={e => updateSetting('hero_title_en', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Undertittel (Norsk)</label>
            <input className="form-input" value={settings.hero_subtitle_no || ''} onChange={e => updateSetting('hero_subtitle_no', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Undertittel (Engelsk)</label>
            <input className="form-input" value={settings.hero_subtitle_en || ''} onChange={e => updateSetting('hero_subtitle_en', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Om oss (Norsk)</label>
          <textarea className="form-textarea" value={settings.about_text_no || ''} onChange={e => updateSetting('about_text_no', e.target.value)} rows={4} />
        </div>
        <div className="form-group">
          <label className="form-label">Om oss (Engelsk)</label>
          <textarea className="form-textarea" value={settings.about_text_en || ''} onChange={e => updateSetting('about_text_en', e.target.value)} rows={4} />
        </div>
        <button className="btn btn-primary" onClick={saveSettings}>Lagre innhold</button>
      </div>

    {/* Contact */}
      <div className="admin-form-section">
        <h3>Kontakt og Kapasitet</h3>
        <div className="admin-form-grid">
          <div className="form-group">
            <label className="form-label">Adresse</label>
            <input className="form-input" value={settings.address || ''} onChange={e => updateSetting('address', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Telefon</label>
            <input className="form-input" value={settings.phone || ''} onChange={e => updateSetting('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">E-post</label>
            <input className="form-input" value={settings.email || ''} onChange={e => updateSetting('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Maks kapasitet (personer)</label>
            <input className="form-input" type="number" value={settings.max_capacity || ''} onChange={e => updateSetting('max_capacity', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Booking stoppes X min før stenging</label>
            <input className="form-input" type="number" value={settings.booking_cutoff_minutes || ''} onChange={e => updateSetting('booking_cutoff_minutes', e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
             <label className="form-label">SMS Leverandør</label>
             <select className="form-input" value={settings.sms_provider || 'webhook'} onChange={e => updateSetting('sms_provider', e.target.value)}>
                <option value="webhook">Webhook (Make.com, Zapier, etc.)</option>
                <option value="twilio">Twilio</option>
             </select>
          </div>
          {settings.sms_provider === 'twilio' ? (
             <>
               <div className="form-group">
                 <label className="form-label">Twilio Account SID</label>
                 <input className="form-input" value={settings.sms_twilio_sid || ''} onChange={e => updateSetting('sms_twilio_sid', e.target.value)} placeholder="AC..." />
               </div>
               <div className="form-group">
                 <label className="form-label">Twilio Auth Token</label>
                 <input className="form-input" type="password" value={settings.sms_twilio_token || ''} onChange={e => updateSetting('sms_twilio_token', e.target.value)} placeholder="Skjult..." />
               </div>
               <div className="form-group">
                 <label className="form-label">Twilio Sender Number</label>
                 <input className="form-input" value={settings.sms_twilio_from || ''} onChange={e => updateSetting('sms_twilio_from', e.target.value)} placeholder="+123456789" />
               </div>
             </>
          ) : (
             <div className="form-group" style={{ gridColumn: '1 / -1' }}>
               <label className="form-label">SMS Webhook URL (valgfritt)</label>
               <input className="form-input" value={settings.sms_webhook_url || ''} onChange={e => updateSetting('sms_webhook_url', e.target.value)} placeholder="https://..." />
             </div>
          )}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">SMS Mal - Ny booking (Bruk {"{kode}"}, {"{dato}"}, {"{tid}"}, {"{antall}"})</label>
            <textarea className="form-textarea" value={settings.sms_template_received || ''} onChange={e => updateSetting('sms_template_received', e.target.value)} rows={3} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">SMS Mal - Bekreftelse/Bord tildelt (Bruk {"{kode}"}, {"{dato}"}, {"{tid}"}, {"{antall}"})</label>
            <textarea className="form-textarea" value={settings.sms_template_confirmed || ''} onChange={e => updateSetting('sms_template_confirmed', e.target.value)} rows={3} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">SMS Mal - Kansellert (Bruk {"{kode}"}, {"{dato}"}, {"{tid}"}, {"{antall}"})</label>
            <textarea className="form-textarea" value={settings.sms_template_cancelled || ''} onChange={e => updateSetting('sms_template_cancelled', e.target.value)} rows={3} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">SMS Mal - Ikke møtt (Bruk {"{kode}"}, {"{dato}"}, {"{tid}"}, {"{antall}"})</label>
            <textarea className="form-textarea" value={settings.sms_template_noshow || ''} onChange={e => updateSetting('sms_template_noshow', e.target.value)} rows={3} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={saveSettings}>Lagre</button>
      </div>

      {/* Opening Hours */}
      <div className="admin-form-section">
        <h3>Åpningstider</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-lg)' }}>
          Standard genererer tider basert på Fra/Til og intervall i innstillinger. For å bestemme eksakte tidspunkt gjestene kan velge, fyll inn <strong>Spesifikke tidspunkt</strong> (tider separert med komma, f.eks: 17:00, 18:00, 19:30). Dette overstyrer genereringen.
        </p>
        <div className="admin-table-container" style={{ marginBottom: 'var(--space-lg)' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Dag</th>
                <th>Åpent</th>
                <th>Fra</th>
                <th>Til</th>
                <th>Spesifikke tidspunkt (overstyrer)</th>
              </tr>
            </thead>
            <tbody>
              {openDays.sort((a, b) => (a.day_of_week === 0 ? 7 : a.day_of_week) - (b.day_of_week === 0 ? 7 : b.day_of_week)).map(day => (
                <tr key={day.day_of_week}>
                  <td><strong>{DAY_NAMES[day.day_of_week]}</strong></td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!day.is_active}
                        onChange={e => updateOpenDay(day.day_of_week, 'is_active', e.target.checked)}
                        style={{ width: 20, height: 20 }}
                      />
                      {day.is_active ? 'Ja' : 'Nei'}
                    </label>
                  </td>
                  <td>
                    <input
                      type="time"
                      className="form-input"
                      value={day.open_time}
                      onChange={e => updateOpenDay(day.day_of_week, 'open_time', e.target.value)}
                      disabled={!day.is_active}
                      style={{ width: '130px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      className="form-input"
                      value={day.close_time}
                      onChange={e => updateOpenDay(day.day_of_week, 'close_time', e.target.value)}
                      disabled={!day.is_active}
                      style={{ width: '130px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-input"
                      value={day.time_slots || ''}
                      onChange={e => updateOpenDay(day.day_of_week, 'time_slots', e.target.value)}
                      placeholder="17:00, 18:00, 19:30"
                      disabled={!day.is_active}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-primary" onClick={saveOpenDays}>Lagre åpningstider</button>
      </div>

      {/* Special Closures */}
      <div className="admin-form-section">
        <h3>Stengte dager</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-lg)' }}>
          Legg til spesifikke datoer restauranten er stengt (helligdager, ferier, etc.)
        </p>
        <div className="admin-form-grid" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="form-group">
            <label className="form-label">Dato</label>
            <input type="date" className="form-input" value={newClosureDate} onChange={e => setNewClosureDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Grunn (Norsk)</label>
            <input className="form-input" value={newClosureReasonNo} onChange={e => setNewClosureReasonNo(e.target.value)} placeholder="F.eks. Juleferie" />
          </div>
          <div className="form-group">
            <label className="form-label">Grunn (Engelsk)</label>
            <input className="form-input" value={newClosureReasonEn} onChange={e => setNewClosureReasonEn(e.target.value)} placeholder="E.g. Christmas holiday" />
          </div>
        </div>
        <button className="btn btn-secondary" onClick={addClosure} disabled={!newClosureDate} style={{ marginBottom: 'var(--space-xl)' }}>
          + Legg til stengt dag
        </button>

        {closures.length > 0 && (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Dato</th>
                  <th>Grunn (NO)</th>
                  <th>Grunn (EN)</th>
                  <th>Handling</th>
                </tr>
              </thead>
              <tbody>
                {closures.map(c => (
                  <tr key={c.id}>
                    <td>{c.date}</td>
                    <td>{c.reason_no || '—'}</td>
                    <td>{c.reason_en || '—'}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteClosure(c.id)}>
                        Slett
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
