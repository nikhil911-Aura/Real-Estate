import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const jobs = require('../../../../lib/jobs');
  const job = jobs.get(params.id);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(job);
}
