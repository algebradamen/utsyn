import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const sql = await getDb();
        const rows = await sql`SELECT key, value FROM settings`;
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
        if (user.role !== 'admin') {
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
            'sms_template_cancelled', 'sms_template_noshow',
            'currency', 'price_main', 'price_dessert',
            'site_name', 'time_slot_interval'
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

        const sql = await getDb();
        if (filteredEntries.length > 0) {
            await sql.begin(async (t: any) => {
                for (const [key, value] of filteredEntries) {
                    await t`INSERT INTO settings (key, value, updated_at) 
                           VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
                           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`;
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
