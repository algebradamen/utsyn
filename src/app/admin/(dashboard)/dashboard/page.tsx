'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Reservation {
    id: number;
    guest_name: string;
    phone: string;
    guests_count: number;
    date: string;
    time_slot: string;
    status: string;
}

// Helper: get local date as YYYY-MM-DD without UTC conversion
function getLocalDateStr(date?: Date): string {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDatePretty(dateStr: string): string {
    try {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch {
        return dateStr;
    }
}

function formatDateShort(dateStr: string): string {
    try {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
        return dateStr;
    }
}

export default function Dashboard() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/reservations', { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const validStatuses = ['confirmed', 'completed', 'needs_seat'];
                    setReservations(data.filter((r: Reservation) => validStatuses.includes(r.status)));
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const todayStr = getLocalDateStr();
    
    // Today's reservations
    const todayReservations = reservations
        .filter(r => r.date === todayStr)
        .sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    
    // Future reservations (EXCLUDING today) for the second card
    const futureReservations = reservations
        .filter(r => r.date > todayStr && (r.status === 'confirmed' || r.status === 'needs_seat'))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot));
    
    // All upcoming reservations (today + future) for the table below
    const upcomingReservations = reservations
        .filter(r => r.date >= todayStr && (r.status === 'confirmed' || r.status === 'needs_seat'))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot));
    
    // Group upcoming by date
    const upcomingByDate = upcomingReservations.reduce((acc, r) => {
        if (!acc[r.date]) acc[r.date] = [];
        acc[r.date].push(r);
        return acc;
    }, {} as Record<string, Reservation[]>);

    const upcomingDates = Object.keys(upcomingByDate).sort();

    // Find the next date that has reservations (could be today or future)
    const nextDateWithReservations = upcomingDates.length > 0 ? upcomingDates[0] : null;
    const nextDateReservations = nextDateWithReservations ? upcomingByDate[nextDateWithReservations] : [];

    const todayGuests = todayReservations.reduce((sum, r) => sum + r.guests_count, 0);
    
    // Future stats (excluding today)
    const futureByDate = futureReservations.reduce((acc, r) => {
        if (!acc[r.date]) acc[r.date] = [];
        acc[r.date].push(r);
        return acc;
    }, {} as Record<string, Reservation[]>);
    const futureDates = Object.keys(futureByDate);
    const totalFutureGuests = futureReservations.reduce((sum, r) => sum + r.guests_count, 0);

    return (
        <>
            <div className="admin-header">
                <h1 className="admin-title">Oversikt</h1>
                <Link href="/bestill" className="btn btn-primary" target="_blank">Vis nettside</Link>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">I dag — {formatDateShort(todayStr)}</div>
                    <div className="stat-value">{todayReservations.length}</div>
                    <div style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {todayReservations.length > 0 
                            ? `${todayGuests} gjester fordelt på ${todayReservations.length} reservasjon${todayReservations.length > 1 ? 'er' : ''}` 
                            : 'Ingen reservasjoner i dag'
                        }
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Fremtidige reservasjoner</div>
                    <div className="stat-value">{futureReservations.length}</div>
                    <div style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {futureReservations.length > 0
                            ? `${totalFutureGuests} gjester over ${futureDates.length} ${futureDates.length === 1 ? 'dag' : 'dager'}`
                            : 'Ingen fremtidige reservasjoner'
                        }
                    </div>
                </div>
            </div>

            {/* Show today's reservations if any */}
            {todayReservations.length > 0 && (
                <div className="admin-form-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                        <h2 style={{ fontSize: 'var(--font-size-xl)' }}>Dagens reservasjoner</h2>
                        <Link href="/admin/reservasjoner" className="btn btn-ghost btn-sm">Se alle &rarr;</Link>
                    </div>
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Tidspunkt</th>
                                    <th>Navn</th>
                                    <th>Antall</th>
                                    <th>Telefon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayReservations.map(r => (
                                    <tr key={r.id}>
                                        <td><strong>{r.time_slot}</strong></td>
                                        <td>{r.guest_name}</td>
                                        <td>{r.guests_count} personer</td>
                                        <td>{r.phone}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Show next upcoming reservations (especially useful when today has none) */}
            <div className="admin-form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)' }}>
                        {todayReservations.length === 0 && nextDateWithReservations
                            ? `Neste reservasjoner (${formatDatePretty(nextDateWithReservations)})`
                            : 'Kommende reservasjoner'
                        }
                    </h2>
                    <Link href="/admin/reservasjoner" className="btn btn-ghost btn-sm">Se alle &rarr;</Link>
                </div>

                {upcomingDates.length === 0 ? (
                    <p className="empty-state">Ingen kommende reservasjoner.</p>
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Dato</th>
                                    <th>Tidspunkt</th>
                                    <th>Navn</th>
                                    <th>Antall</th>
                                    <th>Telefon</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {upcomingDates.slice(0, 3).flatMap(date =>
                                    upcomingByDate[date].map(r => (
                                        <tr key={r.id}>
                                            <td>{formatDateShort(r.date)}</td>
                                            <td><strong>{r.time_slot}</strong></td>
                                            <td>{r.guest_name}</td>
                                            <td>{r.guests_count} personer</td>
                                            <td><a href={`tel:${r.phone}`}>{r.phone}</a></td>
                                            <td>
                                                <span className={`status-badge status-${r.status}`}>
                                                    {r.status === 'confirmed' ? 'Bekreftet' : (r.status === 'needs_seat' ? 'Venter på bord' : 'Fullført')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
