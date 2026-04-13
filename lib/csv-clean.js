const fs = require('fs');
const readline = require('readline');

/**
 * Robust streaming CSV parser that handles malformed quotes in MLS data.
 * Reads line by line to keep memory low for large files.
 * Returns array of objects keyed by header columns.
 */
async function parseCsvRobust(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = null;
    let pendingRecord = '';
    let lineNum = 0;

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      lineNum++;

      if (pendingRecord) {
        pendingRecord += '\n' + line;
      } else {
        pendingRecord = line;
      }

      // Check if the record is complete (balanced quotes)
      const quoteCount = countQuotes(pendingRecord);
      if (quoteCount % 2 !== 0) {
        // Unbalanced quotes — this line is part of a multi-line field
        return;
      }

      // Record is complete — parse it
      const fields = parseRecordFields(pendingRecord);
      pendingRecord = '';

      if (!headers) {
        headers = fields.map(f => f.trim());
        return;
      }

      if (fields.length === 0 || (fields.length === 1 && fields[0].trim() === '')) return;

      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = j < fields.length ? fields[j].trim() : '';
      }
      rows.push(row);
    });

    rl.on('close', () => {
      // Handle any remaining pending record
      if (pendingRecord) {
        const fields = parseRecordFields(pendingRecord);
        if (headers && fields.length > 1) {
          const row = {};
          for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = j < fields.length ? fields[j].trim() : '';
          }
          rows.push(row);
        }
      }
      resolve(rows);
    });

    rl.on('error', reject);
  });
}

function countQuotes(str) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"') count++;
  }
  return count;
}

function parseRecordFields(record) {
  const fields = [];
  let i = 0;
  const len = record.length;

  while (i <= len) {
    if (i === len) {
      fields.push('');
      break;
    }

    if (record[i] === '"') {
      // Quoted field
      const result = parseQuotedField(record, i);
      fields.push(result.value);
      i = result.nextPos;
    } else {
      // Unquoted field
      let end = i;
      while (end < len && record[end] !== ',') {
        end++;
      }
      fields.push(record.substring(i, end));
      i = end;
    }

    // Skip comma
    if (i < len && record[i] === ',') {
      i++;
      if (i === len) {
        fields.push('');
      }
    } else {
      break;
    }
  }

  return fields;
}

function parseQuotedField(record, start) {
  let i = start + 1; // skip opening quote
  const len = record.length;
  let value = '';

  while (i < len) {
    const ch = record[i];

    if (ch === '"') {
      const next = i + 1 < len ? record[i + 1] : null;

      if (next === '"') {
        // Escaped quote ""
        value += '"';
        i += 2;
      } else if (next === ',' || next === null) {
        // Proper close
        i++; // skip closing quote
        return { value, nextPos: i };
      } else {
        // Unescaped internal quote — include as text
        value += '"';
        i++;
      }
    } else {
      value += ch;
      i++;
    }
  }

  return { value, nextPos: i };
}

/**
 * Streaming version — calls onRow(row) for each parsed row.
 * Never holds all rows in memory. Use for large files.
 */
async function parseCsvStream(filePath, onRow) {
  return new Promise((resolve, reject) => {
    let headers = null;
    let pendingRecord = '';
    let rowCount = 0;

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      if (pendingRecord) {
        pendingRecord += '\n' + line;
      } else {
        pendingRecord = line;
      }

      const quoteCount = countQuotes(pendingRecord);
      if (quoteCount % 2 !== 0) return;

      const fields = parseRecordFields(pendingRecord);
      pendingRecord = '';

      if (!headers) {
        headers = fields.map(f => f.trim());
        return;
      }

      if (fields.length === 0 || (fields.length === 1 && fields[0].trim() === '')) return;

      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = j < fields.length ? fields[j].trim() : '';
      }
      rowCount++;
      onRow(row);
    });

    rl.on('close', () => {
      if (pendingRecord) {
        const fields = parseRecordFields(pendingRecord);
        if (headers && fields.length > 1) {
          const row = {};
          for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = j < fields.length ? fields[j].trim() : '';
          }
          rowCount++;
          onRow(row);
        }
      }
      resolve(rowCount);
    });

    rl.on('error', reject);
  });
}

module.exports = { parseCsvRobust, parseCsvStream };
