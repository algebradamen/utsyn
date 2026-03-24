import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        const validStatuses = ['confirmed', 'cancelled', 'completed', 'no_show', 'needs_seat'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const db = getDb();
        const result = db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reservation PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const db = getDb();
        
        // Remove assignments first
        db.prepare('DELETE FROM table_assignments WHERE reservation_id = ?').run(id);
        
        // Remove reservation entirely
        const result = db.prepare('DELETE FROM reservations WHERE id = ?').run(id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reservation DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
