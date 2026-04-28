import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/utsyn';

const sslConfig = process.env.NODE_ENV === 'production'
  ? {
    ca: process.env.DB_CA_CERT || process.env.NODE_EXTRA_CA_CERTS,
    rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === 'true'
  }
  : false;

const sql = postgres(DATABASE_URL, {
  ssl: sslConfig
});

/**
 * Initializes the database tables and default data if they don't exist.
 */
export async function initializeDatabase() {
  try {
    // 1. Create Tables (PostgreSQL Syntax)
    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    await sql`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    await sql`CREATE TABLE IF NOT EXISTS open_days (
      id SERIAL PRIMARY KEY,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      open_time TEXT NOT NULL,
      close_time TEXT NOT NULL,
      time_slots TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE(day_of_week)
    )`;

    try {
      await sql`ALTER TABLE open_days ADD COLUMN IF NOT EXISTS time_slots TEXT DEFAULT ''`;
    } catch (e) {
      console.warn('time_slots column already exists or err:', e);
    }

    await sql`CREATE TABLE IF NOT EXISTS special_closures (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      reason_no TEXT DEFAULT '',
      reason_en TEXT DEFAULT '',
      is_closed BOOLEAN NOT NULL DEFAULT TRUE,
      time_slots TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    try {
      await sql`ALTER TABLE special_closures ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT TRUE`;
      await sql`ALTER TABLE special_closures ADD COLUMN IF NOT EXISTS time_slots TEXT DEFAULT ''`;
    } catch (e) {
      console.warn('columns already exist or err:', e);
    }

    await sql`CREATE TABLE IF NOT EXISTS reservations (
      id SERIAL PRIMARY KEY,
      guest_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      guests_count INTEGER NOT NULL CHECK(guests_count BETWEEN 1 AND 60),
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      comment TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'needs_seat' CHECK(status IN ('confirmed', 'cancelled', 'completed', 'no_show', 'needs_seat')),
      confirmation_code TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    await sql`CREATE TABLE IF NOT EXISTS tables_config (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )`;

    await sql`CREATE TABLE IF NOT EXISTS table_assignments (
      id SERIAL PRIMARY KEY,
      reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      table_id INTEGER NOT NULL REFERENCES tables_config(id) ON DELETE CASCADE,
      UNIQUE(reservation_id, table_id)
    )`;

    await sql`CREATE TABLE IF NOT EXISTS menu_categories (
      id SERIAL PRIMARY KEY,
      name_no TEXT NOT NULL,
      name_en TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`;

    await sql`CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
      name_no TEXT NOT NULL,
      name_en TEXT NOT NULL,
      desc_no TEXT DEFAULT '',
      desc_en TEXT DEFAULT '',
      price INTEGER NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )`;

    await sql`CREATE TABLE IF NOT EXISTS menu_day_items (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      UNIQUE(date, menu_item_id)
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_menu_day_items_date ON menu_day_items(date)`;

    // 2. Create Indexes (Postgres syntax same as SQLite mostly)
    await sql`CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(confirmation_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_table_assignments_res ON table_assignments(reservation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_table_assignments_table ON table_assignments(table_id)`;

    // 3. Seed Default Settings
    const settingsCheck = await sql`SELECT COUNT(*) FROM settings`;
    if (Number(settingsCheck[0].count) === 0) {
      const defaultSettings = [
        { key: 'hero_title_no', value: 'Velkommen til Restaurant Utsyn' },
        { key: 'hero_title_en', value: 'Welcome to Restaurant Utsyn' },
        { key: 'hero_subtitle_no', value: 'Nyt utsikten og maten på Tangen VGS' },
        { key: 'hero_subtitle_en', value: 'Enjoy the view and food at Tangen VGS' },
        { key: 'about_text_no', value: 'Restaurant Utsyn er en opplæringsrestaurant ved Tangen videregående skole. Her serverer elevene mat av høy kvalitet i en hyggelig atmosfære med fantastisk utsikt.' },
        { key: 'about_text_en', value: 'Restaurant Utsyn is a training restaurant at Tangen Upper Secondary School. Here, the students serve high-quality food in a pleasant atmosphere with a fantastic view.' },
        { key: 'price_main', value: '135' },
        { key: 'price_dessert', value: '35' },
        { key: 'currency', value: 'kr' },
        { key: 'address', value: 'Tangen 21, 1. etg' },
        { key: 'phone', value: '' },
        { key: 'email', value: '' },
        { key: 'max_capacity', value: '60' },
        { key: 'booking_cutoff_minutes', value: '45' },
        { key: 'time_slot_interval', value: '15' },
        { key: 'sms_provider', value: 'webhook' },
        { key: 'sms_webhook_url', value: '' },
        { key: 'sms_twilio_sid', value: '' },
        { key: 'sms_twilio_token', value: '' },
        { key: 'sms_twilio_from', value: '' },
        { key: 'sms_template_received', value: 'Takk for din bestilling hos Restaurant Utsyn! Din kode er {kode}. Vi vil bekrefte og tildele bord snart. Dette gjelder {dato} kl {tid} for {antall} gjester.' },
        { key: 'sms_template_confirmed', value: 'Din reservasjon hos Restaurant Utsyn for {dato} kl {tid} er nå bekreftet og bord er tildelt. Velkommen!' },
        { key: 'sms_template_cancelled', value: 'Din reservasjon hos Restaurant Utsyn for {dato} kl {tid} er dessverre kansellert.' },
        { key: 'sms_template_noshow', value: 'Vi registrerte at du ikke møtte opp til din reservasjon hos Restaurant Utsyn {dato} kl {tid}.' },
      ];

      await sql`INSERT INTO settings ${sql(defaultSettings, 'key', 'value')} ON CONFLICT DO NOTHING`;
    }

    // Ensure new templates exist for older DBs
    await sql`INSERT INTO settings (key, value) VALUES 
      ('sms_template_cancelled', 'Din reservasjon hos Restaurant Utsyn for {dato} kl {tid} er dessverre kansellert.'),
      ('sms_template_noshow', 'Vi registrerte at du ikke møtte opp til din reservasjon hos Restaurant Utsyn for {dato} kl {tid}.')
    ON CONFLICT DO NOTHING`;

    // 4. Seed Open Days
    const daysCheck = await sql`SELECT COUNT(*) FROM open_days`;
    if (Number(daysCheck[0].count) === 0) {
      const defaultDays = [
        { day_of_week: 0, open_time: '00:00', close_time: '00:00', is_active: false },
        { day_of_week: 1, open_time: '00:00', close_time: '00:00', is_active: false },
        { day_of_week: 2, open_time: '00:00', close_time: '00:00', is_active: false },
        { day_of_week: 3, open_time: '00:00', close_time: '00:00', is_active: false },
        { day_of_week: 4, open_time: '12:00', close_time: '14:00', is_active: true },
        { day_of_week: 5, open_time: '11:00', close_time: '13:00', is_active: true },
        { day_of_week: 6, open_time: '00:00', close_time: '00:00', is_active: false }
      ];
      await sql`INSERT INTO open_days ${sql(defaultDays, 'day_of_week', 'open_time', 'close_time', 'is_active')} ON CONFLICT DO NOTHING`;
    }

    // 5. Seed Tables
    const tablesCheck = await sql`SELECT COUNT(*) FROM tables_config`;
    if (Number(tablesCheck[0].count) === 0) {
      const tableRows = [];
      for (let i = 1; i <= 32; i++) {
        tableRows.push({ name: i.toString(), capacity: 4, is_active: true });
      }
      await sql`INSERT INTO tables_config ${sql(tableRows, 'name', 'capacity', 'is_active')} ON CONFLICT DO NOTHING`;
    }

  } catch (error) {
    console.error('Failed to initialize PostgreSQL database:', error);
    throw error;
  }
}

let initPromise: Promise<void> | null = null;

/**
 * Returns the sql client, ensuring tables exist first.
 */
export async function getDb(): Promise<postgres.Sql<any>> {
  if (!initPromise) {
    initPromise = initializeDatabase();
  }
  await initPromise;
  return sql;
}

export default getDb;
