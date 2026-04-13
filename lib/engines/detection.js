const fs = require('fs');
const db = require('../db');
const { parseCsvRobust } = require('../csv-clean');

const DISTRESS_KEYWORDS = [
  'as-is', 'as is', 'cash only', 'investor', 'distressed',
  'fixer', 'needs work', 'handyman', 'tlc', 'motivated',
  'estate sale', 'probate', 'foreclosure', 'rehab',
  'tear down', 'tear-down'
];

function getField(row, ...names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
  }
  return null;
}

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(str) {
  if (!str || str.trim() === '') return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d;
}

function findDistressKeywords(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return DISTRESS_KEYWORDS.filter(kw => lower.includes(kw));
}

function getCountyFallback(county) {
  if (!county) return null;
  const flips = db.prepare('SELECT * FROM flips WHERE county = ?').all(county);
  if (flips.length < 3) return null;

  const buyPrices = flips.map(f => f.buy_price).filter(v => v != null).sort((a, b) => a - b);
  const buyPpsqft = flips.map(f => f.buy_price_per_sqft).filter(v => v != null).sort((a, b) => a - b);

  const mid = Math.floor(buyPrices.length / 2);
  const medianBuy = buyPrices.length % 2 === 1 ? buyPrices[mid] : (buyPrices[mid - 1] + buyPrices[mid]) / 2;

  const lowIdx = Math.floor(0.25 * (buyPrices.length - 1));
  const highIdx = Math.floor(0.75 * (buyPrices.length - 1));

  const midPpsqft = Math.floor(buyPpsqft.length / 2);
  const medianPpsqft = buyPpsqft.length > 0
    ? (buyPpsqft.length % 2 === 1 ? buyPpsqft[midPpsqft] : (buyPpsqft[midPpsqft - 1] + buyPpsqft[midPpsqft]) / 2)
    : 0;

  return {
    median_buy_price: medianBuy,
    typical_buy_price_low: buyPrices[lowIdx],
    typical_buy_price_high: buyPrices[highIdx],
    median_buy_price_per_sqft: medianPpsqft
  };
}

function saveActiveCsvPath(filePath) {
  db.prepare('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)').run('last_active_csv', filePath);
}

function getLastActiveCsvPath() {
  const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get('last_active_csv');
  return row ? row.value : null;
}

async function runDetectionEngine(filePath, onProgress) {
  const listings = [];
  let rowCount = 0;

  // Parse CSV with robust parser (handles malformed quotes)
  const rows = parseCsvRobust(filePath);
  rowCount = rows.length;

  for (const row of rows) {
    listings.push(row);
  }

  if (onProgress) onProgress(30, `Parsed ${rowCount} active listings, scoring...`);

  // Cache zip models
  const zipModels = new Map();
  const allModels = db.prepare('SELECT * FROM zip_models').all();
  for (const m of allModels) {
    zipModels.set(m.zip_code, m);
  }

  const opportunities = [];

  for (const row of listings) {
    const zipCode = getField(row, 'ZipCode', 'PostalCode', 'Zip', 'ZipOrPostalCode') || '';
    const county = getField(row, 'County', 'CountyOrParish', 'CountyName') || '';
    const listPrice = parseNumber(getField(row, 'ListPrice', 'CurrentPrice', 'Price'));
    const originalListPrice = parseNumber(getField(row, 'OriginalListPrice', 'OrigPrice'));
    const sqft = parseNumber(getField(row, 'SqFtTotal', 'SquareFeet', 'LivingArea', 'SqFt', 'GLA'));
    const listDate = getField(row, 'ListDate', 'ListingDate', 'OnMarketDate');
    const remarks = getField(row, 'Remarks', 'PublicRemarks', 'PropertyDescription') || '';
    const address = getField(row, 'Address', 'FullAddress', 'StreetAddress', 'UnparsedAddress', 'FullStreetAddress') || '';
    let mlsNumber = getField(row, 'MlsNumber', 'MLSNumber', 'ListingId', 'MLS', 'MLNumber', 'ListingKey') || '';
    // Fallback: generate unique key from address+zip if MLS number missing
    if (!mlsNumber) mlsNumber = `${address.trim()}_${zipCode}`.replace(/\s+/g, '_');

    if (!listPrice) continue;

    // Step 1: ZIP model lookup
    let model = zipModels.get(zipCode) || null;
    let noZipModel = false;

    if (!model) {
      const fallback = getCountyFallback(county);
      if (fallback) {
        model = fallback;
      } else {
        noZipModel = true;
      }
    }

    // Step 2: Price position score (0-40)
    let pricePositionScore = 0;
    if (model && !noZipModel) {
      if (listPrice <= model.typical_buy_price_low) pricePositionScore = 40;
      else if (listPrice <= model.median_buy_price) pricePositionScore = 25;
      else if (listPrice <= model.typical_buy_price_high) pricePositionScore = 10;
      else pricePositionScore = 0;
    }

    // Step 3: PPSQFT score (0-20)
    let ppsqftScore = 0;
    const listPricePerSqft = sqft && sqft > 0 ? listPrice / sqft : null;
    if (listPricePerSqft && model && model.median_buy_price_per_sqft && !noZipModel) {
      const ratio = listPricePerSqft / model.median_buy_price_per_sqft;
      if (ratio <= 0.8) ppsqftScore = 20;
      else if (ratio <= 0.9) ppsqftScore = 12;
      else if (ratio <= 1.0) ppsqftScore = 5;
      else ppsqftScore = 0;
    }

    // Step 4: Distress score (0-25)
    const foundKeywords = findDistressKeywords(remarks);
    let distressScore = 0;
    if (foundKeywords.length >= 3) distressScore = 25;
    else if (foundKeywords.length === 2) distressScore = 15;
    else if (foundKeywords.length === 1) distressScore = 8;

    // Step 5: Timing score (0-15 + 5 bonus)
    let timingScore = 0;
    let daysOnMarket = null;
    const parsedListDate = parseDate(listDate);
    if (parsedListDate) {
      daysOnMarket = Math.round((new Date() - parsedListDate) / (1000 * 60 * 60 * 24));
      if (daysOnMarket <= 7) timingScore = 15;
      else if (daysOnMarket <= 30) timingScore = 10;
      else if (daysOnMarket <= 90) timingScore = 5;
      else timingScore = 0;
    }

    // Price drop bonus
    if (originalListPrice && listPrice < originalListPrice) {
      const dropPct = (originalListPrice - listPrice) / originalListPrice;
      if (dropPct >= 0.05) timingScore += 5;
    }

    // Step 6: Bucket
    const totalScore = pricePositionScore + ppsqftScore + distressScore + timingScore;
    let bucket;
    if (totalScore >= 70 && !noZipModel) bucket = 'HOT';
    else if ((totalScore >= 50 && totalScore < 70) || (totalScore >= 70 && noZipModel)) bucket = 'UNDERWRITE';
    else if (totalScore >= 30 && totalScore < 50) bucket = 'WATCH';
    else bucket = 'SUPPRESSED';

    opportunities.push({
      mls_number: mlsNumber,
      address: address,
      city: getField(row, 'City', 'CityName') || '',
      zip_code: zipCode,
      county: county,
      year_built: parseNumber(getField(row, 'YearBuilt', 'YrBuilt')) || null,
      sqft: sqft,
      bedrooms: parseNumber(getField(row, 'TotalBedrooms', 'Bedrooms', 'BedroomsTotal', 'Beds', 'BdTotal')) || null,
      bathrooms: parseNumber(getField(row, 'TotalFullBaths', 'Bathrooms', 'BathroomsTotalInteger', 'Baths', 'BathTotal', 'BathroomsFull')) || null,
      list_price: listPrice,
      original_list_price: originalListPrice,
      list_price_per_sqft: listPricePerSqft ? Math.round(listPricePerSqft * 100) / 100 : null,
      days_on_market: daysOnMarket,
      list_date: listDate || null,
      price_position_score: pricePositionScore,
      ppsqft_score: ppsqftScore,
      distress_score: distressScore,
      timing_score: timingScore,
      total_score: totalScore,
      bucket,
      no_zip_model: noZipModel ? 1 : 0,
      distress_keywords_found: foundKeywords.join(', ')
    });
  }

  if (onProgress) onProgress(70, `Scored ${opportunities.length} listings, inserting...`);

  // Step 7: Batch insert
  db.exec('DELETE FROM opportunities');

  const insert = db.prepare(`
    INSERT OR REPLACE INTO opportunities (
      mls_number, address, city, zip_code, county, year_built, sqft, bedrooms, bathrooms,
      list_price, original_list_price, list_price_per_sqft, days_on_market, list_date,
      price_position_score, ppsqft_score, distress_score, timing_score, total_score,
      bucket, no_zip_model, distress_keywords_found
    ) VALUES (
      @mls_number, @address, @city, @zip_code, @county, @year_built, @sqft, @bedrooms, @bathrooms,
      @list_price, @original_list_price, @list_price_per_sqft, @days_on_market, @list_date,
      @price_position_score, @ppsqft_score, @distress_score, @timing_score, @total_score,
      @bucket, @no_zip_model, @distress_keywords_found
    )
  `);

  const batchSize = 1000;
  for (let i = 0; i < opportunities.length; i += batchSize) {
    const batch = opportunities.slice(i, i + batchSize);
    const txn = db.transaction(() => {
      for (const opp of batch) {
        insert.run(opp);
      }
    });
    txn();
  }

  const bucketCounts = { HOT: 0, UNDERWRITE: 0, WATCH: 0, SUPPRESSED: 0 };
  for (const o of opportunities) {
    bucketCounts[o.bucket]++;
  }

  // Save path so historical re-upload can re-score automatically
  saveActiveCsvPath(filePath);

  return {
    total_scored: opportunities.length,
    rows_processed: rowCount,
    bucket_counts: bucketCounts
  };
}

module.exports = { runDetectionEngine, getLastActiveCsvPath };
