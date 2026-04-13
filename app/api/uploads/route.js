import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = require('../../../lib/db');

  const lastHistorical = db.prepare(`
    SELECT * FROM uploads_log WHERE upload_type = 'historical' ORDER BY uploaded_at DESC LIMIT 1
  `).get();

  const lastActive = db.prepare(`
    SELECT * FROM uploads_log WHERE upload_type = 'active' ORDER BY uploaded_at DESC LIMIT 1
  `).get();

  // Get tier counts from flips if historical exists
  let tierCounts = null;
  let modelsBuilt = 0;
  if (lastHistorical) {
    const tiers = db.prepare("SELECT tier, COUNT(*) as count FROM flips GROUP BY tier").all();
    tierCounts = {};
    for (const t of tiers) tierCounts[t.tier] = t.count;
    modelsBuilt = db.prepare("SELECT COUNT(*) as count FROM zip_models").get().count;
  }

  // Get bucket counts from opportunities if active exists
  let bucketCounts = null;
  if (lastActive) {
    const buckets = db.prepare("SELECT bucket, COUNT(*) as count FROM opportunities GROUP BY bucket").all();
    bucketCounts = {};
    for (const b of buckets) bucketCounts[b.bucket] = b.count;
  }

  return NextResponse.json({
    historical: lastHistorical ? {
      filename: lastHistorical.filename,
      rows_processed: lastHistorical.rows_processed,
      flips_confirmed: lastHistorical.flips_detected,
      uploaded_at: lastHistorical.uploaded_at,
      tier_counts: tierCounts,
      models_built: modelsBuilt
    } : null,
    active: lastActive ? {
      filename: lastActive.filename,
      rows_processed: lastActive.rows_processed,
      total_scored: lastActive.opportunities_scored,
      uploaded_at: lastActive.uploaded_at,
      bucket_counts: bucketCounts
    } : null
  });
}
