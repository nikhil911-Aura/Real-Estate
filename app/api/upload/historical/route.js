import { NextResponse } from 'next/server';
import { writeFile, access } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import fs from 'fs';
import { constants } from 'fs';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

async function fileExists(p) {
  try { await access(p, constants.F_OK); return true; }
  catch { return false; }
}

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

    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, 'historical_upload.csv');

    // Stream file to disk instead of loading into memory
    await streamToFile(file.stream(), filePath);

    const jobId = crypto.randomUUID();
    const jobs = require('../../../../lib/jobs');
    jobs.create(jobId);
    const fileName = file.name;

    // Return immediately — process in background
    (async () => {
      try {
        const { runTruthEngine } = require('../../../../lib/engines/truth');
        const { buildMarketModels } = require('../../../../lib/engines/market');
        const { runDetectionEngine, getLastActiveCsvPath } = require('../../../../lib/engines/detection');
        const db = require('../../../../lib/db');

        jobs.update(jobId, { progress: 2, message: 'Starting flip detection...' });

        const truthResult = await runTruthEngine(filePath, (progress, message) => {
          // Truth engine progress 0-70 maps to job progress 2-55
          const jobProgress = Math.min(Math.round(2 + (progress / 70) * 53), 55);
          jobs.update(jobId, { progress: jobProgress, message });
        });

        jobs.update(jobId, { progress: 58, message: 'Building ZIP models...' });

        const marketResult = buildMarketModels((progress, message) => {
          jobs.update(jobId, { progress: Math.min(Math.round(45 + progress * 0.2), 65), message });
        });

        db.prepare(`
          INSERT INTO uploads_log (filename, upload_type, rows_processed, flips_detected)
          VALUES (?, 'historical', ?, ?)
        `).run(fileName, truthResult.rows_processed, truthResult.flips_confirmed);

        // Auto re-score active listings if previous active CSV exists
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
