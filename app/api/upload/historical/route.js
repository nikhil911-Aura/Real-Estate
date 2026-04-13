import { NextResponse } from 'next/server';
import { writeFile, copyFile, access } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { constants } from 'fs';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

async function fileExists(p) {
  try { await access(p, constants.F_OK); return true; }
  catch { return false; }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, 'historical_upload.csv');
    await writeFile(filePath, buffer);

    const jobId = crypto.randomUUID();
    const jobs = require('../../../../lib/jobs');
    jobs.create(jobId);

    // Start async processing - do not await
    (async () => {
      try {
        const { runTruthEngine } = require('../../../../lib/engines/truth');
        const { buildMarketModels } = require('../../../../lib/engines/market');
        const { runDetectionEngine, getLastActiveCsvPath } = require('../../../../lib/engines/detection');
        const db = require('../../../../lib/db');

        jobs.update(jobId, { progress: 5, message: 'Detecting flips...' });

        const truthResult = await runTruthEngine(filePath, (progress, message) => {
          jobs.update(jobId, { progress: Math.min(Math.round(progress * 0.4), 40), message });
        });

        jobs.update(jobId, { progress: 45, message: 'Building ZIP models...' });

        const marketResult = buildMarketModels((progress, message) => {
          jobs.update(jobId, { progress: Math.min(Math.round(45 + progress * 0.2), 65), message });
        });

        // Log the upload
        db.prepare(`
          INSERT INTO uploads_log (filename, upload_type, rows_processed, flips_detected)
          VALUES (?, 'historical', ?, ?)
        `).run(file.name, truthResult.rows_processed, truthResult.flips_confirmed);

        // Auto re-score active listings if a previous active CSV exists
        let rescoreResult = null;
        const lastActiveCsv = getLastActiveCsvPath();
        if (lastActiveCsv && await fileExists(lastActiveCsv)) {
          jobs.update(jobId, { progress: 70, message: 'Re-scoring active listings with new models...' });

          rescoreResult = await runDetectionEngine(lastActiveCsv, (progress, message) => {
            jobs.update(jobId, { progress: Math.min(Math.round(70 + progress * 0.25), 95), message });
          });
        }

        jobs.update(jobId, {
          status: 'done',
          progress: 100,
          message: 'Complete',
          result: {
            ...truthResult,
            models_built: marketResult.models_built,
            rescore: rescoreResult
          }
        });
      } catch (err) {
        console.error('Historical upload error:', err);
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
