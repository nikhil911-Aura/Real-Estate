const db = require('../db');
const { parseCsvStream } = require('../csv-clean');

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

// Extract only the fields we need from a full CSV row — saves ~90% memory
function extractFields(row) {
  return {
    address: getField(row, 'Address', 'FullAddress', 'StreetAddress', 'UnparsedAddress', 'FullStreetAddress') || '',
    zip: getField(row, 'ZipCode', 'PostalCode', 'Zip', 'ZipOrPostalCode') || '',
    closedDate: getField(row, 'ClosedDate', 'CloseDate', 'SoldDate', 'ClosingDate') || '',
    salesPrice: getField(row, 'SalesPrice', 'ClosePrice', 'SoldPrice', 'ClosedPrice', 'SalePrice') || '',
    closingTerms: getField(row, 'ClosingTerms', 'CloseTerms') || '',
    buyerFinancing: getField(row, 'BuyerFinancing', 'Financing') || '',
    officeName: getField(row, 'OfficeSellName', 'ListOfficeName', 'BuyerOfficeName', 'SellingOfficeName') || '',
    remarks: getField(row, 'Remarks', 'PublicRemarks', 'PropertyDescription') || '',
    mls: getField(row, 'MlsNumber', 'MLSNumber', 'ListingId', 'MLS', 'MLNumber', 'ListingKey') || '',
    county: getField(row, 'County', 'CountyOrParish', 'CountyName') || '',
    city: getField(row, 'City', 'CityName') || '',
    yearBuilt: getField(row, 'YearBuilt', 'YrBuilt') || '',
    sqft: getField(row, 'SqFtTotal', 'SquareFeet', 'LivingArea', 'SqFt', 'GLA') || '',
    bedrooms: getField(row, 'TotalBedrooms', 'Bedrooms', 'BedroomsTotal', 'Beds', 'BdTotal') || '',
  };
}

async function runTruthEngine(filePath, onProgress) {
  const addressMap = new Map();
  let rowCount = 0;

  // Step 1: Stream CSV and extract only needed fields — never holds all rows in memory
  rowCount = await parseCsvStream(filePath, (row) => {
    const slim = extractFields(row);
    const normAddr = normalizeAddress(slim.address);
    if (!normAddr || !slim.zip) return;

    const key = `${normAddr}|${slim.zip}`;
    if (!addressMap.has(key)) {
      addressMap.set(key, []);
    }
    addressMap.get(key).push(slim);
  });

  if (onProgress) onProgress(30, `Parsed ${rowCount} rows, finding flip pairs...`);

  // Step 2 & 3: Find and qualify flip pairs
  const flips = [];

  for (const [key, records] of addressMap) {
    if (records.length < 2) continue;

    const dated = records
      .map(r => ({ ...r, _date: parseDate(r.closedDate) }))
      .filter(r => r._date !== null)
      .sort((a, b) => a._date - b._date);

    if (dated.length < 2) continue;

    const buyEvent = dated[0];
    const sellEvent = dated[dated.length - 1];

    const buyPrice = parseNumber(buyEvent.salesPrice);
    const sellPrice = parseNumber(sellEvent.salesPrice);

    if (!buyPrice || !sellPrice) continue;

    const holdDays = daysBetween(buyEvent._date, sellEvent._date);
    const priceSpread = sellPrice - buyPrice;

    if (holdDays < 60 || holdDays > 730) continue;
    if (sellPrice <= buyPrice) continue;
    if (priceSpread < 15000) continue;

    // Investor signal check
    const cashInTerms = buyEvent.closingTerms.toLowerCase().includes('cash');
    const cashInFinancing = buyEvent.buyerFinancing.toLowerCase().includes('cash');
    const officeLower = buyEvent.officeName.toLowerCase();
    const investorOffice = INVESTOR_PATTERNS.some(p => officeLower.includes(p));

    if (!cashInTerms && !cashInFinancing && !investorOffice) continue;

    const distressSignals = countKeywords(buyEvent.remarks, DISTRESS_KEYWORDS);
    const renoSignals = countKeywords(sellEvent.remarks, RENO_KEYWORDS);
    const totalSignals = distressSignals + renoSignals;

    let tier;
    if (totalSignals >= 3 && priceSpread >= 40000) tier = 'A';
    else if (totalSignals >= 2 && priceSpread >= 25000) tier = 'B';
    else if (totalSignals >= 1 && priceSpread >= 15000) tier = 'C';
    else tier = 'D';

    const sqft = parseNumber(buyEvent.sqft);

    flips.push({
      buy_mls: buyEvent.mls,
      sell_mls: sellEvent.mls,
      address: buyEvent.address,
      zip_code: buyEvent.zip,
      county: buyEvent.county,
      city: buyEvent.city,
      year_built: parseNumber(buyEvent.yearBuilt) || null,
      sqft: sqft,
      bedrooms: parseNumber(buyEvent.bedrooms) || null,
      buy_price: buyPrice,
      sell_price: sellPrice,
      price_spread: priceSpread,
      hold_days: holdDays,
      tier,
      distress_signals: distressSignals,
      reno_signals: renoSignals,
      buy_price_per_sqft: sqft && sqft > 0 ? Math.round((buyPrice / sqft) * 100) / 100 : null,
      sell_price_per_sqft: sqft && sqft > 0 ? Math.round((sellPrice / sqft) * 100) / 100 : null,
      buy_closing_terms: buyEvent.closingTerms,
      buy_remarks: buyEvent.remarks,
      sell_remarks: sellEvent.remarks,
      closed_date_buy: buyEvent._date.toISOString().split('T')[0],
      closed_date_sell: sellEvent._date.toISOString().split('T')[0]
    });
  }

  // Clear addressMap
  addressMap.clear();

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
    total_pairs_found: 0,
    flips_confirmed: flips.length,
    rows_processed: rowCount,
    tier_counts: tierCounts
  };
}

module.exports = { runTruthEngine };
