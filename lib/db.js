const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'jenkins.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS flips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buy_mls TEXT,
    sell_mls TEXT,
    address TEXT,
    zip_code TEXT,
    county TEXT,
    city TEXT,
    year_built INTEGER,
    sqft REAL,
    bedrooms INTEGER,
    buy_price REAL,
    sell_price REAL,
    price_spread REAL,
    hold_days INTEGER,
    tier TEXT,
    distress_signals INTEGER,
    reno_signals INTEGER,
    buy_price_per_sqft REAL,
    sell_price_per_sqft REAL,
    buy_closing_terms TEXT,
    buy_remarks TEXT,
    sell_remarks TEXT,
    closed_date_buy TEXT,
    closed_date_sell TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS zip_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zip_code TEXT UNIQUE,
    city TEXT,
    county TEXT,
    flip_count INTEGER,
    median_buy_price REAL,
    median_sell_price REAL,
    median_price_spread REAL,
    median_buy_price_per_sqft REAL,
    median_sell_price_per_sqft REAL,
    median_hold_days REAL,
    typical_buy_price_low REAL,
    typical_buy_price_high REAL,
    tier_a_count INTEGER,
    tier_b_count INTEGER,
    tier_c_count INTEGER,
    tier_d_count INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mls_number TEXT UNIQUE,
    address TEXT,
    city TEXT,
    zip_code TEXT,
    county TEXT,
    year_built INTEGER,
    sqft REAL,
    bedrooms INTEGER,
    bathrooms INTEGER,
    list_price REAL,
    original_list_price REAL,
    list_price_per_sqft REAL,
    days_on_market INTEGER,
    list_date TEXT,
    price_position_score REAL,
    ppsqft_score REAL,
    distress_score REAL,
    timing_score REAL,
    total_score REAL,
    bucket TEXT,
    no_zip_model INTEGER DEFAULT 0,
    distress_keywords_found TEXT,
    status TEXT DEFAULT 'New',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER,
    decision TEXT,
    rejection_reason TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS uploads_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    upload_type TEXT,
    rows_processed INTEGER,
    flips_detected INTEGER,
    opportunities_scored INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_flips_zip ON flips(zip_code);
  CREATE INDEX IF NOT EXISTS idx_flips_tier ON flips(tier);
  CREATE INDEX IF NOT EXISTS idx_opp_bucket ON opportunities(bucket);
  CREATE INDEX IF NOT EXISTS idx_opp_zip ON opportunities(zip_code);
  CREATE INDEX IF NOT EXISTS idx_opp_status ON opportunities(status);
`);

module.exports = db;
