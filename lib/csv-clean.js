const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Robust CSV parser that handles malformed quotes in MLS data.
 * Returns array of objects keyed by header columns.
 *
 * Instead of streaming with csv-parse (which chokes on unescaped quotes),
 * we parse field-by-field with a state machine that recovers from bad quotes.
 */
function parseCsvRobust(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const records = parseFields(content);

  if (records.length === 0) return [];

  const headers = records[0];
  const rows = [];

  for (let i = 1; i < records.length; i++) {
    const fields = records[i];
    if (fields.length === 0 || (fields.length === 1 && fields[0] === '')) continue;

    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = j < fields.length ? fields[j] : '';
    }
    rows.push(row);
  }

  return rows;
}

function parseFields(content) {
  const records = [];
  let i = 0;
  const len = content.length;

  while (i < len) {
    const { fields, nextPos } = parseRecord(content, i);
    records.push(fields);
    i = nextPos;
  }

  return records;
}

function parseRecord(content, start) {
  const fields = [];
  let i = start;
  const len = content.length;

  while (i < len) {
    // Skip \r
    if (content[i] === '\r') {
      i++;
      continue;
    }

    // End of record
    if (content[i] === '\n') {
      i++;
      break;
    }

    if (content[i] === '"') {
      // Quoted field
      const { value, nextPos } = parseQuotedField(content, i);
      fields.push(value.trim());
      i = nextPos;
    } else {
      // Unquoted field
      let end = i;
      while (end < len && content[end] !== ',' && content[end] !== '\n' && content[end] !== '\r') {
        end++;
      }
      fields.push(content.substring(i, end).trim());
      i = end;
    }

    // Skip comma delimiter
    if (i < len && content[i] === ',') {
      i++;
      // If comma is at end of record (before newline or EOF), add empty field
      if (i >= len || content[i] === '\n' || content[i] === '\r') {
        fields.push('');
      }
    }
  }

  return { fields, nextPos: i };
}

function parseQuotedField(content, start) {
  let i = start + 1; // skip opening quote
  const len = content.length;
  let value = '';

  while (i < len) {
    const ch = content[i];

    if (ch === '"') {
      const next = i + 1 < len ? content[i + 1] : null;

      if (next === '"') {
        // Escaped quote ""
        value += '"';
        i += 2;
      } else if (next === ',' || next === '\n' || next === '\r' || next === null) {
        // Proper close of quoted field
        i++; // skip closing quote
        return { value, nextPos: i };
      } else {
        // Unescaped internal quote — just include it as text
        value += '"';
        i++;
      }
    } else {
      value += ch;
      i++;
    }
  }

  // Reached EOF inside quoted field
  return { value, nextPos: i };
}

module.exports = { parseCsvRobust };
