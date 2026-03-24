import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();
        const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
        const settings: Record<string, string> = {};
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        return NextResponse.json(settings, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (user.role !== 'admin' && user.role !== 'staff') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        
        // Define whitelist of permitted settings keys
        const allowedKeys = new Set([
            'hero_title_no', 'hero_title_en',
            'hero_subtitle_no', 'hero_subtitle_en',
            'about_text_no', 'about_text_en',
            'address', 'phone', 'email',
            'max_capacity', 'booking_cutoff_minutes',
            'sms_provider', 'sms_webhook_url',
            'sms_twilio_sid', 'sms_twilio_token', 'sms_twilio_from',
            'sms_template_received', 'sms_template_confirmed',
            'currency', 'price_main', 'price_dessert'
        ]);

        // Filter and validate entries
        const filteredEntries: [string, string][] = [];
        for (const [key, value] of Object.entries(body)) {
            if (!allowedKeys.has(key)) {
                return NextResponse.json({ error: `Forbidden configuration key: ${key}` }, { status: 400 });
            }
            // Coerce to string and basic length validation to prevent DB abuse
            const stringValue = String(value);
            if (stringValue.length > 2000) {
                return NextResponse.json({ error: `Value for ${key} is too long` }, { status: 400 });
            }
            filteredEntries.push([key, stringValue]);
        }

        const db = getDb();
        const update = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
        const updateMany = db.transaction((entries: [string, string][]) => {
            for (const [key, value] of entries) {
                update.run(key, value);
            }
        });
        
        updateMany(filteredEntries);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
