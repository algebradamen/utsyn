'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { IconClipboard, IconCheck, IconX, IconQuestionMark, IconRefresh } from '@/components/Icons';

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
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

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

  const confirmDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Er du sikker på at du vil slette denne reservasjonen helt? Dette kan ikke angres.',
      onConfirm: () => deleteReservation(id)
    });
  };

  const deleteReservation = async (id: number) => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Reservasjon slettet.');
        fetchReservations();
      } else {
        showToast('Kunne ikke slette reservasjon.');
      }
    } catch (err) {
      console.error('Error deleting reservation:', err);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      needs_seat: 'Venter på bord',
      confirmed: 'Bekreftet',
      cancelled: 'Kansellert',
      completed: 'Fullført',
      no_show: 'Møtte ikke',
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
            <option value="needs_seat">Venter på bord</option>
            <option value="confirmed">Bekreftet</option>
            <option value="completed">Fullført</option>
            <option value="cancelled">Kansellert</option>
            <option value="no_show">Møtte ikke</option>
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

      {/* Status workflow help */}
      <div style={{ 
        display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', 
        marginBottom: 'var(--space-lg)', padding: 'var(--space-md) var(--space-lg)', 
        background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)',
        fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 600, color: 'var(--color-text)', marginRight: 'var(--space-xs)' }}>Statusforklaring:</span>
        <span><span className="status-badge status-needs_seat" style={{ marginRight: '4px' }}>Venter på bord</span> Ny reservasjon, trenger bordtildeling</span>
        <span>→</span>
        <span><span className="status-badge status-confirmed" style={{ marginRight: '4px' }}>Bekreftet</span> Bord tildelt, SMS sendt til gjest</span>
        <span>→</span>
        <span><span className="status-badge status-completed" style={{ marginRight: '4px' }}>Fullført</span> Gjesten har vært og gått</span>
      </div>

      {reservations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IconClipboard size={32} /></div>
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
                    <div className="actions-cell" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100px', alignItems: 'center', flexShrink: 0 }}>
                        {(r.status === 'confirmed' || r.status === 'needs_seat') && (
                          <>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button className="btn btn-success btn-sm" onClick={() => updateStatus(r.id, 'completed')} title="Marker som fullført — gjesten har besøkt restauranten" aria-label="Marker som fullført" style={{ padding: '6px 12px' }}>
                                <IconCheck size={16} />
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => updateStatus(r.id, 'cancelled')} title="Kanseller reservasjonen" aria-label="Kanseller" style={{ padding: '6px 14px' }}>
                                <IconX size={16} />
                              </button>
                            </div>
                            <button className="btn btn-warning btn-sm" onClick={() => updateStatus(r.id, 'no_show')} title="Gjesten møtte ikke opp til reservasjonen" aria-label="Møtte ikke" style={{ padding: '4px 10px', height: 'auto', fontWeight: 600, fontSize: '12px' }}>
                              Møtte ikke
                            </button>
                          </>
                        )}
                        {r.status === 'cancelled' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(r.id, 'confirmed')} style={{ whiteSpace: 'nowrap' }}>
                            Gjenopprett
                          </button>
                        )}
                      </div>

                      {/* Universal Delete Action */}
                      <button className="btn btn-danger btn-sm" onClick={() => confirmDelete(r.id)} title="Slett reservasjon" aria-label="Slett" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
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

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Bekreft handling</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              >
                Avbryt
              </button>
              <button 
                className="btn btn-danger" 
                onClick={confirmDialog.onConfirm}
              >
                Slett
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
