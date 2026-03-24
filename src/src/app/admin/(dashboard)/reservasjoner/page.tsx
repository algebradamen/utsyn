'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { IconClipboard } from '@/components/Icons';

interface Reservation {
  id: number;
  guest_name: string;
  phone: string;
  email: string;
  guests_count: number;
  date: string;
  time_slot: string;
  comment: string;
  status: string;
  confirmation_code: string;
  created_at: string;
}

export default function ReservasjonerPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toast, setToast] = useState('');

  const fetchReservations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set('date', filterDate);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const res = await fetch(`/api/reservations?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setReservations(data);
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterStatus]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast('Status oppdatert!');
        fetchReservations();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      confirmed: 'Bekreftet',
      cancelled: 'Kansellert',
      completed: 'Fullført',
      no_show: 'Ikke møtt',
    };
    return map[status] || status;
  };

  const formatDateStr = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Reservasjoner</h1>
      </div>

      {/* Filters */}
      <div className="date-filter">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="filter-date" className="form-label">Dato</label>
          <input
            id="filter-date"
            type="date"
            className="form-input"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ width: 'auto' }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="filter-status" className="form-label">Status</label>
          <select
            id="filter-status"
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="all">Alle</option>
            <option value="confirmed">Bekreftet</option>
            <option value="cancelled">Kansellert</option>
            <option value="completed">Fullført</option>
            <option value="no_show">Ikke møtt</option>
          </select>
        </div>
        {filterDate && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setFilterDate('')}
            style={{ marginTop: '24px' }}
          >
            Nullstill dato
          </button>
        )}
      </div>

      {reservations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IconClipboard size={48} /></div>
          <p>Ingen reservasjoner funnet.</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Dato</th>
                <th>Tid</th>
                <th>Navn</th>
                <th>Gjester</th>
                <th>Telefon</th>
                <th>Kommentar</th>
                <th>Status</th>
                <th>Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr key={r.id}>
                  <td><code style={{ fontSize: 'var(--font-size-xs)', background: 'var(--color-bg-alt)', padding: '2px 6px', borderRadius: '4px' }}>{r.confirmation_code}</code></td>
                  <td>{formatDateStr(r.date)}</td>
                  <td><strong>{r.time_slot}</strong></td>
                  <td>{r.guest_name}</td>
                  <td>{r.guests_count}</td>
                  <td><a href={`tel:${r.phone}`}>{r.phone}</a></td>
                  <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.comment}>{r.comment || '—'}</td>
                  <td>
                    <span className={`status-badge status-${r.status}`}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      {r.status === 'confirmed' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => updateStatus(r.id, 'completed')} title="Marker som fullført">
                            ✓
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => updateStatus(r.id, 'cancelled')} title="Kanseller">
                            ✕
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(r.id, 'no_show')} title="Ikke møtt">
                            ?
                          </button>
                        </>
                      )}
                      {r.status === 'cancelled' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(r.id, 'confirmed')}>
                          Gjenopprett
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast */}
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
