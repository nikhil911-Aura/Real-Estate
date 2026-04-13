import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const db = require('../../../../lib/db');
  const id = params.id;

  const opportunity = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id);
  if (!opportunity) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Get top 5 matching flip comps from same ZIP
  const comps = db.prepare(`
    SELECT * FROM flips WHERE zip_code = ?
    ORDER BY ABS(sqft - ?) ASC, closed_date_sell DESC
    LIMIT 5
  `).all(opportunity.zip_code, opportunity.sqft || 0);

  // Get ZIP model
  const zipModel = db.prepare('SELECT * FROM zip_models WHERE zip_code = ?').get(opportunity.zip_code);

  return NextResponse.json({ opportunity, comps, zip_model: zipModel || null });
}
