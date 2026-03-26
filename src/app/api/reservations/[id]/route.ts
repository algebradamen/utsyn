import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
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

        const sql = await getDb();
        const result = await sql`UPDATE reservations SET status = ${status} WHERE id = ${id} RETURNING *`;

        if (result.count === 0) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        const reservation = result[0];

        // Process SMS for cancelled or no_show
        if ((status === 'cancelled' || status === 'no_show') && reservation.phone) {
            try {
                const settingsQuery = await sql`SELECT key, value FROM settings WHERE key IN ('sms_template_cancelled', 'sms_template_noshow')`;
                const settings = Object.fromEntries(settingsQuery.map(row => [row.key, row.value]));
                
                const templateKey = status === 'cancelled' ? 'sms_template_cancelled' : 'sms_template_noshow';
                let templateText = settings[templateKey];

                if (templateText) {
                    const { sendSms } = await import('@/lib/sms');
                    
                    const msg = templateText
                        .replace('{kode}', reservation.confirmation_code || '')
                        .replace('{dato}', reservation.date || '')
                        .replace('{tid}', reservation.time_slot || '')
                        .replace('{antall}', String(reservation.guests_count || ''));

                    await sendSms(reservation.phone, msg);
                }
            } catch (smsError) {
                console.error('Error sending SMS on status update:', smsError);
            }
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
        const sql = await getDb();
        
        // Remove assignments and reservation in a transaction
        let affected = 0;
        await sql.begin(async (t: any) => {
            await t`DELETE FROM table_assignments WHERE reservation_id = ${id}`;
            const res = await t`DELETE FROM reservations WHERE id = ${id}`;
            affected = res.count;
        });

        if (affected === 0) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reservation DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
