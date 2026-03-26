'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LocaleProvider, useLocale } from '@/components/LocaleProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import A11yToolbar from '@/components/A11yToolbar';
import { IconCheck, IconArrowLeft } from '@/components/Icons';

interface OpenDay {
    day_of_week: number;
    is_active: number | boolean;
}

interface TimeSlot {
    time: string;
    booked: number;
    available: number;
    full: boolean;
}

interface AvailabilityResponse {
    closed: boolean;
    slots: TimeSlot[];
}

function BookingWizard() {
    const { locale, t } = useLocale();
    const [step, setStep] = useState(1);
    const [guests, setGuests] = useState<number>(0);
    const [customGuests, setCustomGuests] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [comment, setComment] = useState('');
    const [confirmationCode, setConfirmationCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [openDays, setOpenDays] = useState<OpenDay[]>([]);
    const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Form errors
    const [nameError, setNameError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [emailError, setEmailError] = useState('');

    useEffect(() => {
        fetch('/api/open-days', { cache: 'no-store' }).then(r => r.json()).then(setOpenDays).catch(console.error);
    }, []);

    const fetchAvailability = useCallback(async (date: string) => {
        setLoadingSlots(true);
        try {
            const res = await fetch(`/api/availability?date=${date}`);
            const data = await res.json();
            setAvailability(data);
        } catch (err) {
            console.error('Error fetching availability:', err);
        } finally {
            setLoadingSlots(false);
        }
    }, []);

    useEffect(() => {
        if (selectedDate) {
            fetchAvailability(selectedDate);
        }
    }, [selectedDate, fetchAvailability]);

    const totalSteps = 5;
    const stepLabels = [
        t('book_step_guests'),
        t('book_step_date'),
        t('book_step_time'),
        t('book_step_info'),
        t('book_step_confirm'),
    ];

    const actualGuests = showCustom ? parseInt(customGuests) || 0 : guests;

    // Calendar helpers
    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month: number, year: number) => {
        const d = new Date(year, month, 1).getDay();
        return d === 0 ? 6 : d - 1; // Monday = 0
    };

    const isOpenDay = (dayOfWeek: number) => {
        const od = openDays.find(d => d.day_of_week === dayOfWeek);
        return od?.is_active === 1 || od?.is_active === true;
    };

    const isWeekend = (dayOfWeek: number) => dayOfWeek === 0 || dayOfWeek === 6;

    const isPastDate = (date: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(date + 'T00:00:00') < today;
    };

    const monthNames = [
        t('month_january'), t('month_february'), t('month_march'), t('month_april'),
        t('month_may'), t('month_june'), t('month_july'), t('month_august'),
        t('month_september'), t('month_october'), t('month_november'), t('month_december'),
    ];

    const dayLabels = [t('day_mon'), t('day_tue'), t('day_wed'), t('day_thu'), t('day_fri'), t('day_sat'), t('day_sun')];

    const formatSelectedDate = () => {
        if (!selectedDate) return '';
        const date = new Date(selectedDate + 'T00:00:00');
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        };
        return date.toLocaleDateString(locale === 'no' ? 'nb-NO' : 'en-US', options);
    };

    const validateForm = () => {
        let valid = true;
        setNameError('');
        setPhoneError('');
        setEmailError('');

        if (!name.trim() || name.trim().length < 2) {
            setNameError(t('error_name_required'));
            valid = false;
        }
        if (!phone.trim()) {
            setPhoneError(t('error_phone_required'));
            valid = false;
        } else if (!/^[\d\s\-\+\(\)]{8,}$/.test(phone)) {
            setPhoneError(t('error_phone_invalid'));
            valid = false;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError(t('error_email_invalid'));
            valid = false;
        }
        return valid;
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest_name: name,
                    phone,
                    email,
                    guests_count: actualGuests,
                    date: selectedDate,
                    time_slot: selectedTime,
                    comment,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setConfirmationCode(data.confirmation_code);
                setStep(6); // confirmation step
            } else {
                setError(data.error || t('error_booking_failed'));
            }
        } catch {
            setError(t('error_booking_failed'));
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => {
        setError('');
        if (step === 3) {
            setSelectedTime('');
        }
        setStep(step - 1);
    };

    const goToStep = (targetStep: number) => {
        setError('');
        setStep(targetStep);
    };

    // Render calendar
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
        const days: React.ReactNode[] = [];

        // Empty cells for offset
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day calendar-day-empty" />);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(dateStr + 'T00:00:00');
            const dow = dateObj.getDay();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = dateObj.getTime() === today.getTime();
            const past = isPastDate(dateStr);
            const open = isOpenDay(dow);
            const isWe = isWeekend(dow);
            const isSelected = dateStr === selectedDate;
            const disabled = past || !open;

            let className = 'calendar-day';
            if (isToday) className += ' today';
            if (isWe && !open) className += ' weekend';
            if (isSelected) className += ' selected';
            if (disabled) className += ' disabled';

            days.push(
                <button
                    key={dateStr}
                    className={className}
                    onClick={() => {
                        if (!disabled) {
                            setSelectedDate(dateStr);
                            setSelectedTime('');
                            setStep(3);
                        }
                    }}
                    disabled={disabled}
                    aria-label={`${d} ${monthNames[currentMonth]} ${currentYear}${isToday ? ' (i dag)' : ''}${disabled ? ' - stengt' : ''}`}
                    aria-pressed={isSelected}
                >
                    {d}
                </button>
            );
        }

        return days;
    };

    const canGoNextMonth = () => {
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 12);
        return new Date(currentYear, currentMonth + 1) <= maxDate;
    };

    const canGoPrevMonth = () => {
        const now = new Date();
        return new Date(currentYear, currentMonth) >= new Date(now.getFullYear(), now.getMonth());
    };

    return (
        <>
            <Header />
            <main id="main-content" style={{ minHeight: 'calc(100vh - var(--header-height) - 200px)' }}>
                <div className="wizard">
                    {/* Confirmation page */}
                    {step === 6 ? (
                        <div className="confirmation animate-in">
                            <div className="confirmation-icon" aria-hidden="true"><IconCheck size={40} /></div>
                            <h2>{t('confirm_title')}</h2>
                            <h3>{t('confirm_subtitle')}</h3>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)' }}>
                                {t('confirm_message')}
                            </p>
                            <div className="confirmation-code">
                                <span className="confirmation-code-label">{t('confirm_code')}</span>
                                <span className="confirmation-code-value">{confirmationCode}</span>
                            </div>
                            <div style={{ marginTop: 'var(--space-2xl)' }}>
                                <Link href="/" className="btn btn-primary btn-lg">
                                    {t('confirm_home')}
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Progress bar */}
                            <div className="wizard-progress" role="navigation" aria-label="Bestillingsfremdrift">
                                {stepLabels.map((label, i) => (
                                    <div
                                        key={i}
                                        className={`wizard-step-indicator ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`}
                                    >
                                        <div className="wizard-step-dot" aria-current={step === i + 1 ? 'step' : undefined}>
                                            {step > i + 1 ? <IconCheck size={16} /> : i + 1}
                                        </div>
                                        <span className="wizard-step-label">{label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Step 1: Guests */}
                            {step === 1 && (
                                <div className="animate-in">
                                    <h2 className="wizard-title">{t('book_guests_question')}</h2>
                                    <div className="guests-grid">
                                        {[1, 2, 3, 4, 5, 6, 7].map(n => (
                                            <button
                                                key={n}
                                                className={`guest-btn ${guests === n && !showCustom ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setGuests(n);
                                                    setShowCustom(false);
                                                    setStep(2);
                                                }}
                                                aria-label={`${n} ${t('book_persons')}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                        <button
                                            className={`guest-btn ${showCustom ? 'selected' : ''}`}
                                            onClick={() => setShowCustom(true)}
                                            aria-label={t('book_guests_custom')}
                                        >
                                            +
                                        </button>
                                    </div>
                                    {showCustom && (
                                        <div className="guest-custom-input">
                                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                                <label htmlFor="custom-guests" className="form-label">{t('book_guests_input')}</label>
                                                <input
                                                    id="custom-guests"
                                                    type="number"
                                                    min="1"
                                                    max="60"
                                                    className="form-input"
                                                    value={customGuests}
                                                    onChange={(e) => setCustomGuests(e.target.value)}
                                                    placeholder="8-60"
                                                    autoFocus
                                                />
                                            </div>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => {
                                                    const n = parseInt(customGuests);
                                                    if (n >= 1 && n <= 60) setStep(2);
                                                }}
                                                disabled={!customGuests || parseInt(customGuests) < 1 || parseInt(customGuests) > 60}
                                                style={{ marginTop: '24px' }}
                                            >
                                                {t('book_next')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Date */}
                            {step === 2 && (
                                <div className="animate-in">
                                    <h2 className="wizard-title">{t('book_date_select')}</h2>
                                    <div className="calendar">
                                        <div className="calendar-header">
                                            <button
                                                className="calendar-nav"
                                                onClick={() => {
                                                    if (currentMonth === 0) {
                                                        setCurrentMonth(11);
                                                        setCurrentYear(currentYear - 1);
                                                    } else {
                                                        setCurrentMonth(currentMonth - 1);
                                                    }
                                                }}
                                                disabled={!canGoPrevMonth()}
                                                aria-label={locale === 'no' ? 'Forrige måned' : 'Previous month'}
                                            >
                                                ‹
                                            </button>
                                            <span className="calendar-title">
                                                {monthNames[currentMonth]} {currentYear}
                                            </span>
                                            <button
                                                className="calendar-nav"
                                                onClick={() => {
                                                    if (currentMonth === 11) {
                                                        setCurrentMonth(0);
                                                        setCurrentYear(currentYear + 1);
                                                    } else {
                                                        setCurrentMonth(currentMonth + 1);
                                                    }
                                                }}
                                                disabled={!canGoNextMonth()}
                                                aria-label={locale === 'no' ? 'Neste måned' : 'Next month'}
                                            >
                                                ›
                                            </button>
                                        </div>
                                        <div className="calendar-weekdays" role="row">
                                            {dayLabels.map(d => (
                                                <div key={d} className="calendar-weekday" role="columnheader">{d}</div>
                                            ))}
                                        </div>
                                        <div className="calendar-days" role="grid">
                                            {renderCalendar()}
                                        </div>
                                    </div>
                                    <div className="wizard-actions">
                                        <button className="btn btn-ghost" onClick={goBack}>
                                            ← {t('book_back')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Time */}
                            {step === 3 && (
                                <div className="animate-in">
                                    <h2 className="wizard-title">{t('book_time_select')}</h2>
                                    <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)' }}>
                                        {formatSelectedDate()}
                                    </p>
                                    {loadingSlots ? (
                                        <div className="loading"><div className="spinner" /></div>
                                    ) : availability?.closed ? (
                                        <p className="empty-state">{t('error_date_closed')}</p>
                                    ) : availability?.slots.length === 0 ? (
                                        <p className="empty-state">{t('error_no_slots')}</p>
                                    ) : (
                                        <div className="time-slots">
                                            {availability?.slots.map(slot => {
                                                const hasCapacity = slot.available >= actualGuests;
                                                return (
                                                    <button
                                                        key={slot.time}
                                                        className={`time-slot ${selectedTime === slot.time ? 'selected' : ''} ${!hasCapacity ? 'full' : ''}`}
                                                        onClick={() => {
                                                            if (hasCapacity) {
                                                                setSelectedTime(slot.time);
                                                                setStep(4);
                                                            }
                                                        }}
                                                        disabled={!hasCapacity}
                                                        aria-label={`${slot.time} - ${hasCapacity ? t('book_time_available') : t('book_time_full')}`}
                                                    >
                                                        {slot.time}
                                                        <span className="time-slot-status">
                                                            {hasCapacity ? t('book_time_available') : t('book_time_full')}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div className="wizard-actions">
                                        <button className="btn btn-ghost" onClick={goBack}>
                                            ← {t('book_back')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Personal info */}
                            {step === 4 && (
                                <div className="animate-in">
                                    <h2 className="wizard-title">{t('book_step_info')}</h2>
                                    <div className="form-group">
                                        <label htmlFor="booking-name" className="form-label">{t('book_name')} *</label>
                                        <input
                                            id="booking-name"
                                            type="text"
                                            className="form-input"
                                            value={name}
                                            onChange={(e) => { setName(e.target.value); setNameError(''); }}
                                            placeholder={t('book_name_placeholder')}
                                            required
                                            autoComplete="name"
                                            aria-required="true"
                                            aria-invalid={!!nameError}
                                        />
                                        {nameError && <span className="form-error" role="alert">{nameError}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="booking-phone" className="form-label">{t('book_phone')} *</label>
                                        <input
                                            id="booking-phone"
                                            type="tel"
                                            className="form-input"
                                            value={phone}
                                            onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                                            placeholder={t('book_phone_placeholder')}
                                            required
                                            autoComplete="tel"
                                            aria-required="true"
                                            aria-invalid={!!phoneError}
                                        />
                                        {phoneError && <span className="form-error" role="alert">{phoneError}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="booking-email" className="form-label">{t('book_email')}</label>
                                        <input
                                            id="booking-email"
                                            type="email"
                                            className="form-input"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                                            placeholder={t('book_email_placeholder')}
                                            autoComplete="email"
                                            aria-invalid={!!emailError}
                                        />
                                        {emailError && <span className="form-error" role="alert">{emailError}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="booking-comment" className="form-label">{t('book_comment')}</label>
                                        <textarea
                                            id="booking-comment"
                                            className="form-textarea"
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder={t('book_comment_placeholder')}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="wizard-actions">
                                        <button className="btn btn-ghost" onClick={goBack}>
                                            ← {t('book_back')}
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => {
                                                if (validateForm()) setStep(5);
                                            }}
                                        >
                                            {t('book_next')} →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Confirm */}
                            {step === 5 && (
                                <div className="animate-in">
                                    <h2 className="wizard-title">{t('book_step_confirm')}</h2>
                                    <div className="summary-card">
                                        <div className="summary-row">
                                            <div>
                                                <div className="summary-label">{t('book_summary_guests')}</div>
                                                <div className="summary-value">{actualGuests} {t('book_persons')}</div>
                                            </div>
                                            <button className="summary-edit" onClick={() => goToStep(1)}>
                                                {t('book_edit')}
                                            </button>
                                        </div>
                                        <div className="summary-row">
                                            <div>
                                                <div className="summary-label">{t('book_summary_date')}</div>
                                                <div className="summary-value">{formatSelectedDate()}, {selectedTime}</div>
                                            </div>
                                            <button className="summary-edit" onClick={() => goToStep(2)}>
                                                {t('book_edit')}
                                            </button>
                                        </div>
                                        <div className="summary-row">
                                            <div>
                                                <div className="summary-label">{t('book_name')}</div>
                                                <div className="summary-value">{name}</div>
                                            </div>
                                            <button className="summary-edit" onClick={() => goToStep(4)}>
                                                {t('book_edit')}
                                            </button>
                                        </div>
                                        <div className="summary-row">
                                            <div>
                                                <div className="summary-label">{t('book_phone')}</div>
                                                <div className="summary-value">{phone}</div>
                                            </div>
                                            <button className="summary-edit" onClick={() => goToStep(4)}>
                                                {t('book_edit')}
                                            </button>
                                        </div>
                                        {email && (
                                            <div className="summary-row">
                                                <div>
                                                    <div className="summary-label">{t('book_email')}</div>
                                                    <div className="summary-value">{email}</div>
                                                </div>
                                            </div>
                                        )}
                                        {comment && (
                                            <div className="summary-row">
                                                <div>
                                                    <div className="summary-label">{t('book_comment')}</div>
                                                    <div className="summary-value">{comment}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {error && (
                                        <div className="login-error" role="alert" style={{ marginTop: 'var(--space-lg)' }}>
                                            {error}
                                        </div>
                                    )}

                                    <div className="wizard-actions">
                                        <button className="btn btn-ghost" onClick={goBack}>
                                            ← {t('book_back')}
                                        </button>
                                        <button
                                            className="btn btn-primary btn-lg"
                                            onClick={handleSubmit}
                                            disabled={loading}
                                        >
                                            {loading ? '...' : t('book_confirm')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
            <Footer />
            <A11yToolbar />
        </>
    );
}

export default function BestillPage() {
    return (
        <LocaleProvider>
            <BookingWizard />
        </LocaleProvider>
    );
}
