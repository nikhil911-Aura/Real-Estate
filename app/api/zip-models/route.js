import { NextResponse } from 'next/server';

export async function GET() {
  const db = require('../../../lib/db');
  const models = db.prepare('SELECT * FROM zip_models ORDER BY flip_count DESC').all();
  return NextResponse.json(models);
}
