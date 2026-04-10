'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { IconCheck, IconX, IconHourglass, IconWrench, IconSave, IconCalendar } from '@/components/Icons';
import { useUser } from '../layout';

interface Table {
    id: number;
    name: string;
    capacity: number;
    is_active: boolean;
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

interface TablePosition {
    x: number;
    y: number;
    rotate?: number;
}

// Helper: get local date as YYYY-MM-DD without UTC conversion
function getLocalDateStr(date?: Date): string {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Default table positions matching the actual floor plan
const defaultTablePositions: Record<number, TablePosition> = {
    24: { x: 10, y: 10 }, 25: { x: 18, y: 10 }, 26: { x: 26, y: 10 },
    27: { x: 34, y: 10 }, 28: { x: 42, y: 10 },
    20: { x: 10, y: 16 }, 21: { x: 18, y: 16 }, 22: { x: 26, y: 16 },
    23: { x: 34, y: 16 },
    17: { x: 10, y: 23 }, 18: { x: 18, y: 23 }, 19: { x: 26, y: 23 },
    14: { x: 10, y: 34 }, 15: { x: 18, y: 34 }, 16: { x: 26, y: 34 },
    11: { x: 10, y: 42 }, 12: { x: 18, y: 42 }, 13: { x: 26, y: 42 },
    8: { x: 10, y: 53 }, 9: { x: 18, y: 53 }, 10: { x: 48, y: 53 },
    5: { x: 10, y: 61 }, 6: { x: 18, y: 61 }, 7: { x: 48, y: 58 },
    3: { x: 10, y: 72 }, 4: { x: 18, y: 72 },
    1: { x: 10, y: 79 }, 2: { x: 18, y: 79 },
    29: { x: 49, y: 25, rotate: 45 },
    32: { x: 70, y: 5 }, 31: { x: 70, y: 10 }, 30: { x: 70, y: 15 },
};

// Default pillar positions
const defaultPillarPositions = [
    { x: 9, y: 5 }, { x: 9, y: 28 }, { x: 9, y: 47 },
    { x: 9, y: 66 }, { x: 9, y: 84 },
];

// Load layout from localStorage
function loadLayout(dateKey?: string): Record<number, TablePosition> | null {
    try {
        // Try date-specific layout first
        if (dateKey) {
            const dayLayout = localStorage.getItem(`utsyn_layout_${dateKey}`);
            if (dayLayout) return JSON.parse(dayLayout);
        }
        // Fall back to permanent layout
        const permLayout = localStorage.getItem('utsyn_layout_permanent');
        if (permLayout) return JSON.parse(permLayout);
    } catch { /* ignore */ }
    return null;
}

function saveLayout(positions: Record<number, TablePosition>, mode: 'permanent' | 'day', dateKey?: string) {
    try {
        if (mode === 'permanent') {
            localStorage.setItem('utsyn_layout_permanent', JSON.stringify(positions));
        } else if (dateKey) {
            localStorage.setItem(`utsyn_layout_${dateKey}`, JSON.stringify(positions));
        }
    } catch { /* ignore */ }
}

export default function BordPage() {
    const user = useUser();
    const isAdmin = user?.role === 'admin';
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
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // Floor plan editor state
    const [editMode, setEditMode] = useState(false);
    const [tablePositions, setTablePositions] = useState<Record<number, TablePosition>>({ ...defaultTablePositions });
    const [dragging, setDragging] = useState<{ id: number; offsetX: number; offsetY: number } | null>(null);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const floorPlanRef = useRef<HTMLDivElement>(null);

    // Load layout on mount and when date changes
    useEffect(() => {
        const saved = loadLayout(filterDate);
        if (saved) {
            setTablePositions(saved);
        } else {
            setTablePositions({ ...defaultTablePositions });
        }
    }, [filterDate]);

    // Fetch all reservations to find dates that have reservations
    const fetchAllReservations = useCallback(async () => {
        try {
            const res = await fetch('/api/reservations');
            const data = await res.json();
            if (Array.isArray(data)) {
                setAllReservations(data.filter((r: Reservation) => r.status !== 'cancelled'));
                const dates = [...new Set(data
                    .filter((r: Reservation) => r.status !== 'cancelled')
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

            const tablesData = await tablesRes.json();
            if (Array.isArray(tablesData)) {
                setTables(tablesData);
            }

            const fetchedRes = await resRes.json();
            if (Array.isArray(fetchedRes)) {
                // Include needs_seat, confirmed, and completed reservations
                setReservations(fetchedRes.filter((r: Reservation) =>
                    r.status === 'confirmed' || r.status === 'completed' || r.status === 'needs_seat'
                ));
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

    // Clear selected reservation when date changes to avoid stale data
    useEffect(() => {
        setSelectedReservation(null);
    }, [filterDate]);

    // Auto-navigate to next date with reservations ONLY on initial load
    useEffect(() => {
        if (!loading && !initialLoadDone && reservations.length === 0 && datesWithReservations.length > 0) {
            const today = getLocalDateStr();
            const nextDate = datesWithReservations.find(d => d >= today);
            if (nextDate && nextDate !== filterDate) {
                setFilterDate(nextDate);
            }
            setInitialLoadDone(true);
        } else if (!loading && !initialLoadDone) {
            setInitialLoadDone(true);
        }
    }, [loading, initialLoadDone, reservations.length, datesWithReservations, filterDate]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const toggleAssignment = async (tableId: number) => {
        if (editMode) return; // Don't assign in edit mode

        const table = tables.find(t => t.id === tableId);

        if (!selectedReservation) {
            setEditingTable(table || null);
            setEditCapacity(table?.capacity || 4);
            setEditIsActive(!!table?.is_active);
            return;
        }

        if (table && !table.is_active) {
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
                    const data = await res.json();
                    showToast(data.error || 'Kunne ikke tildele bord');
                    return;
                }
            }
            fetchData();
            fetchAllReservations();
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
                body: JSON.stringify({ id: editingTable.id, capacity: editCapacity, is_active: editIsActive })
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
                fetchAllReservations();
            } else {
                showToast('Kunne ikke bekrefte reservasjonen.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // --- Floor Plan Editor Handlers ---
    const handleMouseDown = (e: React.MouseEvent, tableId: number) => {
        if (!editMode) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = floorPlanRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pos = tablePositions[tableId];
        if (!pos) return;
        const currentX = (pos.x / 100) * rect.width;
        const currentY = (pos.y / 100) * rect.height;
        setDragging({ id: tableId, offsetX: e.clientX - rect.left - currentX, offsetY: e.clientY - rect.top - currentY });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragging || !floorPlanRef.current) return;
        const rect = floorPlanRef.current.getBoundingClientRect();
        const newX = ((e.clientX - rect.left - dragging.offsetX) / rect.width) * 100;
        const newY = ((e.clientY - rect.top - dragging.offsetY) / rect.height) * 100;
        const clampedX = Math.max(2, Math.min(98, newX));
        const clampedY = Math.max(2, Math.min(98, newY));
        setTablePositions(prev => ({
            ...prev,
            [dragging.id]: { ...prev[dragging.id], x: Math.round(clampedX * 10) / 10, y: Math.round(clampedY * 10) / 10 }
        }));
    }, [dragging]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    useEffect(() => {
        if (editMode) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [editMode, handleMouseMove, handleMouseUp]);

    const handleSaveLayout = (mode: 'permanent' | 'day') => {
        saveLayout(tablePositions, mode, mode === 'day' ? filterDate : undefined);
        setSaveDialogOpen(false);
        setEditMode(false);
        showToast(mode === 'permanent' ? 'Planløsning lagret permanent!' : `Planløsning lagret for ${formatDatePretty(filterDate)}`);
    };

    const handleResetLayout = () => {
        setTablePositions({ ...defaultTablePositions });
        // Remove any saved layouts
        try {
            localStorage.removeItem('utsyn_layout_permanent');
            localStorage.removeItem(`utsyn_layout_${filterDate}`);
        } catch { /* ignore */ }
        showToast('Planløsning tilbakestilt til standard');
    };

    const handleRotateTable = (tableId: number) => {
        setTablePositions(prev => ({
            ...prev,
            [tableId]: { ...prev[tableId], rotate: ((prev[tableId]?.rotate || 0) + 45) % 360 }
        }));
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const getTableStatus = (tableId: number) => {
        const table = tables.find(t => t.id === tableId);
        if (table && !table.is_active) return 'inactive';

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
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', lineHeight: '1.5' }}>
                        <strong>Slik tildeler du bord:</strong>
                        <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                            <li>Klikk på en reservasjon i listen under</li>
                            <li>Klikk på et bord på kartet for å tildele</li>
                            <li>Klikk «Bekreft &amp; Send SMS» når ferdig</li>
                        </ol>
                        <div style={{ marginTop: '6px', fontStyle: 'italic' }}>Klikk et bord uten valgt reservasjon for å endre bordets innstillinger.</div>
                    </div>

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
                                const canConfirm = totalCapacity >= r.guests_count && assignedTables.length > 0 && r.status === 'needs_seat';

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
                                        <div className="res-card-status">
                                            <span className={`status-badge-mini status-${r.status}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                {r.status === 'needs_seat' ? <><IconHourglass size={14} /> Venter på bord</> : r.status === 'confirmed' ? <><IconCheck size={14} /> Bekreftet</> : <><IconCheck size={14} /> Fullført</>}
                                            </span>
                                        </div>
                                        {assignedTables.length > 0 && (
                                            <div className="res-card-tables">
                                                Bord: {assignedTables.map(a => tables.find(t => t.id === a.table_id)?.name).filter(Boolean).join(', ')}
                                            </div>
                                        )}
                                        {canConfirm && (
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
                    {/* Editor toolbar */}
                    <div className="floor-plan-toolbar">
                        <div className="floor-plan-legend">
                            <div className="legend-item"><span className="legend-box free"></span> Ledig</div>
                            <div className="legend-item"><span className="legend-box occupied"></span> Opptatt (samme tidspunkt)</div>
                            <div className="legend-item"><span className="legend-box has-reservations"></span> Har andre reservasjoner</div>
                            <div className="legend-item"><span className="legend-box selected-legend"></span> Tildelt valgt gjest</div>
                        </div>
                        <div className="floor-plan-actions">
                            {editMode && (
                                <>
                                    <button
                                        className="btn btn-ghost btn-sm editor-btn"
                                        onClick={handleResetLayout}
                                        title="Tilbakestill planløsning"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="1 4 1 10 7 10"></polyline>
                                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                        </svg>
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm editor-btn"
                                        onClick={() => setSaveDialogOpen(true)}
                                        title="Lagre planløsning"
                                    >
                                        <IconCheck size={18} />
                                    </button>
                                </>
                            )}
                            {!editMode && isAdmin && (
                                <button
                                    className="btn btn-ghost btn-sm editor-btn"
                                    onClick={() => setEditMode(true)}
                                    title="Rediger planløsning"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {editMode && (
                        <div className="editor-hint" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IconWrench size={18} /> Redigeringsmodus: Dra bordene for å flytte dem. Høyreklikk for å rotere.
                        </div>
                    )}

                    <div className="floor-plan" ref={floorPlanRef}>
                        {/* SVG walls and structural elements */}
                        <svg className="floor-plan-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <line x1="6" y1="2" x2="6" y2="94" stroke="var(--color-border-light)" strokeWidth="0.6" />
                            <line x1="6" y1="94" x2="40" y2="94" stroke="var(--color-border-light)" strokeWidth="0.6" />
                            <line x1="6" y1="2" x2="97" y2="2" stroke="var(--color-border-light)" strokeWidth="0.6" />
                            <line x1="60" y1="30" x2="97" y2="30" stroke="var(--color-border-light)" strokeWidth="0.6" />
                            <path d="M 52 94 L 52 40 Q 52 30 60 30" stroke="var(--color-border-light)" strokeWidth="0.6" fill="none" />
                            <line x1="80" y1="2" x2="80" y2="10" stroke="var(--color-border-light)" strokeWidth="0.6" />
                            <line x1="80" y1="30" x2="80" y2="15" stroke="var(--color-border-light)" strokeWidth="0.6" />
                            <rect x="50.5" y="37" width="1.1" height="5" fill="var(--color-primary-light)" stroke="var(--color-primary)" strokeWidth="0.3" rx="0.3" />
                            <rect x="49.5" y="67" width="2.5" height="13" fill="var(--color-primary-light)" stroke="var(--color-primary)" strokeWidth="0.3" rx="0.3" />
                            <rect x="50.5" y="83" width="1.1" height="8" fill="var(--color-primary-light)" stroke="var(--color-primary)" strokeWidth="0.3" rx="0.3" />
                        </svg>

                        {/* Pillars */}
                        {defaultPillarPositions.map((p, i) => (
                            <div
                                key={`pillar-${i}`}
                                className="map-pillar"
                                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                            >
                                S
                            </div>
                        ))}

                        {/* Kasse */}
                        <div className="map-kasse" style={{ left: '8.4%', top: '89.5%' }}>Kasse</div>

                        {/* Table nodes */}
                        {tables.map(table => {
                            const status = getTableStatus(table.id);
                            const pos = tablePositions[table.id];
                            if (!pos) return null;

                            const rotateVal = pos.rotate || 0;
                            const transformStyle = rotateVal ? `rotate(${rotateVal}deg)` : 'none';

                            return (
                                <button
                                    key={table.id}
                                    className={`table-node node-${status} ${editMode ? 'edit-mode' : ''} ${dragging?.id === table.id ? 'dragging' : ''}`}
                                    style={{
                                        left: `${pos.x}%`,
                                        top: `${pos.y}%`,
                                        transform: transformStyle,
                                        cursor: editMode ? 'grab' : 'pointer'
                                    }}
                                    onClick={() => !editMode && toggleAssignment(table.id)}
                                    onMouseDown={(e) => editMode && handleMouseDown(e, table.id)}
                                    onContextMenu={(e) => {
                                        if (editMode) {
                                            e.preventDefault();
                                            handleRotateTable(table.id);
                                        }
                                    }}
                                    title={editMode ? `Bord ${table.name} — Dra for å flytte, høyreklikk for å rotere` : `Bord ${table.name} (${table.capacity} plasser)`}
                                >
                                    <span className="table-name" style={{ transform: rotateVal ? `rotate(-${rotateVal}deg)` : 'none' }}>
                                        {table.name}
                                    </span>
                                    {!editMode && assignments.filter(a => a.table_id === table.id).length > 0 && (
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

            {/* Save layout dialog */}
            {saveDialogOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Lagre planløsning</h3>
                        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                            Vil du lagre denne planløsningen kun for {formatDatePretty(filterDate)}, eller som standard for alle dager?
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => handleSaveLayout('permanent')}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '12px var(--space-md)' }}
                            >
                                <IconSave size={24} />
                                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: '1.2' }}>
                                    <span>Lagre permanent</span>
                                    <span style={{ fontSize: '0.85em', opacity: 0.9, fontWeight: 'normal' }}>(alle dager)</span>
                                </div>
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleSaveLayout('day')}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '12px var(--space-md)' }}
                            >
                                <IconCalendar size={24} />
                                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: '1.2' }}>
                                    <span>Lagre for i dag</span>
                                    <span style={{ fontSize: '0.85em', opacity: 0.9, fontWeight: 'normal' }}>{formatDatePretty(filterDate)}</span>
                                </div>
                            </button>
                        </div>
                        <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
                            <button
                                className="btn btn-ghost"
                                style={{ width: '100%' }}
                                onClick={() => setSaveDialogOpen(false)}
                            >
                                Avbryt
                            </button>
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
                
                .res-card-status {
                    margin-top: var(--space-xs);
                }

                .status-badge-mini {
                    font-size: 11px;
                    padding: 2px 6px;
                    border-radius: var(--radius-sm);
                    font-weight: 600;
                }

                .status-badge-mini.status-needs_seat {
                    background: var(--color-warning);
                    color: var(--color-text-inverse);
                }

                .status-badge-mini.status-confirmed {
                    background: var(--color-available);
                    color: var(--color-available-text);
                }

                .status-badge-mini.status-completed {
                    background: var(--color-info);
                    color: var(--color-text-inverse);
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
                .status-partial { background: var(--color-warning); color: var(--color-text-inverse); }
                .status-none { background: var(--color-bg-alt); color: var(--color-text-muted); }
                
                .floor-plan-container {
                    background: var(--color-bg-card);
                    border-radius: var(--radius-lg);
                    padding: var(--space-xl);
                    border: 1px solid var(--color-border-light);
                    min-height: 600px;
                }

                .floor-plan-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: var(--space-lg);
                    gap: var(--space-md);
                    flex-wrap: wrap;
                }

                .floor-plan-actions {
                    display: flex;
                    gap: var(--space-sm);
                    align-items: center;
                    flex-shrink: 0;
                }

                .editor-btn {
                    width: 38px;
                    height: 38px;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-md);
                }

                .editor-hint {
                    background: var(--color-primary-50);
                    color: var(--color-primary);
                    padding: var(--space-sm) var(--space-md);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                    margin-bottom: var(--space-md);
                    border: 1px solid var(--color-primary-200);
                }
                
                .floor-plan-legend {
                    display: flex;
                    gap: var(--space-lg);
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
                    background: var(--color-bg-elevated);
                    border: 2px solid var(--color-border-light);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    color: var(--color-text-muted);
                    font-weight: 600;
                    z-index: 2;
                    pointer-events: none;
                }
                
                .map-kasse {
                    position: absolute;
                    padding: 4px 10px;
                    margin-left: -20px;
                    margin-top: -10px;
                    background: var(--color-bg-elevated);
                    border: 1.5px solid var(--color-border);
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--color-text-secondary);
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
                    color: var(--color-text);
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

                .table-node.edit-mode {
                    cursor: grab;
                    border-style: dashed;
                }

                .table-node.edit-mode:hover {
                    box-shadow: 0 0 0 3px #fbbf24, 0 2px 8px rgba(0,0,0,0.15);
                }

                .table-node.dragging {
                    cursor: grabbing;
                    opacity: 0.8;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                    z-index: 100;
                }
                
                .node-free { }
                .node-occupied { background: var(--color-full); border-color: var(--color-error); color: var(--color-full-text); }
                .node-has-reservations { background: var(--color-primary-50); border-color: var(--color-primary-200); }
                .node-selected { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-text-inverse); box-shadow: var(--shadow-md); }
                .node-inactive { background: var(--color-bg-alt); border-color: var(--color-border-light); color: var(--color-text-muted); opacity: 0.6; cursor: not-allowed; }
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
                    max-width: 520px;
                }
            `}</style>
        </>
    );
}
