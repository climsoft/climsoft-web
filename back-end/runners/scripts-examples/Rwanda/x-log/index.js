#!/usr/bin/env node
// =============================================================================
//  LSI LASTEM X-Log  ->  stacked (long) CSV   [Climsoft Web JavaScript adapter]
//  ---------------------------------------------------------------------------
//  Normalises the semicolon-delimited ASCII files written by an LSI LASTEM
//  X-Log data logger into a regular tabular CSV, one row per reading:
//
//        station | measurement | date_time | value
//
//  where `measurement` = <raw_id>_<measurement_name>_<process_id>_<process_name>
//        e.g.  1_temperature_3_minimum
//
//  The record format (X-Log User Guide, Appendix 11.1)
//  --------------------------------------------------
//        S <d> ID <d> hh <d> mm <d> ss <d> dd <d> mm <d> yyyy <d> [mid <d> pid <d> value] ... #
//
//  The first eight fields are a fixed header. Everything after is a flat stream
//  of repeating (measurement id, process id, value) triplets, one per reading.
//  Records start with 'S' and normally end with '#', but a record cut short by
//  the logger has no '#', so records are split on the 'S' (see readRows). Line
//  breaks are ignored: a record may be on one line or span several. The field
//  delimiter <d> is either ';' or ',', can differ from file to file, and is
//  handled without configuration.
//
//  Why this adapter exists
//  -----------------------
//  The triplet order is NOT stable between files. Adding, removing or
//  reconfiguring a sensor makes its triplets appear, disappear or move, which
//  shifts every triplet after it. A file read by column position would silently
//  mislabel readings after any such change, and those changes are not always
//  announced before the data arrives.
//
//  The ids, however, never change: (1, 3) means temperature-minimum wherever it
//  sits in the line. So this adapter ignores position entirely and keys on the
//  (measurement id, process id) pair, which makes the import immune to sensor
//  reconfiguration. Everything below follows from that decision.
//
//  Two further quirks of the format are handled here:
//
//  * Repeated sensors of one type are identified by adding 50 to the base
//    measurement id, so three temperature probes appear as ids 1, 51 and 101.
//    The base id is recovered for naming (see buildLabel below) while the raw
//    id stays in the label, keeping the instances distinct.
//  * Missing or invalidated readings are written as the fill value -9999.0, or
//    as '*' when they fail the logger's own validation. Both become empty in
//    the output CSV.
//
//  Scope
//  -----
//  This adapter normalises structure only. It deliberately does not decide which
//  Climsoft element a measurement corresponds to; that mapping belongs to the
//  point-and-click import specification, where it stays visible and adjustable.
//
//  Runner contract (enforced by the Climsoft JavaScript runner)
//  -----------------------------------------------------------
//  * This file must be named `index.js` at the adapter root.
//  * Dependencies would go in `package.json`; this adapter has none.
//  * Paths arrive as environment variables, not arguments:
//        CLIMSOFT_INPUT_FILE_PATH_NAME   the input file to read
//        CLIMSOFT_OUTPUT_DIR             the directory to write output into
//        CLIMSOFT_METADATA_FILE          run context written by the API
//        CLIMSOFT_WARNINGS_FILE          JSON-Lines file for non-fatal warnings
//  * Exit 0 = success. Any non-zero exit fails the run as RUNTIME_ERROR, and the
//    end of what was written to stderr becomes the run's error message.
//  * Output must not be named metadata.json, warnings.jsonl, stdout.log,
//    stderr.log or install.log; those are the runner's own sidecar files.
//
//  Local testing:
//        node index.js <input-file> <output-dir>
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const OUTPUT_FILENAME = 'output.csv';
const NODATA = -9999.0;
const INSTANCE_OFFSET = 50;   // ids repeat every 50: 1, 51, 101 are all temperature
const HEADER_LEN = 8;         // S, station, hh, mm, ss, dd, mm, yyyy

// --- Lookup tables -----------------------------------------------------------
// Ids 1-40 and the processes are from the X-Log User Guide, Appendix 11.2.
// Ids 41-49 are from the NESA Evolution user manual, Appendix B, which continues
// the same table; id 44 (sunshine duration) appears in every record from station
// 010182. Appendix B lists 46 and 47 only as "n. a." (not assigned), so they are
// left out: a reading with either id is labelled 'unknown' and warned about.
const MEASUREMENTS = {
  1: 'Temperature', 2: 'Humidity', 3: 'Global solar radiation',
  4: 'Wind direction', 5: 'Evaporation', 6: 'Hydrometric Level',
  7: 'Phreatic Level', 8: 'Battery Voltage', 9: 'Wind speed',
  10: 'Precipitation', 11: 'Net solar radiation', 12: 'Snow Depth',
  13: 'Pressure', 14: 'Voltage', 15: 'Evapotranspiration', 16: 'Leaf Soaking',
  17: 'pH', 18: 'Conductivity', 19: 'Counter', 20: 'Crack Gauge',
  21: 'Slope Gauge', 22: 'Load Cell', 23: 'Redox', 24: 'Oxygen released',
  25: 'Turbidity', 26: 'Strain Gauge', 27: 'Linear displacement',
  28: 'Frequency', 29: 'CH4', 30: 'THC', 31: 'NMHC', 32: 'Current',
  33: 'Capacity', 34: 'CO', 35: 'NO', 36: 'NOX', 37: 'NO2', 38: 'O3',
  39: 'SO2', 40: 'Energy',
  // NESA Evolution user manual, Appendix B
  41: 'Auxiliary Measurement', 42: 'Temp. Auxiliary', 43: 'Visibility',
  44: 'Duration of Sunshine', 45: 'UV', 48: 'Latitude', 49: 'Longitude',
};
const PROCESSES = {
  1: 'Instant', 2: 'Average', 3: 'Minimum', 4: 'Maximum', 5: 'Min Minimum',
  6: 'Min Maximum', 7: 'Accumulation', 8: 'Standard Deviation',
  9: 'Root Mean Square Deviation', 10: 'Delta M1 M2 relative to T1 T2',
  11: 'Daily Average', 12: 'Daily Minimum', 13: 'Daily Maximum',
  14: 'Status', 15: 'Status Measurement Value',
};

const COLUMNS = ['station', 'measurement', 'date_time', 'value'];

const warnings = [];

/** Record a non-fatal problem; flushed to CLIMSOFT_WARNINGS_FILE at the end. */
function warn(type, message, detail = {}) {
  warnings.push({ type, message, ...detail });
}

/**
 * Turn a measurement or process name into a label-safe token: lowercase, with
 * every run of non-alphanumeric characters collapsed to a single underscore.
 *
 *     "Global solar radiation"     -> "global_solar_radiation"
 *     "Root Mean Square Deviation" -> "root_mean_square_deviation"
 */
function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// A plain decimal or exponential number, which is all the logger ever writes.
// Number() alone is too permissive to use as the test: it reads '' and '  ' as
// 0, and '0x10' as 16, any of which would turn a junk field into a real
// reading. Matching the shape first and only then converting keeps that shut.
const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * Parse a reading, mapping both of the logger's no-data conventions to null
 * (an empty cell in the output):
 *
 *   * -9999.0  the fill value for a channel that is configured but returning
 *              nothing, e.g. a disconnected or faulted sensor;
 *   * '*'      written in place of a reading that failed the logger's own
 *              min/max validation.
 *
 * Anything else non-numeric is treated as no-data too, rather than failing the
 * run: one unreadable cell should not cost the whole file.
 */
function parseValue(raw) {
  const text = raw.trim();
  if (!NUMERIC.test(text)) return null;
  const value = Number(text);
  return value === NODATA ? null : value;
}

/**
 * Render a reading the way the rest of the pipeline expects to read it.
 *
 * String(93) gives "93", but the value came off an instrument as 93.0 and the
 * column is a float, so integral readings get an explicit ".0" to keep the
 * column visibly numeric rather than a mix of ints and floats.
 *
 * The -0 case is not hypothetical: a sensor reading just below zero, such as
 * global solar radiation at night, is written as "-0.0", and String(-0) would
 * quietly drop the sign. Object.is is the only way to tell -0 from 0.
 */
function formatValue(value) {
  if (value === null) return '';
  if (Number.isInteger(value)) return (Object.is(value, -0) ? '-0' : String(value)) + '.0';
  return String(value);
}

const pad = (n, width = 2) => String(n).padStart(width, '0');

/**
 * Build "YYYY-MM-DD HH:MM:SS" from the header fields, or return null if they do
 * not describe a real instant.
 *
 * Note the ordering: the logger writes time before date, and the date is
 * day-first, so the fields arrive as hh, mm, ss, dd, mm, yyyy.
 *
 * Date is used only to validate, never to format. Two reasons. Date arithmetic
 * rolls over silently, so a nonsense 30 February becomes 2 March instead of an
 * error; building the date and checking every component survives the round trip
 * is what turns that back into a rejection. And formatting through Date would
 * drag the container's local timezone into a timestamp that is already exactly
 * what it should be, so the string is assembled from the parsed numbers.
 */
function parseTimestamp(hh, mm, ss, dd, mo, yy) {
  const parts = [yy, mo, dd, hh, mm, ss];
  if (parts.some((p) => p.trim() === '' || !/^\d+$/.test(p.trim()))) return null;
  const [Y, M, D, h, m, s] = parts.map(Number);
  // Same year range as Python's datetime and the SQL version: 1 to 9999.
  if (Y < 1 || Y > 9999) return null;

  // setUTCFullYear rather than Date.UTC(Y, ...), which maps years 0-99 to
  // 1900-1999 and would make those years fail the round trip below.
  const probe = new Date(0);
  probe.setUTCFullYear(Y, M - 1, D);
  probe.setUTCHours(h, m, s);
  const roundTrips =
    probe.getUTCFullYear() === Y && probe.getUTCMonth() === M - 1 &&
    probe.getUTCDate() === D && probe.getUTCHours() === h &&
    probe.getUTCMinutes() === m && probe.getUTCSeconds() === s;
  if (!roundTrips) return null;

  return `${pad(Y, 4)}-${pad(M)}-${pad(D)} ${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Build the measurement label, e.g. "51_temperature_3_minimum".
 *
 * The raw id leads, so repeated instances of one sensor type stay distinct
 * (1/51/101 give three different labels). Only the NAME is looked up from the
 * base id, recovered by undoing the "+50 per repeated instance" offset.
 *
 * Why -1 and +1 either side of the modulo, rather than a bare `% 50`: the ids
 * are 1-based, but the offset is added in whole blocks of 50, so the block
 * boundaries land on 50, 100, 150... A plain `% 50` maps those to 0, which is
 * not a valid measurement id and would fail the lookup. Subtracting 1 shifts
 * into a 0-based space where the boundaries line up on 0, the modulo strips the
 * instance count cleanly, and adding 1 back returns to the valid 1-based range.
 * This is the standard idiom for wrapping a 1-based number without an
 * off-by-one at the wrap point. A 50-wide block is safe because the +50 scheme
 * only works when base ids are <= 50, which the logger's own encoding
 * guarantees. Any base id not in the lookup tables is labelled 'unknown',
 * below, rather than dropped.
 */
function buildLabel(measId, procId, station) {
  const baseId = ((measId - 1) % INSTANCE_OFFSET) + 1;

  const measName = MEASUREMENTS[baseId];
  const procName = PROCESSES[procId];

  // An unrecognised id is labelled 'unknown' and kept, never dropped: a reading
  // nobody expected should be visible downstream, not silently absent.
  if (measName === undefined) {
    warn('UNKNOWN_MEASUREMENT',
      `Measurement id ${measId} (base ${baseId}) is not in the id tables; labelled 'unknown'.`,
      { station, measurement_id: measId });
  }
  if (procName === undefined) {
    warn('UNKNOWN_PROCESS',
      `Process id ${procId} is not in the id tables; labelled 'unknown'.`,
      { station, process_id: procId });
  }

  return `${measId}_${slug(measName || 'unknown')}_${procId}_${slug(procName || 'unknown')}`;
}

/**
 * Yield one row per reading in a record. `record` is the text that followed one
 * 'S' marker, with line breaks already removed by readRows(). A real record
 * therefore starts with the field delimiter; anything else (an empty string,
 * stray text before the first record) yields nothing.
 *
 * A damaged record is skipped whole, with a warning, never partly imported:
 * once a field is lost or added, every triplet after it is shifted by one and
 * still looks numeric, so skipping only the triplet that failed to parse would
 * import the shifted readings after it.
 */
function* parseRecord(record) {
  let text = record.trim();
  if (!text || !/^[;,]/.test(text)) return;
  const line = ('S' + text).slice(0, 120);   // the record as it appeared, for warnings

  // A complete record ends in '#'. A record cut short by the logger does not,
  // and its last field may itself be cut short (e.g. '21.15' arriving as
  // '21.1'), so everything after its last delimiter is dropped: only fields
  // that were followed by a delimiter are trusted. Any incomplete trailing
  // triplet is then dropped by the loop bound below.
  const complete = text.endsWith('#');
  if (complete) {
    text = text.slice(0, -1);
  } else {
    warn('TRUNCATED_RECORD',
      "Record has no closing '#'; its last field and any incomplete trailing triplet " +
      'were dropped in case they were cut short.',
      { line });
    text = text.replace(/[^;,]*$/, '');
  }

  // Split the header off from the body. The field delimiter is either ';' or
  // ',' (it can differ from file to file), so split on the [;,] character
  // class; this needs no per-file detection and tolerates a record that mixed
  // them. The regex first strips any trailing delimiter that sat before '#'.
  // X-Log values are numeric (decimals use '.'), so ';' and ',' only ever
  // appear as delimiters, never inside a value. The first field is the empty
  // string left where the 'S' was split off.
  const fields = text.replace(/[;,]+$/, '').split(/[;,]/);
  if (fields.length < HEADER_LEN) {
    warn('MALFORMED_RECORD', 'Record is shorter than the eight-field header; skipped.',
      { line });
    return;
  }

  const [, station, hh, mm, ss, dd, mo, yy] = fields;
  const body = fields.slice(HEADER_LEN);

  const dateTime = parseTimestamp(hh, mm, ss, dd, mo, yy);
  if (dateTime === null) {
    warn('BAD_TIMESTAMP', 'Unparseable date/time in record; skipped.', { line });
    return;
  }

  // A complete record's body must be whole triplets; if it is not, a field was
  // lost or added somewhere and the triplets are misaligned. (A truncated
  // record is expected to end part-way through a triplet, so it is not checked.)
  if (complete && body.length % 3 !== 0) {
    warn('RAGGED_RECORD',
      `Record body has ${body.length} fields, not a multiple of three, so its ` +
      'triplets are misaligned; whole record skipped.',
      { station, line });
    return;
  }

  // The body is a flat stream of (measurement id, process id, value). Every id
  // is checked before anything is yielded, so a bad one rejects the record as
  // a whole.
  const triplets = [];
  for (let i = 0; i + 2 < body.length; i += 3) triplets.push(body.slice(i, i + 3));
  const isUint = (raw) => /^\d+$/.test(raw.trim());
  if (!triplets.every(([measRaw, procRaw]) => isUint(measRaw) && isUint(procRaw))) {
    warn('BAD_TRIPLET',
      "Non-numeric measurement or process id, so the record's triplets are " +
      'misaligned; whole record skipped.',
      { station, line });
    return;
  }

  for (const [measRaw, procRaw, valueRaw] of triplets) {
    const measId = Number(measRaw);
    const procId = Number(procRaw);

    yield {
      station,
      measurement: buildLabel(measId, procId, station),
      date_time: dateTime,
      value: parseValue(valueRaw),
    };
  }
}

/** Yield every reading in an X-Log file, one row at a time. */
function* readRows(inputPath) {
  // The whole file is read, its CR/LF removed, and the text split on 'S', the
  // record-start marker. Line breaks carry no meaning in X-Log output (a record
  // may sit on one line, span several, or have a break right after the 'S'),
  // so they are dropped rather than treated as boundaries. 'S' is used instead
  // of the '#' terminator because a record cut short by the logger has no '#',
  // and splitting on '#' would glue it onto the next record (e.g. '...,201' +
  // 'S,010182,...' -> '201S'), turning the next record's header into bogus
  // readings. 'S' is safe to split on as it never occurs inside a record
  // (every other field is numeric or '*'). X-Log files are small (a day of
  // hourly records is a couple of dozen records), so holding the text briefly
  // is cheap; the sort in main() needs every row anyway.
  const content = fs.readFileSync(inputPath, 'utf8').replace(/[\r\n]/g, '');
  for (const record of content.split('S')) {
    yield* parseRecord(record);
  }
}

/**
 * Take the input path and output directory from the runner's environment,
 * falling back to command-line arguments so the adapter can also be run by hand
 * during development.
 */
function resolvePaths() {
  const inputPath = process.env.CLIMSOFT_INPUT_FILE_PATH_NAME || process.argv[2];
  const outputDir = process.env.CLIMSOFT_OUTPUT_DIR || process.argv[3];

  if (!inputPath || !outputDir) {
    console.error('CLIMSOFT_INPUT_FILE_PATH_NAME and CLIMSOFT_OUTPUT_DIR must be set ' +
      '(or pass <input-file> <output-dir> as arguments for local testing).');
    process.exit(1);
  }
  if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }
  return { inputPath, outputDir };
}

/** Append anything warn() collected to CLIMSOFT_WARNINGS_FILE as JSON Lines. */
function flushWarnings() {
  const target = process.env.CLIMSOFT_WARNINGS_FILE;
  if (!target || warnings.length === 0) return;
  try {
    fs.appendFileSync(target, warnings.map((w) => JSON.stringify(w)).join('\n') + '\n');
  } catch (err) {
    // Failing to record a warning must never mask an otherwise good run.
    console.error(`Could not write warnings file: ${err.message}`);
  }
}

/** Quote a cell only where it would otherwise break the CSV. */
function csvCell(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(rows, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const target = path.join(outputDir, OUTPUT_FILENAME);

  const lines = [COLUMNS.join(',')];
  for (const row of rows) {
    lines.push([
      csvCell(row.station),
      csvCell(row.measurement),
      csvCell(row.date_time),
      csvCell(formatValue(row.value)),
    ].join(','));
  }
  // Trailing newline, and '\n' throughout: the runner and everything downstream
  // of it are Linux, and this adapter goes to some trouble to strip carriage
  // returns out of its input, so it should not introduce them on the way out.
  fs.writeFileSync(target, lines.join('\n') + '\n', 'utf8');
  return target;
}

function main() {
  const { inputPath, outputDir } = resolvePaths();

  const rows = [...readRows(inputPath)];
  if (rows.length === 0) {
    // Fail the run rather than write a header-only file: an empty import
    // reporting success is worse than a failure that names the problem. The
    // message below is printed to stderr, so it becomes the run's error.
    flushWarnings();
    console.error(`No X-Log records found in ${inputPath}. Expected lines starting ` +
      "with 'S' and containing (measurement id ; process id ; value) triplets.");
    process.exit(1);
  }

  // Chronological, and stable, so readings keep the logger's own ordering
  // within a timestamp instead of being reshuffled. The timestamp is formatted
  // big-endian, so comparing the strings compares the instants.
  rows.sort((a, b) => (a.date_time < b.date_time ? -1 : a.date_time > b.date_time ? 1 : 0));

  const target = writeCsv(rows, outputDir);
  flushWarnings();
  console.log(`Wrote ${rows.length} rows to ${target}`);
}

main();
