import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const jobs = require('../../../../lib/jobs');
    const job = jobs.get(params.id);

    if (!job) {
      console.log('[jobs] Not found:', params.id);
      return NextResponse.json({ error: 'Job not found', id: params.id }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (err) {
    console.error('[jobs] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
