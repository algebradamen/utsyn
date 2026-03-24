import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { sendSms } from '@/lib/sms';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const db = getDb();
        
        const res = db.prepare('SELECT phone, date, time_slot, guests_count, status, confirmation_code FROM reservations WHERE id = ?').get(id) as any;
        if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Update status to confirmed
        db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run('confirmed', id);
        
        // Send SMS
        const templateRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('sms_template_confirmed') as any;
        if (templateRow?.value) {
            let message = templateRow.value;
            message = message.replace(/{kode}/g, res.confirmation_code || '');
            message = message.replace(/{dato}/g, res.date);
            message = message.replace(/{tid}/g, res.time_slot);
            message = message.replace(/{antall}/g, res.guests_count);
            
            await sendSms(res.phone, message);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Confirm error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
