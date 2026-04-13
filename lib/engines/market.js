const db = require('../db');

function median(sorted) {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[index];
}

function buildMarketModels(onProgress) {
  // Clear existing models
  db.exec('DELETE FROM zip_models');

  // Get all unique ZIP codes with their flips
  const zips = db.prepare(`
    SELECT DISTINCT zip_code, city, county FROM flips WHERE zip_code IS NOT NULL AND zip_code != ''
  `).all();

  let modelsBuilt = 0;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO zip_models (
      zip_code, city, county, flip_count,
      median_buy_price, median_sell_price, median_price_spread,
      median_buy_price_per_sqft, median_sell_price_per_sqft, median_hold_days,
      typical_buy_price_low, typical_buy_price_high,
      tier_a_count, tier_b_count, tier_c_count, tier_d_count
    ) VALUES (
      @zip_code, @city, @county, @flip_count,
      @median_buy_price, @median_sell_price, @median_price_spread,
      @median_buy_price_per_sqft, @median_sell_price_per_sqft, @median_hold_days,
      @typical_buy_price_low, @typical_buy_price_high,
      @tier_a_count, @tier_b_count, @tier_c_count, @tier_d_count
    )
  `);

  const getFlipsForZip = db.prepare('SELECT * FROM flips WHERE zip_code = ?');
  const uniqueZips = [...new Set(zips.map(z => z.zip_code))];

  const txn = db.transaction(() => {
    for (const zip of uniqueZips) {
      const flips = getFlipsForZip.all(zip);
      if (flips.length < 3) continue;

      const buyPrices = flips.map(f => f.buy_price).filter(v => v != null).sort((a, b) => a - b);
      const sellPrices = flips.map(f => f.sell_price).filter(v => v != null).sort((a, b) => a - b);
      const spreads = flips.map(f => f.price_spread).filter(v => v != null).sort((a, b) => a - b);
      const buyPpsqft = flips.map(f => f.buy_price_per_sqft).filter(v => v != null).sort((a, b) => a - b);
      const sellPpsqft = flips.map(f => f.sell_price_per_sqft).filter(v => v != null).sort((a, b) => a - b);
      const holdDays = flips.map(f => f.hold_days).filter(v => v != null).sort((a, b) => a - b);

      const tierCounts = { A: 0, B: 0, C: 0, D: 0 };
      for (const f of flips) {
        if (tierCounts[f.tier] !== undefined) tierCounts[f.tier]++;
      }

      const firstFlip = flips[0];

      insert.run({
        zip_code: zip,
        city: firstFlip.city || '',
        county: firstFlip.county || '',
        flip_count: flips.length,
        median_buy_price: median(buyPrices),
        median_sell_price: median(sellPrices),
        median_price_spread: median(spreads),
        median_buy_price_per_sqft: median(buyPpsqft),
        median_sell_price_per_sqft: median(sellPpsqft),
        median_hold_days: median(holdDays),
        typical_buy_price_low: percentile(buyPrices, 25),
        typical_buy_price_high: percentile(buyPrices, 75),
        tier_a_count: tierCounts.A,
        tier_b_count: tierCounts.B,
        tier_c_count: tierCounts.C,
        tier_d_count: tierCounts.D
      });

      modelsBuilt++;
    }
  });

  txn();

  if (onProgress) onProgress(90, `Built ${modelsBuilt} ZIP models`);

  return { models_built: modelsBuilt };
}

module.exports = { buildMarketModels };
