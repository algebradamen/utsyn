'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { IconCheck, IconX } from '@/components/Icons';

interface Table {
    id: number;
    name: string;
    capacity: number;
    is_active: number;
}

interface Reservation {
    id: number;
    guest_name: string;
    guests_count: number;
    date: string;
    time_slot: string;
    status: string;
}

interface TableAssignment {
    id: number;
    reservation_id: number;
    table_id: number;
    guest_name: string;
    time_slot: string;
    guests_count: number;
}

// Helper: get local date as YYYY-MM-DD without UTC conversion
function getLocalDateStr(date?: Date): string {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Table positions matching the actual floor plan
// Coordinates are in percentages of the floor-plan container
const tablePositions: Record<number, {x: number, y: number, rotate?: number}> = {
    // Left column against wall
    24: { x: 10, y: 10 },
    25: { x: 18, y: 10 },
    26: { x: 26, y: 10 },
    27: { x: 34, y: 10 },
    28: { x: 42, y: 10 },

    20: { x: 10, y: 16 },
    21: { x: 18, y: 16 },
    22: { x: 26, y: 16 },
    23: { x: 34, y: 16 },

    17: { x: 10, y: 23 },
    18: { x: 18, y: 23 },
    19: { x: 26, y: 23 },

    14: { x: 10, y: 34 },
    15: { x: 18, y: 34 },
    16: { x: 26, y: 34 },

    11: { x: 10, y: 42 },
    12: { x: 18, y: 42 },
    13: { x: 26, y: 42 },

    8:  { x: 10, y: 53 },
    9:  { x: 18, y: 53 },
    10: { x: 48, y: 53 },

    5:  { x: 10, y: 61 },
    6:  { x: 18, y: 61 },
    7:  { x: 48, y: 58 },

    3:  { x: 10, y: 72 },
    4:  { x: 18, y: 72 },

    1:  { x: 10, y: 79 },
    2:  { x: 18, y: 79 },

    // Middle angled
    29: { x: 49, y: 25, rotate: 45 },

    // Top right rooms
    32: { x: 70, y: 5 },
    31: { x: 70, y: 10 },
    30: { x: 70, y: 15 },
};

// Pillar positions (S circles on the floor plan)
const pillarPositions = [
    { x: 9, y: 5 },   // Above 24
    { x: 9, y: 28 },  // Above 14
    { x: 9, y: 47 },  // Above 8
    { x: 9, y: 66 },  // Above 3
    { x: 9, y: 84 },  // Below 1
];

export default function BordPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [allReservations, setAllReservations] = useState<Reservation[]>([]);
    const [assignments, setAssignments] = useState<TableAssignment[]>([]);
    const [filterDate, setFilterDate] = useState(getLocalDateStr());
    const [loading, setLoading] = useState(true);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [toast, setToast] = useState('');
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [editCapacity, setEditCapacity] = useState(4);
    const [editIsActive, setEditIsActive] = useState(true);
    const [datesWithReservations, setDatesWithReservations] = useState<string[]>([]);

    // Fetch all reservations to find dates that have reservations
    const fetchAllReservations = useCallback(async () => {
        try {
            const res = await fetch('/api/reservations');
            const data = await res.json();
            if (Array.isArray(data)) {
                setAllReservations(data.filter((r: Reservation) => r.status === 'confirmed' || r.status === 'completed'));
                const dates = [...new Set(data
                    .filter((r: Reservation) => r.status === 'confirmed' || r.status === 'completed')
                    .map((r: Reservation) => r.date)
                )] as string[];
                setDatesWithReservations(dates.sort());
            }
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [tablesRes, resRes, assignRes] = await Promise.all([
                fetch('/api/tables'),
                fetch(`/api/reservations?date=${filterDate}`),
                fetch(`/api/tables/assignments?date=${filterDate}`)
            ]);
            
            setTables(await tablesRes.json());
            
            const fetchedRes = await resRes.json();
            if (Array.isArray(fetchedRes)) {
                setReservations(fetchedRes.filter((r: Reservation) => r.status === 'confirmed' || r.status === 'completed'));
            } else {
                setReservations([]);
            }
            
            const fetchedAssign = await assignRes.json();
            if (Array.isArray(fetchedAssign)) {
                setAssignments(fetchedAssign);
            } else {
                setAssignments([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filterDate]);

    useEffect(() => {
        fetchAllReservations();
    }, [fetchAllReservations]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-navigate to next date with reservations if today has none
    useEffect(() => {
        if (!loading && reservations.length === 0 && datesWithReservations.length > 0) {
            const today = getLocalDateStr();
            // Find the next date with reservations (today or future)
            const nextDate = datesWithReservations.find(d => d >= today);
            if (nextDate && nextDate !== filterDate) {
                setFilterDate(nextDate);
            }
        }
    }, [loading, reservations.length, datesWithReservations, filterDate]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const toggleAssignment = async (tableId: number) => {
        const table = tables.find(t => t.id === tableId);
        
        if (!selectedReservation) {
            setEditingTable(table || null);
            setEditCapacity(table?.capacity || 4);
            setEditIsActive(table?.is_active !== 0);
            return;
        }

        if (table && table.is_active === 0) {
            showToast('Dette bordet er inaktivt og kan ikke tildeles.');
            return;
        }

        const isAssigned = assignments.some(a => a.table_id === tableId && a.reservation_id === selectedReservation.id);

        try {
            if (isAssigned) {
                await fetch(`/api/tables/assignments?reservation_id=${selectedReservation.id}&table_id=${tableId}`, { method: 'DELETE' });
            } else {
                const res = await fetch('/api/tables/assignments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reservation_id: selectedReservation.id, table_id: tableId })
                });
                if (!res.ok) {
                    showToast('Kunne ikke tildele bord');
                    return;
                }
            }
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const updateTableCapacity = async () => {
        if (!editingTable) return;
        try {
            const res = await fetch('/api/tables', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingTable.id, capacity: editCapacity, is_active: editIsActive ? 1 : 0 })
            });
            if (res.ok) {
                setEditingTable(null);
                fetchData();
                showToast('Bord oppdatert');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const confirmReservation = async (id: number) => {
        try {
            const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' });
            if (res.ok) {
                showToast('Reservasjon bekreftet og SMS sendt!');
                fetchData();
            } else {
                showToast('Kunne ikke bekrefte reservasjonen.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const getTableStatus = (tableId: number) => {
        const table = tables.find(t => t.id === tableId);
        if (table && table.is_active === 0) return 'inactive';

        const tableAssignments = assignments.filter(a => a.table_id === tableId);
        
        if (selectedReservation) {
            const isSelected = tableAssignments.some(a => a.reservation_id === selectedReservation.id);
            if (isSelected) return 'selected';
            
            const isOccupied = tableAssignments.some(a => a.time_slot === selectedReservation.time_slot);
            if (isOccupied) return 'occupied';
        }
        
        if (tableAssignments.length > 0) return 'has-reservations';
        return 'free';
    };

    const formatDatePretty = (dateStr: string) => {
        try {
            const date = new Date(dateStr + 'T00:00:00');
            return date.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch {
            return dateStr;
        }
    };

    // Quick-jump dates: show dates that have reservations
    const upcomingDatesWithRes = datesWithReservations.filter(d => d >= getLocalDateStr()).slice(0, 5);

    return (
        <>
            <div className="admin-header">
                <h1 className="admin-title">Bordkart & Tildeling</h1>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label>Dato:</label>
                    <input 
                        type="date" 
                        className="form-input" 
                        value={filterDate} 
                        onChange={e => setFilterDate(e.target.value)}
                        style={{ width: 'auto', padding: 'var(--space-xs) var(--space-sm)', minHeight: 'auto' }}
                    />
                </div>
            </div>

            {/* Quick jump to dates with reservations */}
            {upcomingDatesWithRes.length > 0 && (
                <div className="quick-dates">
                    <span className="quick-dates-label">Kommende:</span>
                    {upcomingDatesWithRes.map(d => (
                        <button
                            key={d}
                            className={`quick-date-btn ${d === filterDate ? 'active' : ''}`}
                            onClick={() => setFilterDate(d)}
                        >
                            {formatDatePretty(d)}
                        </button>
                    ))}
                </div>
            )}

            <div className="table-management-layout">
                {/* Sidebar with reservations */}
                <div className="reservations-sidebar">
                    <h3>Reservasjoner ({formatDatePretty(filterDate)})</h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
                        Velg en reservasjon for å tildele bord. Klikk på et bord for å endre antall plasser.
                    </p>
                    
                    <div className="reservations-list">
                        {reservations.length === 0 ? (
                            <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                                <p>Ingen reservasjoner for {formatDatePretty(filterDate)}.</p>
                                {upcomingDatesWithRes.length > 0 && filterDate === getLocalDateStr() && (
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-sm)' }}>
                                        Bruk datovelgeren eller knappene ovenfor for å se kommende reservasjoner.
                                    </p>
                                )}
                            </div>
                        ) : (
                            reservations.sort((a, b) => a.time_slot.localeCompare(b.time_slot)).map(r => {
                                const isSelected = selectedReservation?.id === r.id;
                                const assignedTables = assignments.filter(a => a.reservation_id === r.id);
                                const totalCapacity = assignedTables.reduce((sum, a) => {
                                    const t = tables.find(tbl => tbl.id === a.table_id);
                                    return sum + (t?.capacity || 0);
                                }, 0);
                                
                                const statusClass = totalCapacity >= r.guests_count ? 'status-ok' : (totalCapacity > 0 ? 'status-partial' : 'status-none');
                                
                                return (
                                    <div 
                                        key={r.id} 
                                        className={`reservation-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => setSelectedReservation(isSelected ? null : r)}
                                    >
                                        <div className="res-card-header">
                                            <strong>{r.time_slot}</strong>
                                            <span className={`capacity-badge ${statusClass}`}>
                                                {totalCapacity} / {r.guests_count} seter
                                            </span>
                                        </div>
                                        <div className="res-card-name">{r.guest_name}</div>
                                        <div className="res-card-guests">{r.guests_count} gjester</div>
                                        {assignedTables.length > 0 && (
                                            <div className="res-card-tables">
                                                Bord: {assignedTables.map(a => tables.find(t => t.id === a.table_id)?.name).filter(Boolean).join(', ')}
                                            </div>
                                        )}
                                        {r.status === 'needs_seat' && totalCapacity >= r.guests_count && (
                                            <div style={{ marginTop: 'var(--space-md)' }}>
                                                <button 
                                                    className="btn btn-primary btn-sm"
                                                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmReservation(r.id);
                                                    }}
                                                >
                                                    <IconCheck size={16} /> Bekreft & Send SMS
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Main floor plan */}
                <div className="floor-plan-container">
                    <div className="floor-plan-legend">
                        <div className="legend-item"><span className="legend-box free"></span> Ledig</div>
                        <div className="legend-item"><span className="legend-box occupied"></span> Opptatt på valgt tid</div>
                        <div className="legend-item"><span className="legend-box has-reservations"></span> Har reservasjoner</div>
                        <div className="legend-item"><span className="legend-box selected-legend"></span> Valgt for gjest</div>
                    </div>

                    <div className="floor-plan">
                        {/* SVG walls and structural elements */}
                        <svg className="floor-plan-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Left wall */}
                            <line x1="6" y1="2" x2="6" y2="94" stroke="#c0c9d6" strokeWidth="0.6"/>
                            {/* Bottom wall */}
                            <line x1="6" y1="94" x2="40" y2="94" stroke="#c0c9d6" strokeWidth="0.6"/>
                            {/* Top wall - main area and right room */}
                            <line x1="6" y1="2" x2="97" y2="2" stroke="#c0c9d6" strokeWidth="0.6"/>
                            
                            {/* Bottom wall of right room */}
                            <line x1="60" y1="30" x2="97" y2="30" stroke="#c0c9d6" strokeWidth="0.6"/>
                            
                            {/* Inner divider (corridor) */}
                            <path d="M 52 94 L 52 40 Q 52 30 60 30" stroke="#c0c9d6" strokeWidth="0.6" fill="none"/>
                            
                            {/* Vertical wall left for tables 30-32 */}
                            <line x1="80" y1="2" x2="80" y2="10" stroke="#c0c9d6" strokeWidth="0.6"/>
                            <line x1="80" y1="30" x2="80" y2="15" stroke="#c0c9d6" strokeWidth="0.6"/>
                            
                            {/* Partitions against middle wall */}
                            <rect x="50.5" y="37" width="1.1" height="5" fill="#aebac9" stroke="#8b9bac" strokeWidth="0.3" rx="0.3" />
                            <rect x="49.5" y="67" width="2.5" height="13" fill="#aebac9" stroke="#8b9bac" strokeWidth="0.3" rx="0.3" />
                            <rect x="50.5" y="83" width="1.1" height="8" fill="#aebac9" stroke="#8b9bac" strokeWidth="0.3" rx="0.3" />
                        </svg>

                        {/* Pillars (S circles) */}
                        {pillarPositions.map((p, i) => (
                            <div
                                key={`pillar-${i}`}
                                className="map-pillar"
                                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                            >
                                S
                            </div>
                        ))}

                        {/* Kasse (register) */}
                        <div className="map-kasse" style={{ left: '8.4%', top: '89.5%' }}>Kasse</div>

                        {/* Table nodes */}
                        {tables.map(table => {
                            const status = getTableStatus(table.id);
                            const pos = tablePositions[table.id];
                            if (!pos) return null;
                            
                            const transformStyle = pos.rotate ? `rotate(${pos.rotate}deg)` : 'none';
                            
                            return (
                                <button
                                    key={table.id}
                                    className={`table-node node-${status}`}
                                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: transformStyle }}
                                    onClick={() => toggleAssignment(table.id)}
                                    title={`Bord ${table.name} (${table.capacity} plasser)`}
                                >
                                    <span className="table-name" style={{ transform: pos.rotate ? `rotate(-${pos.rotate}deg)` : 'none' }}>
                                        {table.name}
                                    </span>
                                    {assignments.filter(a => a.table_id === table.id).length > 0 && (
                                        <div className="table-tooltip">
                                            {assignments.filter(a => a.table_id === table.id).map(a => (
                                                <div key={a.id}>{a.time_slot}: {a.guest_name} ({a.guests_count}p)</div>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal for editing table capacity */}
            {editingTable && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Rediger Bord {editingTable.name}</h3>
                        <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                            <label className="form-label">Antall plasser</label>
                            <input 
                                type="number" 
                                className="form-input" 
                                value={editCapacity} 
                                onChange={e => setEditCapacity(parseInt(e.target.value) || 1)}
                                min={1}
                                max={20}
                            />
                        </div>
                        <div className="form-group" style={{ marginTop: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <input 
                                type="checkbox" 
                                id="is_active_check"
                                checked={editIsActive} 
                                onChange={e => setEditIsActive(e.target.checked)}
                            />
                            <label htmlFor="is_active_check" className="form-label" style={{ marginBottom: 0 }}>Bordet er aktivt (kan tildeles gjester)</label>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setEditingTable(null)}>Avbryt</button>
                            <button className="btn btn-primary" onClick={updateTableCapacity}>Lagre</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
                {toast}
            </div>
            
            <style jsx>{`
                .quick-dates {
                    display: flex;
                    gap: var(--space-sm);
                    align-items: center;
                    flex-wrap: wrap;
                    margin-bottom: var(--space-lg);
                    padding: var(--space-md);
                    background: var(--color-bg-card);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--color-border-light);
                }
                
                .quick-dates-label {
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                    font-weight: var(--font-weight-medium);
                }
                
                .quick-date-btn {
                    padding: var(--space-xs) var(--space-md);
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--color-border);
                    background: var(--color-bg);
                    font-size: var(--font-size-sm);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }
                
                .quick-date-btn:hover {
                    border-color: var(--color-primary-200);
                    background: var(--color-primary-50);
                }
                
                .quick-date-btn.active {
                    border-color: var(--color-primary);
                    background: var(--color-primary);
                    color: white;
                }

                .table-management-layout {
                    display: grid;
                    grid-template-columns: 320px 1fr;
                    gap: var(--space-xl);
                    align-items: start;
                }
                
                @media (max-width: 900px) {
                    .table-management-layout {
                        grid-template-columns: 1fr;
                    }
                }
                
                .reservations-sidebar {
                    background: var(--color-bg-card);
                    border-radius: var(--radius-lg);
                    padding: var(--space-lg);
                    border: 1px solid var(--color-border-light);
                    height: calc(100vh - 240px);
                    display: flex;
                    flex-direction: column;
                }
                
                .reservations-list {
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-sm);
                    flex: 1;
                    padding-right: var(--space-xs);
                }
                
                .reservation-card {
                    padding: var(--space-md);
                    border: 2px solid var(--color-border-light);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }
                
                .reservation-card:hover {
                    border-color: var(--color-primary-100);
                    background: var(--color-primary-50);
                }
                
                .reservation-card.selected {
                    border-color: var(--color-primary);
                    background: var(--color-primary-50);
                    box-shadow: var(--shadow-sm);
                }
                
                .res-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-xs);
                }
                
                .res-card-name {
                    font-weight: var(--font-weight-medium);
                    font-size: var(--font-size-lg);
                }
                
                .res-card-guests {
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                }
                
                .res-card-tables {
                    margin-top: var(--space-xs);
                    font-size: var(--font-size-sm);
                    color: var(--color-primary);
                    font-weight: var(--font-weight-medium);
                }
                
                .capacity-badge {
                    font-size: var(--font-size-xs);
                    padding: 2px 6px;
                    border-radius: var(--radius-sm);
                    font-weight: var(--font-weight-bold);
                }
                
                .status-ok { background: var(--color-available); color: var(--color-available-text); }
                .status-partial { background: var(--color-warning); color: #fff; }
                .status-none { background: var(--color-bg-alt); color: var(--color-text-muted); }
                
                .floor-plan-container {
                    background: var(--color-bg-card);
                    border-radius: var(--radius-lg);
                    padding: var(--space-xl);
                    border: 1px solid var(--color-border-light);
                    min-height: 600px;
                }
                
                .floor-plan-legend {
                    display: flex;
                    gap: var(--space-lg);
                    margin-bottom: var(--space-xl);
                    flex-wrap: wrap;
                }
                
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-xs);
                    font-size: var(--font-size-sm);
                }
                
                .legend-box {
                    width: 16px;
                    height: 16px;
                    border-radius: 4px;
                    border: 2px solid;
                }
                
                .legend-box.free { background: var(--color-bg-card); border-color: var(--color-border); }
                .legend-box.occupied { background: var(--color-full); border-color: var(--color-error); }
                .legend-box.has-reservations { background: var(--color-primary-50); border-color: var(--color-primary-200); }
                .legend-box.selected-legend { background: var(--color-primary); border-color: var(--color-primary); }
                
                .floor-plan {
                    position: relative;
                    width: 100%;
                    max-width: 750px;
                    aspect-ratio: 3 / 4;
                    margin: 0 auto;
                    background: var(--color-bg-card);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--color-border-light);
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                
                .floor-plan-svg {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1;
                }
                
                .map-pillar {
                    position: absolute;
                    width: 35px;
                    height: 35px;
                    margin-left: -13px;
                    margin-top: -13px;
                    background: #f0f3f7;
                    border: 2px solid #c0c9d6;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    color: #888;
                    font-weight: 600;
                    z-index: 2;
                    pointer-events: none;
                }
                
                .map-kasse {
                    position: absolute;
                    padding: 4px 10px;
                    margin-left: -20px;
                    margin-top: -10px;
                    background: #e8ecf1;
                    border: 1.5px solid #b0bac7;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #666;
                    z-index: 2;
                    pointer-events: none;
                    transform: rotate(90deg);
                }
                
                .table-node {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    margin-left: -20px;
                    margin-top: -20px;
                    border-radius: var(--radius-md);
                    border: 2px solid var(--color-border);
                    background: var(--color-bg-card);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    z-index: 5;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                }
                
                .table-node:hover {
                    box-shadow: 0 0 0 3px var(--color-primary-light), 0 2px 8px rgba(0,0,0,0.1);
                    z-index: 10;
                    transform: scale(1.1);
                }
                
                .table-node[style*="rotate"]:hover {
                    z-index: 10;
                }
                
                .node-free { }
                .node-occupied { background: var(--color-full); border-color: var(--color-error); color: var(--color-full-text); }
                .node-has-reservations { background: var(--color-primary-50); border-color: var(--color-primary-200); }
                .node-selected { background: var(--color-primary); border-color: var(--color-primary); color: white; box-shadow: var(--shadow-md); }
                .node-inactive { background: #f0f3f7; border-color: #d1d9e6; color: #a0aebf; opacity: 0.6; cursor: not-allowed; }
                .node-inactive:hover { box-shadow: none; transform: none; z-index: 5; }
                
                .table-name {
                    font-size: 13px;
                    font-weight: var(--font-weight-bold);
                    line-height: 1;
                }
                
                .table-tooltip {
                    display: none;
                    position: absolute;
                    top: 110%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.85);
                    color: white;
                    padding: var(--space-sm) var(--space-md);
                    border-radius: var(--radius-sm);
                    white-space: nowrap;
                    font-size: var(--font-size-xs);
                    z-index: 100;
                    text-align: left;
                    box-shadow: var(--shadow-md);
                }
                
                .table-node:hover .table-tooltip {
                    display: block;
                }
                
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .modal-content {
                    background: var(--color-bg-card);
                    padding: var(--space-2xl);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-xl);
                    width: 100%;
                    max-width: 400px;
                }
            `}</style>
        </>
    );
}
