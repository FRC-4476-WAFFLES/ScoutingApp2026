/**
 * Parse a CSV string into an array of values, handling quoted fields correctly.
 * Quoted fields can contain commas without breaking the parse.
 *
 * @param {string} text - CSV string (single row)
 * @returns {string[]|null} - Array of values, or null if malformed
 */
export function parseCSV(text) {
  if (!text) return null;

  const re_valid =
    /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
  const re_value =
    /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;

  if (!re_valid.test(text)) return null;

  const result = [];
  text.replace(re_value, function (m0, m1, m2, m3) {
    if (m1 !== undefined) result.push(m1.replace(/\\'/g, "'"));
    else if (m2 !== undefined) result.push(m2.replace(/\\"/g, '"'));
    else if (m3 !== undefined) result.push(m3);
    return "";
  });

  if (/,\s*$/.test(text)) result.push("");
  return result;
}

/**
 * Escape a value for safe CSV inclusion.
 * Wraps in quotes if the value contains commas, quotes, or newlines.
 *
 * @param {string} value - The value to escape
 * @returns {string} - CSV-safe string
 */
export function escapeCSVField(value) {
  if (value === null || value === undefined) return '""';

  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  // Empty string gets quotes
  if (str === "") return '""';

  return str;
}
