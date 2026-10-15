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
//  Records are delimited by '#'. The field delimiter <d> is either ';' or ',',
//  can differ from file to file, and is handled without configuration. Newlines
//  between records, if present, are incidental.
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
//  * Exit 0 = success, 2 = OUTPUT_INVALID, any other non-zero = RUNTIME_ERROR.
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

// --- Lookup tables (X-Log User Guide, Appendix 11.2) -------------------------
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

  const probe = new Date(Date.UTC(Y, M - 1, D, h, m, s));
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
 * guarantees. (App. 11.2 defines ids past 40; id 44, for one, appears in real
 * data, so any base id not in the lookup tables is labelled 'unknown', below.)
 */
function buildLabel(measId, procId, station) {
  const baseId = ((measId - 1) % INSTANCE_OFFSET) + 1;

  const measName = MEASUREMENTS[baseId];
  const procName = PROCESSES[procId];

  // An unrecognised id is labelled 'unknown' and kept, never dropped: a reading
  // nobody expected should be visible downstream, not silently absent.
  if (measName === undefined) {
    warn('UNKNOWN_MEASUREMENT',
      `Measurement id ${measId} (base ${baseId}) is not in Appendix 11.2; labelled 'unknown'.`,
      { station, measurement_id: measId });
  }
  if (procName === undefined) {
    warn('UNKNOWN_PROCESS',
      `Process id ${procId} is not in Appendix 11.2; labelled 'unknown'.`,
      { station, process_id: procId });
  }

  return `${measId}_${slug(measName || 'unknown')}_${procId}_${slug(procName || 'unknown')}`;
}

/**
 * Yield one row per reading in a record line. Lines that are blank or do not
 * start with 'S' are not records and yield nothing.
 */
function* parseRecord(record) {
  // Records are delimited by '#', so a record may carry the newline(s) that sat
  // between it and the next one. Strip all CR/LF and trim: newlines are
  // incidental formatting here, and a stray one left inside would corrupt the
  // field it landed in.
  const text = record.replace(/[\r\n]/g, '').trim();
  if (!text || !text.startsWith('S')) return;

  // Split the header off from the body. The field delimiter is either ';' or
  // ',' (it can differ from file to file), so split on the [;,] character
  // class; this needs no per-file detection and tolerates a record that mixed
  // them. The regex first strips any trailing delimiter that sat before '#'.
  // X-Log values are numeric (decimals use '.'), so ';' and ',' only ever
  // appear as delimiters, never inside a value.
  const fields = text.replace(/[;,]+$/, '').split(/[;,]/);
  if (fields.length < HEADER_LEN) {
    warn('MALFORMED_RECORD', 'Record is shorter than the eight-field header; skipped.',
      { line: text.slice(0, 120) });
    return;
  }

  const [, station, hh, mm, ss, dd, mo, yy] = fields;
  const body = fields.slice(HEADER_LEN);

  const dateTime = parseTimestamp(hh, mm, ss, dd, mo, yy);
  if (dateTime === null) {
    warn('BAD_TIMESTAMP', 'Unparseable date/time in record; skipped.',
      { line: text.slice(0, 120) });
    return;
  }

  // The body is a flat stream of (measurement id, process id, value). A ragged
  // tail is ignored by the loop bound, so say so rather than let it vanish.
  if (body.length % 3 !== 0) {
    warn('RAGGED_RECORD',
      `Record body has ${body.length} fields, not a multiple of three; ` +
      'the incomplete trailing triplet was ignored.',
      { station, line: text.slice(0, 120) });
  }

  for (let i = 0; i + 2 < body.length; i += 3) {
    const [measRaw, procRaw, valueRaw] = body.slice(i, i + 3);

    if (!/^\d+$/.test(measRaw.trim()) || !/^\d+$/.test(procRaw.trim())) {
      warn('BAD_TRIPLET', 'Non-numeric measurement or process id; triplet skipped.',
        { station, raw: [measRaw, procRaw, valueRaw] });
      continue;
    }
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
  // Records are delimited by '#', not by newlines, so read the whole file and
  // split on '#'. X-Log files are small (a day of hourly records is a couple of
  // dozen records), so holding the text briefly is cheap; the sort in main()
  // needs every row anyway. The empty tail after the final '#' fails
  // parseRecord's 'S' check and drops out.
  const content = fs.readFileSync(inputPath, 'utf8');
  for (const record of content.split('#')) {
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
    // Exit 2 (OUTPUT_INVALID) rather than write a header-only file: an empty
    // import reporting success is worse than a failure that names the problem.
    flushWarnings();
    console.error(`No X-Log records found in ${inputPath}. Expected lines starting ` +
      "with 'S' and containing (measurement id ; process id ; value) triplets.");
    process.exit(2);
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
