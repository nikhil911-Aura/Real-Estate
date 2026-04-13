import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = require('../../../lib/db');

  const bucketCounts = {};
  const buckets = db.prepare("SELECT bucket, COUNT(*) as count FROM opportunities GROUP BY bucket").all();
  for (const b of buckets) {
    bucketCounts[b.bucket] = b.count;
  }

  const totalFlips = db.prepare('SELECT COUNT(*) as count FROM flips').get().count;
  const totalOpportunities = db.prepare('SELECT COUNT(*) as count FROM opportunities').get().count;

  const topZips = db.prepare('SELECT * FROM zip_models ORDER BY flip_count DESC LIMIT 5').all();

  const tierDist = {};
  const tiers = db.prepare("SELECT tier, COUNT(*) as count FROM flips GROUP BY tier").all();
  for (const t of tiers) {
    tierDist[t.tier] = t.count;
  }

  const confirmed = db.prepare("SELECT COUNT(*) as count FROM feedback WHERE decision = 'confirmed_flip'").get().count;
  const rejected = db.prepare("SELECT COUNT(*) as count FROM feedback WHERE decision = 'rejected'").get().count;

  return NextResponse.json({
    bucket_counts: bucketCounts,
    total_flips: totalFlips,
    total_opportunities: totalOpportunities,
    top_zips: topZips,
    tier_distribution: tierDist,
    feedback_summary: { confirmed, rejected }
  });
}
