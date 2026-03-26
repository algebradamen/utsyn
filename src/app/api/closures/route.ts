import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sql = await getDb();
        const rows = await sql`SELECT * FROM special_closures ORDER BY date ASC`;
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Closures GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date, reason_no, reason_en, is_closed = true, time_slots = '' } = body;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }

        const sql = await getDb();
        await sql`INSERT INTO special_closures (date, reason_no, reason_en, is_closed, time_slots) 
                  VALUES (${date}, ${reason_no || ''}, ${reason_en || ''}, ${is_closed}, ${time_slots}) 
                  ON CONFLICT (date) DO UPDATE SET 
                  reason_no = EXCLUDED.reason_no, 
                  reason_en = EXCLUDED.reason_en,
                  is_closed = EXCLUDED.is_closed,
                  time_slots = EXCLUDED.time_slots`;

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error('Closures POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
