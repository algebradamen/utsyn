import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

        const db = getDb();
        const assignments = db.prepare(`
            SELECT ta.id, ta.reservation_id, ta.table_id, r.guest_name, r.time_slot, r.guests_count, r.status 
            FROM table_assignments ta
            JOIN reservations r ON ta.reservation_id = r.id
            WHERE r.date = ? AND r.status != 'cancelled'
        `).all(date);

        return NextResponse.json(assignments);
    } catch (error) {
        console.error('Table assignments GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { reservation_id, table_id } = body;

        if (!reservation_id || !table_id) {
            return NextResponse.json({ error: 'reservation_id and table_id are required' }, { status: 400 });
        }

        const db = getDb();

        // Get the reservation's time_slot and date
        const reservation = db.prepare('SELECT date, time_slot FROM reservations WHERE id = ?').get(reservation_id) as { date: string; time_slot: string } | undefined;
        if (!reservation) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        // Check if this table is already assigned to another reservation at the same date+time
        const conflict = db.prepare(`
            SELECT ta.id, r.guest_name, r.time_slot 
            FROM table_assignments ta
            JOIN reservations r ON ta.reservation_id = r.id
            WHERE ta.table_id = ? 
              AND r.date = ? 
              AND r.time_slot = ? 
              AND r.id != ?
              AND r.status != 'cancelled'
        `).get(table_id, reservation.date, reservation.time_slot, reservation_id) as any;

        if (conflict) {
            return NextResponse.json({ 
                error: `Bord er allerede tildelt ${conflict.guest_name} kl ${conflict.time_slot}` 
            }, { status: 409 });
        }

        try {
            db.prepare('INSERT INTO table_assignments (reservation_id, table_id) VALUES (?, ?)').run(reservation_id, table_id);
            checkAndUpdateReservationStatus(db, reservation_id);
            return NextResponse.json({ success: true });
        } catch (e: any) {
            if (e.message.includes('UNIQUE')) {
                return NextResponse.json({ error: 'Already assigned' }, { status: 400 });
            }
            throw e;
        }
    } catch (error) {
        console.error('Table assignments POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const reservation_id = searchParams.get('reservation_id');
        const table_id = searchParams.get('table_id');
        
        const db = getDb();
        
        if (reservation_id && table_id) {
            db.prepare('DELETE FROM table_assignments WHERE reservation_id = ? AND table_id = ?').run(reservation_id, table_id);
            checkAndUpdateReservationStatus(db, reservation_id);
        } else if (reservation_id) {
             db.prepare('DELETE FROM table_assignments WHERE reservation_id = ?').run(reservation_id);
             checkAndUpdateReservationStatus(db, reservation_id);
        } else {
             return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Table assignments DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function checkAndUpdateReservationStatus(db: any, reservation_id: number | string) {
    try {
        const res = db.prepare('SELECT guests_count, status, phone, date, time_slot, confirmation_code FROM reservations WHERE id = ?').get(reservation_id);
        if (!res || res.status === 'cancelled' || res.status === 'completed' || res.status === 'no_show') return;
        
        const assigned = db.prepare(`
            SELECT coalesce(SUM(t.capacity), 0) as total_capacity
            FROM table_assignments ta
            JOIN tables_config t ON ta.table_id = t.id
            WHERE ta.reservation_id = ?
        `).get(reservation_id);
        
        const capacity = assigned?.total_capacity || 0;
        
        // Only downgrade to needs_seat if a table was unassigned and capacity is no longer enough.
        // We DO NOT auto-upgrade to 'confirmed'. The user must click the confirm button.
        if (res.status === 'confirmed' && capacity < res.guests_count) {
             db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run('needs_seat', reservation_id);
        }
    } catch (err) {
        console.error('Failed to update reservation status:', err);
    }
}
