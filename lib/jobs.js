function db() {
  return require('./db');
}

module.exports = {
  create(id) {
    db().prepare(`
      INSERT OR REPLACE INTO jobs (id, status, progress, message, result, error)
      VALUES (?, 'processing', 0, 'Starting...', NULL, NULL)
    `).run(id);
  },

  update(id, patch) {
    const current = this.get(id) || {};
    const merged = { ...current, ...patch };
    const resultStr = merged.result ? JSON.stringify(merged.result) : null;
    db().prepare(`
      INSERT OR REPLACE INTO jobs (id, status, progress, message, result, error)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      merged.status || 'processing',
      merged.progress || 0,
      merged.message || '',
      resultStr,
      merged.error || null
    );
  },

  get(id) {
    const row = db().prepare('SELECT * FROM jobs WHERE id = ?').get(id);
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
