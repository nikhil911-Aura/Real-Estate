import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const db = require('../../../../../lib/db');
  const id = params.id;
  const body = await request.json();

  const { decision, rejection_reason, notes } = body;

  if (!decision || !['confirmed_flip', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'decision must be "confirmed_flip" or "rejected"' }, { status: 400 });
  }

  if (decision === 'rejected' && !rejection_reason) {
    return NextResponse.json({ error: 'rejection_reason is required when rejecting' }, { status: 400 });
  }

  const opportunity = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id);
  if (!opportunity) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
  }

  db.prepare(`
    INSERT INTO feedback (opportunity_id, decision, rejection_reason, notes)
    VALUES (?, ?, ?, ?)
  `).run(id, decision, rejection_reason || null, notes || null);

  const newStatus = decision === 'confirmed_flip' ? 'Confirmed' : 'Rejected';
  db.prepare(`
    UPDATE opportunities SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(newStatus, id);

  return NextResponse.json({ success: true, status: newStatus });
}
