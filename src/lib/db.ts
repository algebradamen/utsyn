import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'utsyn.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS open_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      open_time TEXT NOT NULL,
      close_time TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      UNIQUE(day_of_week)
    );

    CREATE TABLE IF NOT EXISTS special_closures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      reason_no TEXT DEFAULT '',
      reason_en TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      guests_count INTEGER NOT NULL CHECK(guests_count BETWEEN 1 AND 60),
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      comment TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled', 'completed', 'no_show', 'needs_seat')),
      confirmation_code TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tables_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS table_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER NOT NULL,
      table_id INTEGER NOT NULL,
      FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
      FOREIGN KEY (table_id) REFERENCES tables_config(id) ON DELETE CASCADE,
      UNIQUE(reservation_id, table_id)
    );

    CREATE TABLE IF NOT EXISTS menu_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_no TEXT NOT NULL,
      name_en TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name_no TEXT NOT NULL,
      name_en TEXT NOT NULL,
      desc_no TEXT DEFAULT '',
      desc_en TEXT DEFAULT '',
      price INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(confirmation_code);
    CREATE INDEX IF NOT EXISTS idx_table_assignments_res ON table_assignments(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_table_assignments_table ON table_assignments(table_id);
  `);

  // Seed default settings if empty
  const settingsCount = database.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings = [
      ['site_name', 'Restaurant Utsyn'],
      ['hero_title_no', 'Velkommen til Restaurant Utsyn'],
      ['hero_title_en', 'Welcome to Restaurant Utsyn'],
      ['hero_subtitle_no', 'Nyt utsikten og maten på Tangen VGS'],
      ['hero_subtitle_en', 'Enjoy the view and food at Tangen VGS'],
      ['about_text_no', 'Restaurant Utsyn er en opplæringsrestaurant ved Tangen videregående skole. Her serverer elevene mat av høy kvalitet i en hyggelig atmosfære med fantastisk utsikt.'],
      ['about_text_en', 'Restaurant Utsyn is a training restaurant at Tangen Upper Secondary School. Here, the students serve high-quality food in a pleasant atmosphere with a fantastic view.'],
      ['price_main', '135'],
      ['price_dessert', '35'],
      ['currency', 'kr'],
      ['address', 'Tangen 21, 1. etg'],
      ['phone', ''],
      ['email', ''],
      ['max_capacity', '60'],
      ['booking_cutoff_minutes', '45'],
      ['time_slot_interval', '15'],
      ['sms_provider', 'webhook'],
      ['sms_webhook_url', ''],
      ['sms_twilio_sid', ''],
      ['sms_twilio_token', ''],
      ['sms_twilio_from', ''],
      ['sms_template_received', 'Takk for din bestilling hos Restaurant Utsyn! Din kode er {kode}. Vi vil bekrefte og tildele bord snart. Dette gjelder {dato} kl {tid} for {antall} gjester.'],
      ['sms_template_confirmed', 'Din reservasjon hos Restaurant Utsyn for {dato} kl {tid} er nå bekreftet og bord er tildelt. Velkommen!'],
    ];

    const insert = database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    const insertMany = database.transaction((settings: string[][]) => {
      for (const [key, value] of settings) {
        insert.run(key, value);
      }
    });
    insertMany(defaultSettings);
  } else {
    // Ensure new SMS templates exist for older DBs
    const ensureSettings = database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    ensureSettings.run('sms_provider', 'webhook');
    ensureSettings.run('sms_twilio_sid', '');
    ensureSettings.run('sms_twilio_token', '');
    ensureSettings.run('sms_twilio_from', '');
    ensureSettings.run('sms_template_received', 'Takk for din bestilling hos Restaurant Utsyn! Din kode er {kode}. Vi vil bekrefte og tildele bord snart. Dette gjelder {dato} kl {tid} for {antall} gjester.');
    ensureSettings.run('sms_template_confirmed', 'Din reservasjon hos Restaurant Utsyn for {dato} kl {tid} er nå bekreftet og bord er tildelt. Velkommen!');
  }

  // Seed default open days if empty
  const daysCount = database.prepare('SELECT COUNT(*) as count FROM open_days').get() as { count: number };
  if (daysCount.count === 0) {
    const defaultDays = [
      [0, '00:00', '00:00', 0], // Sunday - closed
      [1, '00:00', '00:00', 0], // Monday - closed
      [2, '00:00', '00:00', 0], // Tuesday - closed
      [3, '00:00', '00:00', 0], // Wednesday - closed
      [4, '12:00', '14:00', 1], // Thursday - open
      [5, '11:00', '13:00', 1], // Friday - open
      [6, '00:00', '00:00', 0], // Saturday - closed
    ];

    const insertDay = database.prepare('INSERT OR IGNORE INTO open_days (day_of_week, open_time, close_time, is_active) VALUES (?, ?, ?, ?)');
    const insertDays = database.transaction((days: (string | number)[][]) => {
      for (const [dow, open, close, active] of days) {
        insertDay.run(dow, open, close, active);
      }
    });
    insertDays(defaultDays);
  }

  // Seed default 32 tables if empty
  const tablesCount = database.prepare('SELECT COUNT(*) as count FROM tables_config').get() as { count: number };
  if (tablesCount.count === 0) {
    const insertTable = database.prepare('INSERT OR IGNORE INTO tables_config (name, capacity, is_active) VALUES (?, ?, ?)');
    const insertTables = database.transaction(() => {
      for (let i = 1; i <= 32; i++) {
        insertTable.run(i.toString(), 4, 1);
      }
    });
    insertTables();
  }

  // Seed menu if empty
  const menuCount = database.prepare('SELECT COUNT(*) as count FROM menu_categories').get() as { count: number };
  if (menuCount.count === 0) {
    const defaultCategories = [
      ['Hovedretter', 'Main Courses', 10],
      ['Desserter', 'Desserts', 20]
    ];
    
    const insertCat = database.prepare('INSERT INTO menu_categories (name_no, name_en, sort_order) VALUES (?, ?, ?)');
    const insertItem = database.prepare('INSERT INTO menu_items (category_id, name_no, name_en, desc_no, desc_en, price, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)');

    const seedMenu = database.transaction(() => {
      const hovedretterInfo = insertCat.run(defaultCategories[0]);
      const desserterInfo = insertCat.run(defaultCategories[1]);
      
      insertItem.run(hovedretterInfo.lastInsertRowid, 'Dagens Hovedrett', 'Dish of the Day', 'Variert hovedrett basert på sesongens råvarer', 'Varied main course based on seasonal ingredients', 135, 1);
      insertItem.run(desserterInfo.lastInsertRowid, 'Dagens Dessert', 'Dessert of the Day', 'Klassisk dessert', 'Classic dessert', 35, 1);
    });
    seedMenu();
  }
}

export default getDb;
