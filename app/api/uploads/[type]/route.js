import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  const db = require('../../../../lib/db');
  const type = params.type;

  if (type === 'historical') {
    db.exec('DELETE FROM flips');
    db.exec('DELETE FROM zip_models');
    db.exec("DELETE FROM uploads_log WHERE upload_type = 'historical'");
    // Also clear opportunities since they depend on zip_models
    db.exec('DELETE FROM opportunities');
    db.exec("DELETE FROM uploads_log WHERE upload_type = 'active'");
    db.exec("DELETE FROM app_state WHERE key = 'last_active_csv'");
    db.exec('DELETE FROM feedback');
    return NextResponse.json({ success: true, message: 'Historical data and all dependent data cleared' });
  }

  if (type === 'active') {
    db.exec('DELETE FROM opportunities');
    db.exec("DELETE FROM uploads_log WHERE upload_type = 'active'");
    db.exec("DELETE FROM app_state WHERE key = 'last_active_csv'");
    db.exec('DELETE FROM feedback');
    return NextResponse.json({ success: true, message: 'Active listings data cleared' });
  }

  return NextResponse.json({ error: 'Invalid type. Use "historical" or "active"' }, { status: 400 });
}
