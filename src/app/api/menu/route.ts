import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();
        const categories = db.prepare('SELECT * FROM menu_categories ORDER BY sort_order').all() as any[];
        const items = db.prepare('SELECT * FROM menu_items').all() as any[];

        const itemsByCategory = new Map<number, any[]>();
        for (const item of items) {
            const list = itemsByCategory.get(item.category_id) || [];
            list.push(item);
            itemsByCategory.set(item.category_id, list);
        }

        const menuWithItems = categories.map(cat => ({
            ...cat,
            items: itemsByCategory.get(cat.id) || []
        }));

        return NextResponse.json(menuWithItems, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch (error) {
        console.error('Menu GET error:', error);
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
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { category_id, name_no, name_en, desc_no, desc_en, price, is_active } = body;

        if (!category_id || !name_no || !name_en || price === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDb();
        const info = db.prepare('INSERT INTO menu_items (category_id, name_no, name_en, desc_no, desc_en, price, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            category_id, name_no, name_en, desc_no, desc_en, price, is_active ? 1 : 0
        );

        return NextResponse.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        console.error('Menu POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
