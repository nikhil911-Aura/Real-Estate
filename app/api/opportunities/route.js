import { NextResponse } from 'next/server';

export async function GET(request) {
  const db = require('../../../lib/db');
  const { searchParams } = new URL(request.url);

  const bucket = searchParams.get('bucket');
  const zipCode = searchParams.get('zip_code');
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  // Default: exclude SUPPRESSED unless explicitly requested
  if (bucket && bucket !== 'All') {
    where.push('bucket = ?');
    params.push(bucket);
  } else if (!bucket || bucket === 'All') {
    where.push("bucket != 'SUPPRESSED'");
  }

  if (zipCode) {
    where.push('zip_code = ?');
    params.push(zipCode);
  }
  if (minPrice) {
    where.push('list_price >= ?');
    params.push(parseFloat(minPrice));
  }
  if (maxPrice) {
    where.push('list_price <= ?');
    params.push(parseFloat(maxPrice));
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM opportunities ${whereClause}`).get(...params);
  const rows = db.prepare(
    `SELECT * FROM opportunities ${whereClause} ORDER BY total_score DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return NextResponse.json({
    opportunities: rows,
    total: countRow.total,
    page,
    limit,
    totalPages: Math.ceil(countRow.total / limit)
  });
}
