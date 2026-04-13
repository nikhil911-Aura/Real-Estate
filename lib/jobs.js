// Store jobs in SQLite so they persist across route handler bundles
// and survive Railway's process model

function getDb() {
  return require('./db');
}

// Ensure jobs table exists
try {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'processing',
      progress REAL DEFAULT 0,
      message TEXT DEFAULT 'Starting...',
      result TEXT,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {
  // db might not be ready yet at require time — table will be created on first use
}

function ensureTable() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'processing',
      progress REAL DEFAULT 0,
      message TEXT DEFAULT 'Starting...',
      result TEXT,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

module.exports = {
  create(id) {
    ensureTable();
    getDb().prepare(`
      INSERT OR REPLACE INTO jobs (id, status, progress, message, result, error)
      VALUES (?, 'processing', 0, 'Starting...', NULL, NULL)
    `).run(id);
  },

  update(id, patch) {
    ensureTable();
    const current = this.get(id) || {};
    const merged = { ...current, ...patch };
    getDb().prepare(`
      INSERT OR REPLACE INTO jobs (id, status, progress, message, result, error)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      merged.status || 'processing',
      merged.progress || 0,
      merged.message || '',
      merged.result ? JSON.stringify(merged.result) : null,
      merged.error || null
    );
  },

  get(id) {
    ensureTable();
    const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      progress: row.progress,
      message: row.message,
      result: row.result ? JSON.parse(row.result) : null,
      error: row.error
    };
  }
};
