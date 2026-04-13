const fs = require('fs');
const db = require('../db');
const { parseCsvRobust } = require('../csv-clean');

const DISTRESS_KEYWORDS = [
  'as-is', 'as is', 'cash only', 'investor', 'distressed',
  'fixer', 'needs work', 'handyman', 'tlc', 'motivated',
  'estate sale', 'probate', 'foreclosure', 'rehab',
  'tear down', 'tear-down'
];

const RENO_KEYWORDS = [
  'renovated', 'remodeled', 'updated', 'new roof', 'new hvac',
  'new kitchen', 'new bath', 'new floors', 'new flooring',
  'new windows', 'completely updated', 'fully renovated',
  'move in ready', 'turnkey'
];

const INVESTOR_PATTERNS = [
  'llc', 'invest', 'capital', 'properties', 'holdings', 'realty group'
];

function countKeywords(text, keywords) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) count++;
  }
  return count;
}

function parseDate(str) {
  if (!str || str.trim() === '') return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d;
}

function daysBetween(d1, d2) {
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function normalizeAddress(addr) {
  if (!addr) return '';
  return addr.trim().toLowerCase();
}

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

async function runTruthEngine(filePath, onProgress) {
  const addressMap = new Map();
  let rowCount = 0;

  // Step 1: Parse CSV with robust parser (handles malformed quotes)
  const rows = await parseCsvRobust(filePath);
  rowCount = rows.length;

  for (const row of rows) {
    const address = normalizeAddress(getField(row, 'FullAddress', 'Address', 'StreetAddress', 'UnparsedAddress', 'FullStreetAddress'));
    const zip = getField(row, 'ZipCode', 'PostalCode', 'Zip', 'ZipOrPostalCode');
    if (!address || !zip) continue;

    const key = `${address}|${zip}`;
    if (!addressMap.has(key)) {
      addressMap.set(key, []);
    }
    addressMap.get(key).push(row);
  }

  if (onProgress) onProgress(30, `Parsed ${rowCount} rows, finding flip pairs...`);

  // Step 2 & 3: Find and qualify flip pairs
  const flips = [];

  for (const [key, records] of addressMap) {
    if (records.length < 2) continue;

    // Sort by ClosedDate ascending
    const dated = records
      .map(r => ({ ...r, _date: parseDate(getField(r, 'ClosedDate', 'CloseDate', 'SoldDate', 'ClosingDate')) }))
      .filter(r => r._date !== null)
      .sort((a, b) => a._date - b._date);

    if (dated.length < 2) continue;

    const buyEvent = dated[0];
    const sellEvent = dated[dated.length - 1];

    const buyPrice = parseNumber(getField(buyEvent, 'SalesPrice', 'ClosePrice', 'SoldPrice', 'ClosedPrice', 'SalePrice'));
    const sellPrice = parseNumber(getField(sellEvent, 'SalesPrice', 'ClosePrice', 'SoldPrice', 'ClosedPrice', 'SalePrice'));

    if (!buyPrice || !sellPrice) continue;

    const holdDays = daysBetween(buyEvent._date, sellEvent._date);
    const priceSpread = sellPrice - buyPrice;

    // Qualification
    if (holdDays < 60 || holdDays > 730) continue;
    if (sellPrice <= buyPrice) continue;
    if (priceSpread < 15000) continue;

    // Investor signal check
    const buyClosingTerms = getField(buyEvent, 'ClosingTerms', 'CloseTerms', 'BuyerFinancing') || '';
    const buyerFinancing = getField(buyEvent, 'BuyerFinancing', 'Financing') || '';
    const officeName = getField(buyEvent, 'OfficeSellName', 'ListOfficeName', 'BuyerOfficeName', 'SellingOfficeName') || '';

    const cashInTerms = buyClosingTerms.toLowerCase().includes('cash');
    const cashInFinancing = buyerFinancing.toLowerCase().includes('cash');
    const officeLower = officeName.toLowerCase();
    const investorOffice = INVESTOR_PATTERNS.some(p => officeLower.includes(p));

    if (!cashInTerms && !cashInFinancing && !investorOffice) continue;

    // Step 4 & 5: Score signals
    const buyRemarks = getField(buyEvent, 'Remarks', 'PublicRemarks', 'PropertyDescription') || '';
    const sellRemarks = getField(sellEvent, 'Remarks', 'PublicRemarks', 'PropertyDescription') || '';

    const distressSignals = countKeywords(buyRemarks, DISTRESS_KEYWORDS);
    const renoSignals = countKeywords(sellRemarks, RENO_KEYWORDS);
    const totalSignals = distressSignals + renoSignals;

    // Step 6: Assign tier
    let tier;
    if (totalSignals >= 3 && priceSpread >= 40000) tier = 'A';
    else if (totalSignals >= 2 && priceSpread >= 25000) tier = 'B';
    else if (totalSignals >= 1 && priceSpread >= 15000) tier = 'C';
    else tier = 'D';

    const sqft = parseNumber(getField(buyEvent, 'SqFtTotal', 'SquareFeet', 'LivingArea', 'SqFt', 'GLA'));

    flips.push({
      buy_mls: getField(buyEvent, 'MlsNumber', 'MLSNumber', 'ListingId', 'MLS', 'MLNumber', 'ListingKey') || '',
      sell_mls: getField(sellEvent, 'MlsNumber', 'MLSNumber', 'ListingId', 'MLS', 'MLNumber', 'ListingKey') || '',
      address: getField(buyEvent, 'FullAddress', 'Address', 'StreetAddress', 'UnparsedAddress', 'FullStreetAddress') || '',
      zip_code: getField(buyEvent, 'ZipCode', 'PostalCode', 'Zip', 'ZipOrPostalCode') || '',
      county: getField(buyEvent, 'County', 'CountyOrParish', 'CountyName') || '',
      city: getField(buyEvent, 'City', 'CityName') || '',
      year_built: parseNumber(getField(buyEvent, 'YearBuilt', 'YrBuilt')) || null,
      sqft: sqft,
      bedrooms: parseNumber(getField(buyEvent, 'TotalBedrooms', 'Bedrooms', 'BedroomsTotal', 'Beds', 'BdTotal')) || null,
      buy_price: buyPrice,
      sell_price: sellPrice,
      price_spread: priceSpread,
      hold_days: holdDays,
      tier,
      distress_signals: distressSignals,
      reno_signals: renoSignals,
      buy_price_per_sqft: sqft && sqft > 0 ? Math.round((buyPrice / sqft) * 100) / 100 : null,
      sell_price_per_sqft: sqft && sqft > 0 ? Math.round((sellPrice / sqft) * 100) / 100 : null,
      buy_closing_terms: buyClosingTerms,
      buy_remarks: buyRemarks,
      sell_remarks: sellRemarks,
      closed_date_buy: buyEvent._date.toISOString().split('T')[0],
      closed_date_sell: sellEvent._date.toISOString().split('T')[0]
    });
  }

  if (onProgress) onProgress(60, `Found ${flips.length} confirmed flips, inserting...`);

  // Step 7: Batch insert
  db.exec('DELETE FROM flips');

  const insert = db.prepare(`
    INSERT INTO flips (buy_mls, sell_mls, address, zip_code, county, city, year_built, sqft, bedrooms,
      buy_price, sell_price, price_spread, hold_days, tier, distress_signals, reno_signals,
      buy_price_per_sqft, sell_price_per_sqft, buy_closing_terms, buy_remarks, sell_remarks,
      closed_date_buy, closed_date_sell)
    VALUES (@buy_mls, @sell_mls, @address, @zip_code, @county, @city, @year_built, @sqft, @bedrooms,
      @buy_price, @sell_price, @price_spread, @hold_days, @tier, @distress_signals, @reno_signals,
      @buy_price_per_sqft, @sell_price_per_sqft, @buy_closing_terms, @buy_remarks, @sell_remarks,
      @closed_date_buy, @closed_date_sell)
  `);

  const batchSize = 1000;
  for (let i = 0; i < flips.length; i += batchSize) {
    const batch = flips.slice(i, i + batchSize);
    const txn = db.transaction(() => {
      for (const flip of batch) {
        insert.run(flip);
      }
    });
    txn();
  }

  const tierCounts = { A: 0, B: 0, C: 0, D: 0 };
  for (const f of flips) {
    tierCounts[f.tier]++;
  }

  if (onProgress) onProgress(70, 'Flips inserted, building market models...');

  return {
    total_pairs_found: addressMap.size,
    flips_confirmed: flips.length,
    rows_processed: rowCount,
    tier_counts: tierCounts
  };
}

module.exports = { runTruthEngine };
