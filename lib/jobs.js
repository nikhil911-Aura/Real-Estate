// Use globalThis to ensure the same Map is shared across all
// Next.js route handler bundles (they get separate module instances)
if (!globalThis.__jenkinsJobs) {
  globalThis.__jenkinsJobs = new Map();
}

const jobs = globalThis.__jenkinsJobs;

module.exports = {
  create(id) {
    jobs.set(id, {
      id,
      status: 'processing',
      progress: 0,
      message: 'Starting...',
      result: null,
      error: null
    });
  },
  update(id, patch) {
    jobs.set(id, { ...jobs.get(id), ...patch });
  },
  get(id) {
    return jobs.get(id);
  }
};
