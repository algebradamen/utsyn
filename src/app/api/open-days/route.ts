import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();
        const days = db.prepare('SELECT * FROM open_days ORDER BY day_of_week').all();
        return NextResponse.json(days, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch (error) {
        console.error('Open days GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const db = getDb();

        const update = db.prepare(
            'UPDATE open_days SET open_time = ?, close_time = ?, is_active = ? WHERE day_of_week = ?'
        );
        const updateMany = db.transaction((days: { day_of_week: number; open_time: string; close_time: string; is_active: number }[]) => {
            for (const day of days) {
                update.run(day.open_time, day.close_time, day.is_active, day.day_of_week);
            }
        });
        updateMany(body);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Open days PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
