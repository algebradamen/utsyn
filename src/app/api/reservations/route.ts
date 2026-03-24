import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { generateConfirmationCode, sanitizeInput, validatePhone, validateEmail } from '@/lib/utils';

// Rate limiting map (simple in-memory)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // max requests per window
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return true;
    }
    if (entry.count >= RATE_LIMIT) {
        return false;
    }
    entry.count++;
    return true;
}

export async function GET(request: NextRequest) {
    try {
        const { getAuthUser } = await import('@/lib/auth');
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const status = searchParams.get('status');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const db = getDb();
        let query = 'SELECT * FROM reservations WHERE 1=1';
        const params: (string | number)[] = [];

        if (date) {
            query += ' AND date = ?';
            params.push(date);
        }
        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }
        if (from) {
            query += ' AND date >= ?';
            params.push(from);
        }
        if (to) {
            query += ' AND date <= ?';
            params.push(to);
        }

        query += ' ORDER BY date DESC, time_slot ASC';

        const reservations = db.prepare(query).all(...params);
        return NextResponse.json(reservations);
    } catch (error) {
        console.error('Reservations GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        if (!checkRateLimit(ip)) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const body = await request.json();
        const { guest_name, phone, email, guests_count, date, time_slot, comment } = body;

        // Validation
        if (!guest_name || guest_name.trim().length < 2) {
            return NextResponse.json({ error: 'Name is required (min 2 characters)' }, { status: 400 });
        }
        if (!phone || !validatePhone(phone)) {
            return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
        }
        if (email && !validateEmail(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }
        if (!guests_count || guests_count < 1 || guests_count > 60) {
            return NextResponse.json({ error: 'Guests count must be between 1 and 60' }, { status: 400 });
        }
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }
        if (!time_slot || !/^\d{2}:\d{2}$/.test(time_slot)) {
            return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 });
        }

        const db = getDb();

        // Check if date is open
        const dayOfWeek = new Date(date + 'T00:00:00').getDay();
        const openDay = db.prepare('SELECT * FROM open_days WHERE day_of_week = ? AND is_active = 1').get(dayOfWeek);
        if (!openDay) {
            return NextResponse.json({ error: 'Restaurant is closed this day' }, { status: 400 });
        }

        // Check for special closure
        const closure = db.prepare('SELECT * FROM special_closures WHERE date = ?').get(date);
        if (closure) {
            return NextResponse.json({ error: 'Restaurant is closed this day (special closure)' }, { status: 400 });
        }

        // Check capacity
        const maxCapacityRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('max_capacity') as { value: string } | undefined;
        const maxCapacity = parseInt(maxCapacityRow?.value || '60');

        const existingTotal = db.prepare(
            'SELECT COALESCE(SUM(guests_count), 0) as total FROM reservations WHERE date = ? AND time_slot = ? AND status != ?'
        ).get(date, time_slot, 'cancelled') as { total: number };

        if (existingTotal.total + guests_count > maxCapacity) {
            return NextResponse.json({ error: 'Not enough capacity for this time slot' }, { status: 400 });
        }

        // Generate unique confirmation code
        let confirmationCode: string;
        let attempts = 0;
        do {
            confirmationCode = generateConfirmationCode();
            const existing = db.prepare('SELECT id FROM reservations WHERE confirmation_code = ?').get(confirmationCode);
            if (!existing) break;
            attempts++;
        } while (attempts < 10);

        // Insert reservation with 'needs_seat' status - admin must assign tables and confirm
        const result = db.prepare(`
      INSERT INTO reservations (guest_name, phone, email, guests_count, date, time_slot, comment, status, confirmation_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'needs_seat', ?)
    `).run(
            sanitizeInput(guest_name),
            sanitizeInput(phone),
            sanitizeInput(email || ''),
            guests_count,
            date,
            time_slot,
            sanitizeInput(comment || ''),
            confirmationCode
        );

        // SMS notification for received booking (if configured)
        try {
            const templateRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('sms_template_received') as { value: string } | undefined;
            if (templateRow?.value) {
                let message = templateRow.value;
                message = message.replace(/{kode}/g, confirmationCode || '');
                message = message.replace(/{dato}/g, date);
                message = message.replace(/{tid}/g, time_slot);
                message = message.replace(/{antall}/g, guests_count.toString());
                
                const { sendSms } = await import('@/lib/sms');
                await sendSms(phone, message);
            }
        } catch (err) {
            console.error('Failed to send received SMS', err);
        }

        return NextResponse.json({
            success: true,
            id: result.lastInsertRowid,
            confirmation_code: confirmationCode,
        }, { status: 201 });
    } catch (error) {
        console.error('Reservations POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
