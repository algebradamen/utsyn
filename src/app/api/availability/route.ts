import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { generateTimeSlots } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }

        const sql = await getDb();

        // Check for special closure
        const closures = await sql`SELECT * FROM special_closures WHERE date = ${date}`;
        let closure = closures[0];
        
        let customTimeSlotsOverride: string | null = null;
        let isSpecialClosed = false;

        if (closure) {
            const isClosedBool = closure.is_closed === true || closure.is_closed === 1;
            if (isClosedBool) {
                return NextResponse.json({ closed: true, reason: 'Special closure', slots: [] });
            } else {
                // If special day but not closed, use its time_slots
                customTimeSlotsOverride = closure.time_slots || '';
            }
        }

        // Get day of week (JS: 0=Sun, 1=Mon, ..., 6=Sat)
        const dayOfWeek = new Date(date + 'T00:00:00').getDay();

        // Get open day info
        const openDays = await sql`SELECT * FROM open_days WHERE day_of_week = ${dayOfWeek}`;
        const openDay = openDays[0] as {
            open_time: string;
            close_time: string;
            time_slots?: string;
            is_active: boolean | number;
        } | undefined;

        const isActive = openDay?.is_active === true || openDay?.is_active === 1;

        if (!closure && (!openDay || !isActive)) {
            // Only block if there's no custom special override for this day
            return NextResponse.json({ closed: true, reason: 'Not open this day', slots: [] });
        }

        // Get settings for cutoff and interval
        const settingsRows = await sql`SELECT key, value FROM settings WHERE key IN ('booking_cutoff_minutes', 'time_slot_interval', 'max_capacity')`;

        const settings: Record<string, string> = {};
        for (const row of settingsRows) {
            settings[row.key] = row.value;
        }

        const cutoff = parseInt(settings.booking_cutoff_minutes || '45');
        const interval = parseInt(settings.time_slot_interval || '15');
        const maxCapacity = parseInt(settings.max_capacity || '60');

        // Generate time slots
        let slots: string[] = [];
        const hasCustomOverride = customTimeSlotsOverride && customTimeSlotsOverride.trim().length > 0;
        
        if (hasCustomOverride) {
            slots = customTimeSlotsOverride!.split(',').map(s => s.trim()).filter(s => s.length > 0);
        } else if (openDay?.time_slots && openDay.time_slots.trim().length > 0) {
            slots = openDay.time_slots.split(',').map(s => s.trim()).filter(s => s.length > 0);
        } else if (openDay && openDay.open_time && openDay.close_time) {
            slots = generateTimeSlots(openDay.open_time, openDay.close_time, interval, cutoff);
        } else {
            // No custom override and no valid openDay generating slots means closed
            return NextResponse.json({ closed: true, reason: 'Invalid day configuration', slots: [] });
        }

        // Get existing reservations for this date
        const reservations = await sql`SELECT time_slot, SUM(guests_count) as total_guests FROM reservations WHERE date = ${date} AND status != 'cancelled' GROUP BY time_slot`;

        const reservationMap: Record<string, number> = {};
        for (const r of reservations) {
            reservationMap[r.time_slot] = Number(r.total_guests);
        }

        // Build availability
        const availability = slots.map(slot => ({
            time: slot,
            booked: reservationMap[slot] || 0,
            available: maxCapacity - (reservationMap[slot] || 0),
            full: (reservationMap[slot] || 0) >= maxCapacity,
        }));

        return NextResponse.json({
            closed: false,
            openTime: openDay?.open_time || '00:00',
            closeTime: openDay?.close_time || '23:59',
            maxCapacity,
            slots: availability,
        });
    } catch (error) {
        console.error('Availability error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
