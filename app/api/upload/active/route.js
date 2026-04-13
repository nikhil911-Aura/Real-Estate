import { NextResponse } from 'next/server';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

async function streamToFile(readableStream, filePath) {
  const writableStream = fs.createWriteStream(filePath);
  const reader = readableStream.getReader();

  return new Promise((resolve, reject) => {
    function push() {
      reader.read().then(({ done, value }) => {
        if (done) {
          writableStream.end();
          resolve();
          return;
        }
        writableStream.write(Buffer.from(value), (err) => {
          if (err) reject(err);
          else push();
        });
      }).catch(reject);
    }
    push();
  });
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Save to data/ dir so it persists for re-scoring after historical re-upload
    const dataDir = path.join(process.cwd(), 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    const filePath = path.join(dataDir, 'last_active_upload.csv');

    await streamToFile(file.stream(), filePath);

    const jobId = crypto.randomUUID();
    const jobs = require('../../../../lib/jobs');
    jobs.create(jobId);
    const fileName = file.name;

    (async () => {
      try {
        const { runDetectionEngine } = require('../../../../lib/engines/detection');
        const db = require('../../../../lib/db');

        jobs.update(jobId, { progress: 10, message: 'Scoring active listings...' });

        const result = await runDetectionEngine(filePath, (progress, message) => {
          jobs.update(jobId, { progress: Math.min(progress, 95), message });
        });

        db.prepare(`
          INSERT INTO uploads_log (filename, upload_type, rows_processed, opportunities_scored)
          VALUES (?, 'active', ?, ?)
        `).run(fileName, result.rows_processed, result.total_scored);

        jobs.update(jobId, {
          status: 'done',
          progress: 100,
          message: 'Complete',
          result
        });
      } catch (err) {
        console.error('Active upload error:', err);
        jobs.update(jobId, {
          status: 'error',
          message: err.message,
          error: err.message
        });
      }
    })();

    return NextResponse.json({ jobId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
