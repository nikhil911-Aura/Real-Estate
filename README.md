# Jenkins Homebuyers — Flip Detection Platform

Real estate flip detection platform for the Nashville/Tennessee market. Ingests Realtracs MLS data, detects historical flips, builds ZIP-level market models, and scores active listings as opportunities.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000/upload](http://localhost:3000/upload)

4. Upload the **Historical Sold Data** CSV first. Wait for processing to complete (flip detection + ZIP model building).

5. Upload the **Active Listings** CSV. Wait for scoring to complete.

6. Navigate to [http://localhost:3000/opportunities](http://localhost:3000/opportunities) to see the ranked deal queue.

## Pages

- **/upload** — Upload historical sold data and active listings CSVs
- **/opportunities** — Ranked opportunity queue with filtering, scoring, confirm/reject workflow
- **/opportunities/[id]** — Deal detail with score breakdown and comparable flips
- **/market** — Market intelligence with ZIP models, charts, and tier distribution
- **/flips** — Full flip history table with filters and detail panel

## Production Build

```bash
npm run build
npm start
```

## Railway Deployment

Set environment variables:
- `DB_PATH=/app/data/jenkins.db`
- `NODE_ENV=production`

The app uses SQLite with WAL mode and requires a persistent filesystem (standard server mode, not serverless).
