import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const db = require('../../../lib/db');
  const { searchParams } = new URL(request.url);

  const tier = searchParams.get('tier');
  const zipCode = searchParams.get('zip_code');
  const county = searchParams.get('county');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (tier) {
    where.push('tier = ?');
    params.push(tier);
  }
  if (zipCode) {
    where.push('zip_code = ?');
    params.push(zipCode);
  }
  if (county) {
    where.push('county = ?');
    params.push(county);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM flips ${whereClause}`).get(...params);
  const rows = db.prepare(
    `SELECT * FROM flips ${whereClause} ORDER BY price_spread DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return NextResponse.json({
    flips: rows,
    total: countRow.total,
    page,
    limit,
    totalPages: Math.ceil(countRow.total / limit)
  });
}
